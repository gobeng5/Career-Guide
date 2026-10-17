import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

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
      setErrorMessage('Enter your email and password.');
      return;
    }

    if (isRegister && !name.trim()) {
      setErrorMessage('Enter your full name.');
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
        throw new Error(data.error || 'Sign in failed. Check your email and password.');
      }

      if (rememberMe) {
        localStorage.setItem('career_craft_user', JSON.stringify(data.user));
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not reach the server. Check your connection and try again.');
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

  const switchMode = () => {
    setIsRegister(!isRegister);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 w-full max-w-5xl mx-auto px-5 sm:px-8 flex items-center justify-between">
        <span className="font-serif text-[19px] font-semibold tracking-tight text-ink">Career Guide</span>
        {themeMode && onThemeChange && <ThemeSwitcher themeMode={themeMode} onThemeChange={onThemeChange} />}
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-5 sm:px-8 py-8 lg:py-16 grid lg:grid-cols-[1fr_400px] gap-12 lg:gap-20 items-start">
        <section className="order-2 lg:order-1 lg:pt-6">
          <h1 className="text-[28px] sm:text-[34px] leading-[1.15] font-semibold tracking-tight text-ink max-w-md text-balance">
            Show employers what you achieved, not just what you did.
          </h1>
          <p className="mt-4 text-[15px] text-muted leading-relaxed max-w-md">
            Score your resume bullet by bullet, tailor it to a job posting, and write the cover letter that goes with
            it.
          </p>

          <figure className="paper !mx-0 !p-7 sm:!p-9 mt-10 max-w-md !text-[14.5px]">
            <p className="font-sans text-xs font-medium text-[#a8372f] mb-1.5">Before</p>
            <p className="text-[#566170]">Responsible for improving the checkout page.</p>
            <hr className="my-5 border-[#e3e6ea]" />
            <p className="font-sans text-xs font-medium text-[#1d7449] mb-1.5">After</p>
            <p>
              Raised checkout completion by 18%, measured across 40,000 monthly orders, by redesigning the payment
              flow in React.
            </p>
          </figure>
        </section>

        <section className="order-1 lg:order-2 panel p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-ink">{isRegister ? 'Create an account' : 'Sign in'}</h2>
          <p className="text-[13.5px] text-muted mt-1">
            {isRegister ? 'Keep your resumes, scores and letters in one place.' : 'Welcome back.'}
          </p>

          {errorMessage && (
            <div role="alert" className="mt-5 p-3 rounded-md bg-bad-soft text-bad text-[13px]">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isRegister && (
              <div>
                <label htmlFor="name" className="label">
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="field"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="field"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field !pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 btn btn-ghost btn-sm !px-1.5 !h-7"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-[13px] text-muted select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-accent)]"
              />
              Keep me signed in on this device
            </label>

            <button type="submit" disabled={isLoading} className="btn btn-primary w-full !h-10">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {!isRegister && (
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="btn btn-secondary w-full !h-10 mt-3"
            >
              Use the demo account
            </button>
          )}

          <div className="mt-6 pt-5 border-t border-line flex flex-wrap items-center justify-between gap-2 text-[13px]">
            <button type="button" onClick={switchMode} className="text-accent font-medium hover:underline">
              {isRegister ? 'I already have an account' : 'Create an account'}
            </button>
            <button type="button" onClick={onContinueAsGuest} className="text-muted hover:text-ink">
              Continue without an account
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
