namespace AuthService.Models;

public sealed record LoginResponse(
    int UserId,
    string FullName,
    string Email,
    string MobileNumber,
    string DefaultPickupAddress,
    string DemoPin,
    string Message);
