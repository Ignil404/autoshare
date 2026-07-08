import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { decodeJwt, getAuth, setAuth } from "./api";
import type { JwtPayload, StoredAuth, UserType } from "./api-types";

interface AuthContextValue {
  auth: StoredAuth | null;
  userType: UserType | null;
  claims: JwtPayload | null;
  isAuthenticated: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuthState] = useState<StoredAuth | null>(() => getAuth());

  useEffect(() => {
    const sync = () => setAuthState(getAuth());
    window.addEventListener("autoshare-auth-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("autoshare-auth-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const claims = auth ? decodeJwt<JwtPayload>(auth.access_token) : null;
    return {
      auth,
      userType: auth?.user_type ?? null,
      claims,
      isAuthenticated: !!auth,
      signOut: () => setAuth(null),
    };
  }, [auth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}