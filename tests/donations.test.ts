/**
 * Property-Based Tests for Donations Utilities
 * 
 * **Feature: supabase-backend, Property 14: Supports Count Calculation**
 * **Validates: Requirements 13.5**
 * 
 * Tests that supports count is calculated correctly as floor(amount / 1200).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateSupportsCount, calculateAmountFromSupports, SUPPORT_VALUE } from '../utils/donations';

describe('Supports Count Calculation - Property Tests', () => {
  /**
   * **Feature: supabase-backend, Property 14: Supports Count Calculation**
   * **Validates: Requirements 13.5**
   * 
   * For any donation amount, the supports count SHALL equal the floor of (amount / 1200).
   */
  it('supports count equals floor(amount / 1200) for positive amounts', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 10000000, noNaN: true }),
        (amount) => {
          const supports = calculateSupportsCount(amount);
          const expected = Math.floor(amount / SUPPORT_VALUE);
          expect(supports).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: supabase-backend, Property 14: Supports Count Calculation**
   * **Validates: Requirements 13.5**
   * 
   * For any negative amount, supports count should be 0.
   */
  it('negative amounts return 0 supports', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10000000, max: -1 }),
        (amount) => {
          expect(calculateSupportsCount(amount)).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: supabase-backend, Property 14: Supports Count Calculation**
   * **Validates: Requirements 13.5**
   * 
   * Supports count is monotonically increasing with amount.
   */
  it('supports count is monotonically increasing', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1000000, noNaN: true }),
        fc.float({ min: 0, max: 1000000, noNaN: true }),
        (amount1, amount2) => {
          const supports1 = calculateSupportsCount(amount1);
          const supports2 = calculateSupportsCount(amount2);
          
          if (amount1 <= amount2) {
            expect(supports1).toBeLessThanOrEqual(supports2);
          } else {
            expect(supports1).toBeGreaterThanOrEqual(supports2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Boundary test: amounts just below and at support thresholds.
   */
  it('correctly handles boundary values', () => {
    // Just below 1 support
    expect(calculateSupportsCount(1199)).toBe(0);
    expect(calculateSupportsCount(1199.99)).toBe(0);
    
    // Exactly 1 support
    expect(calculateSupportsCount(1200)).toBe(1);
    
    // Just above 1 support
    expect(calculateSupportsCount(1200.01)).toBe(1);
    
    // Multiple supports
    expect(calculateSupportsCount(2400)).toBe(2);
    expect(calculateSupportsCount(3600)).toBe(3);
    expect(calculateSupportsCount(12000)).toBe(10);
  });

  /**
   * Round-trip property: calculateAmountFromSupports is the inverse floor operation.
   */
  it('calculateAmountFromSupports returns minimum amount for supports', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        (supports) => {
          const amount = calculateAmountFromSupports(supports);
          expect(amount).toBe(supports * SUPPORT_VALUE);
          
          // The calculated amount should give back the same supports count
          expect(calculateSupportsCount(amount)).toBe(supports);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * SUPPORT_VALUE constant is 1200.
   */
  it('SUPPORT_VALUE is 1200', () => {
    expect(SUPPORT_VALUE).toBe(1200);
  });

  /**
   * Edge cases: NaN and Infinity.
   */
  it('handles NaN and Infinity gracefully', () => {
    expect(calculateSupportsCount(NaN)).toBe(0);
    expect(calculateSupportsCount(Infinity)).toBe(0);
    expect(calculateSupportsCount(-Infinity)).toBe(0);
  });
});
