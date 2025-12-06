import React from 'react';
import { Menu, Settings, Building2, Search, X } from 'lucide-react';
import { Apartment } from '../types';

interface MobileHeaderProps {
    title: string;
    subtitle?: string;
    onMenuClick: () => void;
    onSettingsClick?: () => void;
    showSearch?: boolean;
    searchQuery?: string;
    onSearchChange?: (val: string) => void;
    onSearchClear?: () => void;
    timeFilter: 'all' | 'today' | 'yesterday';
    onTimeFilterChange: (val: 'all' | 'today' | 'yesterday') => void;
}

export default function MobileHeader({
    title,
    subtitle,
    onMenuClick,
    onSettingsClick,
    showSearch,
    searchQuery,
    onSearchChange,
    onSearchClear,
    timeFilter,
    onTimeFilterChange
}: MobileHeaderProps) {
    return (
        <div className="md:hidden flex flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800 sticky top-0 z-20">
            <div className="flex items-center justify-between p-4 pb-2">
                <div className="flex items-center gap-3">
                    <button onClick={onMenuClick} className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg active:scale-95 transition-transform">
                        <Menu size={24} />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate max-w-[200px] leading-tight">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
                        )}
                    </div>
                </div>
                {onSettingsClick && (
                    <button
                        onClick={onSettingsClick}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                    >
                        <Settings size={20} />
                    </button>
                )}
            </div>

            {showSearch && (
                <div className="px-4 pb-3 space-y-2">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={16} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-400"
                            value={searchQuery}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={onSearchClear}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                                <X size={14} className="text-slate-400" />
                            </button>
                        )}
                    </div>

                    {/* Mobile Time Filter */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {(['all', 'today', 'yesterday'] as const).map(filter => (
                            <button
                                key={filter}
                                onClick={() => onTimeFilterChange(filter)}
                                className={`
                  px-3 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap border transition-colors
                  ${timeFilter === filter
                                        ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-800 dark:border-slate-100'
                                        : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'}
                `}
                            >
                                {filter === 'all' ? 'All Time' : filter}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
