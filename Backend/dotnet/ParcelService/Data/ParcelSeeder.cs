using ParcelService.Models;

namespace ParcelService.Data;

public static class ParcelSeeder
{
    public static Task SeedAsync(ParcelDbContext dbContext)
    {
        ArgumentNullException.ThrowIfNull(dbContext);

        var booking = new ParcelBooking
        {
            SenderName = "Aarav Sharma",
            SenderPhone = "+91 98765 43210",
            ReceiverName = "Meera Reddy",
            ReceiverPhone = "+91 99876 54321",
            PickupAddress = "42 Market Street, Hyderabad",
            DeliveryAddress = "88 Hitech City, Hyderabad",
            PackageType = "Food & Documents",
            Priority = "Express",
            Price = 349,
            TrackingNumber = "LBX-260529-7841",
            DeliveryPin = "4821",
            DriverName = "Ravi Kumar",
            DriverPhone = "+91 99887 77665",
            VehicleNumber = "TS09 EV 2048",
            VehicleLatitude = 17.4434,
            VehicleLongitude = 78.3772,
            CurrentStatus = "Out for Delivery",
            CreatedAtUtc = DateTime.UtcNow.AddMinutes(-55),
            EstimatedDeliveryAtUtc = DateTime.UtcNow.AddMinutes(18)
        };

        booking.TrackingEvents.AddRange(new[]
        {
            new TrackingEvent
            {
                Status = "Order Created",
                Message = "Pickup was scheduled from the sender location.",
                VehicleLatitude = 17.4325,
                VehicleLongitude = 78.4070,
                EventTimeUtc = DateTime.UtcNow.AddMinutes(-55)
            },
            new TrackingEvent
            {
                Status = "Driver Assigned",
                Message = "Ravi Kumar accepted the trip.",
                VehicleLatitude = 17.4350,
                VehicleLongitude = 78.4010,
                EventTimeUtc = DateTime.UtcNow.AddMinutes(-46)
            },
            new TrackingEvent
            {
                Status = "Package Picked Up",
                Message = "Parcel picked up and secured in the vehicle.",
                VehicleLatitude = 17.4395,
                VehicleLongitude = 78.3920,
                EventTimeUtc = DateTime.UtcNow.AddMinutes(-33)
            },
            new TrackingEvent
            {
                Status = "Out for Delivery",
                Message = "Driver is 3.2 km away and approaching the destination.",
                VehicleLatitude = booking.VehicleLatitude,
                VehicleLongitude = booking.VehicleLongitude,
                EventTimeUtc = DateTime.UtcNow.AddMinutes(-8)
            }
        });

        return dbContext.SeedAsync(booking);
    }
}