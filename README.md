<div align="center">

# griper.

**Your everyday, a little better.**

A shopping app for Android, iOS and web, with an owner-only Store Studio for running the catalog, campaigns and orders.

[Features](#features) · [Screenshots](#screenshots) · [Run locally](#run-locally) · [Android download](#android-download) · [Admin setup](#admin-setup)

</div>

## Screenshots

These are actual screenshots of the running application with the development catalog. Mobile captures use Expo web at a phone viewport; they are not Android device captures.

| Home                                                                                                       | Category                                                                                              | Product                                                                                                      | Me                                                                                                       |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| <img src="docs/screenshots/home.png" width="215" alt="Griper home with campaigns and product collections"> | <img src="docs/screenshots/category.png" width="215" alt="Category sidebar, search and product grid"> | <img src="docs/screenshots/product.png" width="215" alt="Product gallery, pricing and shopping bag actions"> | <img src="docs/screenshots/me.png" width="215" alt="Personal account, wishlist, orders and preferences"> |

[Reference analysis and screen mapping](docs/reference-analysis.md)

<details>
<summary>Product delivery, options and description layout</summary>

<img src="docs/screenshots/product-details.png" width="300" alt="Product quantity, delivery and return details, and description">

</details>

### Store Studio

Google Fonts **Source Sans 3** for the interface and **Source Serif 4** for editorial headings, with responsive navigation, accessible product forms and a restrained green palette.

![Store Studio overview](docs/screenshots/admin-overview.png)

<details>
<summary>Catalog, campaigns and mobile admin screenshots</summary>

![Product management](docs/screenshots/admin-products.png)
![Scheduled banners and events](docs/screenshots/admin-campaigns.png)
<img src="docs/screenshots/admin-mobile.png" width="300" alt="Responsive Store Studio navigation and dashboard">

</details>

## Features

### Shopping app

- Reference-based Home: full-width scheduled campaigns, department tabs, category tiles, collection strips, New Arrivals / Best Sellers, featured offers and a compact recommendation feed.
- **Category** replaces the old Search tab. Browse departments and subcategories with a text sidebar and image tiles; search the live catalog, sort/filter collections and load more results.
- Product detail: full-width image gallery and fullscreen viewer, orange pricing, active coupon terms, stocked size/product options, quantity controls, delivery/policy links, specifications and stored customer reviews.
- Saved products, a guest bag, signed-in cart synchronization and delivery addresses.
- Me / My Account: editable profile, orders/refunds, wishlist, coupons, addresses, notifications, grouped policy links, preferences and customer care.
- Checkout: cash on delivery, server-calculated shipping and fixed/percentage coupons. Order creation, coupon usage and inventory changes are atomic.
- Bottom navigation follows the references: Shop, Category, Fresh Fits, Cart and Me. Light/dark theme support and Google Sans typography.

### Owner administration

- Server-enforced owner email access, bcrypt password storage and rate-limited login.
- Create/edit/archive products with multiple image URLs, optional direct image uploads, stocked sizes/options, specifications, original/selling prices and home-page featuring.
- Create/edit/archive categories and subcategories; control the parent department, order, color and cover image.
- Schedule banners and events with start/end dates and product, category or website destinations.
- Create/edit/archive coupons with validity dates, minimum spend, maximum discount and redemption limits.
- Review orders, update fulfillment/payment status, inspect items and print order details.
- Manage customer/seller access and account verification. Customer administration cannot grant another owner account.
- Revenue, order, account and low-stock metrics; payment records; CSV summary export; audit history.
- Store name, home announcement, shipping fees, free-delivery threshold, support address, app download link and customer policy content all come from persisted admin settings.

Archived products/content remain in the database to preserve historical order references. Refresh a screen to pick up catalog changes; shared storefront settings also refresh periodically.

## Frameworks and architecture

| Layer                       | Technology                                                        |
| --------------------------- | ----------------------------------------------------------------- |
| Mobile and web storefront   | React Native 0.81, Expo SDK 54, Expo Router, React 19, TypeScript |
| Mobile state/data           | React Context, AsyncStorage, TanStack Query                       |
| Admin website               | React 19, Vite 7, TypeScript, Lucide icons                        |
| API                         | Express 5, Node.js 24, JWT authentication, bcrypt                 |
| Database                    | PostgreSQL, Drizzle ORM and SQL migrations                        |
| Optional image storage      | Amazon S3 with presigned uploads                                  |
| Optional online payment API | Razorpay; credentials and webhooks required                       |
| Workspace                   | pnpm workspaces                                                   |

```text
artifacts/mobile/       Expo app: Android, iOS and web
artifacts/admin-web/    Owner Store Studio
artifacts/api-server/   Express API and integration tests
lib/db/                 Schema, migrations and sample catalog
lib/api-spec/           Existing OpenAPI/auth code generation
lib/api-client-react/   Generated client package
scripts/                Workspace helpers
.github/workflows/      Checks and Android APK build
```

The admin and app use the same API/database. Admin content is not browser-only state. The OpenAPI file currently describes the original auth contract; the hand-written storefront/admin clients cover the additional routes.

## Run locally

Use Node.js 24, pnpm 11.25 and PostgreSQL 17.

```bash
pnpm install --frozen-lockfile
cp artifacts/api-server/.env.example artifacts/api-server/.env
```

Set your API `.env` values: `DATABASE_URL`, `JWT_SECRET`, `REFRESH_SECRET`, `PORT` and allowed browser origins. Do not commit runtime credentials. The generated native projects and private environment files are ignored.

Apply the schema to a **new development database**:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/griper pnpm --filter @workspace/db run push
```

For a migration-managed database, apply the SQL migrations under `lib/db/drizzle/` in journal order using your migration process. `0001_store_settings.sql` also covers earlier audit/2FA schema additions and tolerates those objects already existing. Back up existing data before production schema changes.

Complete demo catalog (30 products, eight categories, variants, banners and coupons):

```bash
pnpm --filter @workspace/api-server run seed-demo
```

The command reads the API `.env`, updates only records carrying the demo slugs/codes and can be run again without creating duplicates. It preserves customer accounts, carts, orders and owner-created catalog records.

Start the API and admin in separate terminals from the repository root:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/admin-web run dev
```

API: `http://localhost:3000/api` · Store Studio: `http://localhost:5173`. The Vite dev proxy forwards `/api` to port 3000. For production admin hosting, configure the same `/api` reverse proxy to your deployed Express server; the Vite development server is not a production backend.

Start Expo from `artifacts/mobile`:

```bash
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3000/api pnpm exec expo start --lan
```

Use Expo Go on the same network, an emulator, or press `w` for web. For browser-only local development, `EXPO_PUBLIC_API_URL=http://localhost:3000/api` works. Never embed admin passwords, JWT secrets, database URLs or AWS credentials in `EXPO_PUBLIC_*` variables.

## Admin setup

The default owner is **rememberfrxst@gmail.com**. Provision that account explicitly against your selected database. The password supplied by the owner is never included in this repository or the mobile/admin bundle.

```bash
# Bash: enter the password privately, without saving it in shell history.
read -rs -p 'Owner password: ' ADMIN_PASSWORD
export ADMIN_PASSWORD
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/griper'
pnpm --filter @workspace/api-server run provision-owner
unset ADMIN_PASSWORD
```

The command creates or updates the owner's bcrypt hash. Repeat it to rotate the password. If overriding `ADMIN_EMAIL`, use the same value for both provisioning and the API runtime. Public registration cannot claim the owner email. A customer token or a different account with an `admin` role cannot access the owner API.

The requested owner credentials have been provisioned only in the isolated development environment used for these screenshots. Provision them separately on your production database.

## Android download

**An installable APK has not been published yet. A public HTTPS backend URL is required to create a build that can reach the live store.**

[Open Android APK builds / download completed build artifacts](https://github.com/Rememberfrxst/N3EXPO/actions/workflows/android-apk.yml)

After the workflow is present on the default branch:

1. Open **Actions → Android APK → Run workflow**.
2. Enter the deployed API base URL, including `/api`.
3. When the build succeeds, download the **griper-android-preview** artifact and extract `griper-android-preview.apk`.
4. Install the APK on Android. This is an installable preview using generated development signing, not a Play Store production release. Artifacts are retained for 30 days and require GitHub sign-in to download.
5. To offer a permanent download to customers, publish a properly signed APK/release or app-store listing, then set its real URL in **Store Studio → Store settings → App download link**. It will appear in Me.

`artifacts/mobile/eas.json` also provides an internal APK preview profile and a production Android App Bundle profile for Expo EAS. Configure an Expo project, credentials and `EXPO_PUBLIC_API_URL` before using EAS. A production release needs a maintained signing key; Android package ID is `com.griper.shop`.

## Verification

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/admin-web run build
cd artifacts/mobile && pnpm exec expo export --platform web
```

Integration tests require an isolated, schema-initialized database whose name ends in `_test`:

```bash
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/griper_test \
  pnpm --filter @workspace/api-server run test
```

The test exercises owner login, customer/non-owner access denial, product/image/option editing, category hierarchy and cycle validation, banner schedules, public coupon availability, redemption limits, shipping/policy settings, profile editing, variant checkout, inventory rollback, order status updates and archival. It creates fixture records and must not run against production. GitHub Actions runs these checks with a disposable PostgreSQL service.

Browser verification covers the mobile shopping flow and admin login/create/edit/archive flows, along with a narrow admin viewport. Screenshots are stored in `docs/screenshots/`.

## Deployment notes

Host the Express API with PostgreSQL and persistent runtime secrets; serve admin build output through a host that forwards `/api` correctly. Set explicit allowed origins and expose the API over HTTPS for physical devices. S3 uploads need a configured bucket and CORS; hosted image URLs work without S3. Razorpay and delivery-provider integrations require separate production configuration. Cash on delivery is the current app checkout option. Changing an order payment flag records your administrative decision; it does not move money or issue a gateway refund.
