import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  console.log('Seeding database...');

  // 1. Clear existing data in correct dependency order
  console.log('Clearing old data...');
  await db.delete(schema.cartItems);
  await db.delete(schema.carts);
  await db.delete(schema.orderItems);
  await db.delete(schema.orders);
  await db.delete(schema.wishlists);
  await db.delete(schema.reviews);
  await db.delete(schema.productImages);
  await db.delete(schema.productVariants);
  await db.delete(schema.products);
  await db.delete(schema.categories);
  await db.delete(schema.banners);
  await db.delete(schema.coupons);

  console.log('Seeding categories...');
  // 2. Seed Categories
  const seededCategories = await db.insert(schema.categories).values([
    {
      name: 'Smartphones',
      slug: 'smartphones',
      icon: 'cellphone',
      color: '#4F46E5',
      imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&q=80',
      sortOrder: 1,
    },
    {
      name: 'Laptops',
      slug: 'laptops',
      icon: 'laptop',
      color: '#0EA5E9',
      imageUrl: 'https://images.unsplash.com/photo-1496181130204-7552cc1524e2?w=500&q=80',
      sortOrder: 2,
    },
    {
      name: 'Audio',
      slug: 'audio',
      icon: 'headphones',
      color: '#10B981',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
      sortOrder: 3,
    },
    {
      name: 'Smartwatches',
      slug: 'smartwatches',
      icon: 'watch',
      color: '#F59E0B',
      imageUrl: 'https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=500&q=80',
      sortOrder: 4,
    },
  ]).returning();

  const [mobilesCat, laptopsCat, audioCat, watchCat] = seededCategories;

  console.log('Seeding products...');
  // 3. Seed Products
  const iphone = await db.insert(schema.products).values({
    name: 'iPhone 15 Pro Max',
    slug: 'iphone-15-pro-max',
    description: 'The ultimate iPhone featuring Titanium design, A17 Pro chip, and a customisable Action button.',
    price: '159900.00',
    compareAtPrice: '169900.00',
    categoryId: mobilesCat.id,
    brand: 'Apple',
    sku: 'IPHONE15PM-256-NAT',
    stock: 50,
    isFeatured: true,
    avgRating: '4.8',
    totalReviews: 2,
    specifications: {
      Display: '6.7-inch Super Retina XDR OLED',
      Processor: 'A17 Pro chip',
      Camera: '48MP Main + 12MP Ultra Wide + 12MP 5x Telephoto',
      Weight: '221g',
    },
    tags: ['iphone', 'apple', 'smartphone', 'mobile', 'ios'],
  }).returning();

  const macbook = await db.insert(schema.products).values({
    name: 'MacBook Air M3',
    slug: 'macbook-air-m3',
    description: 'Superlight. M3-powered. The MacBook Air is built for work and play, with up to 18 hours of battery life.',
    price: '114900.00',
    compareAtPrice: '119900.00',
    categoryId: laptopsCat.id,
    brand: 'Apple',
    sku: 'MACBOOKM3-8-256',
    stock: 30,
    isFeatured: true,
    avgRating: '4.9',
    totalReviews: 1,
    specifications: {
      Display: '13.6-inch Liquid Retina',
      Processor: 'Apple M3 chip (8-core CPU, 8-core GPU)',
      Memory: '8GB Unified Memory',
      Storage: '256GB SSD',
    },
    tags: ['macbook', 'apple', 'laptop', 'm3'],
  }).returning();

  const sonyHeadphones = await db.insert(schema.products).values({
    name: 'Sony WH-1000XM5',
    slug: 'sony-wh-1000xm5',
    description: 'Industry-leading noise-cancelling headphones with exceptional sound, call quality, and comfort.',
    price: '29990.00',
    compareAtPrice: '34990.00',
    categoryId: audioCat.id,
    brand: 'Sony',
    sku: 'SONYXM5-BLK',
    stock: 100,
    isFeatured: true,
    avgRating: '4.7',
    totalReviews: 1,
    specifications: {
      Type: 'Over-ear',
      'Battery Life': 'Up to 30 hours',
      Bluetooth: 'v5.2',
      'Noise Cancelling': 'Yes (Industry-leading)',
    },
    tags: ['sony', 'headphones', 'audio', 'anc', 'noise-cancelling'],
  }).returning();

  const galaxyWatch = await db.insert(schema.products).values({
    name: 'Galaxy Watch 6 Classic',
    slug: 'galaxy-watch-6-classic',
    description: 'Your wellness partner, featuring a rotating bezel, personalized heart rate zones, and advanced sleep coaching.',
    price: '36999.00',
    compareAtPrice: '42999.00',
    categoryId: watchCat.id,
    brand: 'Samsung',
    sku: 'GALAXYW6C-47-BLK',
    stock: 40,
    isFeatured: false,
    avgRating: '4.5',
    totalReviews: 0,
    specifications: {
      Display: '1.5-inch Super AMOLED',
      OS: 'Wear OS Powered by Samsung',
      Sensors: 'BioActive Sensor, Temperature, Accelerometer',
    },
    tags: ['samsung', 'galaxy', 'watch', 'smartwatch', 'wearos'],
  }).returning();

  console.log('Seeding product images...');
  // 4. Seed Product Images
  await db.insert(schema.productImages).values([
    // iPhone
    {
      productId: iphone[0].id,
      url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80',
      altText: 'iPhone 15 Pro Max Natural Titanium',
      isPrimary: true,
      sortOrder: 1,
    },
    {
      productId: iphone[0].id,
      url: 'https://images.unsplash.com/photo-1695048133031-64d84f4f46c6?w=800&q=80',
      altText: 'iPhone 15 Pro Max Side Titanium',
      isPrimary: false,
      sortOrder: 2,
    },
    // MacBook
    {
      productId: macbook[0].id,
      url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80',
      altText: 'MacBook Air M3 Space Grey',
      isPrimary: true,
      sortOrder: 1,
    },
    // Sony
    {
      productId: sonyHeadphones[0].id,
      url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
      altText: 'Sony WH-1000XM5 Studio',
      isPrimary: true,
      sortOrder: 1,
    },
    // Galaxy Watch
    {
      productId: galaxyWatch[0].id,
      url: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&q=80',
      altText: 'Galaxy Watch 6 Classic rotating bezel',
      isPrimary: true,
      sortOrder: 1,
    },
  ]);

  console.log('Seeding product variants...');
  // 5. Seed Product Variants
  await db.insert(schema.productVariants).values([
    // iPhone Colors
    {
      productId: iphone[0].id,
      name: 'Color',
      value: 'Natural Titanium',
      priceModifier: '0.00',
      stock: 25,
      sku: 'IPHONE15PM-256-NAT',
    },
    {
      productId: iphone[0].id,
      name: 'Color',
      value: 'Blue Titanium',
      priceModifier: '0.00',
      stock: 25,
      sku: 'IPHONE15PM-256-BLU',
    },
    // MacBook Storage
    {
      productId: macbook[0].id,
      name: 'Storage',
      value: '256GB SSD',
      priceModifier: '0.00',
      stock: 15,
      sku: 'MACBOOKM3-8-256',
    },
    {
      productId: macbook[0].id,
      name: 'Storage',
      value: '512GB SSD',
      priceModifier: '15000.00',
      stock: 15,
      sku: 'MACBOOKM3-8-512',
    },
  ]);

  console.log('Seeding banners...');
  // 6. Seed Banners
  await db.insert(schema.banners).values([
    {
      title: 'Mega Upgrade Sale',
      subtitle: 'Get up to 20% off on latest Smartphones & Accessories. Plus interest-free EMI.',
      imageUrl: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=1200&q=80',
      linkType: 'category',
      linkValue: mobilesCat.id,
      sortOrder: 1,
      isActive: true,
    },
    {
      title: 'Sound of Perfection',
      subtitle: 'Experience premium audio with premium noise cancellation. Starting ₹9,999.',
      imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=1200&q=80',
      linkType: 'product',
      linkValue: sonyHeadphones[0].id,
      sortOrder: 2,
      isActive: true,
    },
  ]);

  console.log('Seeding coupons...');
  // 7. Seed Coupons
  await db.insert(schema.coupons).values([
    {
      code: 'WELCOME100',
      discountType: 'fixed',
      discountValue: '100.00',
      minOrderValue: '500.00',
      isActive: true,
    },
    {
      code: 'FESTIVE10',
      discountType: 'percentage',
      discountValue: '10.00',
      minOrderValue: '1000.00',
      maxDiscount: '500.00',
      isActive: true,
    },
  ]);

  console.log('Seeding complete! 🚀');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
