import React from 'react';
import { Clock, Phone, Calendar, ChevronRight, CalendarCheck } from 'lucide-react';
import { BusinessCampaign, Business } from '../../types';
import { BUSINESS_STATUS_CONFIG, BUSINESS_CATEGORY_CONFIG } from '../../constants';
import { cn } from '../../utils/cn';

interface CorporateTasksProps {
  campaigns: BusinessCampaign[];
  onBusinessClick: (businessId: string, campaignId: string) => void;
}

interface TaskItem {
  type: 'callback' | 'follow_up' | 'meeting';
  business: Business;
  campaign: BusinessCampaign;
}

export default function CorporateTasks({ campaigns, onBusinessClick }: CorporateTasksProps) {
  const tasks: TaskItem[] = [];

  campaigns.forEach(campaign => {
    campaign.businesses.forEach(biz => {
      if (biz.status === 'callback') {
        tasks.push({ type: 'callback', business: biz, campaign });
      } else if (biz.status === 'follow_up') {
        tasks.push({ type: 'follow_up', business: biz, campaign });
      } else if (biz.status === 'meeting_scheduled') {
        tasks.push({ type: 'meeting', business: biz, campaign });
      }
    });
  });

  tasks.sort((a, b) => (b.business.updatedAt || 0) - (a.business.updatedAt || 0));

  const callbacks = tasks.filter(t => t.type === 'callback');
  const followUps = tasks.filter(t => t.type === 'follow_up');
  const meetings = tasks.filter(t => t.type === 'meeting');

  if (tasks.length === 0) return null;

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'No date';
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return `Today ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const TaskSection = ({ 
    title, items, icon: Icon, color 
  }: { 
    title: string; 
    items: TaskItem[]; 
    icon: any; 
    color: string;
  }) => {
    if (items.length === 0) return null;
    
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className={cn("px-5 py-4 border-b border-slate-100 dark:border-slate-700", color)}>
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color.replace('bg-', 'bg-').replace('/50', ''))}>
              <Icon size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{items.length} pending</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-64 overflow-y-auto">
          {items.slice(0, 5).map((task) => {
            const category = BUSINESS_CATEGORY_CONFIG[task.business.category];
            const CategoryIcon = category.icon;
            return (
              <button
                key={task.business.id}
                onClick={() => onBusinessClick(task.business.id, task.campaign.id)}
                className="w-full px-5 py-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left group"
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", category.color.replace('text-', 'bg-').replace('600', '100').replace('500', '100'))}>
                  <CategoryIcon size={18} className={category.color} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {task.business.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.business.contactPerson && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {task.business.contactPerson}
                      </span>
                    )}
                    {task.business.amountPledged ? (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                          ₹{task.business.amountPledged.toLocaleString()} pledged
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
              </button>
            );
          })}
        </div>

        {items.length > 5 && (
          <div className="px-5 py-2 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs text-center text-slate-500">+{items.length - 5} more</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <TaskSection title="Callbacks" items={callbacks} icon={Phone} color="bg-amber-50/50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400" />
      <TaskSection title="Follow Ups" items={followUps} icon={Calendar} color="bg-purple-50/50 dark:bg-purple-900/10 text-purple-600 dark:text-purple-400" />
      <TaskSection title="Scheduled Meetings" items={meetings} icon={CalendarCheck} color="bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400" />
    </div>
  );
}
