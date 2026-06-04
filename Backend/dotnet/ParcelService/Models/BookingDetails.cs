namespace ParcelService.Models;

public sealed record BookingDetails(
    int Id,
    string TrackingNumber,
    string SenderName,
    string SenderPhone,
    string ReceiverName,
    string ReceiverPhone,
    string PickupAddress,
    string DeliveryAddress,
    string PackageType,
    string Priority,
    decimal Price,
    string DeliveryPin,
    string CurrentStatus,
    string DriverName,
    string DriverPhone,
    string VehicleNumber,
    DateTime EstimatedDeliveryAtUtc)
{
    public static BookingDetails FromEntity(ParcelBooking booking)
    {
        return new BookingDetails(
            booking.Id,
            booking.TrackingNumber,
            booking.SenderName,
            booking.SenderPhone,
            booking.ReceiverName,
            booking.ReceiverPhone,
            booking.PickupAddress,
            booking.DeliveryAddress,
            booking.PackageType,
            booking.Priority,
            booking.Price,
            booking.DeliveryPin,
            booking.CurrentStatus,
            booking.DriverName,
            booking.DriverPhone,
            booking.VehicleNumber,
            booking.EstimatedDeliveryAtUtc);
    }
}