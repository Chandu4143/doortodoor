import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Cloud, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  className?: string;
}

export default function AutoSaveIndicator({ status, className }: AutoSaveIndicatorProps) {
  if (status === 'idle') return null;

  const config = {
    saving: {
      icon: Loader2,
      text: 'Saving...',
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      animate: true,
    },
    saved: {
      icon: Check,
      text: 'Saved',
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-900/20',
      animate: false,
    },
    error: {
      icon: AlertCircle,
      text: 'Error saving',
      color: 'text-red-500',
      bg: 'bg-red-50 dark:bg-red-900/20',
      animate: false,
    },
  };

  const current = config[status];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold",
          current.bg,
          current.color,
          className
        )}
      >
        <Icon size={14} className={current.animate ? 'animate-spin' : ''} />
        {current.text}
      </motion.div>
    </AnimatePresence>
  );
}

// Hook for managing auto-save state
export function useAutoSave(saveFunction: () => Promise<void> | void, debounceMs = 1000) {
  const [status, setStatus] = React.useState<SaveStatus>('idle');
  const timeoutRef = React.useRef<NodeJS.Timeout>();
  const resetTimeoutRef = React.useRef<NodeJS.Timeout>();

  const triggerSave = React.useCallback(async () => {
    // Clear any pending save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }

    // Debounce the save
    timeoutRef.current = setTimeout(async () => {
      setStatus('saving');
      try {
        await saveFunction();
        setStatus('saved');
        // Reset to idle after showing "saved"
        resetTimeoutRef.current = setTimeout(() => setStatus('idle'), 2000);
      } catch (error) {
        setStatus('error');
        resetTimeoutRef.current = setTimeout(() => setStatus('idle'), 3000);
      }
    }, debounceMs);
  }, [saveFunction, debounceMs]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  return { status, triggerSave };
}
