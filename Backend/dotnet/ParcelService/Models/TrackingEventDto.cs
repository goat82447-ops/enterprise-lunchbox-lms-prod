namespace ParcelService.Models;

public sealed record TrackingEventDto(
    string Status,
    string Message,
    double VehicleLatitude,
    double VehicleLongitude,
    DateTime EventTimeUtc)
{
    public static TrackingEventDto FromEntity(TrackingEvent trackingEvent)
    {
        return new TrackingEventDto(
            trackingEvent.Status,
            trackingEvent.Message,
            trackingEvent.VehicleLatitude,
            trackingEvent.VehicleLongitude,
            trackingEvent.EventTimeUtc);
    }
}