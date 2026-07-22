import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { COUPONS, Order, Product } from '@/constants/data';
import { api, ApiCartItem, mapApiProduct } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export interface CartItem {
  product: Product;
  quantity: number;
  cartItemId?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  coupon: string;
  couponDiscount: number;
  applyCoupon: (code: string) => Promise<'valid' | 'invalid' | 'already'> | 'valid' | 'invalid' | 'already';
  removeCoupon: () => void;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  itemCount: number;
  orders: Order[];
  placeOrder: (paymentMethod: Order['paymentMethod'], address: Order['address']) => Promise<Order> | Order;
}

function mapCartItem(item: ApiCartItem): CartItem & { cartItemId: string } {
  return {
    cartItemId: item.id,
    product: mapApiProduct(item.product),
    quantity: item.quantity,
  };
}

function mapApiOrder(o: any): Order {
  return {
    id: o.id,
    items: (o.items ?? []).map((i: any) => ({
      productId: i.productId,
      name: i.product?.name ?? '',
      price: parseFloat(i.unitPrice) || 0,
      quantity: i.quantity,
      image: i.product?.images?.[0]?.url ?? '',
    })),
    total: parseFloat(o.total) || 0,
    status: o.status,
    date: o.createdAt,
    estimatedDelivery: o.estimatedDelivery ?? '',
    paymentMethod: o.paymentMethod as any,
    address: o.address ? {
      id: o.address.id,
      name: '',
      line1: o.address.line1,
      city: o.address.city,
      state: o.address.state,
      pincode: o.address.pincode,
      phone: '',
      isDefault: false,
    } : { id: '', name: '', line1: '', city: '', state: '', pincode: '', phone: '', isDefault: false },
  };
}

const CartContext = createContext<CartContextType | null>(null);
const CART_KEY = '@griper_cart';
const ORDERS_KEY = '@griper_orders';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        if (user) {
          const apiCart = await api.cart.get();
          if (apiCart && apiCart.items) {
            setItems(apiCart.items.map(mapCartItem));
            if ((apiCart as any).couponCode) {
              setCoupon((apiCart as any).couponCode);
              const pct = COUPONS[String((apiCart as any).couponCode).toUpperCase()] || 10;
              setCouponDiscount(pct);
            }
          } else {
            setItems([]);
          }
          const apiOrders = await api.orders.list();
          setOrders(apiOrders.map(mapApiOrder));
        } else {
          const cartData = await AsyncStorage.getItem(CART_KEY);
          if (cartData) setItems(JSON.parse(cartData) as CartItem[]);
          const ordersData = await AsyncStorage.getItem(ORDERS_KEY);
          if (ordersData) setOrders(JSON.parse(ordersData) as Order[]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [user]);

  const saveCart = async (newItems: CartItem[]) => {
    if (!user) {
      await AsyncStorage.setItem(CART_KEY, JSON.stringify(newItems));
    }
  };

  const saveOrders = async (newOrders: Order[]) => {
    if (!user) {
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(newOrders));
    }
  };

  const loadCartFromApi = async () => {
    try {
      const apiCart = await api.cart.get();
      if (apiCart && apiCart.items) {
        setItems(apiCart.items.map(mapCartItem));
      }
    } catch {}
  };

  const addItem = useCallback(async (product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      const updated = existing
        ? prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { product, quantity: 1 }];
      if (!user) saveCart(updated);
      return updated;
    });

    if (user) {
      try {
        await api.cart.add(product.id, 1);
        await loadCartFromApi();
      } catch (error) {
        console.error('Failed to add to cart:', error);
      }
    }
  }, [user]);

  const removeItem = useCallback(async (productId: string) => {
    let cartItemToRemove: CartItem | undefined;
    setItems(prev => {
      cartItemToRemove = prev.find(i => i.product.id === productId);
      const updated = prev.filter(i => i.product.id !== productId);
      if (!user) saveCart(updated);
      return updated;
    });

    if (user && cartItemToRemove?.cartItemId) {
      try {
        await api.cart.remove(cartItemToRemove.cartItemId);
        await loadCartFromApi();
      } catch (error) {
        console.error('Failed to remove item:', error);
      }
    }
  }, [user]);

  const updateQuantity = useCallback(async (productId: string, qty: number) => {
    if (qty <= 0) { removeItem(productId); return; }
    let cartItemToUpdate: CartItem | undefined;
    
    setItems(prev => {
      cartItemToUpdate = prev.find(i => i.product.id === productId);
      const updated = prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i);
      if (!user) saveCart(updated);
      return updated;
    });

    if (user && cartItemToUpdate?.cartItemId) {
      try {
        await api.cart.update(cartItemToUpdate.cartItemId, qty);
        await loadCartFromApi();
      } catch (error) {
        console.error('Failed to update quantity:', error);
      }
    }
  }, [user, removeItem]);

  const clearCart = useCallback(async () => {
    setItems([]);
    setCoupon('');
    setCouponDiscount(0);
    if (!user) {
      AsyncStorage.removeItem(CART_KEY);
    } else {
      try {
        await api.cart.clear();
      } catch (err) {
        console.error(err);
      }
    }
  }, [user]);

  const applyCoupon = useCallback(async (code: string) => {
    if (coupon) return 'already' as const;
    if (user) {
      try {
        const res = await api.cart.applyCoupon(code);
        if (res.discount !== undefined || res.code) {
          setCoupon(code.toUpperCase());
          const pct = COUPONS[code.toUpperCase()] || 10;
          setCouponDiscount(pct);
          return 'valid' as const;
        }
      } catch (err) {
        return 'invalid' as const;
      }
      return 'invalid' as const;
    } else {
      const pct = COUPONS[code.toUpperCase()];
      if (!pct) return 'invalid' as const;
      setCoupon(code.toUpperCase());
      setCouponDiscount(pct);
      return 'valid' as const;
    }
  }, [coupon, user]);

  const removeCoupon = useCallback(() => {
    setCoupon('');
    setCouponDiscount(0);
  }, []);

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const deliveryFee = subtotal >= 499 ? 0 : 40;
  const discountAmount = Math.round(subtotal * couponDiscount / 100);
  const total = subtotal + deliveryFee - discountAmount;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const placeOrder = useCallback(async (paymentMethod: Order['paymentMethod'], address: Order['address']) => {
    if (user) {
      try {
        const res = await api.orders.place(address.id, paymentMethod, coupon || undefined);
        const newOrder = mapApiOrder(res);
        setOrders(prev => [newOrder, ...prev]);
        clearCart();
        return newOrder;
      } catch (err) {
        console.error('Failed to place order:', err);
        throw err;
      }
    } else {
      const now = new Date();
      const estimated = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const order: Order = {
        id: 'ORD' + Date.now().toString().slice(-8),
        items: items.map(i => ({
          productId: i.product.id,
          name: i.product.name,
          price: i.product.price,
          quantity: i.quantity,
          image: i.product.image,
        })),
        total,
        status: paymentMethod === 'cod' ? 'confirmed' : 'confirmed',
        date: now.toISOString(),
        estimatedDelivery: estimated.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        paymentMethod,
        address,
      };
      setOrders(prev => {
        const updated = [order, ...prev];
        saveOrders(updated);
        return updated;
      });
      clearCart();
      return order;
    }
  }, [items, total, clearCart, user, coupon]);

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart,
      coupon, couponDiscount, applyCoupon, removeCoupon,
      subtotal, deliveryFee, discountAmount, total, itemCount,
      orders, placeOrder,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
