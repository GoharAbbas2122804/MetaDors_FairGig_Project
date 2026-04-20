import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext();
const DASHBOARD_BY_ROLE = {
  worker: "/worker/dashboard",
  verifier: "/verifier/dashboard",
  advocate: "/advocate/dashboard",
};

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const setAuthState = (nextUser) => {
    setUser(nextUser);
  };

  const clearAuthState = () => {
    setUser(null);
  };

  const hydrateSession = async () => {
    try {
      const response = await authAPI.get("/api/auth/me");
      setUser(response.data.user);
    } catch {
      clearAuthState();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    hydrateSession();
  }, []);

  const login = async ({ email, password }) => {
    const response = await authAPI.post("/api/auth/login", { email, password });
    const { user: nextUser } = response.data;
    setAuthState(nextUser);
    return nextUser;
  };

  const signup = async ({ fullName, email, password, role, demographics }) => {
    const response = await authAPI.post("/api/auth/register", {
      fullName,
      email,
      password,
      role,
      demographics,
    });
    const { user: nextUser } = response.data;
    setAuthState(nextUser);
    return nextUser;
  };

  const logout = async () => {
    try {
      await authAPI.post("/api/auth/logout");
    } catch {
      // Clearing local auth state is still correct even if the network request fails.
    }
    clearAuthState();
  };

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      signup,
      logout,
      getDashboardPath: (role = user?.role) => DASHBOARD_BY_ROLE[role] || "/login",
    }),
    [isLoading, user]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
