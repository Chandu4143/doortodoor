export type RoomStatus = 'unvisited' | 'donated' | 'not_interested' | 'callback' | 'other';

export interface Room {
  id: string;
  roomNumber: number;
  visitorName: string;
  remark: string;
  status: RoomStatus;
  note: string;
  updatedAt: number | null;
  amountDonated?: number;
}

export interface Apartment {
  id: string;
  name: string;
  floors: number;
  unitsPerFloor: number;
  createdAt: number;
  // Key is floor number (stringified), Value is array of Rooms
  rooms: Record<string, Room[]>; 
}

export interface Stats {
  totalRooms: number;
  visited: number;
  donated: number;
  totalRaised: number;
}