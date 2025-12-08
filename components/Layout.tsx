import React, { useEffect, useState } from 'react';
import { Moon, Sun, WifiOff, Wifi, Cloud, CloudOff } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { cn } from '../utils/cn';

interface LayoutProps {
    children: React.ReactNode;
    sidebar: React.ReactNode;
    isSidebarOpen: boolean;
    onSidebarClose: () => void;
}

export default function Layout({ children, sidebar, isSidebarOpen, onSidebarClose }: LayoutProps) {
    const [isDarkMode, setIsDarkMode] = useLocalStorage('darkMode', false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showSyncStatus, setShowSyncStatus] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Track storage changes for sync indicator - longer visibility
    useEffect(() => {
        const handleStorage = () => {
            setLastSaved(new Date());
            setShowSyncStatus(true);
            setTimeout(() => setShowSyncStatus(false), 3000); // Increased from 2s to 3s
        };
        
        // Listen for localStorage changes
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
            originalSetItem.apply(this, [key, value]);
            if (key.startsWith('doorstep')) {
                handleStorage();
            }
        };

        return () => {
            localStorage.setItem = originalSetItem;
        };
    }, []);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    return (
        <div className={cn(
            "flex h-screen overflow-hidden font-sans transition-colors duration-300",
            "bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
        )}>
            {/* Offline Banner */}
            {!isOnline && (
                <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white text-xs font-bold text-center py-1.5 px-4 shadow-md flex items-center justify-center gap-2">
                    <CloudOff size={14} />
                    You are offline. Changes saved locally.
                </div>
            )}

            {/* Sync Status Indicator - Improved visibility */}
            {showSyncStatus && isOnline && (
                <div className="fixed top-4 right-4 z-[60] bg-green-500 text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg shadow-green-200 dark:shadow-green-900/50 flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
                    <Cloud size={14} />
                    Saved
                </div>
            )}

            {/* Mobile Sidebar Backdrop */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 z-30 md:hidden backdrop-blur-sm animate-in fade-in"
                    onClick={onSidebarClose}
                />
            )}

            {/* Sidebar Area */}
            {/* We pass the sidebar content from parent to keep Layout generic but it renders here */}
            {sidebar}

            {/* Main Content Area */}
            <main className={cn(
                "flex-1 flex flex-col h-full overflow-hidden relative w-full",
                !isOnline && "pt-6"
            )}>
                {children}

                {/* Dark Mode Toggle (Floating) */}
                <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="fixed bottom-6 right-6 z-50 p-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-yellow-400 rounded-full shadow-lg shadow-slate-200/50 dark:shadow-black/50 hover:scale-110 active:scale-95 transition-all"
                    title="Toggle Dark Mode"
                >
                    {isDarkMode ? <Sun size={20} fill="currentColor" /> : <Moon size={20} />}
                </button>
            </main>
        </div>
    );
}
