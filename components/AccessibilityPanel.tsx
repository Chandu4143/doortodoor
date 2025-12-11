import React, { useState, useEffect, useCallback } from 'react';
import { 
  Accessibility, Eye, Hand, Type, Loader2, AlertCircle
} from 'lucide-react';
import { AccessibilitySettings } from '../types';
import { 
  loadAccessibilitySettings, 
  saveAccessibilitySettings,
  applyAccessibilitySettings 
} from '../services/accessibilityService';
import { 
  updateAccessibilitySettings as updateSupabaseSettings,
  getAccessibilitySettings as getSupabaseSettings
} from '../services/supabase/profileService';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';

export default function AccessibilityPanel() {
  const { user, profile, refreshProfile } = useAuth();
  const [settings, setSettings] = useState<AccessibilitySettings>(loadAccessibilitySettings());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load settings from Supabase when authenticated
  useEffect(() => {
    const loadSettings = async () => {
      if (user && profile?.accessibility_settings) {
        // Use settings from profile if available
        setSettings(profile.accessibility_settings);
        applyAccessibilitySettings(profile.accessibility_settings);
      } else if (user) {
        // Fetch from Supabase if user is authenticated but profile settings not loaded
        try {
          const supabaseSettings = await getSupabaseSettings();
          setSettings(supabaseSettings);
          applyAccessibilitySettings(supabaseSettings);
        } catch (err) {
          console.error('Error loading accessibility settings:', err);
        }
      }
    };

    loadSettings();
  }, [user, profile?.accessibility_settings]);

  const updateSetting = useCallback(async <K extends keyof AccessibilitySettings>(
    key: K, 
    value: AccessibilitySettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setSaveError(null);
    
    // Apply settings immediately to DOM
    applyAccessibilitySettings(newSettings);
    
    // Always save to localStorage for immediate persistence
    saveAccessibilitySettings(newSettings);
    
    // If authenticated, also save to Supabase
    if (user) {
      setIsSaving(true);
      try {
        const result = await updateSupabaseSettings(newSettings);
        if (!result.success) {
          setSaveError(result.error || 'Failed to save settings');
        } else {
          // Refresh profile to sync state
          await refreshProfile();
        }
      } catch (err) {
        setSaveError('Failed to save settings to cloud');
        console.error('Error saving accessibility settings:', err);
      } finally {
        setIsSaving(false);
      }
    }
  }, [settings, user, refreshProfile]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Accessibility size={20} className="text-indigo-500" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Accessibility</h2>
        </div>
        {isSaving && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Loader2 size={14} className="animate-spin" />
            <span>Saving...</span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {saveError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
          <AlertCircle size={16} />
          <span>{saveError}</span>
        </div>
      )}

      {/* Settings List */}
      <div className="space-y-3">
        {/* High Contrast Mode */}
        <ToggleSetting
          icon={<Eye size={20} />}
          title="High Contrast Mode"
          description="Increase color contrast for better visibility"
          enabled={settings.highContrastMode}
          onChange={(v) => updateSetting('highContrastMode', v)}
          color="indigo"
        />

        {/* Larger Touch Targets */}
        <ToggleSetting
          icon={<Hand size={20} />}
          title="Larger Touch Targets"
          description="Increase button and tap area sizes"
          enabled={settings.largerTouchTargets}
          onChange={(v) => updateSetting('largerTouchTargets', v)}
          color="purple"
        />

        {/* Font Size */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center">
              <Type size={20} />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100">Font Size</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Adjust text size throughout the app</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {(['normal', 'large', 'extra-large'] as const).map((size) => (
              <button
                key={size}
                onClick={() => updateSetting('fontSize', size)}
                className={cn(
                  "py-3 px-4 rounded-xl text-sm font-bold transition-all capitalize",
                  settings.fontSize === size
                    ? "bg-amber-500 text-white shadow-md"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                )}
              >
                {size === 'extra-large' ? 'XL' : size === 'large' ? 'Large' : 'Normal'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
        <p className="text-xs uppercase text-slate-400 font-bold mb-2">Preview</p>
        <div className={cn(
          "p-4 rounded-lg border-2 transition-all",
          settings.highContrastMode 
            ? "bg-black text-white border-white" 
            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700"
        )}>
          <p className={cn(
            "font-bold mb-1",
            settings.fontSize === 'extra-large' ? 'text-xl' : settings.fontSize === 'large' ? 'text-lg' : 'text-base'
          )}>
            Sample Text
          </p>
          <p className={cn(
            "text-slate-500 dark:text-slate-400",
            settings.fontSize === 'extra-large' ? 'text-base' : settings.fontSize === 'large' ? 'text-sm' : 'text-xs'
          )}>
            This is how text will appear with your current settings.
          </p>
          <button className={cn(
            "mt-3 bg-blue-600 text-white font-bold rounded-lg transition-all",
            settings.largerTouchTargets ? "py-4 px-6 text-base" : "py-2 px-4 text-sm"
          )}>
            Sample Button
          </button>
        </div>
      </div>
    </div>
  );
}

// Toggle Setting Component
function ToggleSetting({
  icon, title, description, enabled, onChange, color
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  color: 'indigo' | 'purple' | 'amber';
}) {
  const colorClasses = {
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
  };

  const c = colorClasses[color];

  return (
    <div 
      className={cn(
        "bg-white dark:bg-slate-800 rounded-xl p-4 border-2 transition-all cursor-pointer",
        enabled 
          ? "border-green-300 dark:border-green-700" 
          : "border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600"
      )}
      onClick={() => onChange(!enabled)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", c.bg, c.text)}>
            {icon}
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100">{title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>
        <div className={cn(
          "w-12 h-7 rounded-full transition-all relative",
          enabled ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"
        )}>
          <div className={cn(
            "absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all",
            enabled ? "left-6" : "left-1"
          )} />
        </div>
      </div>
    </div>
  );
}
