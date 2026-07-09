import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. التحقق من وجود جلسة دخول مسجلة عند فتح التطبيق
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

  // 2. دالة تسجيل الدخول الحقيقية المرتبطة بـ FastAPI (POST /api/login)
  const login = async (username, password) => {
    try {
      // api.login يستدعي /api/login الحقيقي، واللي بيتحقق فعلياً من
      // اسم المستخدم وكلمة المرور في قاعدة البيانات (أو حساب الأدمن الثابت)
      // ويرجّع الـ role الصحيح من السيرفر بدل ما نخمنه من اسم اليوزر
      const data = await api.login(username, password);

      const userData = {
        id: username,
        username: data.username,
        role: data.role,
        name: data.role === 'insurance' ? 'Insurance Management' : `Hospital Provider #${data.username}`,
        token: data.token, // Basic-auth token، هنحتاجه لإرسال الطلبات لاحقاً
      };

      setUser(userData);
      localStorage.setItem('fraud_auth_user', JSON.stringify(userData));
      return { success: true, user: userData };
    } catch (error) {
      console.error('Login Error:', error);
      return {
        success: false,
        error: error.message === 'Invalid credentials'
          ? 'خطأ في اسم المستخدم أو كلمة المرور'
          : 'تعذر الاتصال بالسيرفر. تأكد من تشغيل FastAPI',
      };
    }
  };

  // 3. دالة تسجيل الخروج
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
