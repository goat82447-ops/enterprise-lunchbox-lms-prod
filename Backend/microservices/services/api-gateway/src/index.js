const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = Number(process.env.PORT || 3000);

const menuServiceUrl = process.env.MENU_SERVICE_URL || 'http://localhost:3001';
const orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3002';
const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3003';

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ service: 'api-gateway', status: 'ok' });
});

app.use('/api/menu', createProxyMiddleware({
  target: menuServiceUrl,
  changeOrigin: true,
  pathRewrite: { '^/api/menu': '/api/menu' }
}));

app.use('/api/orders', createProxyMiddleware({
  target: orderServiceUrl,
  changeOrigin: true,
  pathRewrite: { '^/api/orders': '/api/orders' }
}));

app.use('/api/jobs', createProxyMiddleware({
  target: orderServiceUrl,
  changeOrigin: true,
  pathRewrite: { '^/api/jobs': '/api/jobs' }
}));

app.use('/api/auth', createProxyMiddleware({
  target: authServiceUrl,
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '/api/auth' }
}));

app.listen(port, () => {
  console.log(`api-gateway listening on :${port}`);
});
