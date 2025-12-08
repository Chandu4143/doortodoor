import React, { useMemo, useState } from 'react';
import {
  Briefcase, Settings, Search, X, Plus, Phone, MapPin, Clock, User
} from 'lucide-react';
import { BusinessCampaign, Business, BusinessCategory } from '../../types';
import { BUSINESS_STATUS_CONFIG, BUSINESS_CATEGORY_CONFIG } from '../../constants';
import { cn } from '../../utils/cn';

interface CorporateCampaignViewProps {
  campaign: BusinessCampaign;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onEditCampaign: () => void;
  onBusinessClick: (businessId: string) => void;
  onAddBusiness: () => void;
}

export default function CorporateCampaignView({
  campaign, searchQuery, setSearchQuery, onEditCampaign, onBusinessClick, onAddBusiness
}: CorporateCampaignViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<BusinessCategory | 'all'>('all');

  const filteredBusinesses = useMemo(() => {
    return campaign.businesses.filter(biz => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || (
        biz.name.toLowerCase().includes(q) ||
        biz.contactPerson?.toLowerCase().includes(q) ||
        biz.address?.toLowerCase().includes(q)
      );
      const matchesCategory = categoryFilter === 'all' || biz.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [campaign.businesses, searchQuery, categoryFilter]);

  const formatVisitTime = (timestamp: number | null) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Desktop Header */}
      <div className="hidden md:flex bg-white dark:bg-slate-900 px-8 py-5 items-center justify-between shrink-0 border-b border-slate-200/60 dark:border-slate-800 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
            <Briefcase size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{campaign.name}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {campaign.area} • {campaign.businesses.length} Businesses
            </p>
          </div>
          <button onClick={onEditCampaign} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ml-2" title="Edit Campaign">
            <Settings size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as BusinessCategory | 'all')}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Categories</option>
            {Object.entries(BUSINESS_CATEGORY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>

          {/* Search */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
            <input
              type="text" placeholder="Find business..."
              className="w-48 focus:w-64 pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-300 dark:focus:border-blue-700 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all placeholder:text-slate-400"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <X size={14} className="text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>

          {/* Add Business Button */}
          <button onClick={onAddBusiness} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/50 active:scale-95 transition-all">
            <Plus size={16} /> Add Business
          </button>
        </div>
      </div>

      {/* Mobile Header Stats */}
      <div className="md:hidden bg-white dark:bg-slate-900 px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex overflow-x-auto gap-3 no-scrollbar shrink-0 shadow-sm z-10">
        {Object.entries(BUSINESS_STATUS_CONFIG).map(([key, config]) => {
          const count = campaign.businesses.filter(b => b.status === key).length;
          const Icon = config.icon;
          return (
            <div key={key} className={cn("whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 shrink-0 bg-white dark:bg-slate-800 shadow-sm", config.color.replace('text', 'border-'))}>
              <Icon size={14} strokeWidth={3} className={config.color} />
              <span className="dark:text-slate-300">{config.label}</span> <span className="opacity-60">({count})</span>
            </div>
          );
        })}
      </div>

      {/* Mobile Add Button */}
      <div className="md:hidden p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
        <button onClick={onAddBusiness} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/50 active:scale-95 transition-all">
          <Plus size={18} /> Add New Business
        </button>
      </div>

      {/* Business List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-50/30 dark:bg-slate-950/30 custom-scrollbar">
        {filteredBusinesses.length === 0 ? (
          <div className="text-center py-20 animate-in fade-in">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-600">
              <Briefcase size={32} />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {searchQuery || categoryFilter !== 'all' ? 'No businesses match your filter' : 'No businesses added yet'}
            </p>
            {(searchQuery || categoryFilter !== 'all') && (
              <button onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }} className="mt-4 text-blue-600 dark:text-blue-400 text-sm font-bold hover:underline">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredBusinesses.map(biz => {
              const status = BUSINESS_STATUS_CONFIG[biz.status];
              const category = BUSINESS_CATEGORY_CONFIG[biz.category];
              const Icon = status.icon;
              const CategoryIcon = category.icon;
              const visitTime = formatVisitTime(biz.updatedAt);

              return (
                <div key={biz.id} onClick={() => onBusinessClick(biz.id)}
                  className={cn(
                    "group relative bg-white dark:bg-slate-800 border rounded-2xl p-4 cursor-pointer transition-all duration-200",
                    "hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 hover:-translate-y-1 active:scale-95",
                    biz.status === 'unvisited' ? 'border-slate-100 dark:border-slate-700' : '',
                    biz.status === 'donated' ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/10' : '',
                    biz.status === 'meeting_scheduled' ? 'border-blue-200 dark:border-blue-800 bg-blue-50/10' : '',
                    biz.status === 'follow_up' ? 'border-purple-200 dark:border-purple-800 bg-purple-50/10' : '',
                    biz.status === 'callback' ? 'border-amber-200 dark:border-amber-800 bg-amber-50/10' : '',
                    biz.status === 'not_interested' ? 'border-red-100 dark:border-red-900/50 bg-red-50/10' : ''
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className={cn("p-2 rounded-lg", category.color.replace('text-', 'bg-').replace('600', '50').replace('500', '50'))}>
                      <CategoryIcon size={18} className={category.color} />
                    </div>
                    <div className={cn("p-2 rounded-xl shadow-sm", status.bg, status.color)}>
                      <Icon size={18} strokeWidth={2.5} />
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate mb-1">{biz.name}</h3>
                  
                  {biz.contactPerson && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                      <User size={12} /> {biz.contactPerson}
                    </p>
                  )}
                  {biz.phone && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-1">
                      <Phone size={12} /> {biz.phone}
                    </p>
                  )}
                  {biz.address && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 truncate">
                      <MapPin size={12} /> {biz.address}
                    </p>
                  )}

                  {biz.status === 'donated' && biz.amountDonated ? (
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-2">₹{biz.amountDonated.toLocaleString()}</p>
                  ) : null}

                  {visitTime && biz.status !== 'unvisited' && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      <Clock size={10} /> {visitTime}
                    </div>
                  )}

                  <div className="absolute inset-0 border-2 border-blue-500 rounded-2xl opacity-0 scale-95 group-hover:opacity-0 sm:group-hover:opacity-100 sm:group-hover:scale-100 transition-all pointer-events-none" />
                </div>
              );
            })}
          </div>
        )}
        <div className="h-20 md:h-10"></div>
      </div>
    </div>
  );
}
