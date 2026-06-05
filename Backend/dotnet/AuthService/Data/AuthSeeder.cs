using AuthService.Models;

namespace AuthService.Data;

public static class AuthSeeder
{
    public static async Task SeedAsync(AuthDbContext dbContext)
    {
        ArgumentNullException.ThrowIfNull(dbContext);

        await dbContext.EnsureUserAsync(new UserAccount
        {
            FullName = "Aarav Sharma",
            Email = "demo@lunchbox.local",
            Password = "LunchBox@123",
            MobileNumber = "+91 98765 43210",
            DefaultPickupAddress = "42 Market Street, Hyderabad",
            Role = "Customer",
            SecurityPin = "4821",
            LastIssuedPin = "4821"
        });

        await dbContext.EnsureUserAsync(new UserAccount
        {
            FullName = "LunchBox Admin",
            Email = "admin@lunchbox.local",
            Password = "Admin@123",
            MobileNumber = "+91 90000 00000",
            DefaultPickupAddress = "LunchBox HQ, Hyderabad",
            Role = "Admin",
            SecurityPin = "9999",
            LastIssuedPin = "9999"
        });
    }
}
