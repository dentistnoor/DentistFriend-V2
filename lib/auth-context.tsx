"use client";

import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { type User, onAuthStateChanged, signOut } from "firebase/auth";
import { getAuthInstance } from "./firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const auth = getAuthInstance();
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      setLoading(false);
    }
  }, []);

  const logout = async () => {
    try {
      const auth = getAuthInstance();
      await signOut(auth);
    } catch (error) {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
