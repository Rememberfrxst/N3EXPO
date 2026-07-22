import { Router } from 'express';
import { db } from '@workspace/db';
import { orders, orderItems, cartItems, carts, products, productVariants, addresses } from '@workspace/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/orders — List user's orders
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const list = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, req.user.id))
      .orderBy(desc(orders.createdAt));

    res.json(list);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders/:id — Get order details
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { id } = req.params;

    const ordRows = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, req.user.id)))
      .limit(1);

    if (!ordRows.length) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const order = ordRows[0];

    const items = await db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        variantId: orderItems.variantId,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        totalPrice: orderItems.totalPrice,
        product: {
          name: products.name,
          slug: products.slug,
        }
      })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, id));

    res.json({ ...order, items });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orders — Place a new order
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }
    const { addressId, paymentMethod = 'cod' } = req.body;

    if (!addressId) {
      res.status(400).json({ error: 'addressId is required' });
      return;
    }

    // Verify address exists
    const addr = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, req.user.id)))
      .limit(1);
    
    if (!addr.length) {
      res.status(400).json({ error: 'Invalid shipping address' });
      return;
    }

    // Get user's cart
    const userCart = await db
      .select()
      .from(carts)
      .where(eq(carts.userId, req.user.id))
      .limit(1);
    
    if (!userCart.length) {
      res.status(400).json({ error: 'Cart is empty' });
      return;
    }

    // Get cart items with product details
    const items = await db
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        variantId: cartItems.variantId,
        quantity: cartItems.quantity,
        price: products.price,
        stock: products.stock,
        variantPriceModifier: productVariants.priceModifier,
        variantStock: productVariants.stock,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
      .where(eq(cartItems.cartId, userCart[0].id));

    if (!items.length) {
      res.status(400).json({ error: 'Cart has no items' });
      return;
    }

    // Validate stock and compute totals
    let subtotal = 0;
    for (const item of items) {
      const currentStock = item.variantId ? item.variantStock : item.stock;
      if (currentStock === null || currentStock === undefined || currentStock < item.quantity) {
        res.status(400).json({ error: 'Some items in your cart are out of stock' });
        return;
      }
      
      const price = parseFloat(item.price);
      const modifier = item.variantPriceModifier ? parseFloat(item.variantPriceModifier) : 0;
      subtotal += (price + modifier) * item.quantity;
    }

    const shippingFee = subtotal >= 500 ? 0 : 50;
    const total = subtotal + shippingFee;

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create Order (transaction recommended)
    const newOrder = await db.transaction(async (tx) => {
      const insertedOrder = await tx
        .insert(orders)
        .values({
          userId: req.user!.id,
          orderNumber,
          status: 'pending',
          subtotal: subtotal.toString(),
          shippingFee: shippingFee.toString(),
          total: total.toString(),
          paymentMethod,
          paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid', // simple placeholder
          shippingAddressId: addressId,
          estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        })
        .returning();

      const order = insertedOrder[0];

      // Add order items & update stock
      for (const item of items) {
        const price = parseFloat(item.price);
        const modifier = item.variantPriceModifier ? parseFloat(item.variantPriceModifier) : 0;
        const itemPrice = price + modifier;

        await tx.insert(orderItems).values({
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: itemPrice.toString(),
          totalPrice: (itemPrice * item.quantity).toString(),
        });

        // Deduct stock
        if (item.variantId) {
          await tx
            .update(productVariants)
            .set({ stock: item.variantStock! - item.quantity })
            .where(eq(productVariants.id, item.variantId));
        } else {
          await tx
            .update(products)
            .set({ stock: item.stock! - item.quantity })
            .where(eq(products.id, item.productId));
        }
      }

      // Clear Cart items
      await tx.delete(cartItems).where(eq(cartItems.cartId, userCart[0].id));

      return order;
    });

    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
