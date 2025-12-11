/**
 * PhoneLoginScreen - Phone number input for OTP authentication
 * Requirements: 1.1
 */

import React, { useState, useCallback } from 'react';
import { sendOTP, validatePhoneNumber } from '../../services/supabase/authService';
import { useAuth } from '../../contexts/AuthContext';

export default function PhoneLoginScreen() {
  const { setAuthStep, setPhoneForVerification } = useAuth();
  
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Format phone for display (add spaces for readability)
  const formatDisplayPhone = (value: string) => {
    // Remove non-digits except +
    const cleaned = value.replace(/[^\d+]/g, '');
    return cleaned;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDisplayPhone(e.target.value);
    setPhone(formatted);
    setError(null);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    // Validate phone format
    if (!validatePhoneNumber(phone)) {
      setError('Please enter a valid phone number (e.g., +91 9876543210)');
      return;
    }

    setIsLoading(true);

    try {
      const result = await sendOTP(phone);
      
      if (result.success) {
        setPhoneForVerification(phone);
        setAuthStep('verifying_otp');
      } else {
        setError(result.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [phone, setAuthStep, setPhoneForVerification]);

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">DoorStep</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Door-to-door fundraising made simple</p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/20 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Welcome back</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Enter your phone number to receive a verification code
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Input */}
            <div>
              <label 
                htmlFor="phone" 
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </div>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={handlePhoneChange}
                  disabled={isLoading}
                  className={`
                    w-full pl-10 pr-4 py-3 
                    border rounded-xl 
                    text-slate-800 dark:text-white
                    placeholder-slate-400
                    bg-slate-50 dark:bg-slate-700/50
                    focus:bg-white dark:focus:bg-slate-700
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all
                    ${error ? 'border-red-300 dark:border-red-500' : 'border-slate-200 dark:border-slate-600'}
                  `}
                />
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" x2="12" y1="8" y2="12"/>
                    <line x1="12" x2="12.01" y1="16" y2="16"/>
                  </svg>
                  {error}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Include country code (e.g., +91 for India)
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !phone.trim()}
              className={`
                w-full py-3 px-4 
                bg-blue-600 hover:bg-blue-700 
                text-white font-semibold 
                rounded-xl 
                shadow-lg shadow-blue-200 dark:shadow-blue-900/30
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all active:scale-[0.98]
                flex items-center justify-center gap-2
              `}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Sending code...
                </>
              ) : (
                <>
                  Continue
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"/>
                    <path d="m12 5 7 7-7 7"/>
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
