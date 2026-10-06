import { useState } from 'react';
import AuthCard from '../components/AuthCard';
import { API_BASE } from '../data/constants';

type LoginStep = 'credentials' | 'otp' | 'success' | 'processing';
type ForgotStep = 'none' | 'request' | 'reset';
type AuthMode = 'login' | 'signup';

export default function LoginPage() {
  // ── Form States ──────────────────────────────────────
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // ── Forgot Password States ───────────────────────────
  const [forgotStep, setForgotStep] = useState<ForgotStep>('none');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  // ── OTP & PROCESSING STATES ──────────────────────────
  const [loginStep, setLoginStep] = useState<LoginStep>('credentials');
  const [loginOtp, setLoginOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // ═══════════════════════════════════════════════════
  // STEP 1: Login Submit (email + password)
  // ═══════════════════════════════════════════════════
  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      // TODO: Palitan ito ng actual API call mo
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Invalid credentials');
      }

      // Kung tama, pumunta sa OTP screen
      setAuthLoading(false);
      setLoginStep('otp');
      setLoginOtp('');
      setOtpError('');

    } catch (err: any) {
      setAuthLoading(false);
      setAuthError(err.message || 'Login failed. Please try again.');
    }
  };

  // ═══════════════════════════════════════════════════
  // STEP 2: OTP Verify
  // ═══════════════════════════════════════════════════
  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError('');

    try {
      // TODO: Palitan ito ng actual OTP verification API mo
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: loginOtp }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Invalid OTP');
      }

      // I-save ang token
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('userEmail', data.email || email);
      if (data.role) localStorage.setItem('userRole', data.role);

      setOtpLoading(false);
      setLoginStep('success'); // 👈 Success screen

      // After 2.5s, pumunta sa processing animation
      setTimeout(() => {
        setLoginStep('processing'); // 👈 Process animation
      }, 2500);

      // After processing (~3.5s), redirect sa dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 6000);

    } catch (err: any) {
      setOtpLoading(false);
      setOtpError(err.message || 'Invalid OTP. Please try again.');
    }
  };

  // ═══════════════════════════════════════════════════
  // STEP 3: Cancel OTP
  // ═══════════════════════════════════════════════════
  const handleCancelOtp = () => {
    setLoginStep('credentials');
    setLoginOtp('');
    setOtpError('');
  };

  // ═══════════════════════════════════════════════════
  // Forgot Password Handlers
  // ═══════════════════════════════════════════════════
  const handleStartForgotPassword = () => {
    setForgotStep('request');
    setForgotError('');
    setForgotMessage('');
  };

  const handleCancelForgotPassword = () => {
    setForgotStep('none');
    setForgotError('');
    setForgotMessage('');
  };

  const handleForgotRequest = async () => {
    setForgotLoading(true);
    setForgotError('');
    setForgotMessage('');

    try {
      // TODO: Palitan ng actual API call
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to send reset code');
      }

      setForgotMessage('Reset code sent to your email!');
    } catch (err: any) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setForgotLoading(true);
    setForgotError('');

    try {
      // TODO: Palitan ng actual API call
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: resetCode,
          new_password: resetNewPassword,
          confirm_password: resetConfirmPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to reset password');
      }

      setForgotStep('none');
      setAuthError('');
    } catch (err: any) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <AuthCard
      authMode={authMode}
      fullName={fullName}
      email={email}
      password={password}
      confirmPassword={confirmPassword}
      authError={authError}
      authLoading={authLoading}
      forgotStep={forgotStep}
      forgotLoading={forgotLoading}
      forgotMessage={forgotMessage}
      forgotError={forgotError}
      resetCode={resetCode}
      resetNewPassword={resetNewPassword}
      resetConfirmPassword={resetConfirmPassword}
      onFullNameChange={setFullName}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onSubmit={handleLoginSubmit}
      onStartForgotPassword={handleStartForgotPassword}
      onCancelForgotPassword={handleCancelForgotPassword}
      onForgotRequest={handleForgotRequest}
      onResetCodeChange={setResetCode}
      onResetNewPasswordChange={setResetNewPassword}
      onResetConfirmPasswordChange={setResetConfirmPassword}
      onResetPassword={handleResetPassword}
      onToggleMode={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
      showSignupOption={true}
      apiBase={API_BASE}
      // 👈 ITO ANG MGA BAGONG PROPS NA MAG-TRIGGER NG ANIMATIONS
      loginStep={loginStep}
      loginOtp={loginOtp}
      otpError={otpError}
      otpLoading={otpLoading}
      onLoginOtpChange={setLoginOtp}
      onVerifyOtp={handleVerifyOtp}
      onCancelOtp={handleCancelOtp}
    />
  );
}