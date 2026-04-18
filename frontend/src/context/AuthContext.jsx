import React, { createContext, useContext, useMemo, useState } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    if (!stored) return null;

    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });

  const setAuthState = (nextUser, accessToken, refreshToken) => {
    setUser(nextUser);
    localStorage.setItem('user', JSON.stringify(nextUser));
    localStorage.setItem('token', accessToken);

    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  };

  const login = async (email, password) => {
    const response = await authAPI.post('/api/auth/login', { email, password });
    const { accessToken, refreshToken, user: nextUser } = response.data;
    setAuthState(nextUser, accessToken, refreshToken);
    return nextUser;
  };

  const signup = async (email, password, role) => {
    await authAPI.post('/api/auth/register', { email, password, role });

    // Auto-login after successful registration for smoother onboarding.
    return login(email, password);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  };

  const value = useMemo(
    () => ({ user, login, signup, logout }),
    [user]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
