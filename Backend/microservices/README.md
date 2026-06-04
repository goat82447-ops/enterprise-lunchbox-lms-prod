# LunchBox Microservices Backend

This is a production-style backend for LunchBox Delivery using microservices:
- `api-gateway`: single entry point for frontend (`http://localhost:3000`)
- `menu-service`: static menu catalog
- `order-service`: order CRUD + durable queue enqueue
- `worker-service`: async order processing pipeline
- `redis`: durable queue broker

## Why this solves "session closed but remaining jobs should continue"

Order processing is asynchronous and durable:
- Frontend creates an order once.
- Order is stored in a durable JSON data file and queued in Redis (BullMQ).
- Worker runs independently from user sessions/browser tabs.
- If browser closes, queued/running jobs continue.
- If worker restarts, queued jobs are recovered from Redis.

## Quick Start

1. Install dependencies:
   ```powershell
   cd lunchbox-microservices
   npm install
   ```

2. Start all services:
   ```powershell
   npm run start
   ```

3. API endpoints:
   - `GET http://localhost:3000/api/menu`
   - `POST http://localhost:3000/api/orders`
   - `GET http://localhost:3000/api/orders/{orderId}`
   - `GET http://localhost:3000/api/jobs/{jobId}`

## Example Create Order Request

```json
{
  "userId": "user-1",
  "items": [
    { "menuItemId": "1", "name": "Pepperoni Pizza", "price": 12.99, "quantity": 2 }
  ],
  "deliveryAddress": "123 Main St, City, State 12345"
}
```

## Frontend Integration

Your existing Angular `OrderService` can keep using:
- `http://localhost:3000/api/orders`

No frontend architecture change is required.
