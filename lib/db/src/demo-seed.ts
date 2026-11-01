import { eq, inArray } from "drizzle-orm";
import { db, pool } from "./index";
import {
  banners,
  categories,
  coupons,
  productImages,
  products,
  productVariants,
  storeSettings,
} from "./schema";

const image = (id: string, width = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=82`;

const categorySeed = [
  [
    "Men",
    "men",
    "shirt-outline",
    "#2F4858",
    "photo-1617137968427-85924c800a22",
  ],
  [
    "Women",
    "women",
    "woman-outline",
    "#C95F7B",
    "photo-1483985988355-763728e1935b",
  ],
  [
    "Footwear",
    "footwear",
    "footsteps-outline",
    "#735751",
    "photo-1542291026-7eec264c27ff",
  ],
  [
    "Accessories",
    "accessories",
    "bag-handle-outline",
    "#8E6C88",
    "photo-1523779917675-b6ed3a42a561",
  ],
  [
    "Beauty",
    "beauty",
    "sparkles-outline",
    "#C98986",
    "photo-1596462502278-27bfdc403348",
  ],
  [
    "Smartphones",
    "smartphones",
    "phone-portrait-outline",
    "#526D82",
    "photo-1511707171634-5f897ff02aa9",
  ],
  [
    "Audio",
    "audio",
    "headset-outline",
    "#4D7C6F",
    "photo-1505740420928-5e560c06d30e",
  ],
  [
    "Home & Living",
    "home-living",
    "home-outline",
    "#A27752",
    "photo-1618221195710-dd6b41faaea6",
  ],
] as const;

type DemoProduct = {
  name: string;
  slug: string;
  category: string;
  brand: string;
  price: number;
  compareAt: number;
  photo: string;
  alternate?: string;
  featured?: boolean;
};

type DemoVariant = {
  name: string;
  value: string;
  priceModifier?: string;
};

const productSeed: DemoProduct[] = [
  {
    name: "Essential Oversized T-Shirt",
    slug: "demo-essential-oversized-tshirt",
    category: "men",
    brand: "Griper Studio",
    price: 799,
    compareAt: 1299,
    photo: "photo-1521572163474-6864f9cf17ab",
    featured: true,
  },
  {
    name: "Washed Denim Jacket",
    slug: "demo-washed-denim-jacket",
    category: "men",
    brand: "Northline",
    price: 2499,
    compareAt: 3499,
    photo: "photo-1551537482-f2075a1d41f2",
    featured: true,
  },
  {
    name: "Relaxed Utility Cargo",
    slug: "demo-relaxed-utility-cargo",
    category: "men",
    brand: "Urban Field",
    price: 1799,
    compareAt: 2599,
    photo: "photo-1517445312882-bc9910d016b7",
  },
  {
    name: "Premium Knit Polo",
    slug: "demo-premium-knit-polo",
    category: "men",
    brand: "Aster",
    price: 1399,
    compareAt: 1999,
    photo: "photo-1586790170083-2f9ceadc732d",
  },
  {
    name: "Everyday Zip Hoodie",
    slug: "demo-everyday-zip-hoodie",
    category: "men",
    brand: "Griper Basics",
    price: 1599,
    compareAt: 2299,
    photo: "photo-1556821840-3a63f95609a7",
  },

  {
    name: "Satin Evening Dress",
    slug: "demo-satin-evening-dress",
    category: "women",
    brand: "Elara",
    price: 2899,
    compareAt: 4199,
    photo: "photo-1566174053879-31528523f8ae",
    featured: true,
  },
  {
    name: "Linen Co-ord Set",
    slug: "demo-linen-coord-set",
    category: "women",
    brand: "Mysa",
    price: 2199,
    compareAt: 3199,
    photo: "photo-1539109136881-3be0616acf4b",
    featured: true,
  },
  {
    name: "Ribbed Crop Top",
    slug: "demo-ribbed-crop-top",
    category: "women",
    brand: "Griper Studio",
    price: 699,
    compareAt: 1099,
    photo: "photo-1503342217505-b0a15ec3261c",
  },
  {
    name: "High Rise Wide Leg Jeans",
    slug: "demo-wide-leg-jeans",
    category: "women",
    brand: "Indigo House",
    price: 1899,
    compareAt: 2699,
    photo: "photo-1541099649105-f69ad21f3246",
  },
  {
    name: "Soft Knit Cardigan",
    slug: "demo-soft-knit-cardigan",
    category: "women",
    brand: "Mysa",
    price: 1499,
    compareAt: 2199,
    photo: "photo-1434389677669-e08b4cac3105",
  },

  {
    name: "Street Court Sneakers",
    slug: "demo-street-court-sneakers",
    category: "footwear",
    brand: "Stride",
    price: 2299,
    compareAt: 3299,
    photo: "photo-1549298916-b41d501d3772",
    featured: true,
  },
  {
    name: "Aero Running Shoes",
    slug: "demo-aero-running-shoes",
    category: "footwear",
    brand: "Pace",
    price: 3499,
    compareAt: 4999,
    photo: "photo-1542291026-7eec264c27ff",
    featured: true,
  },
  {
    name: "Classic Penny Loafers",
    slug: "demo-classic-penny-loafers",
    category: "footwear",
    brand: "Borough",
    price: 2799,
    compareAt: 3999,
    photo: "photo-1614252369475-531eba835eb1",
  },
  {
    name: "Cloud Comfort Slides",
    slug: "demo-cloud-comfort-slides",
    category: "footwear",
    brand: "Drift",
    price: 899,
    compareAt: 1399,
    photo: "photo-1603487742131-4160ec999306",
  },
  {
    name: "Chelsea Ankle Boots",
    slug: "demo-chelsea-ankle-boots",
    category: "footwear",
    brand: "Borough",
    price: 3299,
    compareAt: 4799,
    photo: "photo-1608256246200-53e635b5b65f",
  },

  {
    name: "Structured Crossbody Bag",
    slug: "demo-structured-crossbody",
    category: "accessories",
    brand: "Miro",
    price: 1799,
    compareAt: 2599,
    photo: "photo-1584917865442-de89df76afd3",
    featured: true,
  },
  {
    name: "Retro Square Sunglasses",
    slug: "demo-retro-square-sunglasses",
    category: "accessories",
    brand: "Sol",
    price: 999,
    compareAt: 1599,
    photo: "photo-1511499767150-a48a237f0083",
  },
  {
    name: "Minimal Steel Watch",
    slug: "demo-minimal-steel-watch",
    category: "accessories",
    brand: "Noma",
    price: 2999,
    compareAt: 4499,
    photo: "photo-1524592094714-0f0654e20314",
  },
  {
    name: "City Day Backpack",
    slug: "demo-city-day-backpack",
    category: "accessories",
    brand: "Carry Co.",
    price: 1999,
    compareAt: 2999,
    photo: "photo-1553062407-98eeb64c6a62",
  },

  {
    name: "Vitamin C Glow Serum",
    slug: "demo-vitamin-c-serum",
    category: "beauty",
    brand: "Pure Edit",
    price: 749,
    compareAt: 999,
    photo: "photo-1620916566398-39f1143ab7be",
    featured: true,
  },
  {
    name: "Velvet Matte Lip Color",
    slug: "demo-velvet-matte-lip",
    category: "beauty",
    brand: "Muse",
    price: 599,
    compareAt: 899,
    photo: "photo-1586495777744-4413f21062fa",
  },
  {
    name: "No. 08 Eau de Parfum",
    slug: "demo-no08-perfume",
    category: "beauty",
    brand: "Atelier Eight",
    price: 1899,
    compareAt: 2799,
    photo: "photo-1541643600914-78b084683601",
  },

  {
    name: "iPhone 15 Pro",
    slug: "demo-iphone-15-pro",
    category: "smartphones",
    brand: "Apple",
    price: 129900,
    compareAt: 139900,
    photo: "photo-1695048133142-1a20484d2569",
    featured: true,
  },
  {
    name: "Galaxy S24 5G",
    slug: "demo-galaxy-s24",
    category: "smartphones",
    brand: "Samsung",
    price: 74999,
    compareAt: 84999,
    photo: "photo-1610945265064-0e34e5519bbf",
    featured: true,
  },
  {
    name: "Pixel 8",
    slug: "demo-pixel-8",
    category: "smartphones",
    brand: "Google",
    price: 62999,
    compareAt: 75999,
    photo: "photo-1598327105666-5b89351aff97",
  },

  {
    name: "WH-1000XM5 Headphones",
    slug: "demo-sony-xm5",
    category: "audio",
    brand: "Sony",
    price: 29990,
    compareAt: 34990,
    photo: "photo-1505740420928-5e560c06d30e",
    featured: true,
  },
  {
    name: "Studio True Wireless Buds",
    slug: "demo-wireless-buds",
    category: "audio",
    brand: "Sonic",
    price: 3999,
    compareAt: 5999,
    photo: "photo-1606220945770-b5b6c2c55bf1",
  },
  {
    name: "Portable Mini Speaker",
    slug: "demo-mini-speaker",
    category: "audio",
    brand: "Pulse",
    price: 2499,
    compareAt: 3499,
    photo: "photo-1608043152269-423dbba4e7e1",
  },

  {
    name: "Mushroom Table Lamp",
    slug: "demo-mushroom-table-lamp",
    category: "home-living",
    brand: "Casa Form",
    price: 1699,
    compareAt: 2499,
    photo: "photo-1507473885765-e6ed057f782c",
    featured: true,
  },
  {
    name: "Textured Cotton Cushion",
    slug: "demo-textured-cushion",
    category: "home-living",
    brand: "Casa Form",
    price: 699,
    compareAt: 999,
    photo: "photo-1584100936595-c0654b55a2e2",
  },
];

function variantsFor(product: DemoProduct): DemoVariant[] {
  if (["men", "women"].includes(product.category))
    return ["S", "M", "L", "XL"].map((value) => ({ name: "Size", value }));
  if (product.category === "footwear")
    return ["6", "7", "8", "9", "10"].map((value) => ({ name: "Size", value }));
  if (product.category === "smartphones")
    return ["128GB", "256GB"].map((value, index) => ({
      name: "Storage",
      value,
      priceModifier: index ? "10000" : "0",
    }));
  if (["audio", "accessories"].includes(product.category))
    return ["Black", "Sand"].map((value) => ({ name: "Color", value }));
  return [];
}

async function main() {
  console.log("Preparing complete demo catalog...");
  const categoryIds = new Map<string, string>();

  for (const [name, slug, icon, color, photo] of categorySeed) {
    const [category] = await db
      .insert(categories)
      .values({
        name,
        slug,
        icon,
        color,
        imageUrl: image(photo),
        sortOrder: categoryIds.size + 1,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          name,
          icon,
          color,
          imageUrl: image(photo),
          sortOrder: categoryIds.size + 1,
          isActive: true,
        },
      })
      .returning();
    categoryIds.set(slug, category.id);
  }

  const seededProducts = new Map<string, string>();
  for (const [index, item] of productSeed.entries()) {
    const values = {
      name: item.name,
      slug: item.slug,
      description: `${item.name} from ${item.brand}. Demo-ready product with selectable options, stock, wishlist, cart and checkout support.`,
      price: item.price.toFixed(2),
      compareAtPrice: item.compareAt.toFixed(2),
      categoryId: categoryIds.get(item.category),
      brand: item.brand,
      sku: `DEMO-${String(index + 1).padStart(3, "0")}`,
      stock: 35 + (index % 6) * 7,
      isActive: true,
      isFeatured: item.featured ?? index % 4 === 0,
      avgRating: (4.2 + (index % 7) / 10).toFixed(1),
      totalReviews: 18 + index * 3,
      totalSold: 220 - index * 4,
      specifications: {
        Brand: item.brand,
        Collection: "Demo collection",
        Availability: "In stock",
      },
      tags: ["demo", item.category, item.brand.toLowerCase()],
      updatedAt: new Date(),
    };
    const [product] = await db
      .insert(products)
      .values(values)
      .onConflictDoUpdate({ target: products.slug, set: values })
      .returning();
    seededProducts.set(item.slug, product.id);

    await db
      .delete(productImages)
      .where(eq(productImages.productId, product.id));
    await db.insert(productImages).values([
      {
        productId: product.id,
        url: image(item.photo),
        altText: item.name,
        isPrimary: true,
        sortOrder: 0,
      },
      {
        productId: product.id,
        url: image(item.alternate || item.photo, 1100),
        altText: `${item.name} detail`,
        isPrimary: false,
        sortOrder: 1,
      },
    ]);

    await db
      .delete(productVariants)
      .where(eq(productVariants.productId, product.id));
    const variants = variantsFor(item);
    if (variants.length)
      await db.insert(productVariants).values(
        variants.map((variant, variantIndex) => ({
          productId: product.id,
          name: variant.name,
          value: variant.value,
          priceModifier: variant.priceModifier || "0",
          stock: 12 + variantIndex * 3,
          sku: `DEMO-${String(index + 1).padStart(3, "0")}-${variantIndex + 1}`,
        })),
      );
  }

  const bannerTitles = [
    "THE NEW SEASON EDIT",
    "TECH THAT MOVES WITH YOU",
    "BEAUTY, EVERY DAY",
  ];
  await db.delete(banners).where(inArray(banners.title, bannerTitles));
  await db.insert(banners).values([
    {
      title: bannerTitles[0],
      subtitle: "Fresh silhouettes, standout layers and everyday essentials.",
      imageUrl: image("photo-1445205170230-053b83016050", 1400),
      linkType: "category",
      linkValue: "women",
      sortOrder: 0,
      isActive: true,
    },
    {
      title: bannerTitles[1],
      subtitle:
        "Phones and audio selected for work, play and everything between.",
      imageUrl: image("photo-1516321318423-f06f85e504b3", 1400),
      linkType: "category",
      linkValue: "smartphones",
      sortOrder: 1,
      isActive: true,
    },
    {
      title: bannerTitles[2],
      subtitle: "Small rituals, polished finishes and new signature scents.",
      imageUrl: image("photo-1596462502278-27bfdc403348", 1400),
      linkType: "category",
      linkValue: "beauty",
      sortOrder: 2,
      isActive: true,
    },
  ]);

  const demoCoupons = [
    {
      code: "DEMO10",
      discountType: "percentage" as const,
      discountValue: "10",
      minOrderValue: "999",
      maxDiscount: "750",
      isActive: true,
    },
    {
      code: "FIRST200",
      discountType: "fixed" as const,
      discountValue: "200",
      minOrderValue: "1499",
      maxDiscount: "200",
      isActive: true,
    },
    {
      code: "STYLE15",
      discountType: "percentage" as const,
      discountValue: "15",
      minOrderValue: "2499",
      maxDiscount: "1000",
      isActive: true,
    },
  ];
  for (const coupon of demoCoupons)
    await db
      .insert(coupons)
      .values(coupon)
      .onConflictDoUpdate({ target: coupons.code, set: coupon });

  await db
    .insert(storeSettings)
    .values({
      id: "storefront",
      data: {
        storeName: "Griper",
        announcement: "Demo store · 30 products · Use DEMO10 at checkout",
        supportEmail: "rememberfrxst@gmail.com",
        deliveryFee: 40,
        freeShippingThreshold: 999,
        returnsHeadline: "Easy returns & exchanges",
        aboutStore:
          "Explore a complete demo catalog across fashion, beauty, electronics and home.",
      },
    })
    .onConflictDoNothing();

  console.log(
    `Demo ready: ${categoryIds.size} categories, ${seededProducts.size} products, 3 banners and 3 coupons.`,
  );
  console.log("Coupons: DEMO10, FIRST200, STYLE15");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
