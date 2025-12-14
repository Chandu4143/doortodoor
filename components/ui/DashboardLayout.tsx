import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface DashboardLayoutProps {
    children: ReactNode;
    className?: string;
    delay?: number;
}

export default function DashboardLayout({ children, className, delay = 0.1 }: DashboardLayoutProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay }}
            className={cn("space-y-6 max-w-7xl mx-auto pb-10", className)}
        >
            {children}
        </motion.div>
    );
}
