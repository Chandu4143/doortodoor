import React, { useState, useEffect } from 'react';
import { Business, BusinessStatus, BusinessCategory } from '../../types';
import { BUSINESS_STATUS_CONFIG, BUSINESS_CATEGORY_CONFIG } from '../../constants';
import { X, Save, User, Phone, Mail, MapPin, StickyNote, IndianRupee, Check, Clock, Building2, Users, UserCheck } from 'lucide-react';
import { cn } from '../../utils/cn';
import Modal from '../ui/Modal';
import VoiceInputButton from '../ui/VoiceInputButton';
import { useAuth } from '../../contexts/AuthContext';
import { getTeamMembers, type TeamMember } from '../../services/supabase/teamService';

interface BusinessModalProps {
  business: Business | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Business>) => void;
  onDelete?: (id: string) => void;
  isNew?: boolean;
  onCreateNew?: (business: Omit<Business, 'id'>) => void;
}

const BusinessModal: React.FC<BusinessModalProps> = ({ 
  business, isOpen, onClose, onSave, onDelete, isNew, onCreateNew 
}) => {
  const [formData, setFormData] = useState<Partial<Business>>({});
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Get auth context for current user and team
  const { user, profile, currentTeam } = useAuth();

  const toLocalISOString = (timestamp: number) => {
    const date = new Date(timestamp);
    const offset = date.getTimezoneOffset() * 60000;
    return (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
  };

  // Fetch team members when modal opens
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (isOpen && currentTeam) {
        setLoadingMembers(true);
        try {
          const result = await getTeamMembers(currentTeam.id);
          if (result.success && result.members) {
            setTeamMembers(result.members);
          }
        } catch (err) {
          console.error('Error fetching team members:', err);
        } finally {
          setLoadingMembers(false);
        }
      }
    };
    
    fetchTeamMembers();
  }, [isOpen, currentTeam]);

  useEffect(() => {
    if (isOpen) {
      if (isNew) {
        setFormData({
          name: '', contactPerson: '', phone: '', email: '', address: '',
          category: 'office', status: 'unvisited', note: '',
          amountDonated: 0, amountPledged: 0, updatedAt: Date.now(), nextFollowUp: null,
          // Attribution - default to current user for new records
          collectedBy: user?.id || '',
          enteredBy: user?.id || '',
          collectedByName: profile?.name || '',
          enteredByName: profile?.name || '',
        });
      } else if (business) {
        setFormData({
          name: business.name, contactPerson: business.contactPerson, phone: business.phone,
          email: business.email, address: business.address, category: business.category,
          status: business.status, note: business.note, amountDonated: business.amountDonated || 0,
          amountPledged: business.amountPledged || 0, updatedAt: business.updatedAt || Date.now(),
          nextFollowUp: business.nextFollowUp,
          // Attribution - preserve existing or default to current user
          collectedBy: business.collectedBy || user?.id || '',
          enteredBy: business.enteredBy || user?.id || '',
          collectedByName: business.collectedByName || profile?.name || '',
          enteredByName: business.enteredByName || profile?.name || '',
        });
      }
    }
  }, [isOpen, business, isNew, user, profile]);

  const handleSave = () => {
    // Always set entered_by to current user when saving
    const dataToSave = {
      ...formData,
      enteredBy: user?.id || formData.enteredBy,
      enteredByName: profile?.name || formData.enteredByName,
    };
    
    if (isNew && onCreateNew) {
      onCreateNew(dataToSave as Omit<Business, 'id'>);
    } else if (business) {
      onSave(business.id, dataToSave);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-0 bg-transparent shadow-none" title="">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 h-[85vh] sm:h-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 p-4 sm:p-6 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
              {isNew ? 'Add Business' : 'Business Details'}
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {isNew ? 'New Business' : formData.name || 'Unnamed'}
            </h2>
          </div>
          <button onClick={onClose} className="group p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all border border-slate-100 dark:border-slate-700">
            <X size={20} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-6">
          
          {/* Business Name */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Business Name *</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building2 size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              </div>
              <input value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-base text-slate-900 dark:text-slate-100"
                placeholder="Company / Shop Name" autoFocus={isNew}
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(BUSINESS_CATEGORY_CONFIG) as BusinessCategory[]).map((cat) => {
                const config = BUSINESS_CATEGORY_CONFIG[cat];
                const isSelected = formData.category === cat;
                const Icon = config.icon;
                return (
                  <button key={cat} onClick={() => setFormData({ ...formData, category: cat })}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition-all text-center",
                      isSelected ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400"
                    )}
                  >
                    <Icon size={18} className={isSelected ? 'text-blue-600' : config.color} />
                    <span className="text-[9px] font-bold uppercase">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(BUSINESS_STATUS_CONFIG) as BusinessStatus[]).map((status) => {
                const config = BUSINESS_STATUS_CONFIG[status];
                const isSelected = formData.status === status;
                const Icon = config.icon;
                let tileStyle = "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400";
                if (isSelected) {
                  if (status === 'donated') tileStyle = "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 ring-1 ring-green-500";
                  else if (status === 'meeting_scheduled') tileStyle = "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 ring-1 ring-blue-500";
                  else if (status === 'follow_up') tileStyle = "border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 ring-1 ring-purple-500";
                  else if (status === 'callback') tileStyle = "border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 ring-1 ring-amber-500";
                  else if (status === 'not_interested') tileStyle = "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 ring-1 ring-red-500";
                  else tileStyle = "border-slate-800 bg-slate-800 text-white ring-1 ring-slate-800";
                }
                return (
                  <button key={status} onClick={() => setFormData({ ...formData, status })}
                    className={cn("relative flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition-all active:scale-95", tileStyle)}
                  >
                    {isSelected && <div className="absolute top-1 right-1"><Check size={12} /></div>}
                    <Icon size={18} strokeWidth={isSelected ? 2.5 : 2} />
                    <span className="text-[9px] font-bold uppercase">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Donation Amount (conditional) */}
          {formData.status === 'donated' && (
            <div className="animate-in slide-in-from-top-2 space-y-3">
              <label className="text-xs font-bold text-green-600 uppercase tracking-wider block">Donation Amount</label>
              
              {/* Quick Amount Presets - Higher amounts for corporate */}
              <div className="flex flex-wrap gap-2">
                {[1000, 5000, 10000, 25000, 50000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setFormData({ ...formData, amountDonated: amount })}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-bold transition-all active:scale-95",
                      formData.amountDonated === amount
                        ? "bg-green-600 text-white shadow-md"
                        : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                    )}
                  >
                    ₹{amount.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee size={18} className="text-green-500" />
                </div>
                <input type="number" min="0" value={formData.amountDonated || 0}
                  onChange={(e) => setFormData({ ...formData, amountDonated: Number(e.target.value) })}
                  className="w-full pl-10 pr-4 py-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-100 dark:border-green-800 rounded-xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all font-mono font-bold text-lg text-green-700 dark:text-green-400"
                  placeholder="Custom amount"
                />
              </div>

              {/* Attribution Section - Who collected the donation */}
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-900/50 space-y-3 mt-4">
                <label className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-2">
                  <Users size={14} />
                  Donation Attribution
                </label>

                {/* Collected By Dropdown */}
                <div>
                  <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Collected By</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserCheck size={16} className="text-purple-400" />
                    </div>
                    <select
                      value={formData.collectedBy || user?.id || ''}
                      onChange={(e) => {
                        const selectedMember = teamMembers.find(m => m.user_id === e.target.value);
                        setFormData({ 
                          ...formData, 
                          collectedBy: e.target.value,
                          collectedByName: selectedMember?.profile.name || profile?.name || ''
                        });
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-lg text-sm appearance-none cursor-pointer"
                      disabled={loadingMembers}
                    >
                      {loadingMembers ? (
                        <option>Loading team members...</option>
                      ) : teamMembers.length > 0 ? (
                        teamMembers.map((member) => (
                          <option key={member.user_id} value={member.user_id}>
                            {member.profile.name} {member.user_id === user?.id ? '(You)' : ''}
                          </option>
                        ))
                      ) : (
                        <option value={user?.id || ''}>{profile?.name || 'Current User'}</option>
                      )}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Select the team member who collected this donation
                  </p>
                </div>

                {/* Display Entered By (read-only) */}
                <div>
                  <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Data Entered By</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={16} className="text-slate-400" />
                    </div>
                    <input
                      value={profile?.name || 'You'}
                      readOnly
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Automatically set to the person saving this record
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pledged Amount */}
          {(formData.status === 'follow_up' || formData.status === 'meeting_scheduled') && (
            <div className="animate-in slide-in-from-top-2 space-y-3">
              <label className="text-xs font-bold text-purple-600 uppercase tracking-wider block">Pledged Amount</label>
              
              {/* Quick Pledge Presets */}
              <div className="flex flex-wrap gap-2">
                {[5000, 10000, 25000, 50000, 100000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setFormData({ ...formData, amountPledged: amount })}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-bold transition-all active:scale-95",
                      formData.amountPledged === amount
                        ? "bg-purple-600 text-white shadow-md"
                        : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                    )}
                  >
                    ₹{amount.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee size={18} className="text-purple-500" />
                </div>
                <input type="number" min="0" value={formData.amountPledged || 0}
                  onChange={(e) => setFormData({ ...formData, amountPledged: Number(e.target.value) })}
                  className="w-full pl-10 pr-4 py-3 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-100 dark:border-purple-800 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all font-mono font-bold text-lg text-purple-700 dark:text-purple-400"
                  placeholder="0"
                />
              </div>
            </div>
          )}

          {/* Contact Details */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Contact Details</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={18} className="text-slate-400" /></div>
              <input value={formData.contactPerson || ''} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-900 dark:text-slate-100"
                placeholder="Contact Person Name"
              />
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone size={18} className="text-slate-400" /></div>
              <input value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-900 dark:text-slate-100"
                placeholder="Phone Number"
              />
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail size={18} className="text-slate-400" /></div>
              <input value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-900 dark:text-slate-100"
                placeholder="Email Address"
              />
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MapPin size={18} className="text-slate-400" /></div>
              <input value={formData.address || ''} onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-slate-900 dark:text-slate-100"
                placeholder="Address"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Notes</label>
            <div className="relative group">
              <div className="absolute top-3 left-0 pl-3 flex pointer-events-none"><StickyNote size={18} className="text-slate-400" /></div>
              <textarea value={formData.note || ''} onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="w-full pl-10 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-base min-h-[80px] text-slate-900 dark:text-slate-100"
                placeholder="Private notes... (or use voice input)"
              />
              <div className="absolute top-2 right-2">
                <VoiceInputButton onTranscript={(text) => setFormData({ ...formData, note: (formData.note || '') + text })} />
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock size={14} />
            <input type="datetime-local" className="bg-transparent border-none focus:ring-0 p-0 font-medium"
              value={formData.updatedAt ? toLocalISOString(formData.updatedAt) : ''}
              onChange={(e) => {
                const date = new Date(e.target.value);
                if (!isNaN(date.getTime())) setFormData({ ...formData, updatedAt: date.getTime() });
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 sticky bottom-0 z-10 shrink-0">
          {!isNew && onDelete && (
            <button onClick={() => { onDelete(business!.id); onClose(); }}
              className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95 transition-all"
            >
              Delete
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!formData.name?.trim()}
            className="flex-[2] py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/50 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} /> {isNew ? 'Add Business' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default BusinessModal;
