import { useState } from 'react';
import {
  Zap,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Target,
  FileCheck,
  Loader2,
  AlertCircle
} from 'lucide-react';

import { ThemeSwitcher, type ThemeMode } from './ThemeSwitcher';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
}

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
  onContinueAsGuest: () => void;
  themeMode?: ThemeMode;
  onThemeChange?: (mode: ThemeMode) => void;
}

export const LoginPage = ({
  onLoginSuccess,
  onContinueAsGuest,
  themeMode,
  onThemeChange
}: LoginPageProps) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (isRegister && !name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister ? { name, email, password } : { email, password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      if (rememberMe) {
        localStorage.setItem('career_craft_user', JSON.stringify(data.user));
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('alex.rivera@example.com');
    setPassword('password123');
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'alex.rivera@example.com',
          password: 'password123'
        })
      });

      const data = await response.json();
      if (response.ok && data.user) {
        if (rememberMe) {
          localStorage.setItem('career_craft_user', JSON.stringify(data.user));
        }
        onLoginSuccess(data.user);
      }
    } catch (err) {
      const demoUser: AuthUser = {
        id: 'usr_demo',
        name: 'Alex Rivera',
        email: 'alex.rivera@example.com',
        role: 'Pro Member',
        avatar: 'AR'
      };
      if (rememberMe) {
        localStorage.setItem('career_craft_user', JSON.stringify(demoUser));
      }
      onLoginSuccess(demoUser);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Background ambient orbs in blue shades */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-sky-500/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Theme Switcher Button */}
      {themeMode && onThemeChange && (
        <div className="absolute top-4 right-4 z-30">
          <ThemeSwitcher themeMode={themeMode} onThemeChange={onThemeChange} />
        </div>
      )}

      {/* Main Container Card */}
      <div className="w-full max-w-5xl glass-card rounded-3xl shadow-2xl border border-blue-900/40 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10 animate-fadeIn">
        {/* Left Side: Product Showcase & Value Proposition */}
        <div className="lg:col-span-5 p-8 sm:p-10 bg-gradient-to-br from-blue-950/80 via-slate-950/90 to-sky-950/50 border-b lg:border-b-0 lg:border-r border-blue-900/30 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-60 h-60 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/30 ring-1 ring-white/20">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-black tracking-tight text-white">CareerCraft</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    AI
                  </span>
                </div>
                <p className="text-xs text-blue-300/80 font-medium">Google XYZ Resume Suite</p>
              </div>
            </div>

            {/* Headline */}
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug mb-4">
              Turn Accomplishments into Job Offers.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-8">
              Score resumes with Google's proven <span className="text-sky-400 font-bold">Accomplished [X] as measured by [Y], by doing [Z]</span> formula, tailor for ATS match, and bypass AI detection.
            </p>

            {/* Feature Highlights */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 ring-1 ring-blue-500/30">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Google XYZ Resume Scoring</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Evaluates action verbs, quantifiable metrics, and tools.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 ring-1 ring-sky-500/30">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Targeted Job Match Rewriter</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Boosts ATS keywords and reforms bullets for target roles.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-300 flex items-center justify-center shrink-0 ring-1 ring-blue-500/30">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Deep AI Humanizer</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Removes robotic AI clichés and injects human burstiness.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* User Testimonial Pill */}
          <div className="mt-8 pt-6 border-t border-blue-900/30">
            <div className="p-3.5 rounded-2xl bg-blue-950/60 border border-blue-800/40 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-sky-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                AR
              </div>
              <div>
                <p className="text-[11px] text-slate-200 font-medium italic">
                  "Jumped my ATS score from 41% to 96% and landed 4 interviews."
                </p>
                <span className="text-[10px] text-sky-400 font-semibold block mt-0.5">
                  Alex Rivera &bull; Senior Software Engineer
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Login / Register Form */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center bg-slate-950/40">
          <div className="max-w-md w-full mx-auto">
            {/* Header / Mode Switcher */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  {isRegister ? 'Create an Account' : 'Welcome Back'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isRegister
                    ? 'Join CareerCraft AI to accelerate your career search'
                    : 'Sign in to access your resumes, scoring reports & letters'}
                </p>
              </div>

              <div className="flex bg-blue-950/50 p-1 rounded-2xl border border-blue-800/40 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setErrorMessage(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    !isRegister
                      ? 'bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setErrorMessage(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                    isRegister
                      ? 'bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            {/* Quick Demo 1-Click Login Banner */}
            {!isRegister && (
              <div className="mb-6 p-3.5 rounded-2xl bg-blue-950/50 border border-blue-500/30 flex items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Instant Demo Access</span>
                    <span className="text-[10px] text-blue-300">Test all features with 1-click login</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={isLoading}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  Demo Login
                </button>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="text-xs font-bold text-slate-200 block mb-1.5 uppercase tracking-wider">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Rivera"
                      className="w-full bg-slate-950/90 border border-blue-900/40 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition shadow-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1.5 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-slate-950/90 border border-blue-900/40 focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition shadow-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Password
                  </label>
                  {!isRegister && (
                    <button
                      type="button"
                      onClick={() => alert('Password reset link sent to demo email!')}
                      className="text-[11px] text-sky-400 hover:text-sky-300 font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950/90 border border-blue-900/40 focus:border-blue-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none transition shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-950 border-blue-900 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span>Remember me on this browser</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-2xl font-bold text-xs bg-gradient-to-r from-blue-600 via-blue-500 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white shadow-xl shadow-blue-500/25 transition cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Authenticating...
                  </>
                ) : (
                  <>
                    {isRegister ? 'Create Free Account' : 'Sign In to Workspace'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Guest Access Link */}
            <div className="mt-8 pt-6 border-t border-blue-900/30 text-center">
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="text-xs text-slate-400 hover:text-blue-300 font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
              >
                <span>Skip for now, continue as Guest</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
