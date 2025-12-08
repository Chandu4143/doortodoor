import React from 'react';
import { Clock, Phone, Calendar, ChevronRight, AlertCircle } from 'lucide-react';
import { Apartment, Room } from '../types';
import { STATUS_CONFIG } from '../constants';
import { cn } from '../utils/cn';

interface TodaysTasksProps {
  apartments: Apartment[];
  onRoomClick: (roomId: string, floor: string, apartmentId: string) => void;
}

interface TaskItem {
  type: 'callback' | 'recent';
  room: Room;
  floor: string;
  apartment: Apartment;
}

export default function TodaysTasks({ apartments, onRoomClick }: TodaysTasksProps) {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  // Collect all callbacks and recent activities
  const tasks: TaskItem[] = [];

  apartments.forEach(apt => {
    Object.entries(apt.rooms).forEach(([floor, rooms]) => {
      rooms.forEach(room => {
        // Callbacks that need follow-up
        if (room.status === 'callback') {
          tasks.push({ type: 'callback', room, floor, apartment: apt });
        }
      });
    });
  });

  // Sort by most recent first
  tasks.sort((a, b) => (b.room.updatedAt || 0) - (a.room.updatedAt || 0));

  const callbacks = tasks.filter(t => t.type === 'callback');

  if (callbacks.length === 0) {
    return null;
  }

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'No date';
    const date = new Date(timestamp);
    if (date.toDateString() === today) {
      return `Today ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    if (date.toDateString() === yesterday) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-900/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center">
            <Phone size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Pending Callbacks</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{callbacks.length} people to follow up</p>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-80 overflow-y-auto">
        {callbacks.slice(0, 10).map((task) => {
          const config = STATUS_CONFIG[task.room.status];
          return (
            <button
              key={task.room.id}
              onClick={() => onRoomClick(task.room.id, task.floor, task.apartment.id)}
              className="w-full px-5 py-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left group"
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0",
                "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
              )}>
                #{task.room.roomNumber}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {task.room.visitorName || 'Unknown'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full font-bold uppercase">
                    {task.apartment.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Clock size={12} className="text-slate-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatTime(task.room.updatedAt)}
                  </span>
                  {task.room.remark && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                        {task.room.remark}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors shrink-0" />
            </button>
          );
        })}
      </div>

      {callbacks.length > 10 && (
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs text-center text-slate-500 dark:text-slate-400">
            +{callbacks.length - 10} more callbacks
          </p>
        </div>
      )}
    </div>
  );
}
