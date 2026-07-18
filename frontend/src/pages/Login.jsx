import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader, AlertCircle, Building2, HeartPulse, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';

const rolePaths = {
  insurance: '/insurance/dashboard',
  provider: '/provider/dashboard',
};

const demoUsers = [
  { label: 'Insurance Admin', user: 'admin_insurance', pass: 'password123', icon: ShieldCheck },
  { label: 'Claims Auditor', user: 'auditor_insurance', pass: 'password123', icon: ShieldCheck },
  { label: 'Risk Manager', user: 'manager_insurance', pass: 'password123', icon: ShieldCheck },
  { label: 'Medical Doctor', user: 'doctor_provider', pass: 'password123', icon: Building2 },
];

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
      setError('Please enter both username and password.');
      return;
    }

    setSubmitting(true);
    const result = await login(username, password);
    setSubmitting(false);

    if (result.success) {
      navigate(rolePaths[result.user.role] || '/');
    } else {
      setError(result.error || 'Unable to authenticate with these credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-bg p-4 text-textPrimary">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl shadow-slate-900/10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden bg-primary p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.18),transparent_42%),radial-gradient(circle_at_78%_18%,rgba(34,211,238,0.34),transparent_18rem)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <HeartPulse size={26} />
              <div>
                <p className="text-sm font-black">MediSure AI</p>
                <p className="text-xs text-white/75">Healthcare fraud intelligence</p>
              </div>
            </div>
            <h1 className="mt-14 max-w-xl text-5xl font-black leading-tight tracking-tight">
              Enterprise claim defense for modern healthcare teams.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-white/78">
              Review claim risk, provider behavior, policy status, and model health from one secure analytics workspace connected to the live backend.
            </p>
          </div>

          <div className="relative grid grid-cols-3 gap-3">
            {[
              ['AI Risk', 'Live scoring'],
              ['Azure SQL', 'Verified records'],
              ['XGBoost', 'ML pipeline'],
            ].map(([title, value]) => (
              <div key={title} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">{title}</p>
                <p className="mt-2 text-sm font-bold">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                <HeartPulse size={24} />
              </div>
              <h1 className="text-2xl font-black">MediSure AI</h1>
              <p className="mt-1 text-sm text-textSecondary">Healthcare fraud intelligence</p>
            </div>

            <div className="mb-7">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Secure access</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-textPrimary">Sign in</h2>
              <p className="mt-2 text-sm text-textSecondary">Use your provider or insurance account to open the analytics workspace.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-danger">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  <span className="text-sm font-semibold">{error}</span>
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-textSecondary">Username</span>
                <div className="relative">
                  <UserRound size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm outline-none"
                    placeholder="Enter your account ID"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-black uppercase tracking-widest text-textSecondary">Password</span>
                <div className="relative">
                  <LockKeyhole size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm outline-none"
                    placeholder="Enter your password"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-white shadow-lg shadow-primary/20 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader size={16} className="animate-spin" />}
                {submitting ? 'Authenticating...' : 'Open workspace'}
              </button>
            </form>

            <div className="mt-7 border-t border-border pt-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-textSecondary">Development access</span>
                <span className="rounded-full border border-success/20 bg-success/10 px-2 py-1 text-[10px] font-black text-success">Demo</span>
              </div>
              <div className="grid gap-2">
                {demoUsers.map((d) => {
                  const Icon = d.icon;
                  return (
                    <button
                      key={d.user}
                      type="button"
                      onClick={() => {
                        setUsername(d.user);
                        setPassword(d.pass);
                      }}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg/70 px-3 py-3 text-left hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span className="flex items-center gap-2 text-sm font-bold text-textPrimary">
                        <Icon size={16} className="text-primary" />
                        {d.label}
                      </span>
                      <span className="truncate font-mono text-[11px] text-textSecondary">{d.user}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
