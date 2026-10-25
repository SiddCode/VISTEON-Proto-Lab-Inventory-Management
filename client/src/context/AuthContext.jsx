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

    // 1. Check if the server returned an empty body (e.g. Content-Length: 0 from static hosting proxy)
    if (!data || (typeof data === 'string' && !data.trim())) {
      throw new Error(
        'Login failed: Empty response received from server (HTTP 200, Content-Length: 0). ' +
        'Please verify that your frontend VITE_API_URL points to your deployed Render backend web service.'
      );
    }

    // 2. Extract token and user from direct or nested structure
    const token = data.token || data.data?.token;
    const user = data.user || data.data?.user;

    if (token && user) {
      setToken(token);
      setUser(user);
      localStorage.setItem('visteon_token', token);
      localStorage.setItem('visteon_user', JSON.stringify(user));
      setLoading(false);
      return user;
    }

    // 3. If server provided a descriptive error message in JSON
    if (data.message) {
      throw new Error(data.message);
    }

    throw new Error('Login failed: Invalid server response (missing authentication credentials)');
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
