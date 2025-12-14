
import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, MessageSquare, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendHelpRequest } from '../services/supabase/helpRequestService';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

interface HelpRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamId: string;
    buildingName?: string;
}

const URGENCY_LEVELS = [
    { id: 'safety', label: 'Safety Concern', icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
    { id: 'tough_door', label: 'Tough Door (Need Senior)', icon: MessageSquare, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800' },
    { id: 'other', label: 'Other Issue', icon: AlertTriangle, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
];

export default function HelpRequestModal({ isOpen, onClose, teamId, buildingName }: HelpRequestModalProps) {
    const { user } = useAuth();
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!selectedType && !message) return;
        setIsSubmitting(true);

        // Get location if possible
        let location = undefined;
        if (navigator.geolocation) {
            try {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
                location = { lat: position.coords.latitude, lng: position.coords.longitude };
            } catch (e) {
                console.warn('Could not get location for help request');
            }
        }

        const fullMessage = selectedType
            ? `[${URGENCY_LEVELS.find(u => u.id === selectedType)?.label}] ${message}`
            : message;

        const result = await sendHelpRequest(teamId, fullMessage, location, buildingName);

        setIsSubmitting(false);
        if (result.success) {
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setMessage('');
                setSelectedType(null);
                onClose();
            }, 2000);
        } else {
            alert('Failed to send request. 请 try again or call directly.');
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <AlertTriangle className="text-red-500" size={20} />
                            Request Help
                        </h3>
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        {success ? (
                            <div className="py-8 text-center text-green-600 dark:text-green-400">
                                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
                                    <Send size={24} />
                                </div>
                                <p className="font-bold">Request Sent!</p>
                                <p className="text-sm">Team leaders have been notified.</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Select the type of help you need. Location will be shared automatically.
                                </p>

                                <div className="grid gap-3">
                                    {URGENCY_LEVELS.map((level) => (
                                        <button
                                            key={level.id}
                                            onClick={() => setSelectedType(level.id)}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                                                selectedType === level.id
                                                    ? `ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 ${level.bg} ${level.border}`
                                                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                                            )}
                                        >
                                            <div className={cn("p-2 rounded-lg bg-white dark:bg-slate-800", level.color)}>
                                                <level.icon size={20} />
                                            </div>
                                            <span className="font-semibold text-slate-700 dark:text-slate-200">{level.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Additional Details (Optional)</label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Briefly describe the situation..."
                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                                    />
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={!selectedType && !message || isSubmitting}
                                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? 'Sending...' : 'Send Request'}
                                </button>
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
