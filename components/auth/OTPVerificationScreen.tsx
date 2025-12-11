/**
 * OTPVerificationScreen - 6-digit OTP input and verification
 * Requirements: 1.2, 1.3
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { verifyOTP, sendOTP } from '../../services/supabase/authService';
import { useAuth } from '../../contexts/AuthContext';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30; // seconds

export default function OTPVerificationScreen() {
  const { phoneForVerification, setAuthStep } = useAuth();
  
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [isResending, setIsResending] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Handle individual digit input
  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(null);

    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === OTP_LENGTH - 1) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === OTP_LENGTH) {
        handleVerify(fullOtp);
      }
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    
    if (pastedData) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);
      
      // Focus appropriate input
      const focusIndex = Math.min(pastedData.length, OTP_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();

      // Auto-submit if complete
      if (pastedData.length === OTP_LENGTH) {
        handleVerify(pastedData);
      }
    }
  };

  // Verify OTP
  const handleVerify = useCallback(async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    
    if (code.length !== OTP_LENGTH) {
      setError('Please enter all 6 digits');
      return;
    }

    if (!phoneForVerification) {
      setError('Phone number not found. Please go back and try again.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await verifyOTP(phoneForVerification, code);
      
      if (result.success) {
        // Auth state change will be handled by AuthContext
        // The context will determine the next step (profile_setup or team_join)
        // Keep loading state true - AuthContext will handle the transition
      } else {
        setError(result.error || 'Invalid code. Please try again.');
        // Clear OTP on error
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
        setIsLoading(false);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      setIsLoading(false);
    }
    // Note: Don't set isLoading to false on success - let AuthContext handle the transition
  }, [otp, phoneForVerification]);

  // Resend OTP
  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || !phoneForVerification) return;

    setIsResending(true);
    setError(null);

    try {
      const result = await sendOTP(phoneForVerification);
      
      if (result.success) {
        setResendCooldown(RESEND_COOLDOWN);
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      } else {
        setError(result.error || 'Failed to resend code');
      }
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  }, [phoneForVerification, resendCooldown]);

  // Go back to phone input
  const handleBack = () => {
    setAuthStep('unauthenticated');
  };

  // Mask phone number for display
  const maskedPhone = phoneForVerification 
    ? phoneForVerification.replace(/(\+\d{2})(\d+)(\d{4})/, '$1 ••••• $3')
    : '';

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="mb-6 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7"/>
            <path d="M19 12H5"/>
          </svg>
          Back
        </button>

        {/* Verification Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/20 p-6 sm:p-8">
          {/* Icon */}
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
              <rect width="20" height="16" x="2" y="4" rx="2"/>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </div>

          <h2 className="text-xl font-bold text-slate-800 dark:text-white text-center mb-2">
            Verify your phone
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-6">
            We sent a 6-digit code to<br />
            <span className="font-medium text-slate-700 dark:text-slate-300">{maskedPhone}</span>
          </p>

          {/* OTP Input */}
          <div className="flex justify-center gap-2 sm:gap-3 mb-4">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                onPaste={handlePaste}
                disabled={isLoading}
                className={`
                  w-11 h-14 sm:w-12 sm:h-16
                  text-center text-xl sm:text-2xl font-bold
                  border-2 rounded-xl
                  bg-slate-50 dark:bg-slate-700/50
                  text-slate-800 dark:text-white
                  focus:bg-white dark:focus:bg-slate-700
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all
                  ${error ? 'border-red-300 dark:border-red-500' : 'border-slate-200 dark:border-slate-600'}
                  ${digit ? 'border-blue-300 dark:border-blue-500' : ''}
                `}
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center mb-4 flex items-center justify-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" x2="12" y1="8" y2="12"/>
                <line x1="12" x2="12.01" y1="16" y2="16"/>
              </svg>
              {error}
            </p>
          )}

          {/* Verify Button */}
          <button
            onClick={() => handleVerify()}
            disabled={isLoading || otp.join('').length !== OTP_LENGTH}
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
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </button>

          {/* Resend Code */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending}
              className={`
                mt-1 text-sm font-medium
                ${resendCooldown > 0 
                  ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' 
                  : 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
                }
                transition-colors
              `}
            >
              {isResending ? (
                'Sending...'
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                'Resend code'
              )}
            </button>
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
          The code expires in 5 minutes
        </p>
      </div>
    </div>
  );
}
