import bcrypt from "bcryptjs";
import { closeDatabase, db } from "@workspace/db";
import {
  banners,
  categories,
  coupons,
  productImages,
  products,
  productVariants,
  storeSettings,
  users,
} from "@workspace/db/schema";
import { DEFAULT_STOREFRONT } from "./lib/storefront";

if (
  process.env.GRIPER_LOCAL_MODE !== "1" ||
  process.env.NODE_ENV === "production"
)
  throw new Error(
    "This setup command requires the development-only local launcher.",
  );

async function seedCatalog() {
  await db.transaction(async (tx) => {
    const marker = await tx
      .insert(storeSettings)
      .values({ id: "local_catalog_v1", data: {} })
      .onConflictDoNothing()
      .returning();
    if (!marker.length) return;
    const collections = [
      [
        "Smartphones",
        "smartphones",
        "cellphone",
        "#4F46E5",
        "photo-1511707171634-5f897ff02aa9",
      ],
      [
        "Laptops",
        "laptops",
        "laptop",
        "#0EA5E9",
        "photo-1496181130204-7552cc1524e2",
      ],
      [
        "Audio",
        "audio",
        "headphones",
        "#10B981",
        "photo-1505740420928-5e560c06d30e",
      ],
      [
        "Smartwatches",
        "smartwatches",
        "watch",
        "#F59E0B",
        "photo-1542496658-e33a6d0d50f6",
      ],
      [
        "Clothing",
        "clothing",
        "tshirt-crew",
        "#DB2777",
        "photo-1521572163474-6864f9cf17ab",
      ],
    ];
    const image = (key: string) =>
      `https://images.unsplash.com/${key}?w=900&q=80`;
    const catalog = await tx
      .insert(categories)
      .values(
        collections.map(([name, slug, icon, color, cover], sortOrder) => ({
          name,
          slug,
          icon,
          color,
          imageUrl: image(cover),
          sortOrder,
        })),
      )
      .returning();
    const samples = [
      {
        name: "iPhone 15 Pro Max",
        price: "159900",
        compareAtPrice: "169900",
        category: 0,
        image: "photo-1592750475338-74b7b21085ab",
      },
      {
        name: "Samsung Galaxy S24",
        price: "74999",
        compareAtPrice: "84999",
        category: 0,
        image: "photo-1511707171634-5f897ff02aa9",
      },
      {
        name: "MacBook Air M3",
        price: "114900",
        compareAtPrice: "119900",
        category: 1,
        image: "photo-1517336714731-489689fd1ca8",
      },
      {
        name: "Everyday Notebook",
        price: "45990",
        compareAtPrice: "49990",
        category: 1,
        image: "photo-1496181130204-7552cc1524e2",
      },
      {
        name: "Sony WH-1000XM5",
        price: "29990",
        compareAtPrice: "34990",
        category: 2,
        image: "photo-1505740420928-5e560c06d30e",
      },
      {
        name: "Wireless Headphones",
        price: "3999",
        compareAtPrice: "5999",
        category: 2,
        image: "photo-1546435770-a3e426bf472b",
      },
      {
        name: "Samsung Galaxy Watch",
        price: "36999",
        compareAtPrice: "39999",
        category: 3,
        image: "photo-1546868871-7041f2a55e12",
      },
      {
        name: "Everyday Cotton T-Shirt",
        price: "599",
        compareAtPrice: "999",
        category: 4,
        image: "photo-1521572163474-6864f9cf17ab",
      },
    ];
    for (const [index, sample] of samples.entries()) {
      const [product] = await tx
        .insert(products)
        .values({
          name: sample.name,
          slug: `local-${sample.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          price: sample.price,
          compareAtPrice: sample.compareAtPrice,
          categoryId: catalog[sample.category].id,
          stock: 20,
          isFeatured: true,
          description:
            "Sample product for local shopping and order testing. Edit or archive it in Store Studio.",
          specifications: { Collection: catalog[sample.category].name },
          tags: ["local-sample"],
          totalSold: index,
        })
        .returning();
      await tx
        .insert(productImages)
        .values({
          productId: product.id,
          url: image(sample.image),
          isPrimary: true,
        });
      if (sample.category === 4)
        await tx
          .insert(productVariants)
          .values(
            ["S", "M", "L"].map((value, i) => ({
              productId: product.id,
              name: "Size",
              value,
              stock: 5,
              priceModifier: i === 2 ? "100" : "0",
            })),
          );
    }
    await tx.insert(banners).values([
      {
        title: "Your local store",
        subtitle: "Explore sample products, then add your own in Store Studio.",
        imageUrl: image("photo-1511707171634-5f897ff02aa9"),
        linkType: "category",
        linkValue: "smartphones",
        sortOrder: 0,
      },
      {
        title: "Everyday essentials",
        subtitle: "Browse the collection and test your shopping flow.",
        imageUrl: image("photo-1505740420928-5e560c06d30e"),
        linkType: "category",
        linkValue: "audio",
        sortOrder: 1,
      },
    ]);
    await tx
      .insert(coupons)
      .values({
        code: "LOCAL10",
        discountType: "percentage",
        discountValue: "10",
        minOrderValue: "500",
        maxDiscount: "500",
      });
    await tx
      .insert(storeSettings)
      .values({
        id: "storefront",
        data: {
          ...DEFAULT_STOREFRONT,
          announcement: "Local testing store · Orders stay on this computer.",
          aboutStore:
            "This store runs on your own computer for development and testing. Orders are local test records.",
        },
      })
      .onConflictDoNothing();
    console.log(
      "Sample catalog created. It will not be reset on subsequent starts.",
    );
  });
}

try {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 12)
    throw new Error("Choose an owner password of at least 12 characters.");
  const email = (process.env.ADMIN_EMAIL || "rememberfrxst@gmail.com")
    .trim()
    .toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  await db
    .insert(users)
    .values({
      name: "Store owner",
      email,
      passwordHash,
      role: "admin",
      isVerified: true,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash,
        role: "admin",
        isVerified: true,
        updatedAt: new Date(),
      },
    });
  await seedCatalog();
  console.log(`Local owner ready: ${email}. Password stored as a bcrypt hash.`);
} finally {
  await closeDatabase();
}
