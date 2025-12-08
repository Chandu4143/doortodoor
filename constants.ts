import { RoomStatus, BusinessStatus, BusinessCategory } from './types';
import { 
  Circle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  HelpCircle,
  CalendarCheck,
  PhoneForwarded,
  Building2,
  Store,
  UtensilsCrossed,
  Stethoscope,
  Briefcase,
  Factory,
  MoreHorizontal
} from 'lucide-react';

export const LS_KEY = "doorstep_app_v2";
export const LS_KEY_CORPORATE = "doorstep_corporate_v1";

export const STATUS_CONFIG: Record<RoomStatus, { label: string; color: string; icon: any; bg: string }> = {
  unvisited: { 
    label: 'Unvisited', 
    color: 'text-slate-500', 
    bg: 'bg-white',
    icon: Circle 
  },
  donated: { 
    label: 'Donated', 
    color: 'text-green-600', 
    bg: 'bg-green-50 border-green-200',
    icon: CheckCircle2 
  },
  not_interested: { 
    label: 'Not Interested', 
    color: 'text-red-500', 
    bg: 'bg-red-50 border-red-200',
    icon: XCircle 
  },
  callback: { 
    label: 'Call Back', 
    color: 'text-amber-500', 
    bg: 'bg-amber-50 border-amber-200',
    icon: Clock 
  },
  other: { 
    label: 'Other', 
    color: 'text-gray-500', 
    bg: 'bg-gray-100 border-gray-200',
    icon: HelpCircle 
  },
};

// ===== BUSINESS/CORPORATE STATUS CONFIG =====
export const BUSINESS_STATUS_CONFIG: Record<BusinessStatus, { label: string; color: string; icon: any; bg: string }> = {
  unvisited: { 
    label: 'Unvisited', 
    color: 'text-slate-500', 
    bg: 'bg-white',
    icon: Circle 
  },
  donated: { 
    label: 'Donated', 
    color: 'text-green-600', 
    bg: 'bg-green-50 border-green-200',
    icon: CheckCircle2 
  },
  not_interested: { 
    label: 'Not Interested', 
    color: 'text-red-500', 
    bg: 'bg-red-50 border-red-200',
    icon: XCircle 
  },
  callback: { 
    label: 'Call Back', 
    color: 'text-amber-500', 
    bg: 'bg-amber-50 border-amber-200',
    icon: Clock 
  },
  meeting_scheduled: { 
    label: 'Meeting Set', 
    color: 'text-blue-500', 
    bg: 'bg-blue-50 border-blue-200',
    icon: CalendarCheck 
  },
  follow_up: { 
    label: 'Follow Up', 
    color: 'text-purple-500', 
    bg: 'bg-purple-50 border-purple-200',
    icon: PhoneForwarded 
  },
};

export const BUSINESS_CATEGORY_CONFIG: Record<BusinessCategory, { label: string; icon: any; color: string }> = {
  corporate: { label: 'Corporate', icon: Building2, color: 'text-blue-600' },
  retail: { label: 'Retail Shop', icon: Store, color: 'text-orange-500' },
  restaurant: { label: 'Restaurant', icon: UtensilsCrossed, color: 'text-red-500' },
  clinic: { label: 'Clinic/Hospital', icon: Stethoscope, color: 'text-emerald-500' },
  office: { label: 'Office', icon: Briefcase, color: 'text-slate-600' },
  factory: { label: 'Factory/Warehouse', icon: Factory, color: 'text-amber-600' },
  other: { label: 'Other', icon: MoreHorizontal, color: 'text-gray-500' },
};

export const FUNDRAISING_SCRIPTS = [
  {
    id: 'intro',
    title: 'The Opener',
    scenario: 'Initial Greeting',
    text: "Hi! My name is [Name] and I'm a volunteer with [Organization]. We're in the neighborhood today sharing updates about our recent community projects. Have you heard about our work with [Project Name]?",
    color: 'bg-blue-50 border-blue-200 text-blue-800'
  },
  {
    id: 'callback',
    title: 'Not Home / Busy',
    scenario: 'Leaving a Note or Call Back',
    text: "Sorry I missed you! I stopped by to share some info about [Organization]. I'll try to swing by later, or feel free to check out our website at [URL]. Have a great day!",
    color: 'bg-amber-50 border-amber-200 text-amber-800'
  },
  {
    id: 'donation',
    title: 'The Ask',
    scenario: 'Requesting Support',
    text: "That's great! Since you value [Cause], would you be willing to support us with a small contribution today? Even ₹100 goes a long way in helping us achieve [Specific Goal].",
    color: 'bg-green-50 border-green-200 text-green-800'
  },
  {
    id: 'refusal',
    title: 'Graceful Exit',
    scenario: 'Not Interested',
    text: "I completely understand. Thank you so much for your time and for being a neighbor. Have a wonderful rest of your day!",
    color: 'bg-red-50 border-red-200 text-red-800'
  }
];