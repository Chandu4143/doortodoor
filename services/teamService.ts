import { Volunteer, Apartment } from '../types';

const LS_KEY_VOLUNTEERS = 'doorstep_volunteers_v1';
const LS_KEY_ACTIVE_VOLUNTEER = 'doorstep_active_volunteer';

const uid = () => Math.random().toString(36).slice(2, 9);

// Volunteer Management
export const loadVolunteers = (): Volunteer[] => {
  try {
    const raw = localStorage.getItem(LS_KEY_VOLUNTEERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveVolunteers = (volunteers: Volunteer[]) => {
  localStorage.setItem(LS_KEY_VOLUNTEERS, JSON.stringify(volunteers));
};

export const createVolunteer = (name: string, phone: string, email?: string): Volunteer => {
  return {
    id: uid(),
    name,
    phone,
    email,
    createdAt: Date.now(),
    isActive: true,
  };
};

export const getActiveVolunteer = (): string | null => {
  return localStorage.getItem(LS_KEY_ACTIVE_VOLUNTEER);
};

export const setActiveVolunteer = (id: string | null) => {
  if (id) {
    localStorage.setItem(LS_KEY_ACTIVE_VOLUNTEER, id);
  } else {
    localStorage.removeItem(LS_KEY_ACTIVE_VOLUNTEER);
  }
};

// QR Code Data Sharing
export const generateShareData = (apartments: Apartment[]): string => {
  // Compress data for QR code
  const shareData = {
    v: 1, // version
    t: Date.now(),
    d: apartments.map(apt => ({
      n: apt.name,
      f: apt.floors,
      u: apt.unitsPerFloor,
      ta: apt.targetAmount,
      r: Object.entries(apt.rooms).reduce((acc, [floor, rooms]) => {
        acc[floor] = rooms.map(r => ({
          rn: r.roomNumber,
          s: r.status,
          vn: r.visitorName,
          a: r.amountDonated,
          sc: r.supportsCount,
        }));
        return acc;
      }, {} as Record<string, any[]>)
    }))
  };
  
  return btoa(JSON.stringify(shareData));
};

export const parseShareData = (encoded: string): Apartment[] | null => {
  try {
    const data = JSON.parse(atob(encoded));
    if (data.v !== 1) return null;
    
    return data.d.map((apt: any) => ({
      id: uid(),
      name: apt.n,
      floors: apt.f,
      unitsPerFloor: apt.u,
      targetAmount: apt.ta,
      createdAt: data.t,
      rooms: Object.entries(apt.r).reduce((acc, [floor, rooms]) => {
        acc[floor] = (rooms as any[]).map((r, i) => ({
          id: `${floor}-${i}-${uid()}`,
          roomNumber: r.rn,
          status: r.s,
          visitorName: r.vn || '',
          remark: '',
          note: '',
          amountDonated: r.a || 0,
          supportsCount: r.sc || 0,
          updatedAt: data.t,
        }));
        return acc;
      }, {} as Record<string, any[]>)
    }));
  } catch {
    return null;
  }
};

// Generate QR code URL using a free API
export const getQRCodeURL = (data: string, size: number = 200): string => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
};
