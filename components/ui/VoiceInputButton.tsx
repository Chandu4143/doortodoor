import React, { useEffect } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { cn } from '../../utils/cn';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
}

export default function VoiceInputButton({ onTranscript, className }: VoiceInputButtonProps) {
  const { isListening, isSupported, transcript, startListening, stopListening } = useVoiceInput();

  useEffect(() => {
    if (transcript) {
      onTranscript(transcript);
    }
  }, [transcript, onTranscript]);

  if (!isSupported) {
    return null; // Don't show button if not supported
  }

  return (
    <button
      type="button"
      onClick={isListening ? stopListening : startListening}
      className={cn(
        "p-2 rounded-lg transition-all",
        isListening 
          ? "bg-red-500 text-white animate-pulse" 
          : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600",
        className
      )}
      title={isListening ? "Stop recording" : "Voice input"}
    >
      {isListening ? <Square size={18} fill="currentColor" /> : <Mic size={18} />}
    </button>
  );
}
