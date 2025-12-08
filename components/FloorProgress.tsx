import React from 'react';
import { ChevronRight, Target, CheckCircle2 } from 'lucide-react';
import { Room } from '../types';
import { cn } from '../utils/cn';

interface FloorProgressProps {
  floor: string;
  rooms: Room[];
  onNextUnvisited: (roomId: string) => void;
}

export default function FloorProgress({ floor, rooms, onNextUnvisited }: FloorProgressProps) {
  const visited = rooms.filter(r => r.status !== 'unvisited').length;
  const total = rooms.length;
  const percentage = Math.round((visited / total) * 100);
  const nextUnvisited = rooms.find(r => r.status === 'unvisited');

  const isComplete = visited === total;

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2 rounded-xl transition-all",
      isComplete 
        ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" 
        : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
    )}>
      {/* Progress Ring */}
      <div className="relative w-10 h-10">
        <svg className="w-10 h-10 transform -rotate-90">
          <circle
            cx="20" cy="20" r="16"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-slate-100 dark:text-slate-700"
          />
          <circle
            cx="20" cy="20" r="16"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${percentage} 100`}
            strokeLinecap="round"
            className={isComplete ? "text-green-500" : "text-blue-500"}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isComplete ? (
            <CheckCircle2 size={14} className="text-green-500" />
          ) : (
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{percentage}%</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Floor {floor}</span>
          {isComplete && (
            <span className="text-[10px] px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full font-bold">
              Complete!
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {visited} of {total} visited • {total - visited} remaining
        </p>
      </div>

      {/* Next Button */}
      {nextUnvisited && (
        <button
          onClick={() => onNextUnvisited(nextUnvisited.id)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
        >
          Next <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
