export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  discount: number;
  rating: number;
  reviewCount: number;
  category: string;
  subcategory: string;
  seller: string;
  sellerId: string;
  stock: number;
  description: string;
  image: string;
  tags: string[];
  isExpress: boolean;
  specifications: Record<string, string>;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  color2: string;
}

export interface Address {
  id: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isDefault: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  addresses: Address[];
  role: 'user' | 'admin';
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
  date: string;
  estimatedDelivery: string;
  paymentMethod: 'razorpay' | 'upi' | 'cod';
  address: Address;
}

export interface SellerProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  sales: number;
  image: string;
}

export const CATEGORIES: Category[] = [];

export const PRODUCTS: Product[] = [];

export const SELLER_PRODUCTS: SellerProduct[] = [];

export const BANNERS: { id: string; image: any; title: string; subtitle: string; color: string }[] = [];

export const COUPONS: Record<string, number> = {};

export const formatPrice = (price: number): string => {
  return '₹' + price.toLocaleString('en-IN');
};
