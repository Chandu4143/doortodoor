import React, { useState, useEffect } from 'react';
import { Room, RoomStatus } from '../types';
import { STATUS_CONFIG, FUNDRAISING_SCRIPTS } from '../constants';
import { X, Save, User, MessageSquare, StickyNote, IndianRupee, Check, BookOpen, Info, Copy, Clock, Calendar } from 'lucide-react';
import { cn } from '../utils/cn';
import Modal from './ui/Modal';

interface RoomModalProps {
  room: Room;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Room>) => void;
}

const RoomModal: React.FC<RoomModalProps> = ({ room, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Room>>({});
  const [activeTab, setActiveTab] = useState<'details' | 'scripts'>('details');
  const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);

  // Helper to format date for input type="datetime-local" (YYYY-MM-DDThh:mm)
  const toLocalISOString = (timestamp: number) => {
    const date = new Date(timestamp);
    const offset = date.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  useEffect(() => {
    if (isOpen) {
      setFormData({
        visitorName: room.visitorName,
        remark: room.remark,
        status: room.status,
        note: room.note,
        amountDonated: room.amountDonated || 0,
        // If room has a time, use it. If not, default to NOW (for the input).
        updatedAt: room.updatedAt || Date.now()
      });
      setActiveTab('details'); // Reset to details on open
    }
  }, [isOpen, room]);

  const handleSave = () => {
    onSave(room.id, formData);
    onClose();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScriptId(id);
    setTimeout(() => setCopiedScriptId(null), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-0 bg-transparent shadow-none" title="">
      {/* Container override to match previous design but using Modal's portal/backdrop */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 h-[80vh] sm:h-auto max-h-[90vh]">

        {/* Header */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 p-4 sm:p-6 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
              Unit Details
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              #{room.roomNumber}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="group p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all border border-slate-100 dark:border-slate-700"
          >
            <X size={20} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              "flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors border-b-2",
              activeTab === 'details'
                ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <Info size={16} />
            Info & Status
          </button>
          <button
            onClick={() => setActiveTab('scripts')}
            className={cn(
              "flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors border-b-2",
              activeTab === 'scripts'
                ? "border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-900/20"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <BookOpen size={16} />
            Smart Scripts
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 sm:p-6 custom-scrollbar">

          {activeTab === 'details' ? (
            <div className="space-y-8 animate-in slide-in-from-left-4 duration-300">
              {/* Status Tiles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Status</label>

                  {/* Date Time Picker */}
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" />
                    <input
                      type="datetime-local"
                      className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-transparent border-none focus:ring-0 p-0"
                      value={formData.updatedAt ? toLocalISOString(formData.updatedAt) : ''}
                      onChange={(e) => {
                        const date = new Date(e.target.value);
                        if (!isNaN(date.getTime())) {
                          setFormData({ ...formData, updatedAt: date.getTime() });
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {(Object.keys(STATUS_CONFIG) as RoomStatus[]).map((status) => {
                    const config = STATUS_CONFIG[status];
                    const isSelected = formData.status === status;
                    const Icon = config.icon;

                    // Custom styles based on selection state
                    let tileStyle = "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/30";
                    if (isSelected) {
                      if (status === 'donated') tileStyle = "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 ring-1 ring-green-500";
                      else if (status === 'callback') tileStyle = "border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500";
                      else if (status === 'not_interested') tileStyle = "border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 ring-1 ring-red-500";
                      else tileStyle = "border-slate-800 dark:border-slate-100 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 ring-1 ring-slate-800 dark:ring-slate-100";
                    }

                    return (
                      <button
                        key={status}
                        onClick={() => setFormData({ ...formData, status })}
                        className={cn(
                          "relative flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 active:scale-95",
                          tileStyle
                        )}
                      >
                        {isSelected && (
                          <div className="absolute top-1 right-1">
                            <Check size={14} className="opacity-100" />
                          </div>
                        )}
                        <Icon size={24} strokeWidth={isSelected ? 2.5 : 2} />
                        <span className="text-[10px] font-bold uppercase tracking-tight leading-none text-center">
                          {config.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">

                {/* Conditional Donation Amount */}
                {formData.status === 'donated' && (
                  <div className="animate-in slide-in-from-top-2">
                    <label className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1.5 block">Donation Amount</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <IndianRupee size={18} className="text-green-500" />
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={formData.amountDonated}
                        onChange={(e) => setFormData({ ...formData, amountDonated: Number(e.target.value) })}
                        className="w-full pl-10 pr-4 py-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-100 dark:border-green-800 rounded-xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all font-mono font-bold text-lg text-green-700 dark:text-green-400"
                        placeholder="0"
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Details</label>
                  <div className="space-y-3">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <input
                        value={formData.visitorName || ''}
                        onChange={(e) => setFormData({ ...formData, visitorName: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-base text-slate-900 dark:text-slate-100"
                        placeholder="Visitor Name"
                      />
                    </div>

                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MessageSquare size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <input
                        value={formData.remark || ''}
                        onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-base text-slate-900 dark:text-slate-100"
                        placeholder="Short remark (e.g. 'Ring bell twice')"
                      />
                    </div>

                    <div className="relative group">
                      <div className="absolute top-3 left-0 pl-3 flex pointer-events-none">
                        <StickyNote size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                      <textarea
                        value={formData.note || ''}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-base min-h-[80px] text-slate-900 dark:text-slate-100"
                        placeholder="Private notes..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl text-purple-800 dark:text-purple-300 text-sm mb-4 flex items-start gap-3 border border-purple-100 dark:border-purple-900/50">
                <BookOpen size={20} className="shrink-0 mt-0.5" />
                <p>Use these scripts to guide your conversation. Tap the copy icon to quickly grab the text.</p>
              </div>

              {FUNDRAISING_SCRIPTS.map(script => (
                <div key={script.id} className={`p-4 rounded-xl border ${script.color.replace('bg-', 'border-').replace('text-', 'text-')} dark:border-slate-700 bg-opacity-30 relative group dark:bg-slate-800`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{script.title}</h4>
                      <p className="text-[10px] uppercase font-bold opacity-70 tracking-wider text-slate-500 dark:text-slate-400">{script.scenario}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(script.text, script.id)}
                      className="p-2 bg-white/50 dark:bg-slate-700/50 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedScriptId === script.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-slate-400" />}
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-600 dark:text-slate-300">{script.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 sticky bottom-0 z-10 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-[2] py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/50 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RoomModal;