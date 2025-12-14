
import { useState, useCallback, useRef, useEffect } from 'react';

interface UseVoiceRecorderReturn {
    isRecording: boolean;
    isSupported: boolean;
    transcript: string;
    audioBlob: Blob | null;
    duration: number;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    reset: () => void;
    audioUrl: string | null;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [duration, setDuration] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recognitionRef = useRef<any>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const isSupported = typeof window !== 'undefined' &&
        !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    // Initialize Speech Recognition
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-IN';

            recognitionRef.current.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript + ' ';
                    }
                }
                setTranscript(prev => prev + finalTranscript);
            };
        }
    }, []);

    const startRecording = useCallback(async () => {
        if (!isSupported) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Start Media Recorder
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));

                // Cleanup stream tracks
                stream.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            };

            mediaRecorder.start();

            // Start Speech Recognition
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                } catch (e) {
                    // Ignore if already started
                    console.warn("Recognition start error", e);
                }
            }

            setIsRecording(true);
            setDuration(0);

            // Start Timer
            timerRef.current = setInterval(() => {
                setDuration(d => d + 1);
            }, 1000);

        } catch (err) {
            console.error("Failed to start recording", err);
        }
    }, [isSupported]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                // ignore
            }
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        setIsRecording(false);
    }, []);

    const reset = useCallback(() => {
        setTranscript('');
        setAudioBlob(null);
        setDuration(0);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
    }, [audioUrl]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    return {
        isRecording,
        isSupported,
        transcript,
        audioBlob,
        duration,
        startRecording,
        stopRecording,
        reset,
        audioUrl
    };
}
