/**
 * AdminDashboard - Landing page for Dev, Owner, and BDM roles
 * Shows team management, analytics, and campaign overview
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Building2, Briefcase, TrendingUp, Target,
  Settings, ChevronRight, Plus, BarChart3, Calendar,
  UserPlus, Share2, Award, Clock, ArrowRight, Megaphone
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Apartment, AppMode } from '../types';
import { loadCampaigns } from '../services/corporateStorageService';
import {
  getPendingRequests,
  approveRequest,
  rejectRequest,
  type RoleRequest
} from '../services/supabase/roleRequestService';
import { createAnnouncement } from '../services/supabase/announcementService';
import TeamCodeShare from './team/TeamCodeShare';
import { cn } from '../utils/cn';

interface AdminDashboardProps {
  onSelectMode: (mode: AppMode) => void;
  apartments: Apartment[];
  onQuickResume?: (apartmentId: string) => void;
}

export default function AdminDashboard({
  onSelectMode,
  apartments,
  onQuickResume
}: AdminDashboardProps) {
  const { profile, currentTeam, teams } = useAuth();

  // Role Requests State
  const [roleRequests, setRoleRequests] = useState<RoleRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // Announcement State
  const [announcementText, setAnnouncementText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showAnnouncementInput, setShowAnnouncementInput] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Load pending requests if user is dev or owner
  useEffect(() => {
    if (profile?.role === 'dev' || profile?.role === 'owner') {
      loadRequests();
    }
  }, [profile?.role]);

  const handlePostAnnouncement = async () => {
    if (!announcementText.trim() || !currentTeam) return;
    setIsPosting(true);
    try {
      const result = await createAnnouncement(currentTeam.id, announcementText.trim());
      if (result.success) {
        setAnnouncementText('');
        setShowAnnouncementInput(false);
        alert('Announcement posted!');
      } else {
        alert('Failed to post: ' + result.error);
      }
    } catch (err) {
      // ignore
    } finally {
      setIsPosting(false);
    }
  };

  const loadRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const result = await getPendingRequests();
      if (result.success && result.requests) {
        setRoleRequests(result.requests);
      }
      // Silently fail if table doesn't exist - it's optional functionality
    } catch (err) {
      console.warn('Role requests feature not available:', err);
    }
    setIsLoadingRequests(false);
  };

  const handleApproveRequest = async (request: RoleRequest) => {
    if (confirm(`Approve ${request.profiles?.name} as ${request.requested_role}?`)) {
      const result = await approveRequest(request.id, request.user_id, request.requested_role);
      if (result.success) {
        setRoleRequests(prev => prev.filter(r => r.id !== request.id));
        alert('Request approved!');
      } else {
        alert('Failed to approve: ' + result.error);
      }
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (confirm('Reject this request?')) {
      const result = await rejectRequest(requestId);
      if (result.success) {
        setRoleRequests(prev => prev.filter(r => r.id !== requestId));
      } else {
        alert('Failed to reject: ' + result.error);
      }
    }
  };

  // Calculate stats
  const residentialStats = useMemo(() => {
    let totalRaised = 0;
    let totalVisited = 0;
    let totalRooms = 0;

    apartments.forEach(apt => {
      Object.values(apt.rooms).forEach((floor: any[]) => {
        floor.forEach(room => {
          totalRooms++;
          if (room.status !== 'unvisited') totalVisited++;
          if (room.status === 'donated') totalRaised += (room.amountDonated || 0);
        });
      });
    });

    return {
      campaigns: apartments.length,
      totalRaised,
      totalVisited,
      totalRooms,
      progress: totalRooms > 0 ? Math.round((totalVisited / totalRooms) * 100) : 0
    };
  }, [apartments]);

  const corporateStats = useMemo(() => {
    const campaigns = loadCampaigns();
    let totalRaised = 0;
    let totalVisited = 0;
    let totalBusinesses = 0;

    campaigns.forEach(c => {
      c.businesses.forEach(b => {
        totalBusinesses++;
        if (b.status !== 'unvisited') totalVisited++;
        if (b.status === 'donated') totalRaised += (b.amountDonated || 0);
      });
    });

    return {
      campaigns: campaigns.length,
      totalRaised,
      totalVisited,
      totalBusinesses,
      progress: totalBusinesses > 0 ? Math.round((totalVisited / totalBusinesses) * 100) : 0
    };
  }, []);

  const totalRaised = residentialStats.totalRaised + corporateStats.totalRaised;
  const totalCampaigns = residentialStats.campaigns + corporateStats.campaigns;

  // Get role display name
  const getRoleDisplay = (role?: string) => {
    switch (role) {
      case 'dev': return 'Developer';
      case 'owner': return 'Owner';
      case 'bdm': return 'Business Development Manager';
      default: return 'Admin';
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">
                Welcome back, {profile?.name?.split(' ')[0] || 'Admin'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  {getRoleDisplay(profile?.role)}
                </span>
                {currentTeam && (
                  <span>• {currentTeam.name}</span>
                )}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAnnouncementInput(!showAnnouncementInput)}
                className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors relative"
                title="Post Announcement"
              >
                <Megaphone size={20} />
                {showAnnouncementInput && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
                )}
              </button>

              <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Settings size={20} className="text-slate-500" />
              </button>
            </div>
          </div>

          {/* Announcement Input */}
          <AnimatePresence>
            {showAnnouncementInput && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-4"
              >
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <Megaphone size={16} /> Post Team Announcement
                  </h3>
                  <textarea
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm min-h-[80px] mb-3"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowAnnouncementInput(false)}
                      className="px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePostAnnouncement}
                      disabled={isPosting || !announcementText.trim()}
                      className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {isPosting ? 'Posting...' : 'Post Message'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Raised</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">₹{totalRaised.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Target size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Campaigns</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{totalCampaigns}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <Users size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Teams</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{teams.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                <BarChart3 size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Avg Progress</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">
                  {Math.round((residentialStats.progress + corporateStats.progress) / 2)}%
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Role Requests Section - Only visible if there are pending requests */}
        {roleRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-l-4 border-l-amber-500 shadow-md"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Award size={24} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Pending Access Requests</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Review requests for Owner and BDM roles</p>
              </div>
            </div>

            <div className="space-y-3">
              {roleRequests.map((req) => (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-800 dark:text-white">{req.profiles?.name || 'Unknown User'}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium uppercase">
                        Requesting: {req.requested_role}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                      <p>{req.profiles?.phone}</p>
                      {req.profiles?.email && <p>{req.profiles.email}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveRequest(req)}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm shadow-green-200 dark:shadow-green-900/20 transition-all flex items-center gap-1"
                    >
                      <UserPlus size={16} />
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => onSelectMode('residential')}
              className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <Building2 size={20} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Residential</span>
            </button>

            <button
              onClick={() => onSelectMode('corporate')}
              className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Briefcase size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Corporate</span>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <UserPlus size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Add Member</span>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                <Share2 size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Share Code</span>
            </button>
          </div>
        </motion.div>

        {/* Campaign Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Residential Overview */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                  <Building2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white">Residential Campaigns</h3>
              </div>
              <button
                onClick={() => onSelectMode('residential')}
                className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 hover:gap-2 transition-all"
              >
                View All <ChevronRight size={16} />
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-500 dark:text-slate-400">Progress</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{residentialStats.progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${residentialStats.progress}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-lg font-bold text-slate-800 dark:text-white">{residentialStats.campaigns}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Campaigns</p>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-lg font-bold text-slate-800 dark:text-white">{residentialStats.totalVisited}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Visited</p>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">₹{(residentialStats.totalRaised / 1000).toFixed(1)}k</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Raised</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Corporate Overview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Briefcase size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-white">Corporate Campaigns</h3>
              </div>
              <button
                onClick={() => onSelectMode('corporate')}
                className="text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 hover:gap-2 transition-all"
              >
                View All <ChevronRight size={16} />
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-500 dark:text-slate-400">Progress</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{corporateStats.progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${corporateStats.progress}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-lg font-bold text-slate-800 dark:text-white">{corporateStats.campaigns}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Campaigns</p>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-lg font-bold text-slate-800 dark:text-white">{corporateStats.totalVisited}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Visited</p>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">₹{(corporateStats.totalRaised / 1000).toFixed(1)}k</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Raised</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recent Activity / Team Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Clock size={18} className="text-slate-400" />
              Recent Campaigns
            </h3>
          </div>

          {apartments.length > 0 ? (
            <div className="space-y-2">
              {apartments.slice(0, 5).map((apt) => (
                <button
                  key={apt.id}
                  onClick={() => onQuickResume?.(apt.id)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                      <Building2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-white">{apt.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{apt.floors} floors • {apt.unitsPerFloor} units/floor</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 dark:text-slate-600" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Plus size={24} className="text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">No campaigns yet</p>
              <button
                onClick={() => onSelectMode('residential')}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 font-medium"
              >
                Create your first campaign
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Share Code Modal */}
      {currentTeam && (
        <TeamCodeShare
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          team={currentTeam}
        />
      )}
    </div>
  );
}
