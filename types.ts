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
  // Donation Form Details
  donorPhone?: string;
  donorEmail?: string;
  donorAddress?: string;
  donorPAN?: string;
  receiptNumber?: string;
  paymentMode?: 'cash' | 'upi' | 'card' | 'cheque' | 'online';
  // Support tracking (1 support = ₹1200)
  supportsCount?: number;
}

// ===== VOLUNTEER/TEAM TYPES =====
export interface Volunteer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  createdAt: number;
  isActive: boolean;
}

// ===== GOAL TRACKING TYPES =====
// Presentations = visits/door knocks
// Forms = filled donation forms with donor details  
// Supports = donation units (1 support = ₹1200)

export interface GoalTargets {
  presentations: number; // Target presentations/visits
  forms: number;         // Target donation forms
  supports: number;      // Target supports (each = ₹1200)
}

export interface GoalProgress {
  date: string; // YYYY-MM-DD
  presentations: number;
  forms: number;
  supports: number;
  amount: number; // Total amount collected
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji or icon name
  unlockedAt?: number;
  requirement: {
    type: 'presentations' | 'forms' | 'supports' | 'amount' | 'streak';
    value: number;
  };
}

export interface GoalSettings {
  dailyTargets: GoalTargets;
  weeklyTargets: GoalTargets;
  streak: StreakData;
  unlockedAchievements: string[]; // Achievement IDs
}

export const SUPPORT_VALUE = 1200; // ₹1200 per support

// ===== ACCESSIBILITY SETTINGS =====
export interface AccessibilitySettings {
  highContrastMode: boolean;
  largerTouchTargets: boolean;
  fontSize: 'normal' | 'large' | 'extra-large';
}

export interface Apartment {
  id: string;
  name: string;
  floors: number;
  unitsPerFloor: number;
  createdAt: number;
  targetAmount?: number; // New: Fundraising Goal
  // Key is floor number (stringified), Value is array of Rooms
  rooms: Record<string, Room[]>; 
}

export interface Stats {
  totalRooms: number;
  visited: number;
  donated: number;
  totalRaised: number;
}

// ===== CORPORATE/BUSINESS TYPES =====

export type BusinessStatus = 'unvisited' | 'donated' | 'not_interested' | 'callback' | 'meeting_scheduled' | 'follow_up';

export interface Business {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  category: BusinessCategory;
  status: BusinessStatus;
  note: string;
  updatedAt: number | null;
  amountDonated?: number;
  amountPledged?: number;
  nextFollowUp?: number | null;
}

export type BusinessCategory = 'corporate' | 'retail' | 'restaurant' | 'clinic' | 'office' | 'factory' | 'other';

export interface BusinessCampaign {
  id: string;
  name: string;
  area: string; // Geographic area or zone
  createdAt: number;
  targetAmount?: number;
  businesses: Business[];
}

// ===== APP MODE =====
export type AppMode = 'home' | 'residential' | 'corporate';

// ===== TEAM/COLLABORATION T