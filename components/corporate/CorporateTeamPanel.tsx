import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, QrCode, Share2, Download, Trash2, 
  User, Phone, Mail, Check, Copy
} from 'lucide-react';
import { Volunteer, BusinessCampaign } from '../../types';
import { 
  loadVolunteers, saveVolunteers, createVolunteer,
  getActiveVolunteer, setActiveVolunteer,
  getQRCodeURL
} from '../../services/teamService';
import { cn } from '../../utils/cn';
import Modal from '../ui/Modal';

interface CorporateTeamPanelProps {
  campaigns: BusinessCampaign[];
  onImportData?: (campaigns: BusinessCampaign[]) => void;
}

// Generate share data for corporate campaigns
const generateCorporateShareData = (campaigns: BusinessCampaign[]): string => {
  const shareData = {
    v: 1,
    type: 'corporate',
    t: Date.now(),
    d: campaigns.map(camp => ({
      n: camp.name,
      a: camp.area,
      ta: camp.targetAmount,
      b: camp.businesses.map(b => ({
        n: b.name,
        cat: b.category,
        s: b.status,
        cp: b.contactPerson,
        ph: b.phone,
        ad: b.amountDonated,
        ap: b.amountPledged,
      }))
    }))
  };
  return btoa(JSON.stringify(shareData));
};

const parseCorporateShareData = (encoded: string): BusinessCampaign[] | null => {
  try {
    const data = JSON.parse(atob(encoded));
    if (data.v !== 1 || data.type !== 'corporate') return null;
    
    const uid = () => Math.random().toString(36).slice(2, 9);
    
    return data.d.map((camp: any) => ({
      id: uid(),
      name: camp.n,
      area: camp.a,
      targetAmount: camp.ta,
      createdAt: data.t,
      businesses: camp.b.map((b: any) => ({
        id: uid(),
        name: b.n,
        category: b.cat,
        status: b.s,
        contactPerson: b.cp || '',
        phone: b.ph || '',
        email: '',
        address: '',
        note: '',
        amountDonated: b.ad || 0,
        amountPledged: b.ap || 0,
        updatedAt: data.t,
        nextFollowUp: null,
      }))
    }));
  } catch {
    return null;
  }
};

export default function CorporateTeamPanel({ campaigns, onImportData }: CorporateTeamPanelProps) {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    setVolunteers(loadVolunteers());
    setActiveId(getActiveVolunteer());
  }, []);

  const handleAddVolunteer = (name: string, phone: string, email?: string) => {
    const newVolunteer = createVolunteer(name, phone, email);
    const updated = [...volunteers, newVolunteer];
    setVolunteers(updated);
    saveVolunteers(updated);
    setShowAddModal(false);
  };

  const handleDeleteVolunteer = (id: string) => {
    if (!confirm('Remove this volunteer?')) return;
    const updated = volunteers.filter(v => v.id !== id);
    setVolunteers(updated);
    saveVolunteers(updated);
    if (activeId === id) {
      setActiveId(null);
      setActiveVolunteer(null);
    }
  };

  const handleSelectVolunteer = (id: string) => {
    setActiveId(id);
    setActiveVolunteer(id);
  };

  const activeVolunteer = volunteers.find(v => v.id === activeId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Users size={20} className="text-purple-500" />
          Team
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowShareModal(true)}
            className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            title="Share Data"
          >
            <QrCode size={18} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
            title="Add Volunteer"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Active Volunteer Banner */}
      {activeVolunteer && (
        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-4 rounded-xl text-white">
          <p className="text-xs opacity-75 mb-1">Active Volunteer</p>
          <p className="text-lg font-bold">{activeVolunteer.name}</p>
          <p className="text-sm opacity-90">{activeVolunteer.phone}</p>
        </div>
      )}

      {/* Volunteers List */}
      <div className="space-y-2">
        {volunteers.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No volunteers added yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-2 text-purple-600 dark:text-purple-400 text-sm font-bold"
            >
              + Add First Volunteer
            </button>
          </div>
        ) : (
          volunteers.map(volunteer => (
            <div
              key={volunteer.id}
              className={cn(
                "p-3 rounded-xl border-2 transition-all cursor-pointer",
                activeId === volunteer.id
                  ? "bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700"
                  : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-purple-200 dark:hover:border-purple-800"
              )}
              onClick={() => handleSelectVolunteer(volunteer.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold",
                    activeId === volunteer.id ? "bg-purple-500" : "bg-slate-400"
                  )}>
                    {volunteer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{volunteer.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{volunteer.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeId === volunteer.id && (
                    <Check size={16} className="text-purple-500" />
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteVolunteer(volunteer.id); }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <button
          onClick={() => setShowShareModal(true)}
          className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
        >
          <Share2 size={16} />
          Share Data
        </button>
        <button
          onClick={() => setShowImportModal(true)}
          className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
        >
          <Download size={16} />
          Import
        </button>
      </div>

      {/* Add Volunteer Modal */}
      <AddVolunteerModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddVolunteer}
      />

      {/* Share Modal */}
      <ShareDataModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        campaigns={campaigns}
      />

      {/* Import Modal */}
      <ImportDataModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={onImportData}
      />
    </div>
  );
}

// Add Volunteer Modal
function AddVolunteerModal({
  isOpen, onClose, onAdd
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, phone: string, email?: string) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim()) return;
    onAdd(name, phone, email || undefined);
    setName('');
    setPhone('');
    setEmail('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Volunteer">
      <div className="space-y-4">
        <div className="relative">
          <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            placeholder="Full Name"
            autoFocus
          />
        </div>
        <div className="relative">
          <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            placeholder="Phone Number"
          />
        </div>
        <div className="relative">
          <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            placeholder="Email (optional)"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || !phone.trim()}
          className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add Volunteer
        </button>
      </div>
    </Modal>
  );
}

// Share Data Modal with QR Code
function ShareDataModal({
  isOpen, onClose, campaigns
}: {
  isOpen: boolean;
  onClose: () => void;
  campaigns: BusinessCampaign[];
}) {
  const [copied, setCopied] = useState(false);
  const shareData = generateCorporateShareData(campaigns);
  const qrUrl = getQRCodeURL(shareData, 250);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalBusinesses = campaigns.reduce((sum, c) => sum + c.businesses.length, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Corporate Data">
      <div className="space-y-4 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Scan this QR code or share the code below to transfer data to another device.
        </p>
        
        <div className="bg-white p-4 rounded-xl inline-block mx-auto">
          <img src={qrUrl} alt="QR Code" className="w-[250px] h-[250px]" />
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl">
          <p className="text-[10px] uppercase text-slate-400 font-bold mb-2">Share Code</p>
          <div className="flex gap-2">
            <input
              value={shareData.slice(0, 30) + '...'}
              readOnly
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-mono"
            />
            <button
              onClick={handleCopy}
              className={cn(
                "px-4 py-2 rounded-lg font-bold text-sm transition-colors",
                copied 
                  ? "bg-green-500 text-white" 
                  : "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          {campaigns.length} campaigns • {totalBusinesses} businesses
        </p>
      </div>
    </Modal>
  );
}

// Import Data Modal
function ImportDataModal({
  isOpen, onClose, onImport
}: {
  isOpen: boolean;
  onClose: () => void;
  onImport?: (campaigns: BusinessCampaign[]) => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleImport = () => {
    const data = parseCorporateShareData(code);
    if (!data) {
      setError('Invalid share code or wrong data type');
      return;
    }
    if (onImport) {
      onImport(data);
      onClose();
      setCode('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Data">
      <div className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Paste the share code from another device to import corporate campaign data.
        </p>
        
        <textarea
          value={code}
          onChange={e => { setCode(e.target.value); setError(''); }}
          className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 min-h-[100px] font-mono text-xs"
          placeholder="Paste share code here..."
        />

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <button
          onClick={handleImport}
          disabled={!code.trim()}
          className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Download size={18} />
          Import Data
        </button>
      </div>
    </Modal>
  );
}
