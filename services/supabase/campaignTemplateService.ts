
import { supabase } from './client';

export interface BuildingPreset {
    id: string;
    name: string;
    floors: number;
    units_per_floor: number;
    is_system: boolean;
    created_by?: string;
    team_id?: string;
    created_at?: string;
}

export interface AreaTemplate {
    id: string;
    name: string;
    buildings: {
        preset_id: string;
        count: number;
    }[]; // JSONB structure
    created_by?: string;
    team_id?: string;
    created_at?: string;
}

// --- Building Presets ---

export async function getBuildingPresets(teamId?: string) {
    let query = supabase
        .from('building_presets')
        .select('*')
        .order('name');

    // Fetch system presets OR presets for this team
    if (teamId) {
        query = query.or(`is_system.eq.true,team_id.eq.${teamId}`);
    } else {
        query = query.eq('is_system', true);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching presets:', error);
        return { success: false, error: error.message };
    }

    return { success: true, presets: data as BuildingPreset[] };
}

export async function createBuildingPreset(preset: Omit<BuildingPreset, 'id' | 'created_at' | 'is_system'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data, error } = await supabase
        .from('building_presets')
        .insert({
            ...preset,
            created_by: user.id
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating preset:', error);
        return { success: false, error: error.message };
    }

    return { success: true, preset: data as BuildingPreset };
}

export async function deleteBuildingPreset(id: string) {
    const { error } = await supabase
        .from('building_presets')
        .delete()
        .eq('id', id)
        // Ensure we don't delete system presets (though RLS should handle this)
        .eq('is_system', false);

    if (error) {
        console.error('Error deleting preset:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

// --- Area Templates ---

export async function getAreaTemplates(teamId: string) {
    const { data, error } = await supabase
        .from('area_templates')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching templates:', error);
        return { success: false, error: error.message };
    }

    return { success: true, templates: data as AreaTemplate[] };
}

export async function createAreaTemplate(template: Omit<AreaTemplate, 'id' | 'created_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data, error } = await supabase
        .from('area_templates')
        .insert({
            ...template,
            created_by: user.id
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating template:', error);
        return { success: false, error: error.message };
    }

    return { success: true, template: data as AreaTemplate };
}

export async function deleteAreaTemplate(id: string) {
    const { error } = await supabase
        .from('area_templates')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting template:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}
