namespace AuthService.Configuration;

/// <summary>
/// Manages database connection and fallback strategies
/// </summary>
public class DatabaseConfig
{
    public string Provider { get; set; } = "MongoDB";
    public string ConnectionString { get; set; } = "mongodb://localhost:27017/lunchbox_db";
    public bool EnableFallback { get; set; } = true;

    /// <summary>
    /// Validates and returns connection string with environment variable substitution
    /// </summary>
    public string GetResolvedConnectionString()
    {
        var connectionString = Environment.GetEnvironmentVariable("MONGO_CONNECTION_STRING") 
            ?? ConnectionString;

        // Support Atlas connection with separate credentials
        if (!connectionString.Contains("mongodb"))
        {
            var mongoUser = Environment.GetEnvironmentVariable("MONGO_USER") ?? "user";
            var mongoPassword = Environment.GetEnvironmentVariable("MONGO_PASSWORD") ?? "password";
            var mongoCluster = Environment.GetEnvironmentVariable("MONGO_CLUSTER") ?? "localhost:27017";
            
            connectionString = $"mongodb+srv://{mongoUser}:{mongoPassword}@{mongoCluster}/lunchbox_db?retryWrites=true&w=majority";
        }

        return connectionString;
    }

    public override string ToString() 
        => $"{Provider} | Fallback: {EnableFallback} | Local: {ConnectionString.Contains("localhost")}";
}
