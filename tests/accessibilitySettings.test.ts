/**
 * Property-Based Tests for Accessibility Settings Persistence
 * 
 * **Feature: supabase-backend, Property 15: Accessibility Settings Persistence**
 * **Validates: Requirements 17.4, 17.5**
 * 
 * Tests that accessibility settings are persisted correctly and can be
 * retrieved with identical values.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import type { AccessibilitySettings } from '../types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

// Set up global localStorage mock
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock document.documentElement for applyAccessibilitySettings
const mockClassList = {
  add: vi.fn(),
  remove: vi.fn(),
};
Object.defineProperty(global, 'document', {
  value: {
    documentElement: {
      classList: mockClassList,
    },
  },
});

// Import after mocks are set up
import { 
  loadAccessibilitySettings, 
  saveAccessibilitySettings 
} from '../services/accessibilityService';

// Arbitrary for generating valid font sizes
const fontSizeArb = fc.constantFrom<AccessibilitySettings['fontSize']>('normal', 'large', 'extra-large');

// Arbitrary for generating valid accessibility settings
const accessibilitySettingsArb = fc.record({
  highContrastMode: fc.boolean(),
  largerTouchTargets: fc.boolean(),
  fontSize: fontSizeArb,
});

describe('Accessibility Settings Persistence - Property Tests', () => {
  beforeEach(() => {
    // Clear localStorage for clean test
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clear localStorage after each test
    localStorageMock.clear();
  });

  /**
   * **Feature: supabase-backend, Property 15: Accessibility Settings Persistence**
   * **Validates: Requirements 17.4, 17.5**
   * 
   * For any accessibility settings, saving and then loading SHALL return
   * identical values for all settings.
   */
  it('round-trip: save then load returns identical settings', () => {
    fc.assert(
      fc.property(accessibilitySettingsArb, (settings) => {
        // Save settings
        saveAccessibilitySettings(settings);
        
        // Load settings
        const loaded = loadAccessibilitySettings();
        
        // Verify all fields match
        expect(loaded.highContrastMode).toBe(settings.highContrastMode);
        expect(loaded.largerTouchTargets).toBe(settings.largerTouchTargets);
        expect(loaded.fontSize).toBe(settings.fontSize);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: supabase-backend, Property 15: Accessibility Settings Persistence**
   * **Validates: Requirements 17.4, 17.5**
   * 
   * For any sequence of settings changes, the last saved settings SHALL be
   * the ones retrieved.
   */
  it('last saved settings are retrieved', () => {
    fc.assert(
      fc.property(
        fc.array(accessibilitySettingsArb, { minLength: 1, maxLength: 10 }),
        (settingsSequence) => {
          // Save each settings in sequence
          for (const settings of settingsSequence) {
            saveAccessibilitySettings(settings);
          }
          
          // Load should return the last saved settings
          const loaded = loadAccessibilitySettings();
          const lastSettings = settingsSequence[settingsSequence.length - 1];
          
          expect(loaded.highContrastMode).toBe(lastSettings.highContrastMode);
          expect(loaded.largerTouchTargets).toBe(lastSettings.largerTouchTargets);
          expect(loaded.fontSize).toBe(lastSettings.fontSize);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: supabase-backend, Property 15: Accessibility Settings Persistence**
   * **Validates: Requirements 17.4, 17.5**
   * 
   * High contrast mode setting is preserved exactly.
   */
  it('highContrastMode is preserved exactly', () => {
    fc.assert(
      fc.property(fc.boolean(), (highContrastMode) => {
        const settings: AccessibilitySettings = {
          highContrastMode,
          largerTouchTargets: false,
          fontSize: 'normal',
        };
        
        saveAccessibilitySettings(settings);
        const loaded = loadAccessibilitySettings();
        
        expect(loaded.highContrastMode).toBe(highContrastMode);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: supabase-backend, Property 15: Accessibility Settings Persistence**
   * **Validates: Requirements 17.4, 17.5**
   * 
   * Larger touch targets setting is preserved exactly.
   */
  it('largerTouchTargets is preserved exactly', () => {
    fc.assert(
      fc.property(fc.boolean(), (largerTouchTargets) => {
        const settings: AccessibilitySettings = {
          highContrastMode: false,
          largerTouchTargets,
          fontSize: 'normal',
        };
        
        saveAccessibilitySettings(settings);
        const loaded = loadAccessibilitySettings();
        
        expect(loaded.largerTouchTargets).toBe(largerTouchTargets);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: supabase-backend, Property 15: Accessibility Settings Persistence**
   * **Validates: Requirements 17.4, 17.5**
   * 
   * Font size setting is preserved exactly for all valid values.
   */
  it('fontSize is preserved exactly for all valid values', () => {
    fc.assert(
      fc.property(fontSizeArb, (fontSize) => {
        const settings: AccessibilitySettings = {
          highContrastMode: false,
          largerTouchTargets: false,
          fontSize,
        };
        
        saveAccessibilitySettings(settings);
        const loaded = loadAccessibilitySettings();
        
        expect(loaded.fontSize).toBe(fontSize);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Default settings are returned when no settings are saved.
   */
  it('returns default settings when nothing is saved', () => {
    localStorageMock.clear();
    const loaded = loadAccessibilitySettings();
    
    expect(loaded.highContrastMode).toBe(false);
    expect(loaded.largerTouchTargets).toBe(false);
    expect(loaded.fontSize).toBe('normal');
  });

  /**
   * Handles corrupted localStorage gracefully by returning defaults.
   */
  it('handles corrupted localStorage gracefully', () => {
    localStorageMock.setItem('doorstep_accessibility_v1', 'not valid json');
    const loaded = loadAccessibilitySettings();
    
    // Should return defaults
    expect(loaded.highContrastMode).toBe(false);
    expect(loaded.largerTouchTargets).toBe(false);
    expect(loaded.fontSize).toBe('normal');
  });

  /**
   * Handles partial settings by merging with defaults.
   */
  it('handles partial settings by merging with defaults', () => {
    localStorageMock.setItem('doorstep_accessibility_v1', JSON.stringify({ highContrastMode: true }));
    const loaded = loadAccessibilitySettings();
    
    expect(loaded.highContrastMode).toBe(true);
    expect(loaded.largerTouchTargets).toBe(false);
    expect(loaded.fontSize).toBe('normal');
  });
});
