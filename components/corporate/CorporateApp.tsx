import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../Layout';
import CorporateSidebar from './CorporateSidebar';
import CorporateCampaignView from './CorporateCampaignView';
import CorporateDashboard from './CorporateDashboard';
import MobileHeader from '../MobileHeader';
import BusinessModal from './BusinessModal';
import Modal from '../ui/Modal';
import CorporateGoalTracker from './CorporateGoalTracker';
import CorporateTeamPanel from './CorporateTeamPanel';
import AccessibilityPanel from '../AccessibilityPanel';
import { BusinessCampaign, Business } from '../../types';
import {
  loadCampaigns, saveCampaigns, createNewCampaign, createNewBusiness,
  addBusinessToCampaign, updateBusinessInCampaign, deleteBusinessFromCampaign,
  updateCampaign, exportCorporateToCSV, validateAndParseCorporateImport
} from '../../services/corporateStorageService';
import { initAccessibility } from '../../services/accessibilityService';

interface CorporateAppProps {
  onGoHome: () => void;
}

export default function CorporateApp({ onGoHome }: CorporateAppProps) {
  const [campaigns, setCampaigns] = useState<BusinessCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'campaign' | 'goals' | 'team' | 'accessibility'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<{ businessId: string; campaignId: string } | null>(null);
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<BusinessCampaign | null>(null);

  useEffect(() => {
    setCampaigns(loadCampaigns());
    initAccessibility();
    if (window.innerWidth >= 768) setIsSidebarOpen(true);
  }, []);

  useEffect(() => {
    if (campaigns.length > 0) saveCampaigns(campaigns);
  }, [campaigns]);

  useEffect(() => {
    setSearchQuery('');
  }, [selectedCampaignId]);

  const handleCreateCampaign = (name: string, area: string, target: number) => {
    const newCampaign = createNewCampaign(name, area, target);
    setCampaigns(prev => [newCampaign, ...prev]);
    setSelectedCampaignId(newCampaign.id);
    setViewMode('campaign');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleDeleteCampaign = (id: string) => {
    if (confirm("Delete this campaign and all data? This cannot be undone.")) {
      setCampaigns(prev => prev.filter(c => c.id !== id));
      if (selectedCampaignId === id) { setSelectedCampaignId(null); setViewMode('dashboard'); }
    }
  };

  const handleAddBusiness = (businessData: Omit<Business, 'id'>) => {
    if (!selectedCampaignId) return;
    const newBiz = createNewBusiness(businessData.name, businessData.category, businessData.contactPerson, businessData.phone, businessData.address);
    Object.assign(newBiz, businessData);
    setCampaigns(prev => addBusinessToCampaign(prev, selectedCampaignId, newBiz));
  };

  const handleUpdateBusiness = (businessId: string, updates: Partial<Business>) => {
    if (!editingBusiness) return;
    setCampaigns(prev => updateBusinessInCampaign(prev, editingBusiness.campaignId, businessId, updates));
  };

  const handleDeleteBusiness = (businessId: string) => {
    if (!editingBusiness) return;
    if (confirm("Delete this business?")) {
      setCampaigns(prev => deleteBusinessFromCampaign(prev, editingBusiness.campaignId, businessId));
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (!confirm("This will OVERWRITE your current data. Are you sure?")) return;
      const importedData = await validateAndParseCorporateImport(file);
      setCampaigns(importedData);
      saveCampaigns(importedData);
      alert("Data restored successfully!");
      setShowDataModal(false);
    } catch (err: any) {
      alert("Import failed: " + err.message);
    }
  };

  const activeCampaign = useMemo(() => campaigns.find(c => c.id === selectedCampaignId), [campaigns, selectedCampaignId]);
  const activeBusiness = useMemo(() => {
    if (!activeCampaign || !editingBusiness) return null;
    return activeCampaign.businesses.find(b => b.id === editingBusiness.businessId);
  }, [activeCampaign, editingBusiness]);

  return (
    <Layout isSidebarOpen={isSidebarOpen} onSidebarClose={() => setIsSidebarOpen(false)}
      sidebar={
        <CorporateSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onGoHome={onGoHome}
          viewMode={viewMode} setViewMode={setViewMode} selectedCampaignId={selectedCampaignId}
          onSelectCampaign={(id) => { setSelectedCampaignId(id); if (id) { setViewMode('campaign'); if (window.innerWidth < 768) setIsSidebarOpen(false); } }}
          campaigns={campaigns} onCreateCampaign={handleCreateCampaign} onDeleteCampaign={handleDeleteCampaign}
          onExportCSV={() => exportCorporateToCSV(campaigns)} onOpenRestoration={() => setShowDataModal(true)}
        />
      }
    >
      <MobileHeader
        title={
          viewMode === 'dashboard' ? 'Corporate Dashboard' : 
          viewMode === 'goals' ? 'Goals & Streaks' :
          viewMode === 'team' ? 'Team & Share' :
          viewMode === 'accessibility' ? 'Accessibility' :
          activeCampaign?.name || 'Corporate'
        }
        subtitle={activeCampaign && viewMode === 'campaign' ? `${activeCampaign.area} • ${activeCampaign.businesses.length} businesses` : undefined}
        onMenuClick={() => setIsSidebarOpen(true)}
        onSettingsClick={activeCampaign && viewMode === 'campaign' ? () => setEditingCampaign(activeCampaign) : undefined}
        showSearch={viewMode === 'campaign' && !!activeCampaign}
        searchQuery={searchQuery} onSearchChange={setSearchQuery} onSearchClear={() => setSearchQuery('')}
        timeFilter="all" onTimeFilterChange={() => {}}
      />

      {viewMode === 'dashboard' ? (
        <div className="h-full overflow-y-auto">
          <div className="hidden md:block px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 sticky top-0 z-10">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Corporate Overview</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Track business visits and corporate donations.</p>
          </div>
          <div className="p-4 md:p-8">
            <CorporateDashboard 
              campaigns={campaigns} 
              onBusinessClick={(bizId, campId) => {
                setSelectedCampaignId(campId);
                setViewMode('campaign');
                setEditingBusiness({ businessId: bizId, campaignId: campId });
              }}
            />
          </div>
        </div>
      ) : viewMode === 'goals' ? (
        <div className="h-full overflow-y-auto">
          <div className="hidden md:block px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 sticky top-0 z-10">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Goals & Achievements</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Track your daily targets, streaks, and unlock badges.</p>
          </div>
          <div className="p-4 md:p-8 max-w-2xl mx-auto">
            <CorporateGoalTracker campaigns={campaigns} />
          </div>
        </div>
      ) : viewMode === 'team' ? (
        <div className="h-full overflow-y-auto">
          <div className="hidden md:block px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 sticky top-0 z-10">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Team Collaboration</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage volunteers and share campaign data.</p>
          </div>
          <div className="p-4 md:p-8 max-w-2xl mx-auto">
            <CorporateTeamPanel 
              campaigns={campaigns} 
              onImportData={(imported) => {
                if (confirm('This will add imported campaigns to your existing data. Continue?')) {
                  setCampaigns(prev => [...prev, ...imported]);
                }
              }}
            />
          </div>
        </div>
      ) : viewMode === 'accessibility' ? (
        <div className="h-full overflow-y-auto">
          <div className="hidden md:block px-8 py-6 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 sticky top-0 z-10">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Accessibility Settings</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Customize the app for better usability.</p>
          </div>
          <div className="p-4 md:p-8 max-w-2xl mx-auto">
            <AccessibilityPanel />
          </div>
        </div>
      ) : activeCampaign ? (
        <CorporateCampaignView campaign={activeCampaign} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          onEditCampaign={() => setEditingCampaign(activeCampaign)}
          onBusinessClick={(bizId) => setEditingBusiness({ businessId: bizId, campaignId: activeCampaign.id })}
          onAddBusiness={() => setShowAddBusiness(true)}
        />
      ) : (
        <div className="h-full flex items-center justify-center p-8 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 bg-white dark:bg-slate-800 shadow-lg rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">No Campaign Selected</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8">Choose a campaign from the sidebar or create a new one.</p>
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all">
              Browse Campaigns
            </button>
          </div>
        </div>
      )}

      {/* Edit Business Modal */}
      {editingBusiness && activeBusiness && (
        <BusinessModal business={activeBusiness} isOpen={!!editingBusiness} onClose={() => setEditingBusiness(null)}
          onSave={handleUpdateBusiness} onDelete={handleDeleteBusiness}
        />
      )}

      {/* Add Business Modal */}
      {showAddBusiness && (
        <BusinessModal business={null} isOpen={showAddBusiness} onClose={() => setShowAddBusiness(false)}
          onSave={() => {}} isNew onCreateNew={handleAddBusiness}
        />
      )}

      {/* Restore Data Modal */}
      <Modal isOpen={showDataModal} onClose={() => setShowDataModal(false)} title="Backup & Restore">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Safeguard your corporate data by exporting it regularly.
          </p>
          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors group">
            <input type="file" className="hidden" accept=".json" onChange={handleImportData} />
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            </div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Restore from File</span>
          </label>
        </div>
      </Modal>

      {/* Edit Campaign Modal */}
      {editingCampaign && (
        <Modal isOpen={!!editingCampaign} onClose={() => setEditingCampaign(null)} title="Edit Campaign">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Campaign Name</label>
              <input className="w-full px-3 py-2 border rounded-lg mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                value={editingCampaign.name} onChange={e => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Area / Zone</label>
              <input className="w-full px-3 py-2 border rounded-lg mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                value={editingCampaign.area} onChange={e => setEditingCampaign({ ...editingCampaign, area: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Target Amount (₹)</label>
              <input type="number" className="w-full px-3 py-2 border rounded-lg mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                value={editingCampaign.targetAmount || 0} onChange={e => setEditingCampaign({ ...editingCampaign, targetAmount: Number(e.target.value) })}
              />
            </div>
            <button onClick={() => {
              setCampaigns(prev => updateCampaign(prev, editingCampaign.id, { name: editingCampaign.name, area: editingCampaign.area, targetAmount: editingCampaign.targetAmount }));
              setEditingCampaign(null);
            }} className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold">
              Save Changes
            </button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
