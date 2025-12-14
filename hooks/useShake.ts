
import { useEffect, useState, useCallback } from 'react';

// Shake sensitivity threshold
const THRESHOLD = 15;
// Time window to ignore subsequent shakes (debounce)
const TIMEOUT = 1000;

export const useShake = (onShake: () => void, enabled: boolean = true) => {
    const [lastShake, setLastShake] = useState(0);
    const [lastX, setLastX] = useState<number | null>(null);
    const [lastY, setLastY] = useState<number | null>(null);
    const [lastZ, setLastZ] = useState<number | null>(null);

    const handleMotion = useCallback((event: DeviceMotionEvent) => {
        if (!enabled) return;

        const current = event.accelerationIncludingGravity;
        if (!current) return;

        const { x, y, z } = current;
        if (x === null || y === null || z === null) return;

        if (lastX === null) {
            setLastX(x);
            setLastY(y);
            setLastZ(z);
            return;
        }

        const deltaX = Math.abs(lastX - x);
        const deltaY = Math.abs(lastY - y);
        const deltaZ = Math.abs(lastZ - z);

        if (deltaX + deltaY + deltaZ > THRESHOLD) {
            const now = Date.now();
            if (now - lastShake > TIMEOUT) {
                setLastShake(now);
                // Clean trigger
                onShake();
            }
        }

        setLastX(x);
        setLastY(y);
        setLastZ(z);
    }, [enabled, lastX, lastY, lastZ, lastShake, onShake]);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.DeviceMotionEvent) {
            // Request permission for iOS 13+ devices if needed, though usually handled by user interaction.
            // For simple integration, we verify listener support.
            window.addEventListener('devicemotion', handleMotion, false);
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('devicemotion', handleMotion);
            }
        };
    }, [handleMotion]);
};
