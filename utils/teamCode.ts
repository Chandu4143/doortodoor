/**
 * Team Code Generator Utility
 * Generates and validates unique 8-character alphanumeric team codes
 * Requirements: 2.1, 2.5
 */

// Characters used for team code generation (alphanumeric, excluding ambiguous chars)
const TEAM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TEAM_CODE_LENGTH = 8;

/**
 * Generates a random 8-character alphanumeric team code
 * Uses cryptographically secure random values when available
 * @returns A unique 8-character team code
 */
export function generateTeamCode(): string {
  let code = '';
  
  // Use crypto.getRandomValues for better randomness if available
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomValues = new Uint32Array(TEAM_CODE_LENGTH);
    crypto.getRandomValues(randomValues);
    
    for (let i = 0; i < TEAM_CODE_LENGTH; i++) {
      code += TEAM_CODE_CHARS[randomValues[i] % TEAM_CODE_CHARS.length];
    }
  } else {
    // Fallback to Math.random
    for (let i = 0; i < TEAM_CODE_LENGTH; i++) {
      code += TEAM_CODE_CHARS[Math.floor(Math.random() * TEAM_CODE_CHARS.length)];
    }
  }
  
  return code;
}

/**
 * Validates that a team code has the correct format
 * Must be exactly 8 alphanumeric characters
 * @param code The team code to validate
 * @returns true if the code format is valid, false otherwise
 */
export function validateTeamCodeFormat(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }
  
  // Must be exactly 8 characters
  if (code.length !== TEAM_CODE_LENGTH) {
    return false;
  }
  
  // Must be alphanumeric (letters and numbers only)
  const alphanumericRegex = /^[A-Za-z0-9]+$/;
  return alphanumericRegex.test(code);
}

/**
 * Normalizes a team code to uppercase for consistent comparison
 * @param code The team code to normalize
 * @returns The normalized (uppercase) team code
 */
export function normalizeTeamCode(code: string): string {
  return code.toUpperCase().trim();
}
