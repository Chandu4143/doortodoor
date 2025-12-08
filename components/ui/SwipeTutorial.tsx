import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';

const SWIPE_TUTORIAL_KEY = 'doorstep_swipe_tutorial_seen';

interface SwipeTutorialProps {
  onDismiss: () => void;
}

export function useSwipeTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(SWIPE_TUTORIAL_KEY);
    if (!seen) {
      // Delay showing tutorial to let the UI settle
      const timer = setTimeout(() => setShowTutorial(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissTutorial = () => {
    localStorage.setItem(SWIPE_TUTORIAL_KEY, 'true');
    setShowTutorial(false);
  };

  return { showTutorial, dismissTutorial };
}

export default function SwipeTutorial({ onDismiss }: SwipeTutorialProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onDismiss}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Quick Tip! 💡
            </h3>
            <button
              onClick={onDismiss}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Swipe cards left or right to quickly update their status:
          </p>

          {/* Animated Demo */}
          <div className="relative h-24 mb-6 overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-900">
            {/* Left indicator */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-red-500">
              <XCircle size={20} />
              <span className="text-xs font-bold">Not Interested</span>
            </div>

            {/* Right indicator */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-green-500">
              <span className="text-xs font-bold">Donated</span>
              <CheckCircle2 size={20} />
            </div>

            {/* Animated card */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-y-1/2 w-20 h-14 bg-white dark:bg-slate-700 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 flex items-center justify-center"
              animate={{
                x: ['-50%', '30%', '-50%', '-130%', '-50%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatDelay: 1,
                ease: 'easeInOut',
              }}
            >
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">#101</span>
            </motion.div>

            {/* Swipe arrows */}
            <motion.div
              className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 text-slate-400"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronLeft size={16} />
              <span className="text-[10px] font-bold uppercase">Swipe</span>
              <ChevronRight size={16} />
            </motion.div>
          </div>

          <button
            onClick={onDismiss}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
          >
            Got it!
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
