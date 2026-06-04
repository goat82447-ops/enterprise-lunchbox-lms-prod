const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const port = Number(process.env.PORT || 3002);

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = Number(process.env.REDIS_PORT || 6379);
const dbPath = process.env.ORDER_DB_FILE || './orders.json';
const queueName = 'order-fulfillment';

const redisConnection = new IORedis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: null
});

const orderQueue = new Queue(queueName, { connection: redisConnection });

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ orders: [] }, null, 2));
}

function readStore() {
  const raw = fs.readFileSync(dbPath, 'utf-8');
  const parsed = JSON.parse(raw || '{}');
  return {
    orders: Array.isArray(parsed.orders) ? parsed.orders : []
  };
}

function writeStore(store) {
  fs.writeFileSync(dbPath, JSON.stringify(store, null, 2));
}

function getOrderById(orderId) {
  const store = readStore();
  return store.orders.find((order) => order.id === orderId) || null;
}

function updateOrder(orderId, patch) {
  const store = readStore();
  const index = store.orders.findIndex((order) => order.id === orderId);
  if (index === -1) {
    return null;
  }

  const current = store.orders[index];
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString()
  };

  store.orders[index] = next;
  writeStore(store);
  return next;
}

function calculateTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
}

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ service: 'order-service', status: 'ok' });
});

app.post('/api/orders', async (req, res) => {
  try {
    const { userId, items, deliveryAddress } = req.body || {};

    if (!userId || !Array.isArray(items) || items.length === 0 || !deliveryAddress) {
      return res.status(400).json({ error: 'userId, items, and deliveryAddress are required.' });
    }

    const totalPrice = calculateTotal(items);
    const now = new Date().toISOString();
    const orderId = uuidv4();

    const store = readStore();
    const created = {
      id: orderId,
      userId,
      items,
      totalPrice,
      status: 'received',
      deliveryAddress,
      estimatedTime: 35,
      jobId: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now
    };
    store.orders.unshift(created);
    writeStore(store);

    const job = await orderQueue.add('fulfill-order', { orderId }, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: false,
      removeOnFail: false
    });

    const updated = updateOrder(orderId, {
      jobId: job.id,
      errorMessage: null
    });
    return res.status(201).json(updated);
  } catch (error) {
    console.error('create order error', error);
    return res.status(500).json({ error: 'Failed to create order.' });
  }
});

app.get('/api/orders/:orderId', (req, res) => {
  const order = getOrderById(req.params.orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  return res.json(order);
});

app.get('/api/orders', (req, res) => {
  const { userId } = req.query;
  const store = readStore();
  const rows = userId
    ? store.orders.filter((order) => order.userId === String(userId))
    : store.orders;

  return res.json(rows);
});

app.patch('/api/orders/:orderId', (req, res) => {
  const existing = getOrderById(req.params.orderId);
  if (!existing) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const allowedStatuses = new Set(['received', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'failed']);
  const nextStatus = req.body?.status;

  if (nextStatus && !allowedStatuses.has(nextStatus)) {
    return res.status(400).json({ error: 'Invalid order status.' });
  }

  const patch = {};
  if (nextStatus) {
    patch.status = nextStatus;
  }
  if (req.body?.estimatedTime !== undefined) {
    patch.estimatedTime = req.body.estimatedTime;
  }
  if (req.body?.errorMessage !== undefined) {
    patch.errorMessage = req.body.errorMessage;
  }

  const updated = updateOrder(req.params.orderId, patch);
  return res.json(updated);
});

app.patch('/internal/orders/:orderId/status', (req, res) => {
  const existing = getOrderById(req.params.orderId);
  if (!existing) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const allowedStatuses = new Set(['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'failed']);
  const { status, estimatedTime, errorMessage } = req.body || {};

  if (!status || !allowedStatuses.has(status)) {
    return res.status(400).json({ error: 'Valid status is required.' });
  }

  const patch = {
    status
  };
  if (estimatedTime !== undefined) {
    patch.estimatedTime = estimatedTime;
  }
  if (errorMessage !== undefined) {
    patch.errorMessage = errorMessage;
  }

  const updated = updateOrder(req.params.orderId, patch);
  return res.json(updated);
});

app.get('/api/jobs/:jobId', async (req, res) => {
  const job = await orderQueue.getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found.' });
  }

  const state = await job.getState();
  return res.json({
    id: job.id,
    name: job.name,
    state,
    attemptsMade: job.attemptsMade,
    data: job.data,
    failedReason: job.failedReason || null,
    returnValue: job.returnvalue || null
  });
});

app.listen(port, () => {
  console.log(`order-service listening on :${port}`);
});
