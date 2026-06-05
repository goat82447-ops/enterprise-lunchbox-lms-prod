using MongoDB.Driver;
using ParcelService.Models;

namespace ParcelService.Data;

public sealed class ParcelDbContext
{
    private readonly IMongoCollection<ParcelBooking> _bookings;

    public ParcelDbContext(IConfiguration configuration)
    {
        var connectionString = configuration["MongoDb:ConnectionString"] ?? "mongodb://localhost:27017";
        var databaseName = configuration["MongoDb:DatabaseName"] ?? "lunchbox";

        var client = new MongoClient(connectionString);
        var database = client.GetDatabase(databaseName);
        _bookings = database.GetCollection<ParcelBooking>("bookings");

        var trackingNumberIndex = new CreateIndexModel<ParcelBooking>(
            Builders<ParcelBooking>.IndexKeys.Ascending(item => item.TrackingNumber),
            new CreateIndexOptions { Unique = true });

        _bookings.Indexes.CreateOne(trackingNumberIndex);
    }

    public async Task<List<ParcelBooking>> GetBookingsAsync()
        => await _bookings.Find(Builders<ParcelBooking>.Filter.Empty)
            .SortByDescending(item => item.CreatedAtUtc)
            .ToListAsync();

    public async Task<ParcelBooking?> FindBookingByIdAsync(int id)
        => await _bookings.Find(item => item.Id == id).FirstOrDefaultAsync();

    public async Task<ParcelBooking> CreateBookingAsync(ParcelBooking booking)
    {
        ArgumentNullException.ThrowIfNull(booking);

        booking.Id = await GetNextBookingIdAsync();
        NormalizeTrackingEvents(booking);
        await _bookings.InsertOneAsync(booking);
        return booking;
    }

    public async Task ReplaceBookingAsync(ParcelBooking booking)
    {
        ArgumentNullException.ThrowIfNull(booking);

        NormalizeTrackingEvents(booking);
        await _bookings.ReplaceOneAsync(item => item.Id == booking.Id, booking);
    }

    public async Task SeedAsync(ParcelBooking booking)
    {
        ArgumentNullException.ThrowIfNull(booking);

        if (await _bookings.Find(Builders<ParcelBooking>.Filter.Empty).AnyAsync())
        {
            return;
        }

        booking.Id = await GetNextBookingIdAsync();
        NormalizeTrackingEvents(booking);
        await _bookings.InsertOneAsync(booking);
    }

    private async Task<int> GetNextBookingIdAsync()
    {
        var lastBooking = await _bookings
            .Find(Builders<ParcelBooking>.Filter.Empty)
            .SortByDescending(item => item.Id)
            .Limit(1)
            .FirstOrDefaultAsync();

        return (lastBooking?.Id ?? 0) + 1;
    }

    private static void NormalizeTrackingEvents(ParcelBooking booking)
    {
        var nextTrackingId = 1;

        foreach (var trackingEvent in booking.TrackingEvents.OrderBy(item => item.EventTimeUtc))
        {
            trackingEvent.Id = nextTrackingId++;
            trackingEvent.ParcelBookingId = booking.Id;
        }
    }
}