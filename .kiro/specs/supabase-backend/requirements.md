# Requirements Document

## Introduction

This document specifies the requirements for migrating the Door-to-Door fundraising application from localStorage to a Supabase backend. The system will support a hierarchical team structure with role-based access control, phone number OTP authentication, team code-based access, and real-time data synchronization for both residential and business/corporate campaigns.

## Glossary

- **System**: The Door-to-Door Supabase Backend
- **Dev**: The application developer who has exclusive authority to assign Owner roles (system-level access)
- **Owner**: A top-level administrator (maximum 3 allowed) who has full control over all teams and can assign BDM, Team Leader, and Team Member roles
- **Business Development Manager (BDM)**: A user with elevated privileges who can create teams, manage team leaders, and assign Team Leader and Team Member roles (cannot assign Owner role)
- **Team Leader**: A user who manages a specific team and can assign Team Member roles within their team only
- **Team Member**: A user who can view and edit data within their assigned team but cannot assign any roles
- **Team Code**: A unique alphanumeric code used to join a team
- **OTP**: One-Time Password sent via SMS for phone number verification
- **Residential Campaign**: Door-to-door fundraising in apartment buildings
- **Business Campaign**: Corporate/business fundraising activities
- **Real-time Sync**: Immediate data synchronization across all connected clients using Supabase Realtime

## Requirements

### Requirement 1

**User Story:** As a user, I want to authenticate using my phone number with OTP verification, so that I can securely access the application without remembering passwords.

#### Acceptance Criteria

1. WHEN a user enters a valid phone number and requests OTP THEN the System SHALL send a 6-digit OTP to the provided phone number within 30 seconds
2. WHEN a user enters a valid OTP within 5 minutes of request THEN the System SHALL authenticate the user and create a session
3. WHEN a user enters an invalid OTP THEN the System SHALL reject the authentication attempt and display an error message
4. WHEN an OTP expires after 5 minutes THEN the System SHALL require the user to request a new OTP
5. WHEN a user requests more than 3 OTPs within 10 minutes THEN the System SHALL implement rate limiting and delay subsequent requests

### Requirement 2

**User Story:** As an Owner or BDM, I want to create teams with unique team codes, so that I can organize team members and control access to the application.

#### Acceptance Criteria

1. WHEN an Owner or BDM creates a new team THEN the System SHALL generate a unique 8-character alphanumeric team code
2. WHEN a team is created THEN the System SHALL store the team name, description, created date, and creator reference
3. WHEN an Owner creates a team THEN the System SHALL allow the Owner to assign a Team Leader to that team
4. WHEN a BDM creates a team THEN the System SHALL allow the BDM to assign a Team Leader to that team
5. WHEN a team code is generated THEN the System SHALL ensure the code is unique across all teams

### Requirement 3

**User Story:** As a new user, I want to join a team using a team code, so that I can access the team's data and start contributing.

#### Acceptance Criteria

1. WHEN an authenticated user enters a valid team code THEN the System SHALL add the user to that team as a Team Member
2. WHEN a user enters an invalid team code THEN the System SHALL display an error message and prevent access
3. WHEN a user successfully joins a team THEN the System SHALL grant the user access to view and edit team data
4. WHEN a user has not joined any team THEN the System SHALL restrict access to the main application features
5. WHEN a user belongs to multiple teams THEN the System SHALL allow the user to switch between teams

### Requirement 4

**User Story:** As the Dev, I want to have exclusive authority to assign Owner roles, so that the highest level of access is tightly controlled.

#### Acceptance Criteria

1. WHEN the Dev assigns the Owner role to a user THEN the System SHALL update the user's role to Owner
2. WHEN a non-Dev user attempts to assign the Owner role THEN the System SHALL reject the request and return an authorization error
3. WHEN the System already has 3 users with Owner role THEN the System SHALL prevent the Dev from creating additional Owner accounts
4. WHEN the Dev removes the Owner role from a user THEN the System SHALL demote the user to the previously held role or Team Member
5. WHILE the Dev manages Owner assignments THEN the System SHALL log all Owner role changes for audit purposes

### Requirement 5

**User Story:** As an Owner, I want to have full control over all teams and users, so that I can manage the entire organization effectively.

#### Acceptance Criteria

1. WHILE a user has the Owner role THEN the System SHALL grant access to all teams and their data
2. WHILE a user has the Owner role THEN the System SHALL allow creation, modification, and deletion of any team
3. WHILE a user has the Owner role THEN the System SHALL allow assignment of BDM, Team Leader, and Team Member roles to users
4. WHILE a user has the Owner role THEN the System SHALL restrict the Owner from assigning the Owner role to other users
5. WHILE a user has the Owner role THEN the System SHALL allow viewing of all user activity and statistics
6. WHEN the System has 3 users with Owner role THEN the System SHALL prevent creation of additional Owner accounts
7. WHEN the Owner assigns a role to a user THEN the System SHALL update the user's permissions immediately

### Requirement 6

**User Story:** As a Business Development Manager, I want to create and manage teams, so that I can organize fundraising efforts across different areas.

#### Acceptance Criteria

1. WHILE a user has the BDM role THEN the System SHALL allow creation of new teams with unique codes
2. WHILE a user has the BDM role THEN the System SHALL allow assignment of Team Leader and Team Member roles to users
3. WHILE a user has the BDM role THEN the System SHALL restrict the BDM from assigning Owner or BDM roles to users
4. WHILE a user has the BDM role THEN the System SHALL allow viewing of all teams and their statistics
5. WHEN a BDM creates a team THEN the System SHALL associate the team with the BDM as the creator
6. WHILE a user has the BDM role THEN the System SHALL restrict deletion of teams created by other BDMs or the Owner

### Requirement 7

**User Story:** As a Team Leader, I want to manage my team members and their activities, so that I can ensure effective fundraising operations.

#### Acceptance Criteria

1. WHILE a user has the Team Leader role THEN the System SHALL allow viewing of all team member activities within their team
2. WHILE a user has the Team Leader role THEN the System SHALL allow assignment of Team Member role to users within their team only
3. WHILE a user has the Team Leader role THEN the System SHALL restrict the Team Leader from assigning Owner, BDM, or Team Leader roles
4. WHILE a user has the Team Leader role THEN the System SHALL allow removal of Team Members from their team
5. WHILE a user has the Team Leader role THEN the System SHALL allow editing of team details such as name and description
6. WHEN a Team Leader views the dashboard THEN the System SHALL display aggregated statistics for their team
7. WHILE a user has the Team Leader role THEN the System SHALL restrict access to other teams' data

### Requirement 8

**User Story:** As a Team Member, I want to add and edit residential and business visits, so that I can record my fundraising activities.

#### Acceptance Criteria

1. WHEN a Team Member creates a new residential visit record THEN the System SHALL store the room details, status, donor information, and timestamp
2. WHEN a Team Member updates a visit record THEN the System SHALL update the record and set the updatedAt timestamp
3. WHEN a Team Member creates a new business visit record THEN the System SHALL store the business details, status, contact information, and timestamp
4. WHILE a Team Member is editing a record THEN the System SHALL prevent other users from overwriting concurrent changes
5. WHEN a Team Member marks a visit as completed THEN the System SHALL update the team's progress statistics

### Requirement 9

**User Story:** As a team user, I want to see real-time updates when other team members make changes, so that I can stay informed about team progress.

#### Acceptance Criteria

1. WHEN any team member creates, updates, or deletes a record THEN the System SHALL broadcast the change to all connected team members within 2 seconds
2. WHEN a user connects to the application THEN the System SHALL subscribe the user to real-time updates for their team's data
3. WHEN a real-time update is received THEN the System SHALL update the local UI without requiring a page refresh
4. WHEN a user loses connection THEN the System SHALL queue local changes and sync when connection is restored
5. WHEN multiple users edit the same record simultaneously THEN the System SHALL apply the most recent change and notify affected users

### Requirement 10

**User Story:** As a user, I want my data to be secure and accessible only to authorized team members, so that sensitive donor information is protected.

#### Acceptance Criteria

1. WHEN a user queries data THEN the System SHALL enforce Row Level Security policies based on team membership
2. WHEN a user attempts to access data outside their team THEN the System SHALL deny the request and return an authorization error
3. WHEN storing donor information THEN the System SHALL encrypt sensitive fields such as phone numbers and PAN numbers
4. WHEN a user's session expires THEN the System SHALL require re-authentication before allowing data access
5. WHEN a user is removed from a team THEN the System SHALL immediately revoke access to that team's data

### Requirement 11

**User Story:** As an Owner or BDM, I want to view comprehensive statistics and reports, so that I can track overall fundraising performance.

#### Acceptance Criteria

1. WHEN an Owner views the dashboard THEN the System SHALL display aggregated statistics across all teams
2. WHEN a BDM views the dashboard THEN the System SHALL display statistics for teams they manage
3. WHEN viewing statistics THEN the System SHALL show total visits, donations collected, conversion rates, and team rankings
4. WHEN filtering statistics by date range THEN the System SHALL recalculate and display filtered results
5. WHEN exporting reports THEN the System SHALL generate CSV files with the requested data scope

### Requirement 12

**User Story:** As a user, I want all my existing data to be preserved and synced when migrating to the new backend, so that I do not lose any previous work.

#### Acceptance Criteria

1. WHEN a user first connects to the Supabase backend THEN the System SHALL check for existing localStorage data
2. WHEN existing localStorage data is found THEN the System SHALL offer to migrate the data to the user's team in Supabase
3. WHEN migrating data THEN the System SHALL preserve all apartment, room, business, and campaign records with their original timestamps
4. WHEN migration completes successfully THEN the System SHALL clear the localStorage data to prevent duplicates
5. IF migration fails THEN the System SHALL retain the localStorage data and notify the user of the failure

### Requirement 13

**User Story:** As a Team Member, I want to record complete donor information for residential visits, so that donation records are accurate and complete.

#### Acceptance Criteria

1. WHEN a Team Member records a donation THEN the System SHALL store the donor name, phone, email, address, and PAN number
2. WHEN a Team Member records a donation THEN the System SHALL store the amount donated, supports count, payment mode, and receipt number
3. WHEN a Team Member updates donor information THEN the System SHALL validate required fields before saving
4. WHEN viewing a room record THEN the System SHALL display all donor information associated with that room
5. WHEN a donation is recorded THEN the System SHALL calculate and store the supports count based on the amount (1 support = ₹1200)

### Requirement 14

**User Story:** As a Team Member, I want to record complete business visit information, so that corporate fundraising records are accurate and complete.

#### Acceptance Criteria

1. WHEN a Team Member records a business visit THEN the System SHALL store the business name, contact person, phone, email, and address
2. WHEN a Team Member records a business visit THEN the System SHALL store the business category, status, amount donated, and amount pledged
3. WHEN a Team Member schedules a follow-up THEN the System SHALL store the next follow-up date and time
4. WHEN viewing a business record THEN the System SHALL display all information associated with that business
5. WHEN a business status changes THEN the System SHALL update the team's business campaign statistics


### Requirement 15

**User Story:** As an individual user, I want to track my personal goals and streaks, so that I can monitor my own fundraising performance and stay motivated.

#### Acceptance Criteria

1. WHEN a user sets daily targets THEN the System SHALL store presentations, forms, and supports targets for that user
2. WHEN a user sets weekly targets THEN the System SHALL store presentations, forms, and supports targets for that user
3. WHEN a user completes activities on consecutive days THEN the System SHALL increment the user's streak counter
4. WHEN a user misses a day of activity THEN the System SHALL reset the current streak to zero while preserving the longest streak
5. WHEN viewing goals THEN the System SHALL display the user's personal progress against their individual targets
6. WHEN a user's progress syncs THEN the System SHALL update goal progress in real-time across all user devices

### Requirement 16

**User Story:** As an individual user, I want to earn achievements based on my personal performance, so that I can feel rewarded for my fundraising efforts.

#### Acceptance Criteria

1. WHEN a user reaches an achievement milestone THEN the System SHALL unlock the achievement and store the unlock timestamp
2. WHEN viewing achievements THEN the System SHALL display all available achievements with progress indicators
3. WHEN an achievement is unlocked THEN the System SHALL display a notification to the user
4. WHEN a user views their profile THEN the System SHALL display all unlocked achievements
5. WHEN calculating achievement progress THEN the System SHALL use the user's individual statistics only

### Requirement 17

**User Story:** As a user, I want to access accessibility settings, so that I can customize the application to my needs.

#### Acceptance Criteria

1. WHEN a user enables high contrast mode THEN the System SHALL apply high contrast styling across all screens
2. WHEN a user enables larger touch targets THEN the System SHALL increase button and interactive element sizes
3. WHEN a user changes font size THEN the System SHALL apply the selected font size (normal, large, extra-large) across the application
4. WHEN accessibility settings are changed THEN the System SHALL persist the settings to the user's profile
5. WHEN a user logs in on a new device THEN the System SHALL apply the user's saved accessibility settings

### Requirement 18

**User Story:** As a user, I want to export and backup my data, so that I can preserve my records and share reports.

#### Acceptance Criteria

1. WHEN a user exports to CSV THEN the System SHALL generate a CSV file containing all team data the user has access to
2. WHEN a user exports to PDF THEN the System SHALL generate a formatted PDF report with summary, detailed, or forms view
3. WHEN a user requests a backup THEN the System SHALL generate a JSON backup of all accessible data
4. WHEN a user restores from backup THEN the System SHALL validate and import the backup data to the appropriate team
5. WHEN exporting data THEN the System SHALL respect the user's role permissions and only include authorized data


### Requirement 19

**User Story:** As a user, I want to manage my profile information, so that my team members can identify me and I can be contacted if needed.

#### Acceptance Criteria

1. WHEN a user first logs in THEN the System SHALL prompt the user to enter their name
2. WHEN a user views their profile THEN the System SHALL display their name, phone number (from authentication), and email (if provided)
3. WHEN a user updates their name THEN the System SHALL save the updated name to their profile
4. WHEN a user adds or updates their email THEN the System SHALL validate the email format and save it as optional contact information
5. WHEN a user's profile is viewed by team members THEN the System SHALL display the user's name and role within the team
6. WHEN a user changes their profile THEN the System SHALL sync the changes in real-time across all connected clients

### Requirement 20

**User Story:** As a team member, I want to view my team members and their activities, so that I can collaborate effectively with my team.

#### Acceptance Criteria

1. WHEN a user views the Team section THEN the System SHALL display all members of the current team with their names and roles
2. WHEN a team member updates a record THEN the System SHALL display the member's name as the last editor
3. WHEN viewing team statistics THEN the System SHALL show individual contributions from each team member
4. WHEN a Team Leader views the team THEN the System SHALL display additional management options for team members
5. WHEN a user switches teams THEN the System SHALL update the team member list to show the new team's members

### Requirement 21

**User Story:** As a user, I want to share team data with new members easily, so that they can quickly join and access team information.

#### Acceptance Criteria

1. WHEN an Owner, BDM, or Team Leader views the Team section THEN the System SHALL display the team code for sharing
2. WHEN a user copies the team code THEN the System SHALL copy the code to the clipboard with confirmation
3. WHEN a user generates a QR code for the team THEN the System SHALL create a scannable QR code containing the team code
4. WHEN a new user scans the team QR code THEN the System SHALL extract the team code and pre-fill the join form
5. WHEN sharing team information THEN the System SHALL only share the team code and not expose sensitive team data


### Requirement 22

**User Story:** As a team member, I want to attribute donations to the correct team member who collected them, so that individual contributions are tracked accurately even when someone else enters the data.

#### Acceptance Criteria

1. WHEN a team member creates a donation record THEN the System SHALL display a dropdown to select the collecting team member
2. WHEN selecting a collecting member THEN the System SHALL show all active team members as options
3. WHEN no collecting member is selected THEN the System SHALL default to the user entering the data
4. WHEN viewing donation records THEN the System SHALL display both the collecting member and the data entry member
5. WHEN calculating individual statistics THEN the System SHALL attribute the donation to the collecting member, not the data entry member
6. WHEN a team member views their personal goals THEN the System SHALL count only donations attributed to that member
