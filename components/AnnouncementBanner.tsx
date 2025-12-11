
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Megaphone, AlertCircle } from 'lucide-react';
import { getAnnouncements, Announcement } from '../services/supabase/announcementService';
import { useAuth } from '../contexts/AuthContext';

export default function AnnouncementBanner() {
    const { currentTeam } = useAuth();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (currentTeam) {
            loadAnnouncements();
        }
    }, [currentTeam]);

    const loadAnnouncements = async () => {
        if (!currentTeam) return;
        try {
            const result = await getAnnouncements(currentTeam.id);
            if (result.success && result.announcements && result.announcements.length > 0) {
                setAnnouncements(result.announcements);
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (announcements.length === 0 || !isVisible) return null;

    const current = announcements[currentIndex];
    const isHighPriority = current.priority === 'high';

    const nextAnnouncement = () => {
        setCurrentIndex((prev) => (prev + 1) % announcements.length);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 rounded-2xl p-4 relative overflow-hidden ${isHighPriority
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800'
                    : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800'
                }`}
        >
            <div className="flex items-start gap-4">
                <div className={`p-2 rounded-xl ${isHighPriority ? 'bg-red-100 dark:bg-red-900/40 text-red-600' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600'
                    }`}>
                    {isHighPriority ? <AlertCircle size={20} /> : <Megaphone size={20} />}
                </div>

                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h3 className={`font-bold text-sm mb-1 ${isHighPriority ? 'text-red-900 dark:text-red-100' : 'text-blue-900 dark:text-blue-100'
                            }`}>
                            Team Announcement
                            {announcements.length > 1 && (
                                <span className="ml-2 text-xs opacity-60 font-normal">
                                    ({currentIndex + 1}/{announcements.length})
                                </span>
                            )}
                        </h3>

                        <div className="flex gap-2">
                            {announcements.length > 1 && (
                                <button
                                    onClick={nextAnnouncement}
                                    className="text-xs font-bold uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity"
                                >
                                    Next
                                </button>
                            )}
                            <button
                                onClick={() => setIsVisible(false)}
                                className="opacity-40 hover:opacity-100 transition-opacity"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <p className={`text-sm leading-relaxed ${isHighPriority ? 'text-red-800 dark:text-red-200' : 'text-blue-800 dark:text-blue-200'
                        }`}>
                        {current.content}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs opacity-50">
                            Posted by {current.profiles?.name || 'Admin'} • {new Date(current.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
