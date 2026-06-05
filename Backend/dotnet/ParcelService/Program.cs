using ParcelService.Data;
using ParcelService.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddCors(options =>
{
	options.AddDefaultPolicy(policy =>
	{
		policy.AllowAnyOrigin()
			.AllowAnyHeader()
			.AllowAnyMethod();
	});
});
builder.Services.AddSingleton<ParcelDbContext>();

var app = builder.Build();

app.UseCors();

using (var scope = app.Services.CreateScope())
{
	var dbContext = scope.ServiceProvider.GetRequiredService<ParcelDbContext>();
	await ParcelSeeder.SeedAsync(dbContext);
}

app.MapGet("/", () => Results.Ok(new
{
	service = "LunchBox Parcel Service",
	version = "v1",
	endpoints = "/api/catalog, /api/bookings, /api/bookings/{id}, /api/bookings/{id}/tracking"
}));

app.MapGet("/api/catalog", () => Results.Ok(ParcelCatalog.Create()));

app.MapGet("/api/bookings", async (ParcelDbContext dbContext) =>
{
	var bookings = (await dbContext.GetBookingsAsync())
		.Select(BookingSummary.FromEntity)
		.ToList();

	return Results.Ok(bookings);
});

app.MapGet("/api/bookings/{id:int}", async (int id, ParcelDbContext dbContext) =>
{
	var booking = await dbContext.FindBookingByIdAsync(id);
	if (booking is null)
	{
		return Results.NotFound(new { message = "Booking not found." });
	}

	return Results.Ok(BookingDetails.FromEntity(booking));
});

app.MapPost("/api/bookings", async (CreateBookingRequest request, ParcelDbContext dbContext) =>
{
	var booking = new ParcelBooking
	{
		SenderName = request.SenderName,
		SenderPhone = request.SenderPhone,
		ReceiverName = request.ReceiverName,
		ReceiverPhone = request.ReceiverPhone,
		PickupAddress = request.PickupAddress,
		DeliveryAddress = request.DeliveryAddress,
		PackageType = request.PackageType,
		Priority = request.Priority,
		Price = request.Priority.Equals("Express", StringComparison.OrdinalIgnoreCase) ? 349 : 199,
		TrackingNumber = $"LBX-{DateTime.UtcNow:yyMMdd}-{Random.Shared.Next(1000, 9999)}",
		DeliveryPin = Random.Shared.Next(1000, 9999).ToString(),
		DriverName = "Ravi Kumar",
		DriverPhone = "+91 99887 77665",
		VehicleNumber = "TS09 EV 2048",
		VehicleLatitude = 17.4370,
		VehicleLongitude = 78.3962,
		CurrentStatus = "Driver Assigned",
		CreatedAtUtc = DateTime.UtcNow,
		EstimatedDeliveryAtUtc = DateTime.UtcNow.AddMinutes(42)
	};

	booking.TrackingEvents.Add(new TrackingEvent
	{
		Status = "Order Created",
		Message = "Pickup request confirmed. Driver assignment in progress.",
		VehicleLatitude = 17.4325,
		VehicleLongitude = 78.4070,
		EventTimeUtc = DateTime.UtcNow
	});

	booking.TrackingEvents.Add(new TrackingEvent
	{
		Status = "Driver Assigned",
		Message = "Ravi Kumar is heading to the pickup location.",
		VehicleLatitude = booking.VehicleLatitude,
		VehicleLongitude = booking.VehicleLongitude,
		EventTimeUtc = DateTime.UtcNow.AddMinutes(4)
	});

	await dbContext.CreateBookingAsync(booking);

	return Results.Created($"/api/bookings/{booking.Id}", BookingDetails.FromEntity(booking));
});

app.MapPost("/api/bookings/{id:int}/verify-pin", async (int id, VerifyDeliveryPinRequest request, ParcelDbContext dbContext) =>
{
	var booking = await dbContext.FindBookingByIdAsync(id);
	if (booking is null)
	{
		return Results.NotFound(new { message = "Booking not found." });
	}

	var isValid = string.Equals(booking.DeliveryPin, request.Pin, StringComparison.Ordinal);
	if (isValid)
	{
		booking.CurrentStatus = "Delivered";
		booking.TrackingEvents.Add(new TrackingEvent
		{
			Status = "Delivered",
			Message = "Parcel handed over successfully after PIN verification.",
			VehicleLatitude = booking.VehicleLatitude,
			VehicleLongitude = booking.VehicleLongitude,
			EventTimeUtc = DateTime.UtcNow
		});
		await dbContext.ReplaceBookingAsync(booking);
	}

	return Results.Ok(new DeliveryPinVerificationResponse(
		booking.Id,
		isValid,
		isValid ? "PIN verified. Delivery completed." : "Incorrect PIN. Please verify again."));
});

app.MapGet("/api/bookings/{id:int}/tracking", async (int id, ParcelDbContext dbContext) =>
{
	var booking = await dbContext.FindBookingByIdAsync(id);

	if (booking is null)
	{
		return Results.NotFound(new { message = "Booking not found." });
	}

	return Results.Ok(TrackingResponse.FromEntity(booking));
});

app.Run();
