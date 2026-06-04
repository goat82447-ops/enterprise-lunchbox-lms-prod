namespace ParcelService.Models;

public sealed record BookingSummary(
    int Id,
    string TrackingNumber,
    string ReceiverName,
    string DeliveryAddress,
    string CurrentStatus,
    decimal Price,
    DateTime EstimatedDeliveryAtUtc)
{
    public static BookingSummary FromEntity(ParcelBooking booking)
    {
        return new BookingSummary(
            booking.Id,
            booking.TrackingNumber,
            booking.ReceiverName,
            booking.DeliveryAddress,
            booking.CurrentStatus,
            booking.Price,
            booking.EstimatedDeliveryAtUtc);
    }
}