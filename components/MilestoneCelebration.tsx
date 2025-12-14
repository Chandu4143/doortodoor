
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, X, Share2, PartyPopper } from 'lucide-react';
import Confetti from 'react-confetti';

interface MilestoneCelebrationProps {
    type: 'level_up' | 'achievement';
    title: string;
    description: string;
    level?: number;
    onClose: () => void;
}

export default function MilestoneCelebration({ type, title, description, level, onClose }: MilestoneCelebrationProps) {
    const [showConfetti, setShowConfetti] = useState(true);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [windowHeight, setWindowHeight] = useState(window.innerHeight);

    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
            setWindowHeight(window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        // Stop confetti after 5 seconds
        const timer = setTimeout(() => setShowConfetti(false), 5000);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timer);
        };
    }, []);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
                {showConfetti && (
                    <Confetti
                        width={windowWidth}
                        height={windowHeight}
                        recycle={false}
                        numberOfPieces={500}
                        gravity={0.2}
                    />
                )}

                <motion.div
                    initial={{ scale: 0.5, opacity: 0, y: 50 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden relative"
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 z-10 bg-white/50 dark:bg-slate-900/50 p-1 rounded-full backdrop-blur-md"
                    >
                        <X size={20} />
                    </button>

                    {/* Header Image / Gradient */}
                    <div className="h-32 bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.2, type: "spring" }}
                            className="bg-white p-4 rounded-full shadow-xl z-10"
                        >
                            {type === 'level_up' ? (
                                <Trophy size={48} className="text-yellow-500 fill-yellow-500" />
                            ) : (
                                <Star size={48} className="text-yellow-500 fill-yellow-500" />
                            )}
                        </motion.div>

                        {/* Decorative circles */}
                        <div className="absolute top-[-20px] left-[-20px] w-20 h-20 bg-white/20 rounded-full blur-xl"></div>
                        <div className="absolute bottom-[-10px] right-[-10px] w-32 h-32 bg-yellow-300/30 rounded-full blur-xl"></div>
                    </div>

                    {/* Content */}
                    <div className="p-8 text-center">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 uppercase tracking-tight">
                                {title}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                                {description}
                            </p>
                        </motion.div>

                        {type === 'level_up' && level && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 mb-6 border border-slate-100 dark:border-slate-700"
                            >
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">New Level</div>
                                <div className="text-4xl font-black text-slate-800 dark:text-white">{level}</div>
                            </motion.div>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onClose}
                            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900/30 flex items-center justify-center gap-2"
                        >
                            <PartyPopper size={20} />
                            Awesome!
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
