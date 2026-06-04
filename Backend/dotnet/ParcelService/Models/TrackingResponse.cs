namespace ParcelService.Models;

public sealed record TrackingResponse(
    int BookingId,
    string TrackingNumber,
    string CurrentStatus,
    string DriverName,
    string DriverPhone,
    string VehicleNumber,
    double VehicleLatitude,
    double VehicleLongitude,
    DateTime EstimatedDeliveryAtUtc,
    IReadOnlyList<TrackingEventDto> Updates)
{
    public static TrackingResponse FromEntity(ParcelBooking booking)
    {
        return new TrackingResponse(
            booking.Id,
            booking.TrackingNumber,
            booking.CurrentStatus,
            booking.DriverName,
            booking.DriverPhone,
            booking.VehicleNumber,
            booking.VehicleLatitude,
            booking.VehicleLongitude,
            booking.EstimatedDeliveryAtUtc,
            booking.TrackingEvents
                .OrderBy(item => item.EventTimeUtc)
                .Select(TrackingEventDto.FromEntity)
                .ToList());
    }
}