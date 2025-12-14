
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, X } from 'lucide-react';

interface UndoToastProps {
    isVisible: boolean;
    onUndo: () => void;
    onDismiss: () => void;
    message?: string;
    duration?: number;
}

export default function UndoToast({
    isVisible,
    onUndo,
    onDismiss,
    message = "Shake detected! Undo last action?",
    duration = 5000
}: UndoToastProps) {

    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onDismiss, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onDismiss]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-4"
                >
                    <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-2xl p-4 flex items-center justify-between gap-4 border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-full animate-bounce">
                                <Undo2 size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-sm">Undo Action</p>
                                <p className="text-xs text-slate-300 dark:text-slate-500">{message}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={onUndo}
                                className="px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
                            >
                                Undo
                            </button>
                            <button
                                onClick={onDismiss}
                                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={16} className="text-slate-400" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
