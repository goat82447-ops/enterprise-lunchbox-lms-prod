namespace AuthService.Models;

public sealed record VerifyPinRequest(int UserId, string Pin);
