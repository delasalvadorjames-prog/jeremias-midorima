import { useEffect, useState } from 'react';
import ProcessingModal from '../components/ProcessingModalProfessional';
import { API_BASE, ASSIGNED_CATEGORY_KEY, ROLE_KEY, TOKEN_KEY } from '../data/constants';
import { CURRENT_ACCOUNT_EMAIL_KEY, normalizeAccountEmail } from '../lib/accountStorage';
import { GOOGLE_AUTH_STATE_KEY, GOOGLE_PENDING_SIGNUP_KEY, getGoogleProfileFromHash } from '../lib/googleAuth';

type GoogleAuthResponse = {
  access_token?: string;
  email?: string;
  full_name?: string;
  role?: 'admin' | 'staff';
  assigned_category?: string | null;
  detail?: string;
};

export default function GoogleCallback() {
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);
  const [userName, setUserName] = useState('');

  // 👈 Kapag TAPOS NA ANG DALAWA (auth + animation), mag-redirect at magsara
  useEffect(() => {
    if (authReady && animationFinished) {
      // Small delay para makita ang "Access Confirmed" state
      const timer = setTimeout(() => {
        setIsProcessing(false);
        window.location.replace('/');
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [authReady, animationFinished]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(
      window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash,
    );
    const code = hashParams.get('id_token') || urlParams.get('id_token') || urlParams.get('code') || hashParams.get('code') || '';
    const errorParam = urlParams.get('error') || hashParams.get('error');
    const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
    const returnedState = urlParams.get('state') || hashParams.get('state');
    const expectedState = sessionStorage.getItem(GOOGLE_AUTH_STATE_KEY) || localStorage.getItem(GOOGLE_AUTH_STATE_KEY);
    const googleProfile = getGoogleProfileFromHash(window.location.hash);

    sessionStorage.removeItem(GOOGLE_AUTH_STATE_KEY);
    localStorage.removeItem(GOOGLE_AUTH_STATE_KEY);

    const fail = (message: string) => {
      setError(message);
      setIsProcessing(false);
    };

    if (errorParam) {
      fail(`Google Error: ${errorParam} - ${errorDescription || 'Unknown error'}`);
      return;
    }
    if (expectedState && returnedState !== expectedState) {
      fail('Google login session did not match. Please try again.');
      return;
    }
    if (!code) {
      fail('Google login did not return a usable response. Please try again.');
      return;
    }

    setUserName(googleProfile.fullName || '');

    fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, email: googleProfile.email, full_name: googleProfile.fullName }),
    })
      .then(async (response) => {
        const data = (await response.json()) as GoogleAuthResponse;
        if (!response.ok) {
          if (response.status === 403 && data.detail === 'Google account is not registered in the system') {
            sessionStorage.setItem(GOOGLE_PENDING_SIGNUP_KEY, JSON.stringify({
              email: normalizeAccountEmail(googleProfile.email || ''),
              fullName: googleProfile.fullName || '',
            }));
            window.location.replace('/?auth=signup');
            return null;
          }
          throw new Error(data.detail || `Backend error: ${response.status}`);
        }
        return data;
      })
      .then((data) => {
        if (!data) return;
        if (!data.access_token) throw new Error('No access token in response');

        const authenticatedEmail = normalizeAccountEmail(data.email || googleProfile.email || '');
        const authenticatedName = data.full_name || googleProfile.fullName || authenticatedEmail.split('@')[0];
        const authenticatedRole = data.role === 'staff' ? 'staff' : 'admin';
        const authenticatedAssignment = data.assigned_category || '';

        setUserName(authenticatedName);
        localStorage.setItem(TOKEN_KEY, data.access_token);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('userEmail', authenticatedEmail);
        localStorage.setItem('userName', authenticatedName);
        localStorage.setItem(ROLE_KEY, authenticatedRole);
        localStorage.setItem('userRole', authenticatedRole);
        localStorage.setItem(ASSIGNED_CATEGORY_KEY, authenticatedAssignment);
        localStorage.setItem('assignedCategory', authenticatedAssignment);
        localStorage.setItem(CURRENT_ACCOUNT_EMAIL_KEY, authenticatedEmail);
        localStorage.removeItem('userPassword');
        localStorage.setItem('user', JSON.stringify({
          email: authenticatedEmail,
          full_name: authenticatedName,
          role: authenticatedRole,
          assigned_category: authenticatedAssignment,
        }));
        setAuthReady(true); // 👈 Naka-set na — hintayin na lang ang animation
      })
      .catch((authError) => {
        const message = authError instanceof Error ? authError.message : 'Google login failed';
        fail(`Login failed: ${message}`);
      });
  }, []);

  // ── Error Screen ───────────────────────────
  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold">Authentication Error</h1>
          <p className="mt-2 text-sm text-slate-300">{error}</p>
          <button
            type="button"
            onClick={() => window.location.replace('/')}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Back to Login
          </button>
        </div>
      </main>
    );
  }

  // ── Processing Modal ───────────────────────────
  return (
    <ProcessingModal
      isOpen={isProcessing}
      userName={userName}
      steps={[
        { label: 'Verifying Google credentials', duration: 900 },
        { label: 'Authenticating with server', duration: 1100 },
        { label: 'Loading your profile', duration: 800 },
        { label: 'Preparing dashboard', duration: 700 },
      ]}
      title="Signing you in"
      subtitle="Verifying your Google account securely"
      onComplete={() => {
        // 👈 I-set lang ang flag — hindi na magsasara agad
        // Ang useEffect sa taas ang bahala mag-redirect kapag pareho nang ready
        setAnimationFinished(true);
      }}
    />
  );
}