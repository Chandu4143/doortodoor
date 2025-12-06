import { Apartment, Room, RoomStatus } from '../types';
import { LS_KEY } from '../constants';

// --- Helpers ---
const uid = () => Math.random().toString(36).slice(2, 9);

function generateRooms(floors: number, unitsPerFloor: number): Record<string, Room[]> {
  const out: Record<string, Room[]> = {};
  for (let f = floors; f >= 1; f--) {
    out[f] = Array.from({ length: unitsPerFloor }, (_, i) => {
      const roomNumber = f * 100 + (i + 1);
      return {
        id: `${f}-${i + 1}-${uid()}`,
        roomNumber,
        visitorName: "",
        remark: "",
        status: 'unvisited',
        note: "",
        updatedAt: null,
      };
    });
  }
  return out;
}

// --- Service Methods ---

export const loadApartments = (): Apartment[] => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load data from localStorage", e);
    return [];
  }
};

export const saveApartments = (apartments: Apartment[]) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(apartments));
  } catch (e) {
    console.error("Failed to save data to localStorage", e);
  }
};

export const createNewApartment = (name: string, floors: number, unitsPerFloor: number, targetAmount?: number): Apartment => {
  return {
    id: uid(),
    name,
    floors,
    unitsPerFloor,
    createdAt: Date.now(),
    targetAmount: targetAmount || 0,
    rooms: generateRooms(floors, unitsPerFloor),
  };
};

export const updateRoomInApartment = (
  apartments: Apartment[],
  apartmentId: string,
  floor: string,
  roomId: string,
  updates: Partial<Room>
): Apartment[] => {
  return apartments.map((a) => {
    if (a.id !== apartmentId) return a;
    
    // Deep copy rooms for immutability
    const newRooms = { ...a.rooms };
    if (!newRooms[floor]) return a;

    newRooms[floor] = newRooms[floor].map(r => {
      if (r.id === roomId) {
        // Use provided updatedAt, or default to Date.now() if not provided but other updates exist
        const newTimestamp = updates.updatedAt !== undefined ? updates.updatedAt : Date.now();
        return { ...r, ...updates, updatedAt: newTimestamp };
      }
      return r;
    });

    return { ...a, rooms: newRooms };
  });
};

export const resizeApartment = (
  apartments: Apartment[],
  apartmentId: string,
  newName: string,
  newFloorCount: number,
  newUnitCount: number,
  newTargetAmount?: number
): Apartment[] => {
  return apartments.map(apt => {
    if (apt.id !== apartmentId) return apt;

    const updatedRooms: Record<string, Room[]> = {};

    // Iterate up to the new floor count
    for (let f = newFloorCount; f >= 1; f--) {
      const existingFloor = apt.rooms[f];
      
      if (existingFloor) {
        // Floor exists, resize units
        if (newUnitCount > existingFloor.length) {
            // Add units
            const unitsToAdd = newUnitCount - existingFloor.length;
            const newUnits = Array.from({ length: unitsToAdd }, (_, i) => {
                const roomNumber = f * 100 + (existingFloor.length + i + 1);
                return {
                    id: `${f}-${existingFloor.length + i + 1}-${uid()}`,
                    roomNumber,
                    visitorName: "",
                    remark: "",
                    status: 'unvisited',
                    note: "",
                    updatedAt: null,
                } as Room;
            });
            updatedRooms[f] = [...existingFloor, ...newUnits];
        } else {
            // Remove/Keep units (slice)
            // Warning: Data in truncated rooms will be lost.
            updatedRooms[f] = existingFloor.slice(0, newUnitCount);
        }
      } else {
        // Create new floor
         updatedRooms[f] = Array.from({ length: newUnitCount }, (_, i) => {
            const roomNumber = f * 100 + (i + 1);
            return {
                id: `${f}-${i + 1}-${uid()}`,
                roomNumber,
                visitorName: "",
                remark: "",
                status: 'unvisited',
                note: "",
                updatedAt: null,
            } as Room;
        });
      }
    }

    return {
        ...apt,
        name: newName,
        floors: newFloorCount,
        unitsPerFloor: newUnitCount,
        targetAmount: newTargetAmount !== undefined ? newTargetAmount : apt.targetAmount,
        rooms: updatedRooms
    };
  });
};

export const exportToCSV = (apartments: Apartment[]) => {
  const rows = [
    ["Apartment", "Floor", "Room", "Status", "Visitor Name", "Remark", "Notes", "Last Updated", "Donation Amount"]
  ];

  apartments.forEach(apt => {
    Object.keys(apt.rooms).forEach(floor => {
      apt.rooms[floor].forEach(room => {
        rows.push([
          apt.name,
          floor,
          room.roomNumber.toString(),
          room.status,
          room.visitorName || "",
          room.remark || "",
          room.note || "",
          room.updatedAt ? new Date(room.updatedAt).toISOString() : "",
          room.amountDonated ? room.amountDonated.toString() : "0"
        ]);
      });
    });
  });

  const csvContent = rows.map(e => e.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `doorstep_export_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
};

// --- Backup & Restore ---

export const exportBackupJSON = (apartments: Apartment[]) => {
  const dataStr = JSON.stringify(apartments, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `doorstep_backup_${new Date().toISOString().slice(0,10)}.json`;
  link.click();
};

export const validateAndParseImport = async (file: File): Promise<Apartment[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!Array.isArray(json)) {
          throw new Error("Invalid format: Root must be an array");
        }
        // Basic schema check (check if first item has 'id' and 'rooms')
        if (json.length > 0 && (!json[0].id || !json[0].rooms)) {
             throw new Error("Invalid format: Missing required apartment fields");
        }
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};