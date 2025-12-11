# Implementation Plan

## Phase 1: Database Setup and Core Infrastructure

- [x] 1. Set up Supabase database schema






  - [x] 1.1 Create database types and enums (user_role, team_role, room_status, payment_mode, business_category, business_status)

    - Apply migration with all enum types
    - _Requirements: 8.1, 14.2_
  - [x] 1.2 Create profiles table with RLS policies


    - Create profiles table extending auth.users
    - Add accessibility_settings JSONB column
    - Create RLS policies for profile access
    - _Requirements: 19.1, 19.2, 17.4_
  - [x] 1.3 Create teams and team_memberships tables with RLS policies


    - Create teams table with unique team_code constraint
    - Create team_memberships junction table
    - Add indexes for performance
    - Create RLS policies for team access
    - _Requirements: 2.1, 2.2, 3.1_
  - [x] 1.4 Create apartments and rooms tables with RLS policies


    - Create apartments table with team_id foreign key
    - Create rooms table with collected_by and entered_by attribution
    - Add indexes for queries
    - Create RLS policies based on team membership
    - _Requirements: 8.1, 13.1, 22.1_

  - [x] 1.5 Create business_campaigns and businesses tables with RLS policies

    - Create business_campaigns table with team_id foreign key
    - Create businesses table with attribution fields
    - Add indexes for queries
    - Create RLS policies based on team membership
    - _Requirements: 8.3, 14.1, 22.1_
  - [x] 1.6 Create goal_settings and user_achievements tables with RLS policies


    - Create goal_settings table with streak fields
    - Create user_achievements table
    - Create RLS policies for user-only access
    - _Requirements: 15.1, 16.1_
  - [x] 1.7 Create role_audit_log table


    - Create audit log table for owner role changes
    - _Requirements: 4.5_
  - [x] 1.8 Create helper functions for RLS


    - Create is_team_member() function
    - Create get_user_role() function
    - Create is_admin() function
    - _Requirements: 10.1, 10.2_

- [x] 2. Checkpoint - Verify database setup





  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Authentication and Profile Services

- [x] 3. Implement Supabase client and authentication service






  - [x] 3.1 Set up Supabase client configuration


    - Install @supabase/supabase-js package
    - Create supabase client with environment variables
    - Create services/supabase/client.ts
    - _Requirements: 1.1_

  - [x] 3.2 Implement authentication service

    - Create services/supabase/authService.ts
    - Implement sendOTP function with phone validation
    - Implement verifyOTP function
    - Implement getSession and signOut functions
    - Implement onAuthStateChange listener
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [ ] 3.3 Write property test for OTP verification
    - **Property 1: OTP Verification Correctness**
    - **Validates: Requirements 1.2, 1.3, 1.4**
  - [x] 3.4 Implement profile service


    - Create services/supabase/profileService.ts
    - Implement getProfile function
    - Implement upsertProfile function
    - Implement getUserRole function
    - _Requirements: 19.1, 19.2, 19.3, 19.4_
  - [ ] 3.5 Write property test for profile persistence
    - **Property 11: Profile Data Persistence**
    - **Validates: Requirements 19.2, 19.3, 19.4**

- [x] 4. Implement role management service






  - [x] 4.1 Create role permission utilities

    - Create utils/rolePermissions.ts
    - Implement canAssignRole function with permission matrix
    - Implement getAssignableRoles function
    - _Requirements: 4.1, 4.2, 5.3, 5.4, 6.2, 6.3, 7.2, 7.3_
  - [x] 4.2 Write property test for role permissions

    - **Property 4: Role Permission Hierarchy**
    - **Validates: Requirements 4.1, 4.2, 5.3, 5.4, 6.2, 6.3, 7.2, 7.3**
  - [x] 4.3 Implement updateUserRole in profile service


    - Add role update with permission check
    - Add audit logging for owner role changes
    - Check max 3 owners constraint
    - _Requirements: 4.1, 4.3, 4.4, 5.7_

- [x] 5. Checkpoint - Verify authentication





  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Team Management


- [x] 6. Implement team service





  - [x] 6.1 Create team code generator

    - Create utils/teamCode.ts
    - Implement generateTeamCode function (8 alphanumeric chars)
    - Implement validateTeamCodeFormat function
    - _Requirements: 2.1, 2.5_
  - [x] 6.2 Write property test for team code generation

    - **Property 2: Team Code Generation Uniqueness**
    - **Validates: Requirements 2.1, 2.5**

  - [x] 6.3 Implement team service core functions

    - Create services/supabase/teamService.ts
    - Implement createTeam function
    - Implement joinTeam function with code validation
    - Implement getUserTeams function
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3_

  - [x] 6.4 Write property test for team code validation

    - **Property 3: Team Code Validation**
    - **Validates: Requirements 3.1, 3.2**

  - [x] 6.5 Implement team member management

    - Implement getTeamMembers function
    - Implement removeMember function
    - Implement updateTeam function
    - _Requirements: 7.4, 7.5, 20.1_

- [x] 7. Checkpoint - Verify team management





  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Residential Data Service

- [x] 8. Implement residential data service







  - [x] 8.1 Create residential service


    - Create services/supabase/residentialService.ts
    - Implement createApartment function
    - Implement getApartments function
    - Implement updateApartment function
    - Implement deleteApartment function
    - _Requirements: 8.1_
  - [x] 8.2 Implement room management



    - Implement createRooms function (batch create for apartment)
    - Implement updateRoom function with attribution
    - Implement getRoomsByApartment function
    - _Requirements: 8.1, 8.2, 13.1, 13.2, 22.1, 22.3_
  - [ ] 8.3 Write property test for visit data persistence
    - **Property 6: Visit Data Persistence Round-Trip**
    - **Validates: Requirements 8.1, 8.2, 8.3, 13.1, 13.2, 14.1, 14.2**
  - [x] 8.4 Implement supports count calculation


    - Create utils/donations.ts

    - Implement calculateSupportsCount function
    - _Requirements: 13.5_
  - [ ] 8.5 Write property test for supports calculation
    - **Property 14: Supports Count Calculation**
    - **Validates: Requirements 13.5**

- [x] 9. Checkpoint - Verify residential service





  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Business Data Service

- [x] 10. Implement business data service





  - [x] 10.1 Create business service


    - Create services/supabase/businessService.ts
    - Implement createCampaign function
    - Implement getCampaigns function
    - Implement updateCampaign function
    - Implement deleteCampaign function
    - _Requirements: 8.3_

  - [x] 10.2 Implement business management

    - Implement createBusiness function with attribution
    - Implement updateBusiness function
    - Implement deleteBusiness function
    - _Requirements: 8.3, 14.1, 14.2, 14.3, 22.1_

- [x] 11. Checkpoint - Verify business service





  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Real-time Sync

- [x] 12. Implement real-time service









  - [x] 12.1 Create real-time service


    - Create services/supabase/realtimeService.ts
    - Implement subscribeToTeam function
    - Implement channel management
    - _Requirements: 9.1, 9.2_


  - [x] 12.2 Implement real-time subscriptions for residential data
    - Add subscribeToApartments in residentialService
    - Add subscribeToRooms in residentialService
    - _Requirements: 9.3_
  - [x] 12.3 Implement real-time subscriptions for business data

    - Add subscribeToCampaigns in businessService
    - Add subscribeToBusinesses in businessService
    - _Requirements: 9.3_

  - [x] 12.4 Implement offline queue

    - Create utils/offlineQueue.ts
    - Implement queueOfflineChange function
    - Implement syncOfflineChanges function
    - Implement connection state handling
    - _Requirements: 9.4, 9.5_

- [x] 13. Checkpoint - Verify real-time sync





  - Ensure all tests pass, ask the user if questions arise.

## Phase 7: Goals and Achievements

- [x] 14. Implement goals service





  - [x] 14.1 Create goals service


    - Create services/supabase/goalsService.ts
    - Implement getGoalSettings function
    - Implement updateGoalSettings function
    - _Requirements: 15.1, 15.2_


  - [x] 14.2 Implement streak calculation
    - Implement updateStreak function
    - Handle consecutive day logic
    - Preserve longest streak on reset
    - _Requirements: 15.3, 15.4_
  - [ ] 14.3 Write property test for streak calculation
    - **Property 8: Streak Calculation Correctness**

    - **Validates: Requirements 15.3, 15.4**
  - [x] 14.4 Implement progress calculation

    - Implement getProgress function
    - Calculate progress from donations attributed to user
    - _Requirements: 15.5, 22.6_
  - [ ] 14.5 Write property test for donation attribution
    - **Property 7: Donation Attribution Correctness**
    - **Validates: Requirements 22.4, 22.5, 22.6**

- [x] 15. Implement achievements service





  - [x] 15.1 Create achievements definitions


    - Create constants/achievements.ts
    - Define all achievement milestones
    - _Requirements: 16.2_
  - [x] 15.2 Implement achievement checking


    - Implement checkAchievements function
    - Implement unlockAchievement function
    - _Requirements: 16.1, 16.5_
  - [ ] 15.3 Write property test for achievement unlock
    - **Property 9: Achievement Unlock Correctness**
    - **Validates: Requirements 16.1, 16.4, 16.5**

- [x] 16. Checkpoint - Verify goals and achievements








  - Ensure all tests pass, ask the user if questions arise.

## Phase 8: Statistics and Export

- [x] 17. Implement statistics service






  - [x] 17.1 Create statistics service

    - Create services/supabase/statisticsService.ts
    - Implement getTeamStatistics function
    - Implement getIndividualStatistics function
    - _Requirements: 11.3, 20.3_
  - [ ] 17.2 Write property test for statistics aggregation
    - **Property 10: Team Member Statistics Aggregation**
    - **Validates: Requirements 11.3, 20.3**

  - [x] 17.3 Implement statistics filtering

    - Implement filterByDateRange function
    - Implement getTeamRankings function
    - _Requirements: 11.4_

- [x] 18. Implement export service





  - [x] 18.1 Update export service for Supabase


    - Update services/supabase/exportService.ts
    - Implement exportToCSV with role-based filtering
    - Implement exportToPDF with role-based filtering
    - _Requirements: 18.1, 18.2, 18.5_
  - [ ] 18.2 Write property test for export scope
    - **Property 12: Export Data Scope**
    - **Validates: Requirements 18.1, 18.5**
  - [x] 18.3 Implement backup and restore


    - Implement exportBackup function
    - Implement restoreBackup function with validation
    - _Requirements: 18.3, 18.4_

- [ ] 19. Checkpoint - Verify -*87statistics and export

  - Ensure all tests pass, ask the user if questions arise.

## Phase 9: UI Components - Authentication

- [x] 20. Create authentication UI components





  - [x] 20.1 Create AuthContext provider


    - Create contexts/AuthContext.tsx
    - Implement auth state management
    - Implement session persistence
    - _Requirements: 1.2_
  - [x] 20.2 Create PhoneLoginScreen component


    - Create components/auth/PhoneLoginScreen.tsx
    - Implement phone number input with validation
    - Implement OTP request button
    - _Requirements: 1.1_
  - [x] 20.3 Create OTPVerificationScreen component


    - Create components/auth/OTPVerificationScreen.tsx
    - Implement OTP input (6 digits)
    - Implement verification and error handling
    - _Requirements: 1.2, 1.3_
  - [x] 20.4 Create ProfileSetupScreen component


    - Create components/auth/ProfileSetupScreen.tsx
    - Implement name input (required)
    - Implement email input (optional)
    - _Requirements: 19.1_
  - [x] 20.5 Create TeamCodeScreen component


    - Create components/auth/TeamCodeScreen.tsx
    - Implement team code input
    - Implement join team flow
    - _Requirements: 3.1, 3.2, 3.4_

- [x] 21. Checkpoint - Verify authentication UI





  - Ensure all tests pass, ask the user if questions arise.

## Phase 10: UI Components - Team Management

- [x] 22. Update Team Panel for Supabase





  - [x] 22.1 Update TeamPanel component


    - Update components/TeamPanel.tsx
    - Replace localStorage with Supabase team service
    - Display team members from database
    - _Requirements: 20.1, 20.2_

  - [x] 22.2 Create TeamCodeShare component

    - Create components/team/TeamCodeShare.tsx
    - Display team code for authorized users
    - Implement copy to clipboard
    - Implement QR code generation
    - _Requirements: 21.1, 21.2, 21.3_
  - [ ] 22.3 Write property test for QR round-trip
    - **Property 13: Team Code QR Round-Trip**
    - **Validates: Requirements 21.3, 21.4**

  - [x] 22.4 Create TeamMemberList component

    - Create components/team/TeamMemberList.tsx
    - Display member names and roles
    - Show management options for Team Leader+
    - _Requirements: 20.1, 20.4_

  - [x] 22.5 Create TeamSwitcher component

    - Create components/team/TeamSwitcher.tsx
    - Allow switching between multiple teams
    - _Requirements: 3.5, 20.5_

- [x] 23. Checkpoint - Verify team UI





  - Ensure all tests pass, ask the user if questions arise.

## Phase 11: UI Components - Data Entry with Attribution

- [x] 24. Update Room Modal for attribution






  - [x] 24.1 Update RoomModal component

    - Update components/RoomModal.tsx
    - Add team member dropdown for collected_by
    - Default to current user
    - Display both collected_by and entered_by
    - _Requirements: 22.1, 22.2, 22.3, 22.4_

  - [x] 24.2 Update BusinessModal component

    - Update components/corporate/BusinessModal.tsx
    - Add team member dropdown for collected_by
    - Default to current user
    - Display both collected_by and entered_by
    - _Requirements: 22.1, 22.2, 22.3, 22.4_

- [x] 25. Checkpoint - Verify data entry UI





  - Ensure all tests pass, ask the user if questions arise.

## Phase 12: UI Components - Goals and Accessibility

- [x] 26. Update Goals components for Supabase



  - [x] 26.1 Update GoalTracker component


    - Update components/GoalTracker.tsx
    - Replace localStorage with Supabase goals service
    - Calculate progress from attributed donations
    - _Requirements: 15.5, 22.6_


  - [x] 26.2 Update GoalSettingsModal
    - Update goal settings to save to Supabase

    - _Requirements: 15.1, 15.2_

  - [x] 26.3 Update AchievementsModal

    - Load achievements from Supabase
    - Display unlock notifications
    - _Requirements: 16.2, 16.3, 16.4_

- [x] 27. Update Accessibility components

  - [x] 27.1 Update AccessibilityPanel component
    - Update components/AccessibilityPanel.tsx
    - Save settings to user profile in Supabase
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

  - [x] 27.2 Write property test for accessibility settings

    - **Property 15: Accessibility Settings Persistence**
    - **Validates: Requirements 17.4, 17.5**

- [x] 28. Checkpoint - Verify goals and accessibility UI





  - Ensure all tests pass, ask the user if questions arise.

## Phase 13: Data Migration

- [x] 29. Implement data migration






  - [x] 29.1 Create migration service

    - Create services/supabase/migrationService.ts
    - Implement checkLocalStorageData function
    - Implement migrateToSupabase function
    - Preserve original timestamps
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 29.2 Create MigrationPrompt component

    - Create components/migration/MigrationPrompt.tsx
    - Show migration offer when localStorage data found
    - Handle migration success/failure
    - Clear localStorage on success
    - _Requirements: 12.2, 12.4, 12.5_

- [x] 30. Checkpoint - Verify migration





  - Ensure all tests pass, ask the user if questions arise.

## Phase 14: Integration and App Updates

- [x] 31. Update main App component




  - [x] 31.1 Wrap App with AuthContext

    - Update App.tsx
    - Add AuthProvider wrapper
    - Implement auth-based routing
    - _Requirements: 1.2, 3.4_


  - [x] 31.2 Update data loading to use Supabase
    - Replace localStorage calls with Supabase services
    - Set up real-time subscriptions on mount

    - _Requirements: 9.2_
  - [x] 31.3 Update Sidebar components


    - Update components/Sidebar.tsx
    - Update components/corporate/CorporateSidebar.tsx
    - Use Supabase data
    - _Requirements: 8.1, 8.3_

- [x] 32. Implement RLS verification






  - [x] 32.1 Write property test for RLS enforcement

    - **Property 5: Row Level Security Enforcement**
    - **Validates: Requirements 10.1, 10.2**

- [x] 33. Final Checkpoint - Verify complete integration





  - Ensure all tests pass, ask the user if questions arise.
