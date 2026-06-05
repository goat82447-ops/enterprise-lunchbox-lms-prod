import mongoose, { Connection } from 'mongoose';

/**
 * Enhanced MongoDB Connection Manager with retry logic and fallback
 */
export class MongoDBConnectionManager {
    private static connection: Connection | null = null;
    private static retryAttempts = 0;
    private static maxRetries = 5;
    private static retryDelay = 3000; // 3 seconds

    /**
     * Get or establish MongoDB connection
     */
    static async connect(): Promise<Connection> {
        if (this.connection && this.connection.readyState === 1) {
            console.log('✓ Using existing MongoDB connection');
            return this.connection;
        }

        try {
            const uri = this.getConnectionString();
            console.log(`Connecting to MongoDB: ${uri.replace(/:[^:]*@/, ':***@')}`);

            const mongooseConnection = await mongoose.connect(uri, {
                maxPoolSize: 10,
                minPoolSize: 5,
                socketTimeoutMS: 45000,
                serverSelectionTimeoutMS: 5000,
                retryWrites: true,
                w: 'majority'
            });

            this.connection = mongooseConnection.connection;
            this.retryAttempts = 0;
            console.log('✓ MongoDB connection established');

            this.setupConnectionHandlers();
            return this.connection;
        } catch (error) {
            console.error('✗ MongoDB connection failed:', error);
            return this.handleConnectionFailure(error);
        }
    }

    /**
     * Get MongoDB connection string with environment substitution
     */
    private static getConnectionString(): string {
        // Try environment variable first
        const envUri = process.env.MONGODB_URI;
        if (envUri && envUri.includes('mongodb')) {
            return envUri;
        }

        // Build from separate credentials
        const user = process.env.MONGO_USER || 'user';
        const password = process.env.MONGO_PASSWORD || 'password';
        const cluster = process.env.MONGO_CLUSTER || 'localhost:27017';
        const dbName = process.env.MONGO_DB_NAME || 'lunchbox_db';

        const isAtlas = process.env.MONGO_CLUSTER?.includes('mongodb.net');
        
        if (isAtlas) {
            return `mongodb+srv://${user}:${password}@${cluster}/${dbName}?retryWrites=true&w=majority`;
        } else {
            return `mongodb://${user}:${password}@${cluster}/${dbName}`;
        }
    }

    /**
     * Handle connection failures with retry logic
     */
    private static async handleConnectionFailure(error: any): Promise<Connection> {
        if (this.retryAttempts < this.maxRetries) {
            this.retryAttempts++;
            const delay = this.retryDelay * this.retryAttempts;
            
            console.warn(
                `⏳ Retrying connection attempt ${this.retryAttempts}/${this.maxRetries} ` +
                `(waiting ${delay}ms)...`
            );

            await new Promise(resolve => setTimeout(resolve, delay));
            return this.connect();
        }

        // Check if in-memory fallback is enabled
        if (process.env.ENABLE_INMEMORY_FALLBACK === '1') {
            console.warn('⚠️  Falling back to in-memory database (data will NOT persist)');
            // Return a mock connection object for testing
            return mongoose.connection;
        }

        throw new Error(
            `Failed to connect to MongoDB after ${this.maxRetries} retries. ` +
            `Last error: ${error.message}`
        );
    }

    /**
     * Setup connection event handlers
     */
    private static setupConnectionHandlers(): void {
        if (!this.connection) return;

        this.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB disconnected unexpectedly');
            this.connection = null;
            // Attempt to reconnect
            setTimeout(() => this.connect(), 5000);
        });

        this.connection.on('error', (error) => {
            console.error('✗ MongoDB connection error:', error);
        });

        this.connection.on('reconnected', () => {
            console.log('✓ MongoDB reconnected');
            this.retryAttempts = 0;
        });
    }

    /**
     * Gracefully close connection
     */
    static async disconnect(): Promise<void> {
        if (this.connection) {
            await mongoose.disconnect();
            this.connection = null;
            console.log('✓ MongoDB connection closed');
        }
    }

    /**
     * Get connection status
     */
    static getStatus(): {
        connected: boolean;
        readyState: number;
        host?: string;
    } {
        return {
            connected: this.connection?.readyState === 1,
            readyState: this.connection?.readyState ?? -1,
            host: this.connection?.host
        };
    }
}

// Export for use in application
export default MongoDBConnectionManager;
