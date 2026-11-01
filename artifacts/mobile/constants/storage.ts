/** Keep local test accounts/carts separate from the normal store on this device. */
export const storeStorageKey = (key: string) =>
  process.env.EXPO_PUBLIC_LOCAL_MODE === "1"
    ? key.replace("@griper_", "@griper_local_")
    : key;
