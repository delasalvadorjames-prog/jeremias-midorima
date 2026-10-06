import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import loginBg from '../assets/Fivel.png';
import ProcessingModal from '../components/ProcessingModalProfessional';

type AuthResponse = {
  id: number;
  access_token: string;
  email: string;
  full_name: string;
  role?: string;
  assigned_category?: string | null;
  account_status?: 'active' | 'disabled' | 'suspended';
};

type StaffLoginProps = {
  apiBase: string;
  token: string | null;
  currentRole: string;
  onAuthSuccess: (data: AuthResponse, plainPassword: string) => boolean;
};

export default function StaffLogin({ apiBase, token, currentRole, onAuthSuccess }: StaffLoginProps) {
  const navigate = useNavigate();
  const [userstaff, setUserstaff] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<{ data: AuthResponse; password: string } | null>(null);

  useEffect(() => {
    if (token && currentRole === 'staff') {
      navigate('/staff', { replace: true });
    }
  }, [token, currentRole, navigate]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError('');

      if (!userstaff.trim() || !password.trim()) {
        setError('Please enter your userstaff and password.');
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(`${apiBase}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userstaff: userstaff.trim(),
            email: userstaff.trim(),
            password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'Login failed.');
        }

        if (data.role !== 'staff') {
          setError('Only staff accounts can log in here.');
          return;
        }

        setPendingAuth({ data, password });
        setShowProcessingModal(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed.';
        if (message === 'Only staff accounts can log in here.' || message.startsWith('Too many failed login attempts')) {
          setError(message);
        } else {
          setError('Invalid staff credentials.');
        }
      } finally {
        setLoading(false);
      }
    },
    [apiBase, userstaff, navigate, password]
  );

  return (
    <>
      <main
        className="relative min-h-screen overflow-hidden bg-[#07111f] text-slate-100"
        style={{
          backgroundImage: `linear-gradient(rgba(7,17,31,0.96), rgba(7,17,31,0.92)), url(${loginBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_90%_85%,_rgba(14,165,233,0.14),_transparent_30%)]" />
        <div className="absolute -left-32 top-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          <section className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/75 shadow-[0_30px_100px_-30px_rgba(0,0,0,0.9)] backdrop-blur-2xl lg:grid-cols-[0.92fr_1.08fr]">
            <div className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-500/20 via-slate-900/40 to-cyan-500/10 p-10 lg:flex lg:flex-col lg:justify-between">
              <div className="absolute -right-28 -top-24 h-80 w-80 rounded-full border border-emerald-300/10 bg-emerald-400/10 blur-2xl" />
              <div className="relative">
                <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/25">
                  <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v5c0 4.5 2.9 8.5 7 10 4.1-1.5 7-5.5 7-10V6l-7-3Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Five L Pharmacy</p>
                <h1 className="mt-4 max-w-xs text-3xl font-semibold leading-tight tracking-tight text-white">
                  Reliable care starts with a secure workspace.
                </h1>
                <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
                  Access your assigned pharmacy tools, inventory, and daily operations from one secure portal.
                </p>
              </div>
              <div className="relative flex items-center gap-3 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
                Secure staff access
              </div>
            </div>

            <div className="p-6 sm:p-10 lg:p-12">
              <div className="mb-9 lg:hidden">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/25">
                  <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v5c0 4.5 2.9 8.5 7 10 4.1-1.5 7-5.5 7-10V6l-7-3Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Five L Pharmacy</p>
              </div>

              <div className="mb-8">
                <p className="mb-2 text-sm font-medium text-emerald-300">Staff portal</p>
                <h2 className="text-3xl font-semibold tracking-tight text-white">Welcome back</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">Sign in to continue to your pharmacy workspace.</p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="staff-userstaff" className="mb-2 block text-sm font-medium text-slate-200">
                    Username or email
                  </label>
                  <div className="relative">
                    <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0" />
                    </svg>
                    <input
                      id="staff-userstaff"
                      type="text"
                      value={userstaff}
                      onChange={(event) => setUserstaff(event.target.value)}
                      placeholder="Enter your username"
                      autoComplete="username"
                      className="w-full rounded-xl border border-slate-700/80 bg-slate-950/50 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label htmlFor="staff-password" className="text-sm font-medium text-slate-200">Password</label>
                    <span className="text-xs text-slate-500">Protected access</span>
                  </div>
                  <div className="relative">
                    <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7a4.5 4.5 0 0 0-9 0v3.5M6 10.5h12v9H6v-9Z" />
                    </svg>
                    <input
                      id="staff-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-slate-700/80 bg-slate-950/50 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                    <svg className="mt-0.5 h-4 w-4 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3h.008M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <p>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-500/20 focus:outline-none focus:ring-4 focus:ring-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in to portal
                      <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-xs leading-5 text-slate-500">
                Need access or forgot your credentials? Contact your pharmacy administrator.
              </p>
            </div>
          </section>
        </div>
      </main>

      <ProcessingModal
        isOpen={showProcessingModal}
        userName={pendingAuth?.data.full_name}
        onComplete={() => {
          setShowProcessingModal(false);
          const pending = pendingAuth;
          setPendingAuth(null);

          if (!pending) return;

          const accepted = onAuthSuccess(pending.data, pending.password);
          if (accepted) {
            navigate('/staff', { replace: true });
          } else {
            setError(`This staff account is ${pending.data.account_status || 'disabled'}. Please contact the admin.`);
          }
        }}
      />
    </>
  );
}
