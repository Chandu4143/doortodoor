
import { supabase } from './client';
import { createApartment } from './residentialService';

export interface ImportError {
    row: number;
    message: string;
}

export interface ImportResult {
    success: boolean;
    createdCount: number;
    errors: ImportError[];
}

export interface CSVBuildingData {
    name: string;
    floors: number;
    units_per_floor: number;
    latitude?: number;
    longitude?: number;
    target_amount?: number;
}

/**
 * Validates and parses raw CSV text into structured data
 */
export function parseCSV(csvText: string): { data: CSVBuildingData[], errors: ImportError[] } {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    const data: CSVBuildingData[] = [];
    const errors: ImportError[] = [];

    if (lines.length < 2) {
        return { data: [], errors: [{ row: 0, message: "CSV file is empty or missing headers" }] };
    }

    // Expected Headers: name, floors, units_per_floor, latitude, longitude, target_amount
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

    // Simple validation of required headers
    if (!headers.includes('name') || !headers.includes('floors')) {
        return { data: [], errors: [{ row: 0, message: "Missing required headers: name, floors" }] };
    }

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const rowData: any = {};

        headers.forEach((header, index) => {
            if (values[index]) rowData[header] = values[index];
        });

        // Validation for this row
        if (!rowData.name) {
            errors.push({ row: i + 1, message: "Missing building Name" });
            continue;
        }

        const floors = parseInt(rowData.floors);
        const units = parseInt(rowData.units_per_floor);

        if (isNaN(floors) || floors < 1) {
            errors.push({ row: i + 1, message: `Invalid floors: ${rowData.floors}` });
            continue;
        }
        if (isNaN(units) || units < 1) {
            errors.push({ row: i + 1, message: `Invalid units_per_floor: ${rowData.units_per_floor}` });
            continue;
        }

        data.push({
            name: rowData.name,
            floors,
            units_per_floor: units,
            latitude: rowData.latitude ? parseFloat(rowData.latitude) : undefined,
            longitude: rowData.longitude ? parseFloat(rowData.longitude) : undefined,
            target_amount: rowData.target_amount ? parseFloat(rowData.target_amount) : 0
        });
    }

    return { data, errors };
}

/**
 * Batch imports apartments into a team
 */
export async function importBuildings(teamId: string, buildings: CSVBuildingData[]): Promise<ImportResult> {
    let createdCount = 0;
    const errors: ImportError[] = [];

    // Since our createApartment logic involves generating rooms, we should reuse it.
    // However, for speed, we might want a bulk insert RPC function in Supabase.
    // For now, to ensure all triggers/room generation logic runs (which is currently client-side in residentialService potentially?), we loop.
    // IMPORTANT: Note that createApartment in residentialService is what triggers room creation logic IF it's handled there.
    // Let's check residentialService.ts content. If room init is complex, we use the service.

    // Using parallel promises for speed, but capped concurrency would be better for huge files.
    // For < 100 items, Promise.all is okay.

    const results = await Promise.all(buildings.map(async (b, index) => {
        const result = await createApartment(teamId, {
            name: b.name,
            floors: b.floors,
            units_per_floor: b.units_per_floor,
            target_amount: b.target_amount || 0,
            latitude: b.latitude,
            longitude: b.longitude
        });

        if (result.success) {
            return { success: true };
        } else {
            return { success: false, row: index + 2, message: result.error || 'Unknown error' };
        }
    }));

    results.forEach(r => {
        if (r.success) createdCount++;
        else if (r.message) errors.push({ row: r.row!, message: r.message });
    });

    return { success: errors.length === 0, createdCount, errors };
}
