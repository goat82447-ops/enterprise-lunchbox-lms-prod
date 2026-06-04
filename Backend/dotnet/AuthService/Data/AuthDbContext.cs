using AuthService.Models;
using Microsoft.EntityFrameworkCore;

namespace AuthService.Data;

public sealed class AuthDbContext : DbContext
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options)
        : base(options)
    {
    }

    public DbSet<UserAccount> Users => Set<UserAccount>();
}
