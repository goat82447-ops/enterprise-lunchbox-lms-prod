namespace ParcelService.Models;

public sealed class ParcelBooking
{
    public int Id { get; set; }

    public string TrackingNumber { get; set; } = string.Empty;

    public string SenderName { get; set; } = string.Empty;

    public string SenderPhone { get; set; } = string.Empty;

    public string ReceiverName { get; set; } = string.Empty;

    public string ReceiverPhone { get; set; } = string.Empty;

    public string PickupAddress { get; set; } = string.Empty;

    public string DeliveryAddress { get; set; } = string.Empty;

    public string PackageType { get; set; } = string.Empty;

    public string Priority { get; set; } = string.Empty;

    public decimal Price { get; set; }

    public string DeliveryPin { get; set; } = string.Empty;

    public string CurrentStatus { get; set; } = string.Empty;

    public string DriverName { get; set; } = string.Empty;

    public string DriverPhone { get; set; } = string.Empty;

    public string VehicleNumber { get; set; } = string.Empty;

    public double VehicleLatitude { get; set; }

    public double VehicleLongitude { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime EstimatedDeliveryAtUtc { get; set; }

    public List<TrackingEvent> TrackingEvents { get; set; } = new();
}