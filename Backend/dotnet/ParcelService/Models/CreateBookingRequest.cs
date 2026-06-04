namespace ParcelService.Models;

public sealed record CreateBookingRequest(
    string SenderName,
    string SenderPhone,
    string ReceiverName,
    string ReceiverPhone,
    string PickupAddress,
    string DeliveryAddress,
    string PackageType,
    string Priority);