const { Worker } = require('bullmq');
const IORedis = require('ioredis');

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = Number(process.env.REDIS_PORT || 6379);
const orderServiceInternalUrl = process.env.ORDER_SERVICE_INTERNAL_URL || 'http://localhost:3002';
const queueName = 'order-fulfillment';

const redisConnection = new IORedis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateOrderStatus(orderId, payload) {
  const response = await fetch(`${orderServiceInternalUrl}/internal/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed status update for ${orderId}: ${response.status} ${body}`);
  }
}

const worker = new Worker(queueName, async (job) => {
  const { orderId } = job.data;

  try {
    await updateOrderStatus(orderId, { status: 'confirmed', estimatedTime: 30 });
    await sleep(2000);

    await updateOrderStatus(orderId, { status: 'preparing', estimatedTime: 20 });
    await sleep(4000);

    await updateOrderStatus(orderId, { status: 'out_for_delivery', estimatedTime: 10 });
    await sleep(4000);

    await updateOrderStatus(orderId, { status: 'delivered', estimatedTime: 0 });

    return { orderId, completed: true };
  } catch (error) {
    await updateOrderStatus(orderId, {
      status: 'failed',
      errorMessage: error.message
    });
    throw error;
  }
}, {
  connection: redisConnection,
  concurrency: 2
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id || 'unknown'} failed`, err);
});

console.log('worker-service listening for order jobs');
