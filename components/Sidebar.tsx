import React, { useState } from 'react';
import {
    Home,
    LayoutGrid,
    Database,
    Plus,
    Building2,
    Trash2,
    Download,
    ChevronLeft
} from 'lucide-react';
import { Apartment } from '../types';
import { cn } from '../utils/cn';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    viewMode: 'dashboard' | 'apartment';
    setViewMode: (mode: 'dashboard' | 'apartment') => void;
    selectedApartmentId: string | null;
    onSelectApartment: (id: string | null) => void;
    apartments: Apartment[];
    onCreateApartment: (name: string, floors: number, units: number, target: number) => void;
    onDeleteApartment: (id: string) => void;
    onExportCSV: () => void;
    onOpenRestoration: () => void;
}

export default function Sidebar({
    isOpen,
    onClose,
    viewMode,
    setViewMode,
    selectedApartmentId,
    onSelectApartment,
    apartments,
    onCreateApartment,
    onDeleteApartment,
    onExportCSV,
    onOpenRestoration
}: SidebarProps) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newAptName, setNewAptName] = useState('');
    const [newFloors, setNewFloors] = useState(5);
    const [newUnits, setNewUnits] = useState(4);
    const [newTarget, setNewTarget] = useState(0);

    const handleSubmit = () => {
        if (!newAptName.trim()) return;
        onCreateApartment(newAptName, newFloors, newUnits, newTarget);
        setNewAptName('');
        setNewTarget(0);
        setShowCreateForm(false);
    };

    return (
        <aside
            className={cn(
                "fixed inset-y-0 left-0 z-40 w-80 bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-800 shadow-2xl md:shadow-none flex flex-col transition-transform duration-300 ease-in-out",
                "md:relative md:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full md:w-0 md:overflow-hidden"
            )}
        >
            <div className="p-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 text-slate-800 dark:text-slate-100 font-bold text-xl tracking-tight">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-blue-200 dark:shadow-blue-900/50 shadow-lg">
                        <Home size={18} strokeWidth={2.5} />
                    </div>
                    DoorStep
                </div>
                <button onClick={onClose} className="md:hidden text-slate-400 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">
                    <ChevronLeft />
                </button>
            </div>

            <div className="px-4 py-2 flex-1 overflow-y-auto space-y-6 custom-scrollbar">

                {/* Main Nav */}
                <div className="space-y-1">
                    <button
                        onClick={() => { setViewMode('dashboard'); onSelectApartment(null); }}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                            viewMode === 'dashboard'
                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm"
                                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                        )}
                    >
                        <LayoutGrid size={20} className={viewMode === 'dashboard' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                        Dashboard
                    </button>
                    <button
                        onClick={onOpenRestoration}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                        <Database size={20} className="text-slate-400" />
                        Backup & Restore
                    </button>
                </div>

                {/* Apartments List */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Campaigns</span>
                        <button
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1.5 rounded-lg transition-colors"
                            title="Add New Apartment"
                        >
                            <Plus size={16} strokeWidth={3} />
                        </button>
                    </div>

                    {showCreateForm && (
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-2 space-y-3 shadow-inner">
                            <input
                                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-400 transition-all placeholder:text-slate-400"
                                placeholder="Building Name"
                                autoFocus
                                value={newAptName}
                                onChange={e => setNewAptName(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase text-slate-400 font-bold ml-1 mb-0.5 block">Floors</label>
                                    <input
                                        type="number" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                                        value={newFloors} onChange={e => setNewFloors(Number(e.target.value))}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase text-slate-400 font-bold ml-1 mb-0.5 block">Units/Flr</label>
                                    <input
                                        type="number" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                                        value={newUnits} onChange={e => setNewUnits(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase text-slate-400 font-bold ml-1 mb-0.5 block">Target Amount (₹)</label>
                                <input
                                    type="number" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
                                    value={newTarget} onChange={e => setNewTarget(Number(e.target.value))}
                                    placeholder="e.g. 50000"
                                />
                            </div>
                            <button
                                onClick={handleSubmit}
                                className="w-full bg-blue-600 text-white text-sm py-2 rounded-lg font-bold hover:bg-blue-700 shadow-md shadow-blue-200 dark:shadow-none transition-all active:scale-95"
                            >
                                Create Building
                            </button>
                        </div>
                    )}

                    <div className="space-y-1">
                        {apartments.length === 0 && !showCreateForm && (
                            <div className="text-sm text-center text-slate-400 py-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                                No apartments yet.<br />Click + to add one.
                            </div>
                        )}
                        {apartments.map(apt => (
                            <div
                                key={apt.id}
                                className={cn(
                                    "group relative flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer text-sm transition-all duration-200",
                                    selectedApartmentId === apt.id && viewMode === 'apartment'
                                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-200 dark:shadow-slate-800"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm hover:text-slate-900 dark:hover:text-slate-100 border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                                )}
                                onClick={() => onSelectApartment(apt.id)}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <Building2 size={18} className={cn(
                                        selectedApartmentId === apt.id ? 'text-blue-400 dark:text-blue-600' : 'text-slate-300 dark:text-slate-600 group-hover:text-blue-500'
                                    )} />
                                    <div className="flex flex-col truncate">
                                        <span className="truncate font-semibold tracking-tight">{apt.name}</span>
                                        <span className={cn("text-[10px]", selectedApartmentId === apt.id ? 'text-slate-400 dark:text-slate-500' : 'text-slate-400 dark:text-slate-500')}>
                                            {apt.floors} Floors
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteApartment(apt.id); }}
                                    className={cn(
                                        "p-1.5 rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-20",
                                        selectedApartmentId === apt.id
                                            ? 'hover:bg-slate-800 dark:hover:bg-slate-200 text-slate-400 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-600'
                                            : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 dark:text-slate-600 hover:text-red-500'
                                    )}
                                    title="Delete Campaign"
                                >
                                    <Trash2 size={14} />
                                </button>

                                {/* Active Indicator Line */}
                                {selectedApartmentId === apt.id && viewMode === 'apartment' && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-blue-500 rounded-r-full"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                <button
                    onClick={onExportCSV}
                    className="group w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border border-slate-200 dark:border-slate-700 rounded-xl py-3 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-sm transition-all"
                >
                    <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                    Export CSV
                </button>
            </div>
        </aside>
    );
}
