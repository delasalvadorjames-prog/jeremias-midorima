import { useEffect, useState } from 'react';
import FiveLLogo from '../assets/Fivel.png';
import { StarsBackground } from '@/components/animate-ui/components/backgrounds/stars';

type Step = { label: string; duration: number };

type Props = {
  isOpen: boolean;
  onComplete?: () => void;
  steps?: Step[];
  title?: string;
  subtitle?: string;
  userName?: string;
};

const DEFAULT_STEPS: Step[] = [
  { label: 'Verifying credentials', duration: 800 },
  { label: 'Loading your profile', duration: 900 },
  { label: 'Fetching inventory data', duration: 1000 },
  { label: 'Preparing dashboard', duration: 800 },
];

export default function ProcessingModalProfessional({
  isOpen,
  onComplete,
  steps = DEFAULT_STEPS,
  title = 'Signing you in',
  subtitle = 'Please wait while we prepare your dashboard',
  userName,
}: Props) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setCurrentStep(0);
      setCompletedSteps([]);
      setIsDone(false);
      return;
    }

    let stepIndex = 0;
    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0);
    const timers: ReturnType<typeof setTimeout>[] = [];

    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 100 : prev + 1));
    }, totalDuration / 100);

    const runNextStep = () => {
      if (stepIndex >= steps.length) {
        clearInterval(progressInterval);
        setProgress(100);
        setIsDone(true);
        timers.push(setTimeout(() => onComplete?.(), 900));
        return;
      }

      const step = steps[stepIndex];
      setCurrentStep(stepIndex);
      timers.push(
        setTimeout(() => {
          setCompletedSteps((prev) => [...prev, stepIndex]);
          stepIndex += 1;
          runNextStep();
        }, step.duration)
      );
    };

    runNextStep();
    return () => {
      clearInterval(progressInterval);
      timers.forEach((t) => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const progressPercent = Math.min(progress, 100);

  return (
    <div
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-hidden bg-[#030a14] px-4 py-8 animate-in fade-in duration-300"
      role="status"
      aria-live="polite"
      aria-label={isDone ? 'Login complete' : title}
    >
      {/* ── Background Layers ─────────────────────────── */}
      <img className="absolute inset-0 h-full w-full object-cover" src={FiveLLogo} alt="" draggable={false} />
      <div className="absolute inset-0 bg-slate-950/70" />
      <StarsBackground
        starColor="#FFFFFF"
        className="pointer-events-none absolute inset-0 z-[1] opacity-60 bg-[radial-gradient(ellipse_at_bottom,_#0B7A75_0%,_#031B2E_55%,_#020617_100%)]"
      />
      <div className="pointer-events-none absolute inset-0 z-[2] bg-slate-950/25" />

      {/* ── Main Card ─────────────────────────── */}
      <div className="relative z-10 w-full max-w-[900px] animate-in zoom-in-95 duration-500">
        <div className="overflow-hidden rounded-[2rem] border border-white/[0.14] bg-slate-900/75 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.95),inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-2xl">
          {/* Top accent line */}
          <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-cyan-400/0" />

          {/* ── Header ─────────────────────────── */}
          <div className="flex items-center gap-3.5 border-b border-white/[0.06] px-7 py-5">
            <div className="relative flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_0_24px_rgba(16,185,129,0.3)]">
              <div className="absolute inset-0 rounded-xl bg-emerald-300/30 blur-md" />
              <svg
                className="relative h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-400/90">
                Five L Pharmacy
              </p>
              <p className="mt-0.5 truncate text-[13px] font-medium text-slate-400">
                Secure Authentication
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-2.5 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                Secure
              </span>
            </div>
          </div>

          {/* ── Body ─────────────────────────── */}
          <div className="grid items-center gap-8 px-7 py-8 sm:px-10 sm:py-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:px-12">
            {/* Circular Progress */}
            <div className="flex flex-col items-center lg:border-r lg:border-white/[0.08] lg:pr-12">
              <div className="relative mb-6 flex h-[148px] w-[148px] items-center justify-center">
                {/* Outer ring glow */}
                <div className="absolute inset-0 rounded-full bg-emerald-500/[0.06] blur-2xl" />

                {/* Rotating accent dot */}
                {!isDone && (
                  <div
                    className="absolute inset-0 animate-spin"
                    style={{ animationDuration: '2.5s' }}
                  >
                    <div className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
                  </div>
                )}

                {/* SVG ring */}
                <svg
                  className="absolute inset-0 h-full w-full -rotate-90"
                  viewBox="0 0 128 128"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient
                      id="pro-progress-gradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="50%" stopColor="#2dd4bf" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                    <filter id="pro-glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {/* Track */}
                  <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    fill="none"
                    stroke="rgba(71, 85, 105, 0.28)"
                    strokeWidth="5"
                  />
                  {/* Progress */}
                  <circle
                    cx="64"
                    cy="64"
                    r={radius}
                    fill="none"
                    stroke="url(#pro-progress-gradient)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-200 ease-out"
                    filter="url(#pro-glow)"
                  />
                </svg>

                {/* Center content */}
                <div className="relative flex flex-col items-center">
                  {isDone ? (
                    <div className="animate-in zoom-in duration-500">
                      <svg
                        className="h-12 w-12 text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.9)]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  ) : (
                    <>
                      <span className="text-[2.5rem] font-bold leading-none tracking-tighter text-white tabular-nums">
                        {progressPercent}
                      </span>
                      <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500">
                        percent
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Title */}
              <h1 className="text-[1.4rem] font-bold tracking-tight text-white">
                {isDone ? 'Access Confirmed' : title}
              </h1>
              <p className="mt-2 max-w-[290px] text-center text-[13px] leading-relaxed text-slate-400">
                {isDone
                  ? 'Your secure session is ready. Redirecting now.'
                  : userName
                    ? `Welcome back, ${userName}. ${subtitle}`
                    : subtitle}
              </p>
            </div>

            {/* ── Steps Panel ─────────────────────────── */}
            <div className="mt-0 overflow-hidden rounded-2xl border border-white/[0.1] bg-slate-950/50">
              {/* Panel header */}
              <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-3.5 w-3.5 text-slate-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Authentication Status
                  </p>
                </div>
                <p
                  className={`text-[11px] font-bold tabular-nums ${
                    isDone ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {isDone ? 'COMPLETE' : `${progressPercent}%`}
                </p>
              </div>

              {/* Steps list */}
              <div className="space-y-0.5 p-3">
                {steps.map((step, index) => {
                  const isStepDone = completedSteps.includes(index);
                  const isActive = currentStep === index && !isStepDone;
                  const isPending = !isStepDone && !isActive;

                  return (
                    <div
                      key={step.label}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-500 ${
                        isActive ? 'bg-emerald-500/[0.06]' : 'bg-transparent'
                      }`}
                    >
                      {/* Icon */}
                      <div className="relative flex h-6 w-6 flex-none items-center justify-center">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-500 ${
                            isStepDone
                              ? 'border-emerald-400/50 bg-emerald-400/15'
                              : isActive
                                ? 'border-emerald-400 bg-emerald-400/10 shadow-[0_0_16px_rgba(52,211,153,0.3)]'
                                : 'border-slate-700/80 bg-slate-800/60'
                          }`}
                        >
                          {isStepDone ? (
                            <svg
                              className="h-3.5 w-3.5 animate-in zoom-in duration-300 text-emerald-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : isActive ? (
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                            </span>
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                          )}
                        </div>
                      </div>

                      {/* Label */}
                      <p
                        className={`flex-1 text-[13px] transition-colors duration-500 ${
                          isStepDone
                            ? 'font-medium text-emerald-200'
                            : isActive
                              ? 'font-semibold text-white'
                              : 'font-normal text-slate-500'
                        }`}
                      >
                        {step.label}
                        {isActive && (
                          <span className="ml-1 inline-flex animate-pulse text-emerald-400">
                            ...
                          </span>
                        )}
                      </p>

                      {/* Status badge */}
                      {isStepDone && (
                        <span className="animate-in fade-in slide-in-from-right-2 text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-400/70 duration-300">
                          Done
                        </span>
                      )}
                      {isActive && (
                        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-emerald-300">
                          Active
                        </span>
                      )}
                      {isPending && (
                        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">
                          Pending
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Footer ─────────────────────────── */}
          <div className="flex items-center justify-between border-t border-white/[0.05] bg-slate-950/30 px-7 py-4">
            <div className="flex items-center gap-2">
              <svg
                className="h-3 w-3 text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <p className="text-[10px] font-medium text-slate-600">
                End-to-end encrypted
              </p>
            </div>
            <p className="text-[10px] text-slate-700">
              © {new Date().getFullYear()} Five L Pharmacy
            </p>
          </div>
        </div>

        {/* Status hint below card */}
        <p className="mt-5 text-center text-[11px] font-medium tracking-wide text-slate-600">
          {isDone
            ? 'Redirecting to your dashboard...'
            : 'Please do not close this window'}
        </p>
      </div>
    </div>
  );
}
