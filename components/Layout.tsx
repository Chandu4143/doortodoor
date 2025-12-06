import React, { useEffect } from 'react';
import { Moon, Sun, WifiOff } from 'lucide-react';
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
    const [isOnline, setIsOnline] = React.useState(navigator.onLine);

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
                <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white text-xs font-bold text-center py-1 px-4 shadow-md flex items-center justify-center gap-2">
                    <WifiOff size={14} />
                    You are offline. Changes saved locally.
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
