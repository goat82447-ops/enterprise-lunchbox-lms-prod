export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  category: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'on-way' | 'delivered' | 'cancelled';
  deliveryAddress: string;
  estimatedTime: number;
  driverId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
}

export interface TrackingUpdate {
  orderId: string;
  status: string;
  latitude: number;
  longitude: number;
  estimatedArrivalTime: number;
  driverName: string;
  driverPhone: string;
}
