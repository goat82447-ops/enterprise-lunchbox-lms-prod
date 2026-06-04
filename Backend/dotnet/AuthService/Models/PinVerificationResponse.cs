namespace AuthService.Models;

public sealed record PinVerificationResponse(int UserId, bool IsValid, string Message);
