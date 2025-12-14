
import React, { useState } from 'react';
import { Mic, Square, Play, Pause, Save, Trash2, RefreshCcw } from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { createVoiceNote } from '../services/supabase/voiceNotesService';
import { cn } from '../utils/cn';

interface VoiceNoteRecorderProps {
    onSaved?: () => void;
    className?: string;
    location: {
        apartmentId: string;
        floor: number;
        roomNumber: string;
    };
}

const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({ onSaved, className, location }) => {
    const {
        isRecording,
        isSupported,
        transcript,
        audioBlob,
        duration,
        startRecording,
        stopRecording,
        reset,
        audioUrl
    } = useVoiceRecorder();

    const [isSaving, setIsSaving] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = React.useRef<HTMLAudioElement>(null);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSave = async () => {
        if (!audioBlob) return;
        setIsSaving(true);
        try {
            await createVoiceNote(audioBlob, transcript, duration, location);
            if (onSaved) onSaved();
            reset();
        } catch (e) {
            console.error(e);
            alert("Failed to save recording");
        } finally {
            setIsSaving(false);
        }
    };

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    if (!isSupported) {
        return <div className="text-red-500 text-sm">Voice recording is not supported in this browser.</div>;
    }

    return (
        <div className={cn("bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm", className)}>

            {/* Header / Status */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", isRecording ? "bg-red-500 animate-pulse" : "bg-slate-300")} />
                    <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">
                        {formatTime(duration)}
                    </span>
                </div>
                {audioBlob && !isRecording && (
                    <button onClick={reset} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
                        <Trash2 size={12} /> Discard
                    </button>
                )}
            </div>

            {/* Transcription Preview */}
            <div className="mb-4 bg-slate-50 dark:bg-slate-900 rounded-lg p-3 min-h-[60px] text-sm text-slate-600 dark:text-slate-300 italic border border-slate-100 dark:border-slate-800">
                {transcript || (isRecording ? "Listening..." : "Transcript will appear here...")}
            </div>

            {/* Audio Preview */}
            {audioUrl && (
                <div className="mb-4 hidden">
                    <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={() => setIsPlaying(false)}
                        onPause={() => setIsPlaying(false)}
                    />
                </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
                {!isRecording && !audioBlob && (
                    <button
                        onClick={startRecording}
                        className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all"
                    >
                        <Mic size={24} />
                    </button>
                )}

                {isRecording && (
                    <button
                        onClick={stopRecording}
                        className="w-12 h-12 rounded-full bg-slate-800 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-lg hover:scale-105 transition-all"
                    >
                        <Square size={20} fill="currentColor" />
                    </button>
                )}

                {audioBlob && !isRecording && (
                    <>
                        <button
                            onClick={togglePlay}
                            className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all"
                        >
                            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <RefreshCcw size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Note
                                </>
                            )}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default VoiceNoteRecorder;
