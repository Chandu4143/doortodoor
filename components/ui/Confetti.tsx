import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiProps {
  isActive: boolean;
  duration?: number;
}

const CONFETTI_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  scale: number;
}

export default function Confetti({ isActive, duration = 2000 }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (isActive) {
      const newParticles: Particle[] = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        delay: Math.random() * 0.3,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => setParticles([]), duration);
      return () => clearTimeout(timer);
    }
  }, [isActive, duration]);

  return (
    <AnimatePresence>
      {particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ 
                y: -20, 
                x: `${particle.x}vw`, 
                opacity: 1,
                rotate: 0,
                scale: particle.scale 
              }}
              animate={{ 
                y: '100vh', 
                opacity: 0,
                rotate: particle.rotation + 720,
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 2 + Math.random(), 
                delay: particle.delay,
                ease: 'easeOut'
              }}
              className="absolute top-0"
              style={{ left: `${particle.x}%` }}
            >
              <div 
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: particle.color }}
              />
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
