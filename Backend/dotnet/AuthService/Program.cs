using AuthService.Data;
using AuthService.Models;
using Microsoft.EntityFrameworkCore;

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
builder.Services.AddDbContext<AuthDbContext>(options =>
    options.UseSqlite($"Data Source={Path.Combine(builder.Environment.ContentRootPath, "auth.db")}"));

var app = builder.Build();

app.UseCors();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
    dbContext.Database.EnsureCreated();
    AuthSeeder.Seed(dbContext);
}

app.MapGet("/", () => Results.Ok(new
{
    service = "LunchBox Auth Service",
    version = "v1",
    endpoints = "/api/auth/demo-user, /api/auth/login, /api/auth/verify-pin"
}));

app.MapGet("/api/auth/demo-user", async (AuthDbContext dbContext) =>
{
    var user = await dbContext.Users
        .AsNoTracking()
        .Select(account => new
        {
            account.Id,
            account.FullName,
            account.Email,
            account.MobileNumber,
            account.DefaultPickupAddress
        })
        .FirstAsync();

    return Results.Ok(user);
});

app.MapPost("/api/auth/login", async (LoginRequest request, AuthDbContext dbContext) =>
{
    var account = await dbContext.Users.FirstOrDefaultAsync(user =>
        user.Email == request.Email && user.Password == request.Password);

    if (account is null)
    {
        return Results.Unauthorized();
    }

    account.LastLoginAtUtc = DateTime.UtcNow;
    account.LastIssuedPin = account.SecurityPin;
    await dbContext.SaveChangesAsync();

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
    var account = await dbContext.Users.FirstOrDefaultAsync(user => user.Id == request.UserId);
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
