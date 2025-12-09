/**
 * Donation Utilities
 * Handles donation-related calculations
 * Requirements: 13.5
 */

// Value of one support unit in INR
export const SUPPORT_VALUE = 1200;

/**
 * Calculates the number of supports based on donation amount
 * 1 support = ₹1200
 * Requirements: 13.5
 * 
 * @param amount - The donation amount in INR
 * @returns The number of supports (floor of amount / 1200)
 */
export function calculateSupportsCount(amount: number): number {
  if (amount < 0 || !Number.isFinite(amount)) {
    return 0;
  }
  return Math.floor(amount / SUPPORT_VALUE);
}

/**
 * Calculates the donation amount from supports count
 * Inverse of calculateSupportsCount
 * 
 * @param supports - The number of supports
 * @returns The minimum donation amount for that many supports
 */
export function calculateAmountFromSupports(supports: number): number {
  if (supports < 0 || !Number.isFinite(supports)) {
    return 0;
  }
  return Math.floor(supports) * SUPPORT_VALUE;
}
