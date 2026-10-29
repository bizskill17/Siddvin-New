import React, { useState } from 'react';
import Button from '../common/Button';
import { loginTeam, SessionInfo } from '../../services/dataService';

interface LoginFormProps {
  onLogin: (session: SessionInfo) => void;
  onSwitchToPropertyPortal?: () => void;
  theme?: string;
  logoDataUrl?: string;
  orgName?: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onSwitchToPropertyPortal, theme = 'terracotta', logoDataUrl, orgName = 'Sidvin' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      // The password is checked on the server; the browser never sees stored passwords.
      const session = await loginTeam(email.trim(), password);
      onLogin(session);
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sidvin-login min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8" data-color-theme={theme}>
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
	        <div className="flex justify-center">
	          <img
	            src={logoDataUrl || 'https://i.ibb.co/kVFQsG9R/Whats-App-Image-2026-04-06-at-4-35-52-PM-1.jpg'}
	            alt={`${orgName} Logo`}
	            className="h-24 w-auto object-contain"
	          />
	        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to {orgName}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="sidvin-login-card py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div>
              <Button type="submit" className="sidvin-login-submit w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
            {onSwitchToPropertyPortal && (
              <div>
                <button
                  type="button"
                  onClick={onSwitchToPropertyPortal}
                  className="w-full text-sm font-semibold text-slate-700 hover:text-slate-900 underline decoration-dotted"
                >
                  Open Property Dashboard Login
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
