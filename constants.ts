import { RoomStatus } from './types';
import { 
  Circle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  HelpCircle 
} from 'lucide-react';

export const LS_KEY = "doorstep_app_v2";

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