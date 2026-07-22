import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import cartRouter from "./cart";
import wishlistRouter from "./wishlist";
import addressesRouter from "./addresses";
import ordersRouter from "./orders";
import bannersRouter from "./banners";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";
import sellerRouter from "./seller";
import recommendationsRouter from "./recommendations";
import paymentsRouter from "./payments";
import uploadsRouter from "./uploads";

const router: IRouter = Router();

router.use(healthRouter);
router.use('/auth', authRouter);
router.use('/products', productsRouter);
router.use('/categories', categoriesRouter);
router.use('/cart', cartRouter);
router.use('/wishlist', wishlistRouter);
router.use('/addresses', addressesRouter);
router.use('/orders', ordersRouter);
router.use('/banners', bannersRouter);
router.use('/notifications', notificationsRouter);
router.use('/admin', adminRouter);
router.use('/seller', sellerRouter);
router.use('/recommendations', recommendationsRouter);
router.use('/payments', paymentsRouter);
router.use('/uploads', uploadsRouter);

export default router;
