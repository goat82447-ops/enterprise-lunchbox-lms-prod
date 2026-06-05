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

        var captains = Enumerable.Range(1, 5)
            .Select(index => new UserAccount
            {
                FullName = $"Captain{index}",
                Email = $"captain{index}@lunchbox.local",
                Password = $"Captain{index}@123",
                MobileNumber = $"+91 90000 10{index:000}",
                DefaultPickupAddress = $"Captain Hub {index}, Hyderabad",
                Role = "Captain",
                SecurityPin = (7000 + index).ToString(),
                LastIssuedPin = (7000 + index).ToString()
            });

        var customers = Enumerable.Range(1, 8)
            .Select(index => new UserAccount
            {
                FullName = $"Customer{index}",
                Email = $"customer{index}@lunchbox.local",
                Password = $"Customer{index}@123",
                MobileNumber = $"+91 91000 20{index:000}",
                DefaultPickupAddress = $"Customer Street {index}, Hyderabad",
                Role = "Customer",
                SecurityPin = (5000 + index).ToString(),
                LastIssuedPin = (5000 + index).ToString()
            });

        foreach (var captain in captains)
        {
            await dbContext.EnsureUserAsync(captain);
        }

        foreach (var customer in customers)
        {
            await dbContext.EnsureUserAsync(customer);
        }
    }
}
