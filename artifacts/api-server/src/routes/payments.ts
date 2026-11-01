import { Router } from "express";
import { db } from "@workspace/db";
import { orders, coupons } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import Razorpay from "razorpay";
import crypto from "crypto";

const router = Router();

// Initialize Razorpay only if keys are provided (prevent crash on startup)
let razorpay: Razorpay | null = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// 1. POST /api/payments/create-order — Create a Razorpay order
router.post("/create-order", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      res.status(400).json({ success: false, message: "orderId is required" });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    if (
      order.paymentMethod !== "razorpay" ||
      order.paymentStatus !== "pending"
    ) {
      res
        .status(400)
        .json({ success: false, message: "Invalid payment method or status" });
      return;
    }

    if (!razorpay) {
      res.status(503).json({ error: "Online payments are not configured" });
      return;
    }
    const amount = Math.round(parseFloat(order.total as string) * 100);

    const razorpayOrder = await razorpay.orders.create({
      amount: amount,
      currency: "INR",
      receipt: order.orderNumber || "",
      notes: { orderId: order.id, userId: userId },
    });

    await db
      .update(orders)
      .set({ razorpayOrderId: razorpayOrder.id })
      .where(eq(orders.id, orderId));

    res.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: amount,
      currency: "INR",
      orderId: order.id,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Error creating razorpay order:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// 2. POST /api/payments/verify — Verify Razorpay payment
router.post("/verify", requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !orderId
    ) {
      res.status(400).json({ success: false, message: "Missing parameters" });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      res.status(503).json({ error: "Online payments are not configured" });
      return;
    }
    const [matchingOrder] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
    if (
      !matchingOrder ||
      matchingOrder.razorpayOrderId !== razorpay_order_id ||
      matchingOrder.paymentMethod !== "razorpay"
    ) {
      res.status(400).json({ error: "Payment does not match this order" });
      return;
    }
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(body)
      .digest("hex");

    const isValid = expectedSig === razorpay_signature;

    if (!isValid) {
      res.status(400).json({ success: false, message: "Invalid signature" });
      return;
    }

    await db
      .update(orders)
      .set({
        paymentStatus: "paid",
        status: "confirmed",
        razorpayPaymentId: razorpay_payment_id,
      })
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));

    res.json({
      success: true,
      orderId: orderId,
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    console.error("Error verifying razorpay payment:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// 3. POST /api/payments/refund — Initiate refund
router.post("/refund", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      res.status(400).json({ success: false, message: "orderId is required" });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));

    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    if (!order.razorpayPaymentId || order.paymentStatus !== "paid") {
      res.status(400).json({
        success: false,
        message: "Invalid payment status or missing payment ID",
      });
      return;
    }

    if (!razorpay) {
      res.status(503).json({ error: "Online payments are not configured" });
      return;
    }
    const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
      amount: Math.round(parseFloat(order.total as string) * 100),
    });

    await db
      .update(orders)
      .set({
        paymentStatus: "refunded",
        status: "cancelled",
      })
      .where(eq(orders.id, orderId));

    res.json({
      success: true,
      refund,
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// 4. POST /api/payments/webhook — Razorpay webhook handler
router.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;
    if (!signature) {
      res.status(400).json({ success: false, message: "Missing signature" });
      return;
    }

    // In a real application, you would use req.rawBody or raw body parsing middleware.
    // For this example, we stringify req.body or validate string content.
    const bodyStr = JSON.stringify(req.body);
    const webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      process.env.RAZORPAY_KEY_SECRET ||
      "";

    if (!webhookSecret) {
      res.status(503).json({ error: "Payment webhook is not configured" });
      return;
    }
    const isValid = Razorpay.validateWebhookSignature(
      (req as any).rawBody || bodyStr,
      signature,
      webhookSecret,
    );

    if (!isValid) {
      res.status(400).json({ success: false, message: "Invalid signature" });
      return;
    }

    const event = req.body;
    const type = event.event;

    if (type === "payment.captured") {
      const payment = event.payload.payment.entity;
      const orderId = payment.notes?.orderId;
      if (orderId) {
        await db
          .update(orders)
          .set({
            paymentStatus: "paid",
            status: "confirmed",
          })
          .where(eq(orders.id, orderId));
      }
    } else if (type === "payment.failed") {
      const payment = event.payload.payment.entity;
      const orderId = payment.notes?.orderId;
      if (orderId) {
        await db
          .update(orders)
          .set({
            paymentStatus: "pending",
          })
          .where(eq(orders.id, orderId));
      }
    } else if (type === "refund.processed") {
      const refund = event.payload.refund.entity;
      const paymentId = refund.payment_id;
      if (paymentId) {
        await db
          .update(orders)
          .set({
            paymentStatus: "refunded",
          })
          .where(eq(orders.razorpayPaymentId, paymentId));
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

export default router;
