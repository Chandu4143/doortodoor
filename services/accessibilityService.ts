import { AccessibilitySettings } from '../types';

const LS_KEY_ACCESSIBILITY = 'doorstep_accessibility_v1';

const defaultSettings: AccessibilitySettings = {
  highContrastMode: false,
  largerTouchTargets: false,
  fontSize: 'normal',
};

export const loadAccessibilitySettings = (): AccessibilitySettings => {
  try {
    const raw = localStorage.getItem(LS_KEY_ACCESSIBILITY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
};

export const saveAccessibilitySettings = (settings: AccessibilitySettings) => {
  localStorage.setItem(LS_KEY_ACCESSIBILITY, JSON.stringify(settings));
  applyAccessibilitySettings(settings);
};

export const applyAccessibilitySettings = (settings: AccessibilitySettings) => {
  const root = document.documentElement;
  
  // High Contrast Mode
  if (settings.highContrastMode) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }

  // Larger Touch Targets
  if (settings.largerTouchTargets) {
    root.classList.add('large-touch');
  } else {
    root.classList.remove('large-touch');
  }

  // Font Size
  root.classList.remove('font-normal', 'font-large', 'font-extra-large');
  root.classList.add(`font-${settings.fontSize.replace('-', '')}`);
};

// Initialize on load
export const initAccessibility = () => {
  const settings = loadAccessibilitySettings();
  applyAccessibilitySettings(settings);
};
