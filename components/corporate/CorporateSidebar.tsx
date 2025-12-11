/**
 * CorporateSidebar Component
 * Main navigation sidebar for corporate/business campaigns
 * Requirements: 8.3
 */

import React, { useState } from 'react';
import {
  Home,
  LayoutGrid,
  Database,
  Plus,
  Briefcase,
  Trash2,
  Download,
  ChevronLeft,
  MapPin,
  FileText,
  Target,
  Users,
  Accessibility,
  Wifi,
  WifiOff,
  LogOut,
  User
} from 'lucide-react';
import { BusinessCampaign } from '../../types';
import { cn } from '../../utils/cn';
import { generateCorporatePDFReport } from '../../services/pdfService';
import { useAuth } from '../../contexts/AuthContext';
import type { ConnectionState } from '../../services/supabase/realtimeService';

interface CorporateSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onGoHome: () => void;
  viewMode: 'dashboard' | 'campaign' | 'goals' | 'team' | 'accessibility';
  setViewMode: (mode: 'dashboard' | 'campaign' | 'goals' | 'team' | 'accessibility') => void;
  selectedCampaignId: string | null;
  onSelectCampaign: (id: string | null) => void;
  campaigns: BusinessCampaign[];
  onCreateCampaign: (name: string, area: string, target: number) => void;
  onDeleteCampaign: (id: string) => void;
  onExportCSV: () => void;
  onOpenRestoration: () => void;
  connectionState?: ConnectionState;
}

export default function CorporateSidebar({
  isOpen,
  onClose,
  onGoHome,
  viewMode,
  setViewMode,
  selectedCampaignId,
  onSelectCampaign,
  campaigns,
  onCreateCampaign,
  onDeleteCampaign,
  onExportCSV,
  onOpenRestoration,
  connectionState = 'disconnected'
}: CorporateSidebarProps) {
  const { profile, currentTeam, signOut } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newTarget, setNewTarget] = useState(0);

  const handleSubmit = () => {
    if (!newName.trim()) return;
    onCreateCampaign(newName, newArea, newTarget);
    setNewName('');
    setNewArea('');
    setNewTarget(0);
    setShowCreateForm(false);
  };

  // Connection status indicator
  const ConnectionIndicator = () => {
    const isConnected = connectionState === 'connected';
    return (
      <div className={cn(
        "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full",
        isConnected 
          ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20" 
          : "text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800"
      )}>
        {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
        {isConnected ? 'Synced' : 'Offline'}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-80 bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-800 shadow-2xl md:shadow-none flex flex-col transition-transform duration-300 ease-in-out",
        "md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full md:w-0 md:overflow-hidden"
      )}
    >
      <div className="p-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-slate-800 dark:text-slate-100 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-blue-200 dark:shadow-blue-900/50 shadow-lg">
            <Briefcase size={18} strokeWidth={2.5} />
          </div>
          Corporate
        </div>
        <div className="flex items-center gap-2">
          <ConnectionIndicator />
          <button onClick={onClose} className="md:hidden text-slate-400 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
            <ChevronLeft />
          </button>
        </div>
      </div>
      
      {/* User & Team Info */}
      {profile && (
        <div className="px-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <User size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                {profile.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {currentTeam?.name || 'No team'}
              </p>
            </div>
            <button
              onClick={signOut}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="px-4 py-2 flex-1 overflow-y-auto space-y-6 custom-scrollbar">

        {/* Main Nav */}
        <div className="space-y-1">
          <button
            onClick={onGoHome}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <Home size={20} className="text-slate-400" />
            Back to Home
          </button>
          <button
            onClick={() => { setViewMode('dashboard'); onSelectCampaign(null); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
              viewMode === 'dashboard'
                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            <LayoutGrid size={20} className={viewMode === 'dashboard' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
            Dashboard
          </button>
          <button
            onClick={() => { setViewMode('goals'); onSelectCampaign(null); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
              viewMode === 'goals'
                ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            <Target size={20} className={viewMode === 'goals' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'} />
            Goals & Streaks
          </button>
          <button
            onClick={() => { setViewMode('team'); onSelectCampaign(null); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
              viewMode === 'team'
                ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            <Users size={20} className={viewMode === 'team' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'} />
            Team & Share
          </button>
          <button
            onClick={() => { setViewMode('accessibility'); onSelectCampaign(null); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
              viewMode === 'accessibility'
                ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            <Accessibility size={20} className={viewMode === 'accessibility' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'} />
            Accessibility
          </button>
          <button
            onClick={onOpenRestoration}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <Database size={20} className="text-slate-400" />
            Backup & Restore
          </button>
        </div>

        {/* Campaigns List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Campaigns</span>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 rounded-lg transition-colors"
              title="Add New Campaign"
            >
              <Plus size={16} strokeWidth={3} />
            </button>
          </div>

          {showCreateForm && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-2 space-y-3 shadow-inner">
              <input
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all placeholder:text-slate-400"
                placeholder="Campaign Name"
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
              <input
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all placeholder:text-slate-400"
                placeholder="Area / Zone (e.g. MG Road)"
                value={newArea}
                onChange={e => setNewArea(e.target.value)}
              />
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold ml-1 mb-0.5 block">Target Amount (₹)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                  value={newTarget}
                  onChange={e => setNewTarget(Number(e.target.value))}
                  placeholder="e.g. 100000"
                />
              </div>
              <button
                onClick={handleSubmit}
                className="w-full bg-blue-600 text-white text-sm py-2 rounded-lg font-bold hover:bg-blue-700 shadow-md shadow-blue-200 dark:shadow-none transition-all active:scale-95"
              >
                Create Campaign
              </button>
            </div>
          )}

          <div className="space-y-1">
            {campaigns.length === 0 && !showCreateForm && (
              <div className="text-sm text-center text-slate-400 py-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                No campaigns yet.<br />Click + to add one.
              </div>
            )}
            {campaigns.map(campaign => (
              <div
                key={campaign.id}
                className={cn(
                  "group relative flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer text-sm transition-all duration-200",
                  selectedCampaignId === campaign.id && viewMode === 'campaign'
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-200 dark:shadow-slate-800"
                    : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm hover:text-slate-900 dark:hover:text-slate-100 border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                )}
                onClick={() => onSelectCampaign(campaign.id)}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Briefcase size={18} className={cn(
                    selectedCampaignId === campaign.id ? 'text-blue-400 dark:text-blue-600' : 'text-slate-300 dark:text-slate-600 group-hover:text-blue-500'
                  )} />
                  <div className="flex flex-col truncate">
                    <span className="truncate font-semibold tracking-tight">{campaign.name}</span>
                    <span className={cn("text-[10px] flex items-center gap-1", selectedCampaignId === campaign.id ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400 dark:text-slate-500')}>
                      <MapPin size={10} />
                      {campaign.area || 'No area'} • {campaign.businesses.length} businesses
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteCampaign(campaign.id); }}
                  className={cn(
                    "p-1.5 rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-20",
                    selectedCampaignId === campaign.id
                      ? 'hover:bg-slate-800 dark:hover:bg-slate-200 text-slate-400 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-600'
                      : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 dark:text-slate-600 hover:text-red-500'
                  )}
                  title="Delete Campaign"
                >
                  <Trash2 size={14} />
                </button>

                {selectedCampaignId === campaign.id && viewMode === 'campaign' && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-blue-500 rounded-r-full"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
        {/* PDF Export Dropdown */}
        <div className="relative group">
          <button
            className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border border-slate-200 dark:border-slate-700 rounded-xl py-3 hover:bg-white dark:hover:bg-slate-800 hover:border-red-200 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400 hover:shadow-sm transition-all"
          >
            <FileText size={16} />
            Export PDF
          </button>
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <button
              onClick={() => generateCorporatePDFReport(campaigns, 'summary')}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-t-xl"
            >
              Summary Report
            </button>
            <button
              onClick={() => generateCorporatePDFReport(campaigns, 'detailed')}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Detailed Report
            </button>
            <button
              onClick={() => generateCorporatePDFReport(campaigns, 'donations')}
              className="w-full px-4 py-2.5 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-b-xl"
            >
              Donations List
            </button>
          </div>
        </div>
        <button
          onClick={onExportCSV}
          className="group w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border border-slate-200 dark:border-slate-700 rounded-xl py-3 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm transition-all"
        >
          <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" />
          Export CSV
        </button>
      </div>
    </aside>
  );
}
