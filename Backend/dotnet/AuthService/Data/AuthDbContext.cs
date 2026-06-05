using AuthService.Models;
using MongoDB.Driver;

namespace AuthService.Data;

public sealed class AuthDbContext
{
    private readonly IMongoCollection<UserAccount> _users;

    public AuthDbContext(IConfiguration configuration)
    {
        var connectionString = configuration["MongoDb:ConnectionString"] ?? "mongodb://localhost:27017";
        var databaseName = configuration["MongoDb:DatabaseName"] ?? "lunchbox";

        var client = new MongoClient(connectionString);
        var database = client.GetDatabase(databaseName);
        _users = database.GetCollection<UserAccount>("users");

        var emailIndex = new CreateIndexModel<UserAccount>(
            Builders<UserAccount>.IndexKeys.Ascending(account => account.Email),
            new CreateIndexOptions { Unique = true });

        _users.Indexes.CreateOne(emailIndex);
    }

    public async Task<UserAccount?> GetFirstUserAsync()
        => await _users.Find(Builders<UserAccount>.Filter.Empty).FirstOrDefaultAsync();

    public async Task<UserAccount?> FindUserByCredentialsAsync(string email, string password)
        => await _users.Find(user => user.Email == email && user.Password == password).FirstOrDefaultAsync();

    public async Task<UserAccount?> FindUserByIdAsync(int id)
        => await _users.Find(user => user.Id == id).FirstOrDefaultAsync();

    public async Task<UserAccount?> FindUserByEmailAsync(string email)
        => await _users.Find(user => user.Email == email).FirstOrDefaultAsync();

    public Task ReplaceUserAsync(UserAccount account)
        => _users.ReplaceOneAsync(user => user.Id == account.Id, account);

    public async Task EnsureUserAsync(UserAccount account)
    {
        ArgumentNullException.ThrowIfNull(account);

        var existingUser = await FindUserByEmailAsync(account.Email);
        if (existingUser is not null)
        {
            account.Id = existingUser.Id;
            account.LastLoginAtUtc = existingUser.LastLoginAtUtc;
            await ReplaceUserAsync(account);
            return;
        }

        account.Id = await GetNextIdAsync();
        await _users.InsertOneAsync(account);
    }

    private async Task<int> GetNextIdAsync()
    {
        var lastUser = await _users
            .Find(Builders<UserAccount>.Filter.Empty)
            .SortByDescending(user => user.Id)
            .Limit(1)
            .FirstOrDefaultAsync();

        return (lastUser?.Id ?? 0) + 1;
    }
}
