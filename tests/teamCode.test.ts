/**
 * Property-Based Tests for Team Code Generation
 * 
 * **Feature: supabase-backend, Property 2: Team Code Generation Uniqueness**
 * **Validates: Requirements 2.1, 2.5**
 * 
 * Tests that generated team codes are exactly 8 alphanumeric characters
 * and are unique across multiple generations.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateTeamCode, validateTeamCodeFormat, normalizeTeamCode } from '../utils/teamCode';

describe('Team Code Generation - Property Tests', () => {
  /**
   * **Feature: supabase-backend, Property 2: Team Code Generation Uniqueness**
   * **Validates: Requirements 2.1, 2.5**
   * 
   * For any team creation, the generated team code SHALL be exactly 8 
   * alphanumeric characters.
   */
  it('generated codes are always exactly 8 alphanumeric characters', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), () => {
        const code = generateTeamCode();
        
        // Must be exactly 8 characters
        expect(code.length).toBe(8);
        
        // Must be alphanumeric
        expect(/^[A-Za-z0-9]+$/.test(code)).toBe(true);
        
        // Must pass our own validation
        expect(validateTeamCodeFormat(code)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: supabase-backend, Property 2: Team Code Generation Uniqueness**
   * **Validates: Requirements 2.1, 2.5**
   * 
   * For any batch of generated codes, all codes should be unique.
   */
  it('generated codes are unique across multiple generations', () => {
    const codes = new Set<string>();
    const numCodes = 1000;
    
    for (let i = 0; i < numCodes; i++) {
      codes.add(generateTeamCode());
    }
    
    // With 8 chars from 32 possible chars, collision probability is very low
    // We expect all 1000 codes to be unique
    expect(codes.size).toBe(numCodes);
  });
});

describe('Team Code Validation - Property Tests', () => {
  /**
   * **Feature: supabase-backend, Property 3: Team Code Validation**
   * **Validates: Requirements 3.1, 3.2**
   * 
   * For any valid 8-character alphanumeric string, validation should pass.
   */
  it('validates any 8-character alphanumeric string as valid', () => {
    const alphanumChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...alphanumChars.split('')), { minLength: 8, maxLength: 8 }),
        (chars) => {
          const code = chars.join('');
          expect(validateTeamCodeFormat(code)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: supabase-backend, Property 3: Team Code Validation**
   * **Validates: Requirements 3.1, 3.2**
   * 
   * For any string that is not exactly 8 characters, validation should fail.
   */
  it('rejects strings that are not exactly 8 characters', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s.length !== 8),
        (code) => {
          expect(validateTeamCodeFormat(code)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: supabase-backend, Property 3: Team Code Validation**
   * **Validates: Requirements 3.1, 3.2**
   * 
   * For any 8-character string with non-alphanumeric characters, validation should fail.
   */
  it('rejects 8-character strings with special characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 8, maxLength: 8 }).filter(s => /[^A-Za-z0-9]/.test(s)),
        (code) => {
          expect(validateTeamCodeFormat(code)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Normalization should always return uppercase
   */
  it('normalizeTeamCode always returns uppercase', () => {
    const alphanumChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...alphanumChars.split('')), { minLength: 1, maxLength: 20 }),
        (chars) => {
          const code = chars.join('');
          const normalized = normalizeTeamCode(code);
          expect(normalized).toBe(normalized.toUpperCase());
        }
      ),
      { numRuns: 100 }
    );
  });
});
