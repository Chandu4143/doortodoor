
import React, { useEffect, useState } from 'react';
import {
    getBuildingPresets,
    createBuildingPreset,
    deleteBuildingPreset,
    type BuildingPreset
} from '../services/supabase/campaignTemplateService';
import { Plus, Trash2, Building, LayoutTemplate } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface TemplateManagerProps {
    teamId: string;
    onClose?: () => void;
}

export default function TemplateManager({ teamId, onClose }: TemplateManagerProps) {
    const [presets, setPresets] = useState<BuildingPreset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [floors, setFloors] = useState(1);
    const [unitsPerFloor, setUnitsPerFloor] = useState(1);

    useEffect(() => {
        loadPresets();
    }, [teamId]);

    const loadPresets = async () => {
        setIsLoading(true);
        const { success, presets } = await getBuildingPresets(teamId);
        if (success && presets) {
            setPresets(presets);
        }
        setIsLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        const { success, preset, error } = await createBuildingPreset({
            name,
            floors,
            units_per_floor: unitsPerFloor,
            team_id: teamId
        });

        if (success && preset) {
            setPresets(prev => [...prev, preset]);
            setName('');
            setFloors(1);
            setUnitsPerFloor(1);
        } else {
            alert('Failed to create preset: ' + error);
        }
        setIsCreating(false);
    };

    const handleDelete = async (id: string, isSystem: boolean) => {
        if (isSystem) return; // Cannot delete system presets
        if (!confirm('Are you sure you want to delete this preset?')) return;

        const { success, error } = await deleteBuildingPreset(id);
        if (success) {
            setPresets(prev => prev.filter(p => p.id !== id));
        } else {
            alert('Failed to delete: ' + error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <LayoutTemplate className="text-blue-500" />
                        Building Presets
                    </h2>
                    <p className="text-sm text-slate-500">Standard configurations for quick campaign creation.</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Create Form */}
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4">Create New Preset</h3>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Preset Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Standard 4-Storey"
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Floors</label>
                                <input
                                    type="number"
                                    min="1" max="100"
                                    required
                                    value={floors}
                                    onChange={e => setFloors(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Units per Floor</label>
                                <input
                                    type="number"
                                    min="1" max="50"
                                    required
                                    value={unitsPerFloor}
                                    onChange={e => setUnitsPerFloor(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {isCreating ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                            Save Preset
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {isLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-400" /></div>
                    ) : (
                        presets.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">No presets found.</p>
                        ) : (
                            presets.map(preset => (
                                <div key={preset.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${preset.is_system ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                            <Building size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm">{preset.name}</h4>
                                            <p className="text-xs text-slate-500">
                                                {preset.floors} Floors • {preset.units_per_floor} Units/Floor
                                                {preset.is_system && <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded uppercase font-bold tracking-wider">System</span>}
                                            </p>
                                        </div>
                                    </div>
                                    {!preset.is_system && (
                                        <button
                                            onClick={() => handleDelete(preset.id, preset.is_system)}
                                            className="text-slate-400 hover:text-red-600 p-2 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
