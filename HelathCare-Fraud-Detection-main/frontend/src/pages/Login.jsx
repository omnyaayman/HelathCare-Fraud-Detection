import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader, AlertCircle } from 'lucide-react';

// المسارات اللي اليوزر هيروح لها بعد نجاح الدخول
const rolePaths = {
  insurance: '/insurance/dashboard',
  provider: '/provider/dashboard',
};

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setSubmitting(true);
    // استدعاء دالة الـ login اللي عدلناها في AuthContext
    const result = await login(username, password);
    setSubmitting(false);

    if (result.success) {
      // التوجيه للمكان الصح بناءً على الـ Role (Provider أو Insurance)
      navigate(rolePaths[result.user.role] || '/');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="text-textPrimary text-base font-medium mb-1">Healthcare Fraud Detection</div>
          <div className="text-textSecondary text-sm">Sign in with your Provider or Insurance account</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-danger/10 border border-danger/20 rounded-md text-danger text-sm">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-textSecondary mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full px-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150"
              placeholder="Enter your ID (e.g., 1)"
            />
          </div>

          <div>
            <label className="block text-xs text-textSecondary mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-3 py-2 bg-surface border border-border rounded-md text-sm text-textPrimary placeholder-textSecondary/50 focus:outline-none focus:border-primary transition-colors duration-150"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2.5 text-sm bg-primary/15 border border-primary/30 rounded-md text-primary font-medium hover:bg-primary/25 transition-colors duration-150 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader size={14} className="animate-spin" />}
            {submitting ? 'Authenticating...' : 'Sign in'}
          </button>
        </form>

        {/* تم تحديث أزرار الـ Demo لتعمل ببياناتك الحقيقية الجديدة من Azure SQL */}
        <div className="mt-6 pt-5 border-t border-border">
          <div className="text-xs text-textSecondary mb-3">Quick Login (Development)</div>
          <div className="space-y-2">
            {[
              { label: 'Insurance Admin', user: 'admin_insurance', pass: 'password123' },
              { label: 'Hospital Provider #1', user: '1', pass: 'password123' },
            ].map((d) => (
              <button
                key={d.user}
                type="button"
                onClick={() => { setUsername(d.user); setPassword(d.pass); }}
                className="w-full flex items-center justify-between px-3 py-2 bg-surface border border-border rounded-md text-sm text-textSecondary hover:text-textPrimary hover:border-primary/40 transition-colors duration-150"
              >
                <span>{d.label}</span>
                <span className="text-xs font-mono text-textSecondary/60">{d.user} / {d.pass}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}