/**
 * Property-Based Tests for Role Permissions
 * 
 * **Feature: supabase-backend, Property 4: Role Permission Hierarchy**
 * **Validates: Requirements 4.1, 4.2, 5.3, 5.4, 6.2, 6.3, 7.2, 7.3**
 * 
 * Tests the role permission hierarchy ensuring proper access control.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  canAssignRole,
  getAssignableRoles,
  getRoleHierarchyLevel,
  hasHigherOrEqualRole,
  canManageUser,
  isAdminRole,
  canCreateTeam,
  canViewTeamCode,
  canRemoveTeamMember,
  canViewAllTeams,
  ALL_ROLES,
  MAX_OWNERS,
} from '../utils/rolePermissions';
import type { UserRole } from '../services/supabase/profileService';

// Arbitrary for generating valid user roles
const userRoleArb = fc.constantFrom<UserRole>('dev', 'owner', 'bdm', 'team_leader', 'team_member');

describe('Role Permission Hierarchy - Property Tests', () => {
  /**
   * **Feature: supabase-backend, Property 4: Role Permission Hierarchy**
   * **Validates: Requirements 4.1, 4.2**
   * 
   * Dev can assign any role including Owner.
   */
  it('dev can assign any role', () => {
    fc.assert(
      fc.property(userRoleArb, (targetRole) => {
        if (targetRole === 'dev') {
          // Dev cannot assign dev role
          expect(canAssignRole('dev', targetRole)).toBe(false);
        } else {
          expect(canAssignRole('dev', targetRole)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: supabase-backend, Property 4: Role Permission Hierarchy**
   * **Validates: Requirements 5.3, 5.4**
   * 
   * Owner can assign BDM, Team Leader, Team Member but NOT Owner.
   */
  it('owner cannot assign owner role', () => {
    expect(canAssignRole('owner', 'owner')).toBe(false);
    expect(canAssignRole('owner', 'dev')).toBe(false);
    expect(canAssignRole('owner', 'bdm')).toBe(true);
    expect(canAssignRole('owner', 'team_leader')).toBe(true);
    expect(canAssignRole('owner', 'team_member')).toBe(true);
  });

  /**
   * **Feature: supabase-backend, Property 4: Role Permission Hierarchy**
   * **Validates: Requirements 6.2, 6.3**
   * 
   * BDM can assign Team Leader, Team Member but NOT Owner or BDM.
   */
  it('bdm cannot assign owner or bdm roles', () => {
    expect(canAssignRole('bdm', 'owner')).toBe(false);
    expect(canAssignRole('bdm', 'dev')).toBe(false);
    expect(canAssignRole('bdm', 'bdm')).toBe(false);
    expect(canAssignRole('bdm', 'team_leader')).toBe(true);
    expect(canAssignRole('bdm', 'team_member')).toBe(true);
  });

  /**
   * **Feature: supabase-backend, Property 4: Role Permission Hierarchy**
   * **Validates: Requirements 7.2, 7.3**
   * 
   * Team Leader can only assign Team Member role.
   */
  it('team_leader can only assign team_member', () => {
    expect(canAssignRole('team_leader', 'owner')).toBe(false);
    expect(canAssignRole('team_leader', 'dev')).toBe(false);
    expect(canAssignRole('team_leader', 'bdm')).toBe(false);
    expect(canAssignRole('team_leader', 'team_leader')).toBe(false);
    expect(canAssignRole('team_leader', 'team_member')).toBe(true);
  });

  /**
   * **Feature: supabase-backend, Property 4: Role Permission Hierarchy**
   * **Validates: Requirements 7.2, 7.3**
   * 
   * Team Member cannot assign any roles.
   */
  it('team_member cannot assign any role', () => {
    fc.assert(
      fc.property(userRoleArb, (targetRole) => {
        expect(canAssignRole('team_member', targetRole)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: supabase-backend, Property 4: Role Permission Hierarchy**
   * 
   * For any role, getAssignableRoles returns exactly the roles that canAssignRole allows.
   */
  it('getAssignableRoles is consistent with canAssignRole', () => {
    fc.assert(
      fc.property(userRoleArb, (assignerRole) => {
        const assignableRoles = getAssignableRoles(assignerRole);
        
        for (const targetRole of ALL_ROLES) {
          const canAssign = canAssignRole(assignerRole, targetRole);
          const isInList = assignableRoles.includes(targetRole);
          expect(canAssign).toBe(isInList);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Role hierarchy levels are consistent - higher roles have higher levels.
   */
  it('role hierarchy levels are ordered correctly', () => {
    expect(getRoleHierarchyLevel('dev')).toBeGreaterThan(getRoleHierarchyLevel('owner'));
    expect(getRoleHierarchyLevel('owner')).toBeGreaterThan(getRoleHierarchyLevel('bdm'));
    expect(getRoleHierarchyLevel('bdm')).toBeGreaterThan(getRoleHierarchyLevel('team_leader'));
    expect(getRoleHierarchyLevel('team_leader')).toBeGreaterThan(getRoleHierarchyLevel('team_member'));
  });

  /**
   * hasHigherOrEqualRole is reflexive - every role has >= itself.
   */
  it('hasHigherOrEqualRole is reflexive', () => {
    fc.assert(
      fc.property(userRoleArb, (role) => {
        expect(hasHigherOrEqualRole(role, role)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Admin roles are exactly dev, owner, and bdm.
   */
  it('admin roles are dev, owner, and bdm', () => {
    expect(isAdminRole('dev')).toBe(true);
    expect(isAdminRole('owner')).toBe(true);
    expect(isAdminRole('bdm')).toBe(true);
    expect(isAdminRole('team_leader')).toBe(false);
    expect(isAdminRole('team_member')).toBe(false);
  });

  /**
   * Only admin roles can create teams.
   */
  it('only admin roles can create teams', () => {
    fc.assert(
      fc.property(userRoleArb, (role) => {
        expect(canCreateTeam(role)).toBe(isAdminRole(role));
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Team code visibility follows the hierarchy.
   */
  it('team code visibility follows hierarchy', () => {
    expect(canViewTeamCode('dev')).toBe(true);
    expect(canViewTeamCode('owner')).toBe(true);
    expect(canViewTeamCode('bdm')).toBe(true);
    expect(canViewTeamCode('team_leader')).toBe(true);
    expect(canViewTeamCode('team_member')).toBe(false);
  });

  /**
   * MAX_OWNERS constant is 3.
   */
  it('max owners is 3', () => {
    expect(MAX_OWNERS).toBe(3);
  });
});
