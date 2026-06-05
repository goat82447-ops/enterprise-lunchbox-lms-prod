using AuthService.Data;
using AuthService.Models;

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
builder.Services.AddSingleton<AuthDbContext>();

var app = builder.Build();

app.UseCors();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
    await AuthSeeder.SeedAsync(dbContext);
}

app.MapGet("/", () => Results.Ok(new
{
    service = "LunchBox Auth Service",
    version = "v1",
    endpoints = "/api/auth/demo-user, /api/auth/login, /api/auth/verify-pin"
}));

app.MapGet("/api/auth/demo-user", async (AuthDbContext dbContext) =>
{
    var account = await dbContext.GetFirstUserAsync();
    if (account is null)
    {
        return Results.NotFound(new { message = "User was not found." });
    }

    var user = new
    {
        account.Id,
        account.FullName,
        account.Email,
        account.MobileNumber,
        account.DefaultPickupAddress
    };

    return Results.Ok(user);
});

app.MapPost("/api/auth/login", async (LoginRequest request, AuthDbContext dbContext) =>
{
    var account = await dbContext.FindUserByCredentialsAsync(request.Email, request.Password);

    if (account is null)
    {
        return Results.Unauthorized();
    }

    account.LastLoginAtUtc = DateTime.UtcNow;
    account.LastIssuedPin = account.SecurityPin;
    await dbContext.ReplaceUserAsync(account);

    return Results.Ok(new LoginResponse(
        account.Id,
        account.FullName,
        account.Email,
        account.MobileNumber,
        account.DefaultPickupAddress,
        account.SecurityPin,
        "Login successful. Use the demo PIN to verify the parcel handoff."));
});

app.MapPost("/api/auth/verify-pin", async (VerifyPinRequest request, AuthDbContext dbContext) =>
{
    var account = await dbContext.FindUserByIdAsync(request.UserId);
    if (account is null)
    {
        return Results.NotFound(new { message = "User was not found." });
    }

    var isValid = string.Equals(account.SecurityPin, request.Pin, StringComparison.Ordinal);
    return Results.Ok(new PinVerificationResponse(
        account.Id,
        isValid,
        isValid ? "PIN verified. Driver can release the parcel." : "Incorrect PIN. Please try again."));
});

app.Run();
