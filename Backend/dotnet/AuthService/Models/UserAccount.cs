namespace AuthService.Models;

public sealed class UserAccount
{
    public int Id { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string MobileNumber { get; set; } = string.Empty;

    public string DefaultPickupAddress { get; set; } = string.Empty;

    public string SecurityPin { get; set; } = string.Empty;

    public string LastIssuedPin { get; set; } = string.Empty;

    public DateTime? LastLoginAtUtc { get; set; }
}
