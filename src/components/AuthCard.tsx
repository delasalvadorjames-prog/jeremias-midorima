import React, { useState, useEffect, useRef } from 'react';
import { AuthMode } from '../types';
import Fivel from '../assets/Fivel.png';
import pharmacyIntroUrl from '../assets/five-l-pharmacy-intro.html?url';
import {
  createGoogleAuthState,
  getGoogleRedirectUri,
  GOOGLE_AUTH_STATE_KEY,
} from '../lib/googleAuth';

import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';
import { cn } from '@/lib/utils';
import { Label, Link } from '@heroui/react';

type ForgotStep = 'none' | 'request' | 'reset';

type Props = {
  authMode: AuthMode;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  authError: string;
  authLoading: boolean;
  forgotStep: ForgotStep;
  forgotLoading: boolean;
  forgotMessage: string;
  forgotError: string;
  resetCode: string;
  resetNewPassword: string;
  resetConfirmPassword: string;

  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;

  onStartForgotPassword: () => void;
  onCancelForgotPassword: () => void;
  onForgotRequest: () => void;

  onResetCodeChange: (value: string) => void;
  onResetNewPasswordChange: (value: string) => void;
  onResetConfirmPasswordChange: (value: string) => void;
  onResetPassword: () => void;

  onToggleMode: () => void;

  showSignupOption?: boolean;
  signupNotice?: string;
  apiBase: string;

  loginStep?: 'credentials' | 'otp' | 'success' | 'processing';
  loginOtp?: string;
  otpError?: string;
  otpLoading?: boolean;
  onLoginOtpChange?: (value: string) => void;
  onVerifyOtp?: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancelOtp?: () => void;
};

// ── Input 3D (soft inset) ──
const INPUT_BASE =
  'w-full rounded-xl border bg-slate-900/70 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:ring-4';
const INPUT_IDLE =
  'border-slate-700/80 hover:border-emerald-500/40 focus:border-emerald-500 focus:ring-emerald-500/15 shadow-[inset_0_2px_6px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(0,0,0,0.4),0_1px_0_rgba(255,255,255,0.05)]';
const INPUT_ERROR =
  'border-rose-500/60 bg-rose-500/5 focus:border-rose-500 focus:ring-rose-500/15 shadow-[inset_0_2px_6px_rgba(0,0,0,0.3),0_0_0_1px_rgba(244,63,94,0.1)]';

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';

const LABEL_CLASS = 'mb-2 block text-sm font-medium text-slate-200';

// ── 🎨 3D Button Classes ──
const BTN_3D_PRIMARY = `
  group relative w-full cursor-pointer overflow-hidden rounded-xl px-4 py-3 text-sm font-bold text-white
  bg-gradient-to-b from-emerald-500 to-emerald-600
  ring-1 ring-emerald-400/40
  shadow-[0_5px_0_0_#047857,
          0_8px_16px_-4px_rgba(5,150,105,0.5),
          inset_0_2px_0_rgba(255,255,255,0.35),
          inset_0_-2px_4px_rgba(0,0,0,0.15)]
  transition-all duration-150
  hover:from-emerald-400 hover:to-emerald-500
  hover:shadow-[0_5px_0_0_#047857,
                0_10px_20px_-4px_rgba(5,150,105,0.6),
                inset_0_2px_0_rgba(255,255,255,0.4),
                inset_0_-2px_4px_rgba(0,0,0,0.15)]
  active:translate-y-[4px]
  active:shadow-[0_1px_0_0_#047857,
                inset_0_2px_0_rgba(255,255,255,0.2)]
  disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0
  ${FOCUS_RING}
`;

const BTN_3D_SECONDARY = `
  group relative w-full cursor-pointer overflow-hidden rounded-xl px-4 py-3 text-sm font-semibold text-slate-200
  bg-gradient-to-b from-slate-800 to-slate-900
  ring-1 ring-slate-700/80
  shadow-[0_5px_0_0_#0f172a,
          0_8px_16px_-4px_rgba(0,0,0,0.5),
          inset_0_1px_0_rgba(255,255,255,0.08),
          inset_0_-2px_4px_rgba(0,0,0,0.3)]
  transition-all duration-150
  hover:from-slate-700 hover:to-slate-800
  hover:ring-emerald-500/40
  hover:text-white
  hover:shadow-[0_5px_0_0_#0f172a,
                0_10px_20px_-4px_rgba(0,0,0,0.6),
                inset_0_1px_0_rgba(255,255,255,0.1),
                inset_0_-2px_4px_rgba(0,0,0,0.3)]
  active:translate-y-[4px]
  active:shadow-[0_1px_0_0_#0f172a,
                inset_0_1px_0_rgba(255,255,255,0.05)]
  disabled:cursor-not-allowed disabled:opacity-50
  ${FOCUS_RING}
`;

const BTN_3D_GHOST = `
  group relative w-full cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-slate-400
  transition-all duration-150
  hover:text-white
  hover:bg-white/[0.04]
  active:translate-y-[1px]
  ${FOCUS_RING}
`;

const BTN_3D_GOOGLE = `
  group relative flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white
  bg-gradient-to-b from-slate-800 to-slate-900
  ring-1 ring-slate-700/80
  shadow-[0_5px_0_0_#0f172a,
          0_8px_16px_-4px_rgba(0,0,0,0.5),
          inset_0_1px_0_rgba(255,255,255,0.08),
          inset_0_-2px_4px_rgba(0,0,0,0.3)]
  transition-all duration-150
  hover:from-slate-700 hover:to-slate-800
  hover:ring-emerald-500/40
  hover:shadow-[0_5px_0_0_#0f172a,
                0_10px_20px_-4px_rgba(0,0,0,0.6),
                inset_0_1px_0_rgba(255,255,255,0.1),
                inset_0_-2px_4px_rgba(0,0,0,0.3)]
  active:translate-y-[4px]
  active:shadow-[0_1px_0_0_#0f172a,
                inset_0_1px_0_rgba(255,255,255,0.05)]
  ${FOCUS_RING}
`;

// 👈 BAGO: Mga steps para sa process animation
const PROCESS_STEPS = [
  { label: 'Verifying credentials', duration: 800 },
  { label: 'Loading your profile', duration: 900 },
  { label: 'Fetching inventory data', duration: 1000 },
  { label: 'Preparing dashboard', duration: 800 },
];

export default function AuthCard({
  authMode,
  fullName,
  email,
  password,
  confirmPassword,
  authError,
  authLoading,

  forgotStep,
  forgotLoading,
  forgotMessage,
  forgotError,

  resetCode,
  resetNewPassword,
  resetConfirmPassword,

  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,

  onStartForgotPassword,
  onCancelForgotPassword,
  onForgotRequest,

  onResetCodeChange,
  onResetNewPasswordChange,
  onResetConfirmPasswordChange,
  onResetPassword,

  onToggleMode,

  showSignupOption = false,
  signupNotice = 'Public signup is disabled. Contact your administrator to register.',

  apiBase,

  loginStep = 'credentials',
  loginOtp = '',
  otpError = '',
  otpLoading = false,
  onLoginOtpChange,
  onVerifyOtp,
  onCancelOtp,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [localOtp, setLocalOtp] = useState(loginOtp || '');
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [countdown, setCountdown] = useState(36);
  const [isVerifying, setIsVerifying] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setLocalOtp(loginOtp || '');
  }, [loginOtp]);

  useEffect(() => {
    if (loginStep === 'otp' || loginStep === 'success') {
      setCountdown(36);
      const timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [loginStep]);

  useEffect(() => {
    if (loginStep !== 'processing') {
      setCurrentStep(0);
      setCompletedSteps([]);
      setProgress(0);
      return;
    }

    let stepIndex = 0;
    const totalDuration = PROCESS_STEPS.reduce((sum, s) => sum + s.duration, 0);
    let elapsed = 0;

    const runNextStep = () => {
      if (stepIndex >= PROCESS_STEPS.length) {
        return;
      }

      const step = PROCESS_STEPS[stepIndex];
      setCurrentStep(stepIndex);

      const stepTimer = setTimeout(() => {
        setCompletedSteps((prev) => [...prev, stepIndex]);
        elapsed += step.duration;
        setProgress(Math.min((elapsed / totalDuration) * 100, 100));
        stepIndex += 1;
        runNextStep();
      }, step.duration);

      return stepTimer;
    };

    runNextStep();
  }, [loginStep]);

  useEffect(() => {
    if (loginStep === 'processing' && completedSteps.length === PROCESS_STEPS.length) {
      const redirectTimer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('auth:redirect-to-dashboard'));
      }, 600);
      return () => clearTimeout(redirectTimer);
    }
  }, [completedSteps, loginStep]);

  const handleOtpSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (localOtp.length === 6) {
      setIsVerifying(true);
      setTimeout(() => {
        setIsVerifying(false);
        onVerifyOtp?.(e);
      }, 2500);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digits = localOtp.split('');
    digits[index] = value.replace(/\D/g, '');
    const newOtp = digits.join('').slice(0, 6);
    setLocalOtp(newOtp);
    onLoginOtpChange?.(newOtp);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !localOtp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setLocalOtp(pastedData);
    onLoginOtpChange?.(pastedData);
    if (pastedData.length === 6) {
      otpInputRefs.current[5]?.focus();
    } else {
      otpInputRefs.current[pastedData.length]?.focus();
    }
  };

  const handleGoogleLogin = () => {
    const state = createGoogleAuthState();
    sessionStorage.setItem(GOOGLE_AUTH_STATE_KEY, state);
    localStorage.setItem(GOOGLE_AUTH_STATE_KEY, state);

    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      import.meta.env.REACT_APP_GOOGLE_CLIENT_ID ||
      '';

    const redirectUri = getGoogleRedirectUri();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'id_token token',
      scope: 'email profile',
      state: state,
      prompt: 'select_account',
      nonce: state,
    });

    window.location.href =
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  useEffect(() => {
    const savedEmail = localStorage.getItem('userEmail');
    const savedPassword = localStorage.getItem('userPassword');

    if (savedEmail && authMode === 'login') {
      onEmailChange(savedEmail);
      if (savedPassword) {
        onPasswordChange(savedPassword);
      }
    }
  }, [authMode, onEmailChange, onPasswordChange]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-6 md:px-8">
      {/* ── Background ─────────────────────────────────────────────── */}
      <img
        className="absolute inset-0 h-full w-full object-cover"
        src={Fivel}
        alt=""
        draggable={false}
      />
      <div className="absolute inset-0 bg-slate-950/70" />
      <StarsBackground
        starColor="#FFFFFF"
        className={cn(
          'pointer-events-none absolute inset-0 z-[1] opacity-60',
          'bg-[radial-gradient(ellipse_at_bottom,_#0B7A75_0%,_#031B2E_55%,_#020617_100%)]',
        )}
      />

      {/* ── Main Card — 3D Raised ───────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[1180px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/40
        shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7),
                0_0_0_1px_rgba(255,255,255,0.04),
                inset_0_1px_0_rgba(255,255,255,0.1)]
        backdrop-blur-xl">

        <div className="grid w-full items-stretch gap-0 md:grid-cols-2">
          {/* ── Left Visual Panel ─────────────────────────────────── */}
          <div className="relative hidden min-h-[620px] w-full overflow-hidden bg-[#062c1a] md:block">
            <iframe
              title="Five-L Pharmacy introduction"
              src={pharmacyIntroUrl}
              className="absolute inset-0 h-full w-full border-0"
              sandbox="allow-scripts"
            />
          </div>

          {/* ── Right Form Panel ──────────────────────────────────── */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#04121f] via-[#0a2a30] to-[#031a2e] px-8 py-10 lg:px-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative z-10 mx-auto w-full max-w-md">
              {/* Title */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  {authMode === 'login' ? 'Welcome back' : 'Create account'}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {authMode === 'login'
                    ? 'Sign in to access your pharmacy dashboard.'
                    : 'Create an administrator account to get started.'}
                </p>
                {authMode === 'signup' && signupNotice && (
                  <p className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3.5 py-2.5 text-xs leading-5 text-cyan-100">
                    {signupNotice}
                  </p>
                )}
              </div>

              {/* ── Forgot Password / OTP / SUCCESS / PROCESSING ──────────────────────────── */}
              {(forgotStep === 'request' ||
                forgotStep === 'reset' ||
                (forgotStep === 'none' && loginStep === 'otp') ||
                (forgotStep === 'none' && loginStep === 'success') ||
                (forgotStep === 'none' && loginStep === 'processing')) ? (
                <div className="space-y-6">
                  {/* Request Reset */}
                  {forgotStep === 'request' && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-base font-semibold text-white">
                          Reset your password
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          Enter your email and we'll send you a reset code.
                        </p>
                      </div>

                      <input
                        className={cn(INPUT_BASE, forgotError ? INPUT_ERROR : INPUT_IDLE)}
                        placeholder="your@email.com"
                        type="email"
                        value={email}
                        onChange={(e) => onEmailChange(e.target.value)}
                      />

                      {forgotError && (
                        <p className="text-xs text-rose-300">{forgotError}</p>
                      )}
                      {forgotMessage && (
                        <p className="text-xs text-emerald-300">{forgotMessage}</p>
                      )}

                      {/* ✅ 3D Send Reset Code Button */}
                      <button
                        type="button"
                        onClick={onForgotRequest}
                        disabled={forgotLoading || !email.trim()}
                        className={BTN_3D_PRIMARY}
                      >
                        {forgotLoading ? 'Sending code…' : 'Send reset code'}
                      </button>

                      <button
                        type="button"
                        onClick={onCancelForgotPassword}
                        className={BTN_3D_GHOST}
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Reset Form */}
                  {forgotStep === 'reset' && (
                    <form
                      className="space-y-4"
                      onSubmit={(e) => {
                        e.preventDefault();
                        onResetPassword();
                      }}
                    >
                      <div>
                        <h3 className="text-base font-semibold text-white">
                          Set new password
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          Enter the code we emailed you along with your new password.
                        </p>
                      </div>

                      <input
                        className={cn(INPUT_BASE, INPUT_IDLE)}
                        placeholder="Reset code"
                        value={resetCode}
                        onChange={(e) => onResetCodeChange(e.target.value)}
                      />
                      <input
                        className={cn(INPUT_BASE, INPUT_IDLE)}
                        type="password"
                        placeholder="New password"
                        value={resetNewPassword}
                        onChange={(e) => onResetNewPasswordChange(e.target.value)}
                      />
                      <input
                        className={cn(INPUT_BASE, INPUT_IDLE)}
                        type="password"
                        placeholder="Confirm new password"
                        value={resetConfirmPassword}
                        onChange={(e) => onResetConfirmPasswordChange(e.target.value)}
                      />

                      {/* ✅ 3D Reset Password Button */}
                      <button
                        type="submit"
                        disabled={forgotLoading}
                        className={BTN_3D_PRIMARY}
                      >
                        {forgotLoading ? 'Resetting…' : 'Reset password'}
                      </button>

                      <button
                        type="button"
                        onClick={onCancelForgotPassword}
                        className={BTN_3D_GHOST}
                      >
                        Cancel
                      </button>
                    </form>
                  )}

                  {/* ── OTP Verification ─────────────────── */}
                  {forgotStep === 'none' && loginStep === 'otp' && (
                    <form onSubmit={handleOtpSubmit} className="space-y-5">
                      <div className="space-y-1">
                        <Label className="text-sm font-semibold text-white">
                          Verify your account
                        </Label>
                        <p className="text-sm text-slate-400">
                          We sent a 6-digit code to your email. Enter it below to continue.
                        </p>
                      </div>

                      <div className="relative mx-auto w-full max-w-[360px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 p-6
                        shadow-[0_8px_32px_0_rgba(0,0,0,0.37),
                               0_0_0_1px_rgba(255,255,255,0.04),
                               inset_0_1px_0_rgba(255,255,255,0.1)]
                        backdrop-blur-xl">
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />

                        <div className="relative z-10 flex flex-col items-center text-center">
                          <h3 className="mb-1 text-xl font-bold tracking-tight text-white">
                            Verify OTP
                          </h3>
                          <p className="mb-5 text-xs text-slate-400">
                            Enter the 6-digit security code sent to your device
                          </p>

                          {/* ✅ 3D OTP Input Boxes */}
                          <div className="mb-5 flex justify-center gap-1.5">
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                              <input
                                key={index}
                                ref={(el) => (otpInputRefs.current[index] = el)}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={localOtp[index] || ''}
                                onChange={(e) => handleOtpChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={index === 0 ? handlePaste : undefined}
                                className={`h-12 w-11 rounded-lg border text-center text-lg font-bold outline-none transition-all duration-150 focus:ring-4 ${
                                  otpError
                                    ? 'border-rose-500/60 bg-rose-500/10 text-rose-300 focus:border-rose-500 focus:ring-rose-500/15 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)]'
                                    : localOtp[index]
                                      ? 'border-emerald-500/70 bg-emerald-500/15 text-white focus:border-emerald-500 focus:ring-emerald-500/20 shadow-[0_3px_0_0_#047857,inset_0_1px_0_rgba(255,255,255,0.15),0_4px_8px_-2px_rgba(5,150,105,0.35)]'
                                      : 'border-slate-700/80 bg-slate-900/70 text-white hover:border-emerald-500/40 hover:-translate-y-[1px] focus:border-emerald-500 focus:ring-emerald-500/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(0,0,0,0.4),0_1px_0_rgba(255,255,255,0.05)]'
                                }`}
                                autoFocus={index === 0}
                                disabled={otpLoading || isVerifying}
                              />
                            ))}
                          </div>

                          {otpError && (
                            <p className="mb-4 text-center text-xs text-rose-300">{otpError}</p>
                          )}

                          {isVerifying ? (
                            <div className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/20 px-4 py-2.5 text-sm font-semibold text-yellow-300 shadow-[0_3px_0_0_rgba(161,98,7,0.5),inset_0_1px_0_rgba(255,255,255,0.15)]">
                              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Verifying Code...
                            </div>
                          ) : (
                            /* ✅ 3D Verify Code Button */
                            <button
                              type="submit"
                              disabled={otpLoading || localOtp.length < 6}
                              className={`${BTN_3D_PRIMARY} mb-4 !py-2.5`}
                            >
                              {otpLoading ? 'Verifying…' : 'Verify code'}
                            </button>
                          )}

                          <p className="mb-2 text-xs text-slate-500">
                            Didn't receive the code? Resend in 00:{countdown.toString().padStart(2, '0')}
                          </p>

                          <button
                            type="button"
                            onClick={onCancelOtp}
                            className={`${BTN_3D_GHOST} !py-1.5`}
                          >
                            Back to sign in
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* ── GLASSY SUCCESS ANIMATION ─────────────────── */}
                  {forgotStep === 'none' && loginStep === 'success' && (
                    <div className="flex flex-col items-center justify-center space-y-6 py-4 animate-in fade-in zoom-in duration-500">
                      <div className="relative w-full max-w-[360px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 p-6
                        shadow-[0_8px_32px_0_rgba(0,0,0,0.37),
                               0_0_0_1px_rgba(255,255,255,0.04),
                               inset_0_1px_0_rgba(255,255,255,0.1)]
                        backdrop-blur-xl">
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />

                        <div className="relative z-10 flex flex-col items-center text-center">
                          <h3 className="mb-1 text-xl font-bold tracking-tight text-white">
                            Verified Successfully
                          </h3>
                          <p className="mb-6 text-xs text-slate-400">
                            Your security verification code has been confirmed.
                          </p>

                          <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                            <div className="absolute inset-0 rounded-2xl bg-emerald-400/20 blur-md animate-pulse" />
                            <svg
                              className="relative h-8 w-8 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-in zoom-in duration-500 delay-200"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>

                          <p className="mb-4 text-xs text-slate-500">
                            Didn't receive the code? Resend in 00:{countdown.toString().padStart(2, '0')}
                          </p>

                          <button
                            type="button"
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/30 hover:-translate-y-[1px] active:translate-y-[1px]"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Verified & Secured
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── PROCESSING ANIMATION ─────────────────── */}
                  {forgotStep === 'none' && loginStep === 'processing' && (
                    <div className="flex flex-col items-center justify-center space-y-6 py-4 animate-in fade-in duration-500">
                      <div className="relative w-full max-w-[380px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 p-6
                        shadow-[0_8px_32px_0_rgba(0,0,0,0.37),
                               0_0_0_1px_rgba(255,255,255,0.04),
                               inset_0_1px_0_rgba(255,255,255,0.1)]
                        backdrop-blur-xl">
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />

                        <div className="relative z-10 flex flex-col items-center">
                          {/* Animated Logo/Spinner */}
                          <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20" />
                            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-emerald-400 border-r-emerald-400/50" style={{ animationDuration: '1s' }} />

                            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                              <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" style={{ animationDuration: '1.5s' }} />
                              <svg className="relative h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>

                          <h3 className="mb-1 text-lg font-bold tracking-tight text-white">
                            Signing you in
                          </h3>
                          <p className="mb-5 text-xs text-slate-400">
                            Please wait while we prepare your dashboard
                          </p>

                          <div className="mb-5 w-full">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(52,211,153,0.6)]"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <p className="mt-2 text-right text-[10px] font-medium text-slate-500">
                              {Math.round(progress)}%
                            </p>
                          </div>

                          <div className="w-full space-y-2.5">
                            {PROCESS_STEPS.map((step, index) => {
                              const isDone = completedSteps.includes(index);
                              const isActive = currentStep === index && !isDone;

                              return (
                                <div
                                  key={index}
                                  className={`flex items-center gap-3 transition-all duration-300 ${
                                    isDone ? 'opacity-100' : isActive ? 'opacity-100' : 'opacity-40'
                                  }`}
                                >
                                  <div className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border transition-all duration-300 ${
                                    isDone
                                      ? 'border-emerald-500/60 bg-emerald-500/20 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                                      : isActive
                                        ? 'border-emerald-400 bg-emerald-400/20 shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                                        : 'border-slate-700 bg-slate-800/50'
                                  }`}>
                                    {isDone ? (
                                      <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : isActive ? (
                                      <svg className="h-2.5 w-2.5 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                    ) : (
                                      <div className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                                    )}
                                  </div>

                                  <p className={`text-xs font-medium transition-colors duration-300 ${
                                    isDone ? 'text-emerald-300' : isActive ? 'text-white' : 'text-slate-500'
                                  }`}>
                                    {step.label}
                                    {isActive && <span className="ml-1 animate-pulse">...</span>}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 animate-pulse">
                        Redirecting to dashboard...
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Login / Signup Form ──────────────────────────── */
                <form onSubmit={onSubmit} className="space-y-5">
                  {authMode === 'signup' && (
                    <div>
                      <label className={LABEL_CLASS}>Full name</label>
                      <input
                        className={cn(INPUT_BASE, INPUT_IDLE)}
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => onFullNameChange(e.target.value)}
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className={LABEL_CLASS}>
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Stephanie22@.com"
                      value={email}
                      onChange={(e) => onEmailChange(e.target.value)}
                      required
                      className={cn(INPUT_BASE, INPUT_IDLE)}
                    />
                  </div>

                  <div className="relative">
                    <label htmlFor="password" className={LABEL_CLASS}>
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => onPasswordChange(e.target.value)}
                      required
                      className={cn(INPUT_BASE, INPUT_IDLE, 'pr-12')}
                    />
                    <button
                      type="button"
                      id="togglePassword"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      className={`absolute right-2.5 top-[38px] z-10 rounded-lg p-1.5 text-slate-400 transition-all duration-150 hover:text-white hover:bg-white/5 active:translate-y-[1px] ${FOCUS_RING}`}
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {authMode === 'signup' && (
                    <div>
                      <label htmlFor="confirm-password" className={LABEL_CLASS}>
                        Confirm password
                      </label>
                      <input
                        id="confirm-password"
                        name="confirmPassword"
                        type="password"
                        placeholder="Re-enter your password"
                        value={confirmPassword}
                        onChange={(e) => onConfirmPasswordChange(e.target.value)}
                        required
                        className={cn(INPUT_BASE, INPUT_IDLE)}
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                      <input
                        id="remember"
                        name="remember"
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
                      />
                      Remember me
                    </label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={onStartForgotPassword}
                        className={`ml-auto rounded-lg px-2.5 py-1 text-sm font-medium text-emerald-300 transition-all duration-150 hover:text-emerald-200 hover:bg-emerald-500/10 active:translate-y-[1px] ${FOCUS_RING}`}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>

                  {authError && (
                    <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2),0_1px_0_rgba(255,255,255,0.04)]">
                      <svg
                        className="mt-0.5 h-4 w-4 flex-none text-rose-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                        />
                      </svg>
                      <p className="text-sm leading-snug text-rose-200">{authError}</p>
                    </div>
                  )}

                  {/* ✅ 3D Main Submit Button */}
                  <button
                    type="submit"
                    disabled={authLoading}
                    className={BTN_3D_PRIMARY}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                    />
                    <span className="relative z-10">
                      {authLoading
                        ? 'Signing in…'
                        : authMode === 'signup'
                          ? 'Create account'
                          : 'Sign in'}
                    </span>
                  </button>

                  {authMode === 'signup' && showSignupOption && (
                    <button
                      type="button"
                      onClick={onToggleMode}
                      className={BTN_3D_GHOST}
                    >
                      Already have an account? Sign in
                    </button>
                  )}

                  {authMode === 'login' && (
                    <>
                      <div className="my-6 flex items-center gap-4">
                        <hr className="w-full border-slate-700/60" />
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                          or
                        </p>
                        <hr className="w-full border-slate-700/60" />
                      </div>

                      {/* ✅ 3D Google Login Button */}
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className={BTN_3D_GOOGLE}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 512 512"
                          aria-hidden="true"
                        >
                          <path fill="#fbbd00" d="M120 256c0-25.367 6.989-49.13 19.131-69.477v-86.308H52.823C18.568 144.703 0 198.922 0 256s18.568 111.297 52.823 155.785h86.308v-86.308C126.989 305.13 120 281.367 120 256z" />
                          <path fill="#0f9d58" d="m256 392-60 60 60 60c57.079 0 111.297-18.568 155.785-52.823v-86.216h-86.216C305.044 385.147 281.181 392 256 392z" />
                          <path fill="#31aa52" d="m139.131 325.477-86.308 86.308a260.085 260.085 0 0 0 22.158 25.235C123.333 485.371 187.62 512 256 512V392c-49.624 0-93.117-26.72-116.869-66.523z" />
                          <path fill="#3c79e6" d="M512 256a258.24 258.24 0 0 0-4.192-46.377l-2.251-12.299H256v120h121.452a135.385 135.385 0 0 1-51.884 55.638l86.216 86.216a260.085 260.085 0 0 0 25.235-22.158C485.371 388.667 512 324.38 512 256z" />
                          <path fill="#cf2d48" d="m352.167 159.833 10.606 10.606 84.853-84.852-10.606-10.606C388.668 26.72 324.381 0 256 0l-60 60 60 60c36.326 0 70.479 14.146 96.167 39.833z" />
                          <path fill="#eb4132" d="M256 120V0C187.62 0 123.333 26.629 74.98 74.98a259.849 259.849 0 0 0-22.158 25.235l86.308 86.308C162.989 146.72 206.376 120 256 120z" />
                        </svg>
                        Continue with Google
                      </button>
                    </>
                  )}
                </form>
              )}

              {authMode === 'signup' && showSignupOption && (
                <div className="mt-6 text-center text-sm text-slate-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={onToggleMode}
                    className={`rounded px-2 py-1 font-medium text-emerald-300 transition-all duration-150 hover:text-emerald-200 hover:bg-emerald-500/10 active:translate-y-[1px] ${FOCUS_RING}`}
                  >
                    Sign in
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}