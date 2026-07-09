import { createContext, useContext, useState, useEffect } from 'react';

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

  // 2. دالة تسجيل الدخول الحقيقية المرتبطة بـ FastAPI
  const login = async (username, password) => {
    try {
      // تشفير البيانات لإرسالها في الـ Header (Basic Auth)
      const token = btoa(`${username}:${password}`);

      // الاتصال بـ Endpoint محمي في الباك إند للتأكد من الهوية
      const response = await fetch('http://127.0.0.1:8000/health', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        // تحديد الصلاحية: إذا كان اليوزر هو المسؤول عن التأمين أو أي يوزر آخر (Provider)
        // يمكنك تعديل الشرط بناءً على منطق مشروعك
        const role = (username === 'admin_insurance' || username === 'insurance') ? 'insurance' : 'provider';
        
        const userData = {
          id: username,
          username: username,
          role: role,
          name: role === 'insurance' ? 'Insurance Management' : `Hospital Provider #${username}`,
          token: token // سنحتاجه لإرسال المطالبات لاحقاً
        };

        setUser(userData);
        localStorage.setItem('fraud_auth_user', JSON.stringify(userData));
        return { success: true, user: userData };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: errorData.detail || 'خطأ في اسم المستخدم أو كلمة المرور' 
        };
      }
    } catch (error) {
      console.error("Connection Error:", error);
      return { 
        success: false, 
        error: 'تعذر الاتصال بالسيرفر. تأكد من تشغيل FastAPI' 
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