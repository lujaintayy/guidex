import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  orgId: number;
}

interface AuthContextType extends AuthState {
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  orgId: 1,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const stored = localStorage.getItem("infra-auth");
      if (stored) return JSON.parse(stored);
    } catch {}
    return { user: null, token: null, orgId: 1 };
  });

  const login = (user: AuthUser, token: string) => {
    const next = { user, token, orgId: 1 };
    setState(next);
    localStorage.setItem("infra-auth", JSON.stringify(next));
  };

  const logout = () => {
    setState({ user: null, token: null, orgId: 1 });
    localStorage.removeItem("infra-auth");
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, isAuthenticated: !!state.token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
