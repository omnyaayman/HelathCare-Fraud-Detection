
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('fraud_auth_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (error) {
        localStorage.removeItem('fraud_auth_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const userData = await api.login(username, password);
      const userObj = {
        id: username,
        username: userData.username,
        role: userData.role,
        name: userData.role === 'insurance' ? 'Insurance Management' : `Provider ${username}`,
        token: userData.token,
      };
      setUser(userObj);
      localStorage.setItem('fraud_auth_user', JSON.stringify(userObj));
      return { success: true, user: userObj };
    } catch (error) {
      console.error('Login Error:', error);
      return {
        success: false,
        error: 'Invalid credentials. Please try again.',
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('fraud_auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

