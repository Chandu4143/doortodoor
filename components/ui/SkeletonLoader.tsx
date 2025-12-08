import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
}

export function Skeleton({ className, variant = 'rectangular' }: SkeletonProps) {
  const baseClasses = "animate-pulse bg-slate-200 dark:bg-slate-700";
  
  const variantClasses = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
    card: "rounded-2xl",
  };

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300 pb-10">
      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-5">
              <Skeleton variant="rectangular" className="w-14 h-14 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" className="w-20 h-3" />
                <Skeleton variant="text" className="w-16 h-8" />
                <Skeleton variant="text" className="w-24 h-3" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Card Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Skeleton variant="card" className="h-40" />
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
          <Skeleton variant="text" className="w-32 h-5 mb-6" />
          <Skeleton variant="rectangular" className="w-full h-72" />
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
          <Skeleton variant="text" className="w-32 h-5 mb-6" />
          <Skeleton variant="rectangular" className="w-full h-72" />
        </div>
      </div>
    </div>
  );
}

export function RoomCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 min-h-[140px]">
      <div className="flex justify-between items-start mb-4">
        <Skeleton variant="text" className="w-12 h-6" />
        <Skeleton variant="rectangular" className="w-10 h-10 rounded-xl" />
      </div>
      <Skeleton variant="text" className="w-24 h-4 mb-2" />
      <Skeleton variant="text" className="w-16 h-3" />
    </div>
  );
}

export function ApartmentViewSkeleton() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <Skeleton variant="text" className="w-32 h-4 mb-4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <RoomCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
