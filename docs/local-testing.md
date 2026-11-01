# Run the complete store on your Linux computer

You can test the app, owner admin and order flow without installing PostgreSQL, Docker or using a cloud account. This mode uses **PGlite**, an embedded PostgreSQL engine inside Node.js. It is real local data storage, not an empty/mock API. Data persists on your computer.

The repository currently supports **Linux x86_64**. Use **Node.js 24** and **pnpm 11.25.0**. Check `node --version` and `uname -m` (`x86_64`). If pnpm is missing:

```bash
npm install -g pnpm@11.25.0
```

## First run

From a terminal, download the repository and enter its root folder:

```bash
git clone https://github.com/Rememberfrxst/N3EXPO.git
cd N3EXPO
pnpm install --frozen-lockfile
pnpm local:setup
```

If you already have the repository, update it to the version containing these commands and run them from the repository root.

Setup asks for your owner password without echoing it. Choose at least 12 characters. The owner email is **rememberfrxst@gmail.com**. Passwords are stored as bcrypt hashes. Setup creates the schema, stable local signing secrets, eight sample products, category/banner records and the `LOCAL10` test coupon. It creates the samples only once. Running setup again changes the owner password and preserves your edited/archived products, settings, users and orders.

Then start all three services:

```bash
pnpm local
```

| Service            | Default address                                       |
| ------------------ | ----------------------------------------------------- |
| Owner Store Studio | `http://localhost:5173`                               |
| Backend health     | `http://localhost:3000/api/healthz`                   |
| App web preview    | Press **w** in the Expo terminal; default port `8081` |
| Phone app          | Scan the Expo QR using SDK 54-compatible Expo Go      |

The launcher shows your computer's LAN API address. Stop the services with **Ctrl+C**. The next `pnpm local` uses the same saved data. Setup is needed only once, or when you intentionally change the owner password.

## Test the full flow

1. Sign in to Store Studio using the owner email and the password you chose.
2. Add/edit products, sizes, prices and stock. Add banners, categories and coupons.
3. Open the app and refresh the catalog to see admin edits.
4. Register a separate test customer account, select a size, add products to the cart and add a delivery address.
5. Place a **cash-on-delivery test order**. The order, coupon usage and stock change are saved locally.
6. Open Store Studio → Orders, update the fulfillment status and check the customer's order screen.

These are local test records. The launcher omits cloud payment, image-upload and realtime credentials; it does not initiate real payments, refunds, deliveries or push notifications. Hosted product/banner image URLs work; downloading those images requires internet. Direct photo uploads need a configured image storage service and are not included in this mode.

## Connect your phone

Keep the computer and phone on the same Wi-Fi. Install the **SDK 54** Android Expo Go build from [expo.dev/go](https://expo.dev/go) and scan the QR. This is a local preview; no APK build or public HTTPS address is needed.

First open the printed `http://YOUR_COMPUTER_IP:3000/api/healthz` in your phone's browser. If it does not load, check the Wi-Fi network and allow incoming **3000** and **8081** from your LAN through the computer's firewall. PostgreSQL port 5432 is not used in this mode. A guest Wi-Fi network may block communication between devices.

If the launcher selects a VPN/incorrect network address, use your Wi-Fi IPv4 address explicitly:

```bash
GRIPER_LAN_IP=192.168.1.25 pnpm local
```

Replace the example address with your own. The launcher supplies the correct mobile API URL and admin proxy; no mobile/API `.env` editing is necessary.

## Saved files and separate commands

Local records and signing secrets live under **`.local/griper/`**, which is ignored by Git. Stop the store before backing up that entire folder. Keep the folder when updating the code. It contains your local customer/order data; deleting it removes that local store.

The app also keeps its local testing sign-in, cart and wishlist separate from the normal store's device storage.

Only one backend/setup process may open a store at a time. Stop `pnpm local` before rerunning `pnpm local:setup`. A lock prevents two processes from modifying the same storage folder. Normal cloud/production operation continues to use `DATABASE_URL`; embedded local storage refuses to start with `NODE_ENV=production`.

For separate terminals, use `pnpm local:api` for the backend and `pnpm local:app` for Expo. Start the admin separately with `pnpm --filter @workspace/admin-web run dev` when using the default API port 3000. Do not start another API while `pnpm local` is running.

If a default port is occupied, choose consistent alternative ports:

```bash
GRIPER_API_PORT=3001 GRIPER_ADMIN_PORT=5174 GRIPER_APP_PORT=8082 pnpm local
```

`GRIPER_LOCAL_HOME` can select another local storage folder. Run setup with the same folder first. Each folder is a separate test store.

## Automated verification

```bash
pnpm run test:local
```

This creates isolated temporary stores. It verifies real owner/customer authorization, catalog/options, categories, coupons, checkout, stock rollback, profile/settings operations, migrations, persistence after restarting, repeated setup, the single-process lock and the production guard. It does not open or reset your `.local/griper/` data.
