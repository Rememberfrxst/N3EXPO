import { useStorefront } from "@/hooks/useStorefront";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Order, Product } from "@/constants/data";
import { api, ApiCartItem, mapApiProduct } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export interface CartItem {
  product: Product;
  quantity: number;
  cartItemId?: string;
  variantId?: string;
  variantLabel?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (
    product: Product,
    options?: { variantId?: string; variantLabel?: string; quantity?: number },
  ) => Promise<void>;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  coupon: string;
  couponDiscount: number;
  applyCoupon: (
    code: string,
  ) =>
    Promise<"valid" | "invalid" | "already"> | "valid" | "invalid" | "already";
  removeCoupon: () => void;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  itemCount: number;
  orders: Order[];
  placeOrder: (
    paymentMethod: Order["paymentMethod"],
    address: Order["address"],
  ) => Promise<Order> | Order;
}

export const cartItemKey = (item: CartItem) =>
  item.cartItemId || `${item.product.id}:${item.variantId || ""}`;
function mapCartItem(item: ApiCartItem): CartItem & { cartItemId: string } {
  const product = mapApiProduct(item.product),
    modifier = Number(item.variant?.priceModifier || 0);
  return {
    cartItemId: item.id,
    variantId: item.variantId || undefined,
    variantLabel: item.variant
      ? `${item.variant.name}: ${item.variant.value}`
      : undefined,
    product: {
      ...product,
      price: product.price + modifier,
      originalPrice: product.originalPrice + modifier,
      stock: item.variant?.stock ?? product.stock,
    },
    quantity: item.quantity,
  };
}

function mapApiOrder(o: any): Order {
  return {
    id: o.id,
    items: (o.items ?? []).map((i: any) => ({
      productId: i.productId,
      name: i.product?.name ?? "",
      price: parseFloat(i.unitPrice) || 0,
      quantity: i.quantity,
      image: i.product?.images?.[0]?.url ?? "",
    })),
    total: parseFloat(o.total) || 0,
    status: o.status,
    date: o.createdAt,
    estimatedDelivery: o.estimatedDelivery ?? "",
    paymentMethod: o.paymentMethod as any,
    address: o.address
      ? {
          id: o.address.id,
          name: "",
          line1: o.address.line1,
          city: o.address.city,
          state: o.address.state,
          pincode: o.address.pincode,
          phone: "",
          isDefault: false,
        }
      : {
          id: "",
          name: "",
          line1: "",
          city: "",
          state: "",
          pincode: "",
          phone: "",
          isDefault: false,
        },
  };
}

const CartContext = createContext<CartContextType | null>(null);
const CART_KEY = "@griper_cart";
const ORDERS_KEY = "@griper_orders";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const store = useStorefront();
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        if (user) {
          const guestData = await AsyncStorage.getItem(CART_KEY);
          if (guestData) {
            const guestItems = JSON.parse(guestData) as CartItem[];
            const remaining: CartItem[] = [];
            for (const item of guestItems) {
              try {
                await api.cart.add(
                  item.product.id,
                  item.quantity,
                  item.variantId,
                );
              } catch {
                remaining.push(item);
              }
            }
            if (remaining.length)
              await AsyncStorage.setItem(CART_KEY, JSON.stringify(remaining));
            else await AsyncStorage.removeItem(CART_KEY);
          }
          const apiCart = await api.cart.get();
          if (apiCart && apiCart.items) {
            setItems(apiCart.items.map(mapCartItem));
            if ((apiCart as any).couponCode) {
              setCoupon((apiCart as any).couponCode);
              setCouponDiscount(0);
            }
          } else {
            setItems([]);
          }
          const apiOrders = await api.orders.list();
          setOrders(apiOrders.map(mapApiOrder));
        } else {
          const cartData = await AsyncStorage.getItem(CART_KEY);
          setItems(cartData ? (JSON.parse(cartData) as CartItem[]) : []);
          const ordersData = await AsyncStorage.getItem(ORDERS_KEY);
          setOrders(ordersData ? (JSON.parse(ordersData) as Order[]) : []);
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

  const addItem = useCallback(
    async (
      product: Product,
      options?: {
        variantId?: string;
        variantLabel?: string;
        quantity?: number;
      },
    ) => {
      const quantity = options?.quantity || 1;
      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > product.stock
      )
        throw new Error("The requested quantity is unavailable");
      if (user) {
        await api.cart.add(product.id, quantity, options?.variantId);
        const result = await api.cart.get();
        setItems(result.items.map(mapCartItem));
        return;
      }
      const key = `${product.id}:${options?.variantId || ""}`;
      const previous = items.find((i) => cartItemKey(i) === key);
      if ((previous?.quantity || 0) + quantity > product.stock)
        throw new Error("There are no more units available");
      setItems((prev) => {
        const existing = prev.find((i) => cartItemKey(i) === key);
        if ((existing?.quantity || 0) + quantity > product.stock) return prev;
        const updated = existing
          ? prev.map((i) =>
              cartItemKey(i) === key
                ? { ...i, quantity: i.quantity + quantity }
                : i,
            )
          : [
              ...prev,
              {
                product,
                quantity,
                variantId: options?.variantId,
                variantLabel: options?.variantLabel,
              },
            ];
        void saveCart(updated);
        return updated;
      });
    },
    [user, items],
  );

  const removeItem = useCallback(
    async (productId: string) => {
      const current = items.find(
        (i) =>
          cartItemKey(i) === productId ||
          (!i.variantId && i.product.id === productId),
      );
      if (user && current?.cartItemId) {
        try {
          await api.cart.remove(current.cartItemId);
          await loadCartFromApi();
        } catch (e) {
          console.error("Could not remove item", e);
        }
      } else {
        const updated = items.filter(
          (i) =>
            cartItemKey(i) !== productId &&
            (i.variantId || i.product.id !== productId),
        );
        setItems(updated);
        await saveCart(updated);
      }
    },
    [user, items],
  );
  const updateQuantity = useCallback(
    async (productId: string, qty: number) => {
      if (qty < 1) {
        await removeItem(productId);
        return;
      }
      const current = items.find(
        (i) =>
          cartItemKey(i) === productId ||
          (!i.variantId && i.product.id === productId),
      );
      if (!current || qty > current.product.stock) return;
      if (user && current.cartItemId) {
        try {
          await api.cart.update(current.cartItemId, qty);
          await loadCartFromApi();
        } catch (e) {
          console.error("Could not change quantity", e);
        }
      } else {
        const updated = items.map((i) =>
          cartItemKey(i) === productId ||
          (!i.variantId && i.product.id === productId)
            ? { ...i, quantity: qty }
            : i,
        );
        setItems(updated);
        await saveCart(updated);
      }
    },
    [user, items, removeItem],
  );

  const clearCart = useCallback(async () => {
    setItems([]);
    setCoupon("");
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

  const applyCoupon = useCallback(
    async (code: string) => {
      if (coupon) return "already" as const;
      if (!user) return "invalid" as const;
      try {
        const result = await api.cart.applyCoupon(code);
        setCoupon(result.code);
        setCouponDiscount(result.discount);
        return "valid" as const;
      } catch {
        return "invalid" as const;
      }
    },
    [coupon, user],
  );

  const removeCoupon = useCallback(() => {
    setCoupon("");
    setCouponDiscount(0);
  }, []);

  const subtotal = items.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0,
  );
  const deliveryFee =
    subtotal === 0 || subtotal >= store.freeShippingThreshold
      ? 0
      : store.deliveryFee;
  const discountAmount = Math.min(subtotal, couponDiscount);
  const total = subtotal + deliveryFee - discountAmount;
  useEffect(() => {
    if (!coupon || !user) return;
    let active = true;
    api.cart
      .applyCoupon(coupon)
      .then((r) => {
        if (active) setCouponDiscount(r.discount);
      })
      .catch(() => {
        if (active) {
          setCoupon("");
          setCouponDiscount(0);
        }
      });
    return () => {
      active = false;
    };
  }, [coupon, subtotal, user]);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const placeOrder = useCallback(
    async (
      paymentMethod: Order["paymentMethod"],
      address: Order["address"],
    ) => {
      if (user) {
        try {
          const res = await api.orders.place(
            address.id,
            paymentMethod,
            coupon || undefined,
          );
          const newOrder = mapApiOrder(res);
          setOrders((prev) => [newOrder, ...prev]);
          clearCart();
          return newOrder;
        } catch (err) {
          console.error("Failed to place order:", err);
          throw err;
        }
      } else {
        throw new Error("Please sign in to place an order");
      }
    },
    [items, total, clearCart, user, coupon],
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        coupon,
        couponDiscount,
        applyCoupon,
        removeCoupon,
        subtotal,
        deliveryFee,
        discountAmount,
        total,
        itemCount,
        orders,
        placeOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
