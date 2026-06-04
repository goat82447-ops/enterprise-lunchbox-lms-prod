namespace ParcelService.Models;

public sealed class TrackingEvent
{
    public int Id { get; set; }

    public int ParcelBookingId { get; set; }

    public string Status { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public double VehicleLatitude { get; set; }

    public double VehicleLongitude { get; set; }

    public DateTime EventTimeUtc { get; set; }
}