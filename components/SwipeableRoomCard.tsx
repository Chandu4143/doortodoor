import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Room, RoomStatus } from '../types';
import { STATUS_CONFIG } from '../constants';
import { cn } from '../utils/cn';

interface SwipeableRoomCardProps {
  room: Room;
  onStatusChange: (status: RoomStatus) => void;
  onClick: () => void;
}

export default function SwipeableRoomCard({ room, onStatusChange, onClick }: SwipeableRoomCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showFeedback, setShowFeedback] = useState<'left' | 'right' | null>(null);
  const constraintsRef = useRef(null);
  const x = useMotionValue(0);
  
  // Transform x position to background colors and opacity
  const leftBg = useTransform(x, [-150, 0], [1, 0]);
  const rightBg = useTransform(x, [0, 150], [0, 1]);
  
  // Scale feedback based on drag distance
  const leftScale = useTransform(x, [-150, -50, 0], [1.2, 1, 0.8]);
  const rightScale = useTransform(x, [0, 50, 150], [0.8, 1, 1.2]);
  
  const status = STATUS_CONFIG[room.status];
  const Icon = status.icon;

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 100;
    
    if (info.offset.x > threshold) {
      // Swiped right - Mark as Donated
      setShowFeedback('right');
      setTimeout(() => {
        onStatusChange('donated');
        setShowFeedback(null);
      }, 200);
    } else if (info.offset.x < -threshold) {
      // Swiped left - Mark as Not Interested
      setShowFeedback('left');
      setTimeout(() => {
        onStatusChange('not_interested');
        setShowFeedback(null);
      }, 200);
    }
    setIsDragging(false);
  };

  const formatVisitTime = (timestamp: number | null) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const visitTime = formatVisitTime(room.updatedAt);

  return (
    <div ref={constraintsRef} className="relative overflow-hidden rounded-2xl">
      {/* Background indicators */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-start pl-4 rounded-2xl"
        style={{ opacity: rightBg }}
      >
        <motion.div style={{ scale: rightScale }} className="flex items-center gap-2">
          <CheckCircle2 size={24} className="text-white" />
          <span className="text-white font-bold text-xs">Donated</span>
        </motion.div>
      </motion.div>
      
      <motion.div 
        className="absolute inset-0 bg-gradient-to-l from-red-500 to-rose-500 flex items-center justify-end pr-4 rounded-2xl"
        style={{ opacity: leftBg }}
      >
        <motion.div style={{ scale: leftScale }} className="flex items-center gap-2">
          <span className="text-white font-bold text-xs">Not Interested</span>
          <XCircle size={24} className="text-white" />
        </motion.div>
      </motion.div>

      {/* Success feedback overlay */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "absolute inset-0 z-20 flex items-center justify-center rounded-2xl",
              showFeedback === 'right' ? 'bg-green-500' : 'bg-red-500'
            )}
          >
            {showFeedback === 'right' ? (
              <CheckCircle2 size={40} className="text-white" />
            ) : (
              <XCircle size={40} className="text-white" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        onClick={() => !isDragging && onClick()}
        className={cn(
          "relative bg-white dark:bg-slate-800 border rounded-2xl p-4 cursor-pointer transition-shadow",
          "active:cursor-grabbing touch-pan-y",
          "flex flex-col justify-between min-h-[140px]",
          room.status === 'unvisited' ? 'border-slate-100 dark:border-slate-700' : '',
          room.status === 'donated' ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/10' : '',
          room.status === 'callback' ? 'border-amber-200 dark:border-amber-800 bg-amber-50/10' : '',
          room.status === 'not_interested' ? 'border-red-100 dark:border-red-900/50 bg-red-50/10' : '',
          room.status === 'other' ? 'border-slate-200 dark:border-slate-600 bg-slate-50/50' : ''
        )}
      >
        <div className="flex justify-between items-start mb-2">
          <span className="font-bold text-slate-800 dark:text-slate-100 text-xl tracking-tight">#{room.roomNumber}</span>
          <div className={cn(
            "p-2.5 rounded-xl shadow-sm",
            status.bg,
            status.color
          )}>
            <Icon size={20} strokeWidth={2.5} />
          </div>
        </div>

        <div className="flex-1">
          {room.visitorName ? (
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate mb-1">{room.visitorName}</p>
          ) : (
            <p className="text-xs text-slate-300 dark:text-slate-600 font-medium italic mb-1">Unknown Visitor</p>
          )}

          {room.status === 'donated' && room.amountDonated ? (
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{room.amountDonated}</p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">{room.remark}</p>
          )}
        </div>

        {visitTime && room.status !== 'unvisited' && (
          <div className="mt-3 pt-3 border-t border-slate-100/50 dark:border-slate-700/50 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <Clock size={10} />
            {visitTime}
          </div>
        )}

        {/* Swipe hint for unvisited - animated */}
        {room.status === 'unvisited' && (
          <motion.div 
            className="absolute bottom-2 left-0 right-0 flex justify-center items-center gap-1"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              animate={{ x: [-2, 2, -2] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronLeft size={12} className="text-slate-400 dark:text-slate-500" />
            </motion.div>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">swipe</span>
            <motion.div
              animate={{ x: [2, -2, 2] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronRight size={12} className="text-slate-400 dark:text-slate-500" />
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
