using AuthService.Models;

namespace AuthService.Data;

public static class AuthSeeder
{
    public static void Seed(AuthDbContext dbContext)
    {
        ArgumentNullException.ThrowIfNull(dbContext);

        if (dbContext.Users.Any())
        {
            return;
        }

        dbContext.Users.Add(new UserAccount
        {
            FullName = "Aarav Sharma",
            Email = "demo@lunchbox.local",
            Password = "LunchBox@123",
            MobileNumber = "+91 98765 43210",
            DefaultPickupAddress = "42 Market Street, Hyderabad",
            SecurityPin = "4821",
            LastIssuedPin = "4821"
        });

        dbContext.SaveChanges();
    }
}
