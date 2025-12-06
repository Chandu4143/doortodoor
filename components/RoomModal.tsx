import React, { useState, useEffect } from 'react';
import { Room, RoomStatus } from '../types';
import { STATUS_CONFIG } from '../constants';
import { X, Save, User, MessageSquare, StickyNote, IndianRupee, Check } from 'lucide-react';

interface RoomModalProps {
  room: Room;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Room>) => void;
}

const RoomModal: React.FC<RoomModalProps> = ({ room, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Room>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        visitorName: room.visitorName,
        remark: room.remark,
        status: room.status,
        note: room.note,
        amountDonated: room.amountDonated || 0
      });
    }
  }, [isOpen, room]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(room.id, formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
        
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 sm:p-6 flex items-center justify-between sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
              Unit Details
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              #{room.roomNumber}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="group p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-all border border-slate-100"
          >
            <X size={20} className="text-slate-400 group-hover:text-slate-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-8">
          
          {/* Status Tiles */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Status</label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(STATUS_CONFIG) as RoomStatus[]).map((status) => {
                const config = STATUS_CONFIG[status];
                const isSelected = formData.status === status;
                const Icon = config.icon;
                
                // Custom styles based on selection state
                let tileStyle = "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/50";
                if (isSelected) {
                   if (status === 'donated') tileStyle = "border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500";
                   else if (status === 'callback') tileStyle = "border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-500";
                   else if (status === 'not_interested') tileStyle = "border-red-500 bg-red-50 text-red-700 ring-1 ring-red-500";
                   else tileStyle = "border-slate-800 bg-slate-800 text-white ring-1 ring-slate-800";
                }

                return (
                  <button
                    key={status}
                    onClick={() => setFormData({ ...formData, status })}
                    className={`
                      relative flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 active:scale-95
                      ${tileStyle}
                    `}
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
                <label className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1.5 block">Donation Amount</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee size={18} className="text-green-500" />
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={formData.amountDonated}
                    onChange={(e) => setFormData({ ...formData, amountDonated: Number(e.target.value) })}
                    className="w-full pl-10 pr-4 py-3 bg-green-50 border-2 border-green-100 rounded-xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all font-mono font-bold text-lg text-green-700"
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
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-base"
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
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-base"
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
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-base min-h-[80px]"
                    placeholder="Private notes..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 sm:p-6 border-t border-slate-100 flex gap-3 sticky bottom-0 z-10">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="flex-[2] py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoomModal;