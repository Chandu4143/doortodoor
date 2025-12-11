/**
 * Property-Based Tests for Row Level Security Enforcement
 * 
 * **Feature: supabase-backend, Property 5: Row Level Security Enforcement**
 * **Validates: Requirements 10.1, 10.2**
 * 
 * Tests that data access is properly restricted based on team membership
 * and user roles. For any database query, results SHALL only include records
 * that belong to teams where the querying user is a member, unless the user
 * has Owner or BDM role.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isAdminRole, canViewAllTeams } from '../utils/rolePermissions';
import type { UserRole } from '../services/supabase/profileService';

// Types for testing RLS logic
interface TeamMembership {
  teamId: string;
  userId: string;
}

interface DataRecord {
  id: string;
  teamId: string;
}

interface User {
  id: string;
  role: UserRole;
}

// Arbitrary generators
const userIdArb = fc.uuid();
const teamIdArb = fc.uuid();
const recordIdArb = fc.uuid();

const userRoleArb = fc.constantFrom<UserRole>('dev', 'owner', 'bdm', 'team_leader', 'team_member');
const nonAdminRoleArb = fc.constantFrom<UserRole>('team_leader', 'team_member');
const adminRoleArb = fc.constantFrom<UserRole>('dev', 'owner', 'bdm');

// Generate a user with a specific role
const userArb = fc.record({
  id: userIdArb,
  role: userRoleArb,
});

// Generate a team membership
const teamMembershipArb = fc.record({
  teamId: teamIdArb,
  userId: userIdArb,
});

// Generate a data record belonging to a team
const dataRecordArb = fc.record({
  id: recordIdArb,
  teamId: teamIdArb,
});

/**
 * Simulates RLS filtering logic for data records.
 * This mirrors the database RLS policies defined in the design document.
 * 
 * @param records - All records in the database
 * @param user - The querying user
 * @param memberships - All team memberships
 * @returns Records the user is allowed to see
 */
function filterByRLS(
  records: DataRecord[],
  user: User,
  memberships: TeamMembership[]
): DataRecord[] {
  // Admin roles (dev, owner, bdm) can see all records
  if (canViewAllTeams(user.role)) {
    return records;
  }

  // Get teams the user is a member of
  const userTeamIds = new Set(
    memberships
      .filter(m => m.userId === user.id)
      .map(m => m.teamId)
  );

  // Filter records to only those in user's teams
  return records.filter(record => userTeamIds.has(record.teamId));
}

/**
 * Checks if a user should have access to a specific record.
 * 
 * @param record - The record to check access for
 * @param user - The user requesting access
 * @param memberships - All team memberships
 * @returns true if user should have access
 */
function hasAccessToRecord(
  record: DataRecord,
  user: User,
  memberships: TeamMembership[]
): boolean {
  // Admin roles can access all records
  if (canViewAllTeams(user.role)) {
    return true;
  }

  // Check if user is a member of the record's team
  return memberships.some(
    m => m.userId === user.id && m.teamId === record.teamId
  );
}

describe('Row Level Security Enforcement - Property Tests', () => {
  /**
   * **Feature: supabase-backend, Property 5: Row Level Security Enforcement**
   * **Validates: Requirements 10.1, 10.2**
   * 
   * For any non-admin user, filtered results SHALL only include records
   * from teams where the user is a member.
   */
  it('non-admin users can only see records from their teams', () => {
    fc.assert(
      fc.property(
        // Generate a non-admin user
        fc.record({ id: userIdArb, role: nonAdminRoleArb }),
        // Generate multiple teams
        fc.array(teamIdArb, { minLength: 2, maxLength: 5 }),
        // Generate records across teams
        fc.array(dataRecordArb, { minLength: 1, maxLength: 20 }),
        (user, teamIds, records) => {
          // Assign records to random teams from our list
          const recordsWithTeams = records.map((r, i) => ({
            ...r,
            teamId: teamIds[i % teamIds.length],
          }));

          // User is member of only the first team
          const memberships: TeamMembership[] = [
            { teamId: teamIds[0], userId: user.id },
          ];

          // Filter records by RLS
          const visibleRecords = filterByRLS(recordsWithTeams, user, memberships);

          // All visible records should be from user's team
          for (const record of visibleRecords) {
            expect(record.teamId).toBe(teamIds[0]);
          }

          // No records from other teams should be visible
          const otherTeamRecords = recordsWithTeams.filter(r => r.teamId !== teamIds[0]);
          for (const record of otherTeamRecords) {
            expect(visibleRecords).not.toContainEqual(record);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: supabase-backend, Property 5: Row Level Security Enforcement**
   * **Validates: Requirements 10.1, 10.2**
   * 
   * For any admin user (dev, owner, bdm), filtered results SHALL include
   * all records regardless of team membership.
   */
  it('admin users can see all records regardless of team membership', () => {
    fc.assert(
      fc.property(
        // Generate an admin user
        fc.record({ id: userIdArb, role: adminRoleArb }),
        // Generate multiple teams
        fc.array(teamIdArb, { minLength: 2, maxLength: 5 }),
        // Generate records across teams
        fc.array(dataRecordArb, { minLength: 1, maxLength: 20 }),
        (user, teamIds, records) => {
          // Assign records to random teams
          const recordsWithTeams = records.map((r, i) => ({
            ...r,
            teamId: teamIds[i % teamIds.length],
          }));

          // Admin user is NOT a member of any team
          const memberships: TeamMembership[] = [];

          // Filter records by RLS
          const visibleRecords = filterByRLS(recordsWithTeams, user, memberships);

          // Admin should see ALL records
          expect(visibleRecords.length).toBe(recordsWithTeams.length);
          
          // Every original record should be in visible records
          for (const record of recordsWithTeams) {
            expect(visibleRecords).toContainEqual(record);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: supabase-backend, Property 5: Row Level Security Enforcement**
   * **Validates: Requirements 10.1, 10.2**
   * 
   * For any user and any record, hasAccessToRecord should be consistent
   * with filterByRLS - a record is in filtered results iff hasAccessToRecord returns true.
   */
  it('hasAccessToRecord is consistent with filterByRLS', () => {
    fc.assert(
      fc.property(
        userArb,
        fc.array(teamIdArb, { minLength: 1, maxLength: 5 }),
        fc.array(dataRecordArb, { minLength: 1, maxLength: 20 }),
        fc.array(teamMembershipArb, { minLength: 0, maxLength: 10 }),
        (user, teamIds, records, memberships) => {
          // Assign records to teams
          const recordsWithTeams = records.map((r, i) => ({
            ...r,
            teamId: teamIds[i % teamIds.length],
          }));

          // Filter records
          const visibleRecords = filterByRLS(recordsWithTeams, user, memberships);
          const visibleRecordIds = new Set(visibleRecords.map(r => r.id));

          // Check consistency for each record
          for (const record of recordsWithTeams) {
            const hasAccess = hasAccessToRecord(record, user, memberships);
            const isVisible = visibleRecordIds.has(record.id);
            
            expect(hasAccess).toBe(isVisible);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: supabase-backend, Property 5: Row Level Security Enforcement**
   * **Validates: Requirements 10.1**
   * 
   * For any user with multiple team memberships, they should see records
   * from ALL their teams, not just one.
   */
  it('users with multiple team memberships see records from all their teams', () => {
    fc.assert(
      fc.property(
        fc.record({ id: userIdArb, role: nonAdminRoleArb }),
        fc.array(teamIdArb, { minLength: 3, maxLength: 5 }),
        (user, teamIds) => {
          // User is member of first two teams
          const memberships: TeamMembership[] = [
            { teamId: teamIds[0], userId: user.id },
            { teamId: teamIds[1], userId: user.id },
          ];

          // Create one record per team
          const records: DataRecord[] = teamIds.map((teamId, i) => ({
            id: `record-${i}`,
            teamId,
          }));

          // Filter records
          const visibleRecords = filterByRLS(records, user, memberships);

          // Should see records from both teams user is member of
          expect(visibleRecords.length).toBe(2);
          expect(visibleRecords.some(r => r.teamId === teamIds[0])).toBe(true);
          expect(visibleRecords.some(r => r.teamId === teamIds[1])).toBe(true);
          
          // Should NOT see records from teams user is not member of
          for (let i = 2; i < teamIds.length; i++) {
            expect(visibleRecords.some(r => r.teamId === teamIds[i])).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: supabase-backend, Property 5: Row Level Security Enforcement**
   * **Validates: Requirements 10.2**
   * 
   * For any user attempting to access data outside their team,
   * access SHALL be denied (empty result for that team's data).
   */
  it('access to data outside user teams is denied', () => {
    fc.assert(
      fc.property(
        fc.record({ id: userIdArb, role: nonAdminRoleArb }),
        teamIdArb,
        teamIdArb,
        dataRecordArb,
        (user, userTeamId, otherTeamId, record) => {
          // Skip if teams are the same
          fc.pre(userTeamId !== otherTeamId);

          // User is member of userTeamId only
          const memberships: TeamMembership[] = [
            { teamId: userTeamId, userId: user.id },
          ];

          // Record belongs to otherTeamId
          const recordInOtherTeam: DataRecord = {
            ...record,
            teamId: otherTeamId,
          };

          // Check access
          const hasAccess = hasAccessToRecord(recordInOtherTeam, user, memberships);
          
          // Access should be denied
          expect(hasAccess).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: supabase-backend, Property 5: Row Level Security Enforcement**
   * **Validates: Requirements 10.1, 10.2**
   * 
   * The isAdminRole function correctly identifies admin roles.
   */
  it('isAdminRole correctly identifies admin roles', () => {
    fc.assert(
      fc.property(userRoleArb, (role) => {
        const isAdmin = isAdminRole(role);
        const expectedAdmin = role === 'dev' || role === 'owner' || role === 'bdm';
        
        expect(isAdmin).toBe(expectedAdmin);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: supabase-backend, Property 5: Row Level Security Enforcement**
   * **Validates: Requirements 10.1, 10.2**
   * 
   * canViewAllTeams is equivalent to isAdminRole for RLS purposes.
   */
  it('canViewAllTeams matches isAdminRole', () => {
    fc.assert(
      fc.property(userRoleArb, (role) => {
        expect(canViewAllTeams(role)).toBe(isAdminRole(role));
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: supabase-backend, Property 5: Row Level Security Enforcement**
   * **Validates: Requirements 10.1**
   * 
   * Empty memberships for non-admin users results in no visible records.
   */
  it('non-admin users with no team memberships see no records', () => {
    fc.assert(
      fc.property(
        fc.record({ id: userIdArb, role: nonAdminRoleArb }),
        fc.array(dataRecordArb, { minLength: 1, maxLength: 10 }),
        (user, records) => {
          // No memberships
          const memberships: TeamMembership[] = [];

          // Filter records
          const visibleRecords = filterByRLS(records, user, memberships);

          // Should see no records
          expect(visibleRecords.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
