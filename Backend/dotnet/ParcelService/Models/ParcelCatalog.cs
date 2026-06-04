namespace ParcelService.Models;

public static class ParcelCatalog
{
    public static object Create()
    {
        return new
        {
            packageTypes = new[]
            {
                "Documents",
                "Food & Documents",
                "Electronics",
                "Gifts",
                "Groceries"
            },
            priorities = new[]
            {
                new { name = "Standard", price = 199, eta = "60-90 mins" },
                new { name = "Express", price = 349, eta = "30-45 mins" }
            },
            deliveryFeatures = new[]
            {
                "Doorstep OTP handoff",
                "Live driver location",
                "Delivery status messages",
                "Digital proof of delivery"
            }
        };
    }
}