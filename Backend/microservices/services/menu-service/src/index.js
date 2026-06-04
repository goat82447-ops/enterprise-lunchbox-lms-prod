const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const port = Number(process.env.PORT || 3001);

const menuItems = [
  { id: '1', name: 'Pepperoni Pizza', description: 'Classic pepperoni and mozzarella', price: 12.99 },
  { id: '2', name: 'Veggie Supreme', description: 'Peppers, onions, olives, mushrooms', price: 11.49 },
  { id: '3', name: 'Chicken Burger', description: 'Grilled chicken with lettuce and cheese', price: 8.99 },
  { id: '4', name: 'Pasta Alfredo', description: 'Creamy Alfredo pasta with herbs', price: 10.99 },
  { id: '5', name: 'Caesar Salad', description: 'Crisp romaine with Caesar dressing', price: 7.49 },
  { id: '6', name: 'Chocolate Brownie', description: 'Warm brownie with chocolate drizzle', price: 4.99 }
];

app.use(cors());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ service: 'menu-service', status: 'ok' });
});

app.get('/api/menu', (_req, res) => {
  res.json(menuItems);
});

app.listen(port, () => {
  console.log(`menu-service listening on :${port}`);
});
