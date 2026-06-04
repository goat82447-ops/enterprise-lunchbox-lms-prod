namespace ParcelService.Models;

public sealed record DeliveryPinVerificationResponse(int BookingId, bool IsValid, string Message);