/**
 * TeamCodeScreen - Team code input to join a team
 * Requirements: 3.1, 3.2, 3.4
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { joinTeam, createTeam } from '../../services/supabase/teamService';
import { createRoleRequest } from '../../services/supabase/roleRequestService';
import { validateTeamCodeFormat } from '../../utils/teamCode';
import { useAuth } from '../../contexts/AuthContext';

const CODE_LENGTH = 8;

export default function TeamCodeScreen() {
  const { profile, setAuthStep, refreshTeams, signOut } = useAuth();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');

  // Role Request State
  const [showRoleRequest, setShowRoleRequest] = useState(false);
  const [roleRequestSent, setRoleRequestSent] = useState(false);

  // Handle Role Request
  const handleRoleRequest = async (role: 'owner' | 'bdm') => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await createRoleRequest(role);
      if (result.success) {
        setRoleRequestSent(true);
      } else {
        setError(result.error || 'Failed to submit request');
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Check if user can create teams (Owner or BDM)
  const canCreateTeam = profile?.role && ['dev', 'owner', 'bdm'].includes(profile.role);

  // Format code for display (uppercase)
  const formatCode = (value: string) => {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setCode(formatted);
    setError(null);
  };

  // Join team with code
  const handleJoinTeam = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError('Please enter a team code');
      return;
    }

    if (!validateTeamCodeFormat(code)) {
      setError('Team code must be 8 alphanumeric characters');
      return;
    }

    setIsLoading(true);

    try {
      const result = await joinTeam(code);

      if (result.success) {
        await refreshTeams();
        setAuthStep('authenticated');
      } else {
        setError(result.error || 'Invalid team code');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [code, setAuthStep, refreshTeams]);

  // Create new team
  const handleCreateTeam = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!teamName.trim()) {
      setError('Please enter a team name');
      return;
    }

    if (teamName.trim().length < 2) {
      setError('Team name must be at least 2 characters');
      return;
    }

    setIsLoading(true);

    try {
      const result = await createTeam({
        name: teamName.trim(),
        description: teamDescription.trim() || undefined,
      });

      if (result.success) {
        await refreshTeams();
        setAuthStep('authenticated');
      } else {
        setError(result.error || 'Failed to create team');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [teamName, teamDescription, setAuthStep, refreshTeams]);

  // Handle sign out
  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        {/* Team Code Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/20 p-6 sm:p-8">
          {!showRoleRequest && (!showCreateTeam ? (
            <>
              {/* Join Team View */}
              <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600 dark:text-purple-400">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-slate-800 dark:text-white text-center mb-2">
                Join your team
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-6">
                Enter the team code shared by your team leader
              </p>

              <form onSubmit={handleJoinTeam} className="space-y-4">
                {/* Team Code Input */}
                <div>
                  <label
                    htmlFor="teamCode"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Team Code
                  </label>
                  <input
                    ref={inputRef}
                    id="teamCode"
                    type="text"
                    placeholder="ABCD1234"
                    value={code}
                    onChange={handleCodeChange}
                    disabled={isLoading}
                    maxLength={CODE_LENGTH}
                    className={`
                      w-full px-4 py-3 
                      text-center text-xl font-mono font-bold tracking-widest
                      border rounded-xl 
                      text-slate-800 dark:text-white
                      placeholder-slate-300 dark:placeholder-slate-600
                      bg-slate-50 dark:bg-slate-700/50
                      focus:bg-white dark:focus:bg-slate-700
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all uppercase
                      ${error ? 'border-red-300 dark:border-red-500' : 'border-slate-200 dark:border-slate-600'}
                    `}
                  />
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 text-center">
                    8 characters, letters and numbers
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400 text-center flex items-center justify-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" x2="12" y1="8" y2="12" />
                      <line x1="12" x2="12.01" y1="16" y2="16" />
                    </svg>
                    {error}
                  </p>
                )}

                {/* Join Button */}
                <button
                  type="submit"
                  disabled={isLoading || code.length !== CODE_LENGTH}
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
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Joining...
                    </>
                  ) : (
                    <>
                      Join Team
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {/* Create Team Option (for authorized users) */}
              {canCreateTeam && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-3">
                    Or create a new team
                  </p>
                  <button
                    onClick={() => { setShowCreateTeam(true); setError(null); }}
                    className="w-full py-2.5 px-4 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    Create New Team
                  </button>

                  {/* Skip option for admin roles */}
                  <button
                    onClick={() => setAuthStep('authenticated')}
                    className="w-full mt-3 py-2.5 px-4 text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    Skip for now — I'll join a team later
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Create Team View */}
              <button
                onClick={() => { setShowCreateTeam(false); setError(null); }}
                className="mb-4 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 19-7-7 7-7" />
                  <path d="M19 12H5" />
                </svg>
                Back
              </button>

              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" x2="19" y1="8" y2="14" />
                  <line x1="22" x2="16" y1="11" y2="11" />
                </svg>
              </div>

              <h2 className="text-xl font-bold text-slate-800 dark:text-white text-center mb-2">
                Create a team
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-6">
                Set up a new team and invite members
              </p>

              <form onSubmit={handleCreateTeam} className="space-y-4">
                {/* Team Name */}
                <div>
                  <label
                    htmlFor="teamName"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Team Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="teamName"
                    type="text"
                    placeholder="e.g., Downtown Fundraisers"
                    value={teamName}
                    onChange={e => { setTeamName(e.target.value); setError(null); }}
                    disabled={isLoading}
                    className={`
                      w-full px-4 py-3 
                      border rounded-xl 
                      text-slate-800 dark:text-white
                      placeholder-slate-400
                      bg-slate-50 dark:bg-slate-700/50
                      focus:bg-white dark:focus:bg-slate-700
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all
                      ${error && !teamName.trim() ? 'border-red-300 dark:border-red-500' : 'border-slate-200 dark:border-slate-600'}
                    `}
                  />
                </div>

                {/* Team Description */}
                <div>
                  <label
                    htmlFor="teamDescription"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Description <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    id="teamDescription"
                    placeholder="Brief description of your team..."
                    value={teamDescription}
                    onChange={e => setTeamDescription(e.target.value)}
                    disabled={isLoading}
                    rows={3}
                    className="w-full px-4 py-3 border rounded-xl text-slate-800 dark:text-white placeholder-slate-400 bg-slate-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all border-slate-200 dark:border-slate-600 resize-none"
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" x2="12" y1="8" y2="12" />
                      <line x1="12" x2="12.01" y1="16" y2="16" />
                    </svg>
                    {error}
                  </p>
                )}

                {/* Create Button */}
                <button
                  type="submit"
                  disabled={isLoading || !teamName.trim()}
                  className={`
                    w-full py-3 px-4 
                    bg-green-600 hover:bg-green-700 
                    text-white font-semibold 
                    rounded-xl 
                    shadow-lg shadow-green-200 dark:shadow-green-900/30
                    focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all active:scale-[0.98]
                    flex items-center justify-center gap-2
                  `}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Team
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </>
          ))}

          {/* Role Request Modal State */}
          {!showCreateTeam && !showRoleRequest && (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
              <button
                onClick={() => { setShowRoleRequest(true); setError(null); }}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                I am a Business Owner / BDM
              </button>
            </div>
          )}

          {/* Role Request View */}
          {showRoleRequest && (
            <>
              <button
                onClick={() => { setShowRoleRequest(false); setError(null); setRoleRequestSent(false); }}
                className="mb-4 flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 19-7-7 7-7" />
                  <path d="M19 12H5" />
                </svg>
                Back
              </button>

              {!roleRequestSent ? (
                <>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white text-center mb-2">
                    Request Admin Access
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-6">
                    Select the role you are requesting. This will be verified by the administrator.
                  </p>

                  <div className="space-y-3">
                    <button
                      onClick={() => handleRoleRequest('owner')}
                      disabled={isLoading}
                      className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-left group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800 dark:text-white">Owner</span>
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 group-hover:border-blue-500" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Full control over teams and campaigns.</p>
                    </button>

                    <button
                      onClick={() => handleRoleRequest('bdm')}
                      disabled={isLoading}
                      className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-purple-500 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-all text-left group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800 dark:text-white">Business Development Manager</span>
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 group-hover:border-purple-500" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Manage multiple teams and view analytics.</p>
                    </button>
                  </div>

                  {error && (
                    <p className="mt-4 text-sm text-red-600 dark:text-red-400 text-center">
                      {error}
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Request Sent!</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">
                    Your request has been submitted for approval. You will have access once an verify your role.
                  </p>
                  <button
                    onClick={handleSignOut}
                    className="py-2 px-6 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Back to Login
                  </button>
                </div>
              )}
            </>
          )}

          {/* Progress Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <div className="w-2 h-2 rounded-full bg-blue-600" />
          </div>
          <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-2">
            Step 3 of 3: Join Team
          </p>

          {/* Sign Out Option */}
          <div className="mt-6 text-center">
            <button
              onClick={handleSignOut}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Sign out and use a different account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
