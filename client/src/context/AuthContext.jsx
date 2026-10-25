import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('visteon_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('visteon_token') || null);
  const [loading, setLoading] = useState(true);

  // Verify existing token ONCE on initial application load
  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('visteon_token');
      if (storedToken) {
        try {
          const data = await authService.getMe();
          if (data && data.success && data.user) {
            setUser(data.user);
            localStorage.setItem('visteon_user', JSON.stringify(data.user));
          } else {
            logout();
          }
        } catch (err) {
          // Only clear session if server explicitly rejects token with 401 or 403
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            console.warn('[Auth] Session expired or invalid token (401/403). Clearing session.');
            logout();
          } else {
            // Transient network error (e.g. Render cold start) - retain stored credentials
            console.warn('[Auth] Server unreachable during startup verification. Retaining offline session cache:', err.message);
          }
        }
      }
      setLoading(false);
    };

    verifyAuth();
  }, []); // Run only on initial mount, NOT on every login

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    if (data && data.success && data.token && data.user) {
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('visteon_token', data.token);
      localStorage.setItem('visteon_user', JSON.stringify(data.user));
      setLoading(false);
      return data.user;
    }
    throw new Error(data?.message || 'Login failed: Invalid server response');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('visteon_token');
    localStorage.removeItem('visteon_user');
  };

  const refreshUser = async () => {
    try {
      const data = await authService.getMe();
      if (data && data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('visteon_user', JSON.stringify(data.user));
        return data.user;
      }
    } catch (err) {
      console.warn('[Auth] Failed to refresh user profile:', err.message);
    }
    return null;
  };

  const updateProfile = async (profileData) => {
    const data = await authService.updateProfile(profileData);
    if (data && data.success && data.user) {
      setUser(data.user);
      localStorage.setItem('visteon_user', JSON.stringify(data.user));
    }
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        logout,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
