import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Address, User } from "@/constants/data";
import {
  api,
  saveTokens,
  clearTokens,
  getAccessToken,
  ApiUser,
} from "@/services/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    name: string,
    email: string,
    phone: string,
    password: string,
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  addAddress: (address: Omit<Address, "id">) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "@griper_user_cache";

function mapApiUser(apiUser: ApiUser, addresses: any[] = []): User {
  return {
    id: apiUser.id,
    name: apiUser.name,
    email: apiUser.email,
    phone: apiUser.phone ?? "",
    addresses: addresses.map((a) => ({
      id: a.id,
      name: apiUser.name,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      phone: apiUser.phone ?? "",
      isDefault: a.isDefault,
    })),
    role: apiUser.role === "admin" ? "admin" : "user",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const apiUser = await api.auth.me();
      let addresses: any[] = [];
      try {
        addresses = await api.addresses.list();
      } catch (e) {
        console.log("Failed to fetch addresses", e);
      }
      const mappedUser = mapApiUser(apiUser, addresses);
      setUser(mappedUser);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mappedUser));
    } catch (e) {
      console.log("Failed to refresh user", e);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const cachedUser = await AsyncStorage.getItem(STORAGE_KEY);
        if (cachedUser) setUser(JSON.parse(cachedUser) as User);

        const token = await getAccessToken();
        if (token) {
          await refreshUser();
        }
      } catch (e) {
        console.log("Load auth error", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      if (!email) return false;
      try {
        const res = await api.auth.login(email, password);
        await saveTokens(res.accessToken, res.refreshToken);
        await refreshUser();
        return true;
      } catch (e) {
        console.log("Login error", e);
        return false;
      }
    },
    [refreshUser],
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      phone: string,
      password: string,
    ): Promise<boolean> => {
      if (!name || !email) return false;
      try {
        const res = await api.auth.register(name, email, phone, password);
        await saveTokens(res.accessToken, res.refreshToken);
        await refreshUser();
        return true;
      } catch (e) {
        console.log("Register error", e);
        return false;
      }
    },
    [refreshUser],
  );

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch (e) {
      // Ignore errors on logout
    }
    await clearTokens();
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const addAddress = useCallback(
    async (address: Omit<Address, "id">) => {
      try {
        await api.addresses.add(address);
        await refreshUser();
      } catch (e) {
        throw e;
      }
    },
    [refreshUser],
  );

  const setDefaultAddress = useCallback(
    async (id: string) => {
      try {
        await api.addresses.setDefault(id);
        await refreshUser();
      } catch (e) {
        throw e;
      }
    },
    [refreshUser],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        addAddress,
        setDefaultAddress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
