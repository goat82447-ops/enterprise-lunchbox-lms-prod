using Microsoft.EntityFrameworkCore;
using ParcelService.Models;

namespace ParcelService.Data;

public sealed class ParcelDbContext : DbContext
{
    public ParcelDbContext(DbContextOptions<ParcelDbContext> options)
        : base(options)
    {
    }

    public DbSet<ParcelBooking> Bookings => Set<ParcelBooking>();

    public DbSet<TrackingEvent> TrackingEvents => Set<TrackingEvent>();
}