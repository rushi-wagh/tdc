import { createContext, useContext, useMemo, useState } from "react";
import { login as loginRequest } from "../services/authService.js";

const AuthContext = createContext(null);
const storageKey = "tdc.matchmaker.user";

const getStoredUser = () => {
  try {
    const value = localStorage.getItem(storageKey);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);

  const login = async (credentials) => {
    const authenticatedUser = await loginRequest(credentials);
    localStorage.setItem(storageKey, JSON.stringify(authenticatedUser));
    setUser(authenticatedUser);
    return authenticatedUser;
  };

  const logout = () => {
    localStorage.removeItem(storageKey);
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
