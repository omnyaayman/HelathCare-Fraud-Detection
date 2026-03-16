import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const TEMP_USERS = [
  { id: 1, username: 'insurance', password: 'insurance', role: 'insurance', name: 'Insurance Company' },
  { id: 2, username: 'provider1', password: 'provider1', role: 'provider', name: 'City General Hospital' },
  { id: 3, username: 'provider2', password: 'provider2', role: 'provider', name: 'Metro Health Center' },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('fraud_auth_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* skip */ }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const data = await api.login(username, password);
      const userData = { id: data.id, username: data.username, role: data.role, name: data.name, token: data.token };
      setUser(userData);
      localStorage.setItem('fraud_auth_user', JSON.stringify(userData));
      return { success: true, user: userData };
    } catch {
      const temp = TEMP_USERS.find((u) => u.username === username && u.password === password);
      if (temp) {
        const userData = { id: temp.id, username: temp.username, role: temp.role, name: temp.name, token: 'temp' };
        setUser(userData);
        localStorage.setItem('fraud_auth_user', JSON.stringify(userData));
        return { success: true, user: userData };
      }
      return { success: false, error: 'Invalid username or password' };
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
