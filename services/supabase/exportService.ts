/**
 * Export Service for Supabase
 * Handles CSV and PDF export with role-based filtering
 * Requirements: 18.1, 18.2, 18.5
 */

import { supabase } from './client';
import { getCurrentUserRole } from './profileService';
import { getUserTeams, type Team } from './teamService';
import { getApartments, getRoomsByApartment, type SupabaseApartment, type SupabaseRoom } from './residentialService';
import { getCampaigns, getBusinessesByCampaign, type SupabaseBusinessCampaign, type SupabaseBusiness } from './businessService';
import { SUPPORT_VALUE } from '../../types';

// Export types
export type ExportFormat = 'csv' | 'pdf';
export type ReportType = 'summary' | 'detailed' | 'forms' | 'donations';

// Export result
export interface ExportResult {
  success: boolean;
  error?: string;
}

// Residential export data structure
export interface ResidentialExportData {
  apartments: Array<{
    apartment: SupabaseApartment;
    rooms: SupabaseRoom[];
  }>;
  teamName: string;
}

// Business export data structure
export interface BusinessExportData {
  campaigns: Array<{
    campaign: SupabaseBusinessCampaign;
    businesses: SupabaseBusiness[];
  }>;
  teamName: string;
}

/**
 * Checks if user has access to export data for a team
 * Requirements: 18.5 - Role-based access
 */
async function canExportTeamData(teamId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const userRole = await getCurrentUserRole();
    
    // Admins can export any team's data
    if (userRole && ['dev', 'owner', 'bdm'].includes(userRole)) {
      return true;
    }

    // Check if user is a member of the team
    const { data: membership } = await supabase
      .from('team_memberships')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .maybeSingle();

    return !!membership;
  } catch (err) {
    console.error('Error checking export permissions:', err);
    return false;
  }
}


/**
 * Gets all accessible teams for the current user
 * Requirements: 18.5 - Only export data user has access to
 */
export async function getAccessibleTeams(): Promise<Team[]> {
  try {
    const userRole = await getCurrentUserRole();
    
    // Admins can access all teams
    if (userRole && ['dev', 'owner', 'bdm'].includes(userRole)) {
      const { data, error } = await supabase
        .from('teams')
        .select('*');
      
      if (error) {
        console.error('Error fetching all teams:', error.message);
        return [];
      }
      return data as Team[];
    }

    // Regular users can only access their teams
    const result = await getUserTeams();
    if (!result.success || !result.teams) {
      return [];
    }
    return result.teams;
  } catch (err) {
    console.error('Error getting accessible teams:', err);
    return [];
  }
}

/**
 * Fetches residential data for export
 * Requirements: 18.1, 18.5
 */
export async function getResidentialExportData(
  teamId: string
): Promise<{ success: boolean; data?: ResidentialExportData; error?: string }> {
  try {
    // Check permissions
    if (!await canExportTeamData(teamId)) {
      return { success: false, error: 'You do not have permission to export this team\'s data' };
    }

    // Get team info
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();

    if (teamError) {
      return { success: false, error: 'Failed to fetch team information' };
    }

    // Get apartments
    const apartmentsResult = await getApartments(teamId);
    if (!apartmentsResult.success || !apartmentsResult.apartments) {
      return { success: false, error: apartmentsResult.error || 'Failed to fetch apartments' };
    }

    // Get rooms for each apartment
    const apartmentsWithRooms: ResidentialExportData['apartments'] = [];
    
    for (const apartment of apartmentsResult.apartments) {
      const roomsResult = await getRoomsByApartment(apartment.id);
      apartmentsWithRooms.push({
        apartment,
        rooms: roomsResult.success && roomsResult.rooms ? roomsResult.rooms : [],
      });
    }

    return {
      success: true,
      data: {
        apartments: apartmentsWithRooms,
        teamName: team.name,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch export data';
    return { success: false, error: message };
  }
}

/**
 * Fetches business data for export
 * Requirements: 18.1, 18.5
 */
export async function getBusinessExportData(
  teamId: string
): Promise<{ success: boolean; data?: BusinessExportData; error?: string }> {
  try {
    // Check permissions
    if (!await canExportTeamData(teamId)) {
      return { success: false, error: 'You do not have permission to export this team\'s data' };
    }

    // Get team info
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single();

    if (teamError) {
      return { success: false, error: 'Failed to fetch team information' };
    }

    // Get campaigns
    const campaignsResult = await getCampaigns(teamId);
    if (!campaignsResult.success || !campaignsResult.campaigns) {
      return { success: false, error: campaignsResult.error || 'Failed to fetch campaigns' };
    }

    // Get businesses for each campaign
    const campaignsWithBusinesses: BusinessExportData['campaigns'] = [];
    
    for (const campaign of campaignsResult.campaigns) {
      const businessesResult = await getBusinessesByCampaign(campaign.id);
      campaignsWithBusinesses.push({
        campaign,
        businesses: businessesResult.success && businessesResult.businesses ? businessesResult.businesses : [],
      });
    }

    return {
      success: true,
      data: {
        campaigns: campaignsWithBusinesses,
        teamName: team.name,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch export data';
    return { success: false, error: message };
  }
}


/**
 * Exports residential data to CSV
 * Requirements: 18.1
 */
export async function exportResidentialToCSV(
  teamId: string,
  reportType: ReportType = 'detailed'
): Promise<ExportResult> {
  try {
    const result = await getResidentialExportData(teamId);
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const { apartments, teamName } = result.data;
    let csvContent = '';
    const date = new Date().toLocaleDateString('en-IN');

    if (reportType === 'summary') {
      // Summary CSV - apartment level stats
      csvContent = 'Building,Total Units,Visited,Donated,Amount Raised,Supports\n';
      
      for (const { apartment, rooms } of apartments) {
        const totalUnits = rooms.length;
        const visited = rooms.filter(r => r.status !== 'unvisited').length;
        const donated = rooms.filter(r => r.status === 'donated').length;
        const amount = rooms.reduce((sum, r) => sum + (r.amount_donated || 0), 0);
        const supports = rooms.reduce((sum, r) => sum + (r.supports_count || 0), 0);
        
        csvContent += `"${apartment.name}",${totalUnits},${visited},${donated},${amount},${supports}\n`;
      }
    } else if (reportType === 'forms' || reportType === 'donations') {
      // Forms/Donations CSV - only donated rooms with donor info
      csvContent = 'Building,Floor,Unit,Donor Name,Phone,Email,Address,PAN,Amount,Supports,Payment Mode,Receipt #\n';
      
      for (const { apartment, rooms } of apartments) {
        const donatedRooms = rooms.filter(r => r.status === 'donated');
        for (const room of donatedRooms) {
          csvContent += `"${apartment.name}",${room.floor},${room.room_number},"${room.visitor_name || ''}","${room.donor_phone || ''}","${room.donor_email || ''}","${room.donor_address || ''}","${room.donor_pan || ''}",${room.amount_donated || 0},${room.supports_count || 0},"${room.payment_mode || 'cash'}","${room.receipt_number || ''}"\n`;
        }
      }
    } else {
      // Detailed CSV - all visited rooms
      csvContent = 'Building,Floor,Unit,Status,Name,Remark,Amount,Supports,Phone,Payment Mode,Receipt #\n';
      
      for (const { apartment, rooms } of apartments) {
        const visitedRooms = rooms.filter(r => r.status !== 'unvisited');
        for (const room of visitedRooms) {
          csvContent += `"${apartment.name}",${room.floor},${room.room_number},"${room.status}","${room.visitor_name || ''}","${room.remark || ''}",${room.amount_donated || 0},${room.supports_count || 0},"${room.donor_phone || ''}","${room.payment_mode || ''}","${room.receipt_number || ''}"\n`;
        }
      }
    }

    // Trigger download
    downloadCSV(csvContent, `${teamName}_residential_${reportType}_${date}.csv`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to export CSV';
    return { success: false, error: message };
  }
}

/**
 * Exports business data to CSV
 * Requirements: 18.1
 */
export async function exportBusinessToCSV(
  teamId: string,
  reportType: ReportType = 'detailed'
): Promise<ExportResult> {
  try {
    const result = await getBusinessExportData(teamId);
    if (!result.success || !result.data) {
    
return { success: false, error: result.error };
    }

    const { campaigns, teamName } = result.data;
    let csvContent = '';
    const date = new Date().toLocaleDateString('en-IN');

    if (reportType === 'summary') {
      // Summary CSV - campaign level stats
      csvContent = 'Campaign,Area,Total Businesses,Visited,Donated,Amount Raised,Amount Pledged\n';
      
      for (const { campaign, businesses } of campaigns) {
        const totalBusinesses = businesses.length;
        const visited = businesses.filter(b => b.status !== 'unvisited').length;
        const donated = businesses.filter(b => b.status === 'donated').length;
        const amount = businesses.reduce((sum, b) => sum + (b.amount_donated || 0), 0);
        const pledged = businesses.reduce((sum, b) => sum + (b.amount_pledged || 0), 0);
        
        csvContent += `"${campaign.name}","${campaign.area || ''}",${totalBusinesses},${visited},${donated},${amount},${pledged}\n`;
      }
    } else if (reportType === 'donations') {
      // Donations CSV - only donated businesses
      csvContent = 'Campaign,Business,Contact,Phone,Email,Address,Category,Amount Donated,Amount Pledged\n';
      
      for (const { campaign, businesses } of campaigns) {
        const donatedBusinesses = businesses.filter(b => b.status === 'donated');
        for (const biz of donatedBusinesses) {
          csvContent += `"${campaign.name}","${biz.name}","${biz.contact_person || ''}","${biz.phone || ''}","${biz.email || ''}","${biz.address || ''}","${biz.category}",${biz.amount_donated || 0},${biz.amount_pledged || 0}\n`;
        }
      }
    } else {
      // Detailed CSV - all visited businesses
      csvContent = 'Campaign,Business,Contact,Phone,Email,Category,Status,Amount Donated,Amount Pledged,Next Follow-up,Note\n';
      
      for (const { campaign, businesses } of campaigns) {
        const visitedBusinesses = businesses.filter(b => b.status !== 'unvisited');
        for (const biz of visitedBusinesses) {
          const followUp = biz.next_follow_up ? new Date(biz.next_follow_up).toLocaleDateString('en-IN') : '';
          csvContent += `"${campaign.name}","${biz.name}","${biz.contact_person || ''}","${biz.phone || ''}","${biz.email || ''}","${biz.category}","${biz.status}",${biz.amount_donated || 0},${biz.amount_pledged || 0},"${followUp}","${(biz.note || '').replace(/"/g, '""')}"\n`;
        }
      }
    }

    // Trigger download
    downloadCSV(csvContent, `${teamName}_business_${reportType}_${date}.csv`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to export CSV';
    return { success: false, error: message };
  }
}

/**
 * Helper function to trigger CSV download
 */
function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


/**
 * Exports residential data to PDF
 * Requirements: 18.2
 */
export async function exportResidentialToPDF(
  teamId: string,
  reportType: ReportType = 'summary'
): Promise<ExportResult> {
  try {
    const result = await getResidentialExportData(teamId);
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const { apartments, teamName } = result.data;
    const html = generateResidentialPDFHTML(apartments, teamName, reportType);
    
    // Open print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return { success: false, error: 'Please allow popups to generate PDF' };
    }

    printWindow.document.write(html);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
    };

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to export PDF';
    return { success: false, error: message };
  }
}

/**
 * Exports business data to PDF
 * Requirements: 18.2
 */
export async function exportBusinessToPDF(
  teamId: string,
  reportType: ReportType = 'summary'
): Promise<ExportResult> {
  try {
    const result = await getBusinessExportData(teamId);
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const { campaigns, teamName } = result.data;
    const html = generateBusinessPDFHTML(campaigns, teamName, reportType);
    
    // Open print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return { success: false, error: 'Please allow popups to generate PDF' };
    }

    printWindow.document.write(html);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
    };

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to export PDF';
    return { success: false, error: message };
  }
}

/**
 * Generates HTML for residential PDF report
 */
function generateResidentialPDFHTML(
  apartments: ResidentialExportData['apartments'],
  teamName: string,
  reportType: ReportType
): string {
  const date = new Date().toLocaleDateString('en-IN', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });

  // Calculate totals
  let totalRooms = 0, totalVisited = 0, totalDonated = 0, totalAmount = 0, totalSupports = 0;
  const allDonations: { apt: string; room: SupabaseRoom }[] = [];

  for (const { apartment, rooms } of apartments) {
    for (const room of rooms) {
      totalRooms++;
      if (room.status !== 'unvisited') totalVisited++;
      if (room.status === 'donated') {
        totalDonated++;
        totalAmount += room.amount_donated || 0;
        totalSupports += room.supports_count || Math.floor((room.amount_donated || 0) / SUPPORT_VALUE);
        allDonations.push({ apt: apartment.name, room });
      }
    }
  }

  const styles = getPDFStyles();
  let content = '';

  if (reportType === 'summary' || reportType === 'detailed') {
    content = `
      <div class="summary-grid">
        <div class="summary-card">
          <div class="value">${totalRooms}</div>
          <div class="label">Total Units</div>
        </div>
        <div class="summary-card">
          <div class="value">${totalVisited}</div>
          <div class="label">Visited</div>
        </div>
        <div class="summary-card green">
          <div class="value">${totalDonated}</div>
          <div class="label">Forms Filled</div>
        </div>
        <div class="summary-card green">
          <div class="value">₹${totalAmount.toLocaleString()}</div>
          <div class="label">Total Raised</div>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="value">${totalSupports}</div>
          <div class="label">Total Supports</div>
        </div>
        <div class="summary-card">
          <div class="value">${Math.round((totalVisited / Math.max(totalRooms, 1)) * 100)}%</div>
          <div class="label">Coverage</div>
        </div>
        <div class="summary-card">
          <div class="value">${Math.round((totalDonated / Math.max(totalVisited, 1)) * 100)}%</div>
          <div class="label">Conversion</div>
        </div>
        <div class="summary-card">
          <div class="value">₹${totalDonated > 0 ? Math.round(totalAmount / totalDonated).toLocaleString() : 0}</div>
          <div class="label">Avg Donation</div>
        </div>
      </div>
    `;

    if (reportType === 'detailed') {
      for (const { apartment, rooms } of apartments) {
        const aptDonated = rooms.filter(r => r.status === 'donated').length;
        const aptAmount = rooms.reduce((sum, r) => sum + (r.amount_donated || 0), 0);
        const visitedRooms = rooms.filter(r => r.status !== 'unvisited');

        if (visitedRooms.length === 0) continue;

        content += `
          <div class="section">
            <h2>${apartment.name} - ${aptDonated} donations (₹${aptAmount.toLocaleString()})</h2>
            <table>
              <thead>
                <tr>
                  <th>Floor</th>
                  <th>Unit</th>
                  <th>Status</th>
                  <th>Name</th>
                  <th>Amount</th>
                  <th>Supports</th>
                </tr>
              </thead>
              <tbody>
                ${visitedRooms.map(room => `
                  <tr>
                    <td>${room.floor}</td>
                    <td>${room.room_number}</td>
                    <td><span class="status ${room.status}">${room.status.replace('_', ' ')}</span></td>
                    <td>${room.visitor_name || '-'}</td>
                    <td class="amount">${room.status === 'donated' ? '₹' + (room.amount_donated || 0).toLocaleString() : '-'}</td>
                    <td>${room.supports_count || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }
  }

  if (reportType === 'forms' || reportType === 'donations') {
    content = `
      <div class="section">
        <h2>Donation Forms (${allDonations.length} total)</h2>
        <table>
          <thead>
            <tr>
              <th>Building</th>
              <th>Unit</th>
              <th>Donor Name</th>
              <th>Phone</th>
              <th>Amount</th>
              <th>Supports</th>
              <th>Payment</th>
              <th>Receipt #</th>
            </tr>
          </thead>
          <tbody>
            ${allDonations.map(({ apt, room }) => `
              <tr>
                <td>${apt}</td>
                <td>${room.room_number}</td>
                <td>${room.visitor_name || '-'}</td>
                <td>${room.donor_phone || '-'}</td>
                <td class="amount">₹${(room.amount_donated || 0).toLocaleString()}</td>
                <td>${room.supports_count || Math.floor((room.amount_donated || 0) / SUPPORT_VALUE)}</td>
                <td>${room.payment_mode || 'cash'}</td>
                <td>${room.receipt_number || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="summary-grid" style="margin-top: 24px;">
        <div class="summary-card green">
          <div class="value">${allDonations.length}</div>
          <div class="label">Total Forms</div>
        </div>
        <div class="summary-card green">
          <div class="value">${totalSupports}</div>
          <div class="label">Total Supports</div>
        </div>
        <div class="summary-card green">
          <div class="value">₹${totalAmount.toLocaleString()}</div>
          <div class="label">Total Amount</div>
        </div>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${teamName} - Residential Report - ${date}</title>
      ${styles}
    </head>
    <body>
      <div class="header">
        <h1>${teamName} - Residential Campaign Report</h1>
        <p>Generated on ${date}</p>
      </div>
      ${content}
      <div class="footer">
        <p>Generated by DoorStep App • ${apartments.length} buildings</p>
      </div>
    </body>
    </html>
  `;
}


/**
 * Generates HTML for business PDF report
 */
function generateBusinessPDFHTML(
  campaigns: BusinessExportData['campaigns'],
  teamName: string,
  reportType: ReportType
): string {
  const date = new Date().toLocaleDateString('en-IN', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });

  // Calculate totals
  let totalBusinesses = 0, totalVisited = 0, totalDonated = 0, totalAmount = 0, totalPledged = 0;
  const allDonations: { campaign: string; business: SupabaseBusiness }[] = [];

  for (const { campaign, businesses } of campaigns) {
    for (const biz of businesses) {
      totalBusinesses++;
      if (biz.status !== 'unvisited') totalVisited++;
      if (biz.status === 'donated') {
        totalDonated++;
        totalAmount += biz.amount_donated || 0;
        allDonations.push({ campaign: campaign.name, business: biz });
      }
      totalPledged += biz.amount_pledged || 0;
    }
  }

  const styles = getPDFStyles();
  let content = '';

  if (reportType === 'summary' || reportType === 'detailed') {
    content = `
      <div class="summary-grid">
        <div class="summary-card">
          <div class="value">${totalBusinesses}</div>
          <div class="label">Total Businesses</div>
        </div>
        <div class="summary-card">
          <div class="value">${totalVisited}</div>
          <div class="label">Visited</div>
        </div>
        <div class="summary-card green">
          <div class="value">${totalDonated}</div>
          <div class="label">Donated</div>
        </div>
        <div class="summary-card green">
          <div class="value">₹${totalAmount.toLocaleString()}</div>
          <div class="label">Total Raised</div>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card purple">
          <div class="value">₹${totalPledged.toLocaleString()}</div>
          <div class="label">Total Pledged</div>
        </div>
        <div class="summary-card">
          <div class="value">${Math.round((totalVisited / Math.max(totalBusinesses, 1)) * 100)}%</div>
          <div class="label">Coverage</div>
        </div>
        <div class="summary-card">
          <div class="value">${Math.round((totalDonated / Math.max(totalVisited, 1)) * 100)}%</div>
          <div class="label">Conversion</div>
        </div>
        <div class="summary-card">
          <div class="value">₹${totalDonated > 0 ? Math.round(totalAmount / totalDonated).toLocaleString() : 0}</div>
          <div class="label">Avg Donation</div>
        </div>
      </div>
    `;

    if (reportType === 'detailed') {
      for (const { campaign, businesses } of campaigns) {
        const campDonated = businesses.filter(b => b.status === 'donated').length;
        const campAmount = businesses.reduce((sum, b) => sum + (b.amount_donated || 0), 0);
        const visitedBusinesses = businesses.filter(b => b.status !== 'unvisited');

        if (visitedBusinesses.length === 0) continue;

        content += `
          <div class="section">
            <h2>${campaign.name}${campaign.area ? ` (${campaign.area})` : ''} - ${campDonated} donations (₹${campAmount.toLocaleString()})</h2>
            <table>
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Category</th>
                  <th>Contact</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${visitedBusinesses.map(biz => `
                  <tr>
                    <td>${biz.name}</td>
                    <td>${biz.category}</td>
                    <td>${biz.contact_person || '-'}</td>
                    <td>${biz.phone || '-'}</td>
                    <td><span class="status ${biz.status}">${biz.status.replace('_', ' ')}</span></td>
                    <td class="amount">${biz.status === 'donated' ? '₹' + (biz.amount_donated || 0).toLocaleString() : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }
  }

  if (reportType === 'donations') {
    content = `
      <div class="section">
        <h2>Corporate Donations (${allDonations.length} total)</h2>
        <table>
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Business</th>
              <th>Contact</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${allDonations.map(({ campaign, business }) => `
              <tr>
                <td>${campaign}</td>
                <td>${business.name}</td>
                <td>${business.contact_person || '-'}</td>
                <td>${business.phone || '-'}</td>
                <td>${business.email || '-'}</td>
                <td class="amount">₹${(business.amount_donated || 0).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="summary-grid" style="margin-top: 24px;">
        <div class="summary-card green">
          <div class="value">${allDonations.length}</div>
          <div class="label">Total Donors</div>
        </div>
        <div class="summary-card green">
          <div class="value">₹${totalAmount.toLocaleString()}</div>
          <div class="label">Total Amount</div>
        </div>
        <div class="summary-card purple">
          <div class="value">₹${totalPledged.toLocaleString()}</div>
          <div class="label">Pledged</div>
        </div>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${teamName} - Corporate Report - ${date}</title>
      ${styles}
    </head>
    <body>
      <div class="header">
        <h1>${teamName} - Corporate Campaign Report</h1>
        <p>Generated on ${date}</p>
      </div>
      ${content}
      <div class="footer">
        <p>Generated by DoorStep App • ${campaigns.length} campaigns</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Returns common PDF styles
 */
function getPDFStyles(): string {
  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
      .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
      .header h1 { font-size: 28px; color: #1e40af; margin-bottom: 8px; }
      .header p { color: #64748b; font-size: 14px; }
      .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 40px; }
      .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; }
      .summary-card .value { font-size: 32px; font-weight: bold; color: #1e293b; }
      .summary-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
      .summary-card.green { border-color: #10b981; background: #ecfdf5; }
      .summary-card.green .value { color: #059669; }
      .summary-card.purple { border-color: #8b5cf6; background: #f5f3ff; }
      .summary-card.purple .value { color: #7c3aed; }
      .section { margin-bottom: 32px; }
      .section h2 { font-size: 18px; color: #1e293b; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { background: #f1f5f9; padding: 12px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; }
      td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
      tr:hover { background: #f8fafc; }
      .status { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
      .status.donated { background: #dcfce7; color: #166534; }
      .status.meeting_scheduled { background: #dbeafe; color: #1e40af; }
      .status.follow_up { background: #f3e8ff; color: #7c3aed; }
      .status.callback { background: #fef3c7; color: #92400e; }
      .status.not_interested { background: #fee2e2; color: #991b1b; }
      .amount { font-weight: 600; color: #059669; }
      .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
      @media print { body { padding: 20px; } }
    </style>
  `;
}


// ============================================
// Backup and Restore Functions
// Requirements: 18.3, 18.4
// ============================================

// Backup data structure
export interface BackupData {
  version: string;
  exportedAt: string;
  teamId: string;
  teamName: string;
  residential: {
    apartments: Array<{
      apartment: SupabaseApartment;
      rooms: SupabaseRoom[];
    }>;
  };
  business: {
    campaigns: Array<{
      campaign: SupabaseBusinessCampaign;
      businesses: SupabaseBusiness[];
    }>;
  };
}

// Backup validation result
export interface BackupValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary?: {
    apartments: number;
    rooms: number;
    campaigns: number;
    businesses: number;
  };
}

const BACKUP_VERSION = '1.0';

/**
 * Exports a complete backup of team data as JSON
 * Requirements: 18.3
 */
export async function exportBackup(
  teamId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check permissions
    if (!await canExportTeamData(teamId)) {
      return { success: false, error: 'You do not have permission to backup this team\'s data' };
    }

    // Get residential data
    const residentialResult = await getResidentialExportData(teamId);
    if (!residentialResult.success || !residentialResult.data) {
      return { success: false, error: residentialResult.error || 'Failed to fetch residential data' };
    }

    // Get business data
    const businessResult = await getBusinessExportData(teamId);
    if (!businessResult.success || !businessResult.data) {
      return { success: false, error: businessResult.error || 'Failed to fetch business data' };
    }

    // Create backup object
    const backup: BackupData = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      teamId,
      teamName: residentialResult.data.teamName,
      residential: {
        apartments: residentialResult.data.apartments,
      },
      business: {
        campaigns: businessResult.data.campaigns,
      },
    };

    // Trigger download
    const jsonContent = JSON.stringify(backup, null, 2);
    const date = new Date().toISOString().split('T')[0];
    downloadJSON(jsonContent, `${backup.teamName}_backup_${date}.json`);

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create backup';
    return { success: false, error: message };
  }
}

/**
 * Validates a backup file before restore
 * Requirements: 18.4
 */
export function validateBackup(backupData: unknown): BackupValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if it's an object
  if (!backupData || typeof backupData !== 'object') {
    return { valid: false, errors: ['Invalid backup file format'], warnings: [] };
  }

  const data = backupData as Record<string, unknown>;

  // Check version
  if (!data.version) {
    errors.push('Missing backup version');
  } else if (data.version !== BACKUP_VERSION) {
    warnings.push(`Backup version ${data.version} may not be fully compatible with current version ${BACKUP_VERSION}`);
  }

  // Check required fields
  if (!data.exportedAt) {
    errors.push('Missing export timestamp');
  }

  if (!data.teamId) {
    errors.push('Missing team ID');
  }

  if (!data.teamName) {
    warnings.push('Missing team name');
  }

  // Validate residential data
  let apartmentCount = 0;
  let roomCount = 0;

  if (data.residential && typeof data.residential === 'object') {
    const residential = data.residential as Record<string, unknown>;
    if (Array.isArray(residential.apartments)) {
      for (const item of residential.apartments) {
        if (item && typeof item === 'object') {
          const aptItem = item as Record<string, unknown>;
          if (aptItem.apartment && typeof aptItem.apartment === 'object') {
            apartmentCount++;
            if (Array.isArray(aptItem.rooms)) {
              roomCount += aptItem.rooms.length;
            }
          }
        }
      }
    }
  }

  // Validate business data
  let campaignCount = 0;
  let businessCount = 0;

  if (data.business && typeof data.business === 'object') {
    const business = data.business as Record<string, unknown>;
    if (Array.isArray(business.campaigns)) {
      for (const item of business.campaigns) {
        if (item && typeof item === 'object') {
          const campItem = item as Record<string, unknown>;
          if (campItem.campaign && typeof campItem.campaign === 'object') {
            campaignCount++;
            if (Array.isArray(campItem.businesses)) {
              businessCount += campItem.businesses.length;
            }
          }
        }
      }
    }
  }

  if (apartmentCount === 0 && campaignCount === 0) {
    warnings.push('Backup contains no data to restore');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      apartments: apartmentCount,
      rooms: roomCount,
      campaigns: campaignCount,
      businesses: businessCount,
    },
  };
}


/**
 * Restores data from a backup file to a team
 * Requirements: 18.4
 * 
 * Note: This will add data to the team, not replace existing data.
 * Duplicate detection is based on names to avoid creating duplicates.
 */
export async function restoreBackup(
  teamId: string,
  backupData: BackupData
): Promise<{ success: boolean; error?: string; restored?: { apartments: number; rooms: number; campaigns: number; businesses: number } }> {
  try {
    // Check permissions
    if (!await canExportTeamData(teamId)) {
      return { success: false, error: 'You do not have permission to restore data to this team' };
    }

    // Validate backup
    const validation = validateBackup(backupData);
    if (!validation.valid) {
      return { success: false, error: `Invalid backup: ${validation.errors.join(', ')}` };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    let restoredApartments = 0;
    let restoredRooms = 0;
    let restoredCampaigns = 0;
    let restoredBusinesses = 0;

    // Restore residential data
    if (backupData.residential?.apartments) {
      for (const { apartment, rooms } of backupData.residential.apartments) {
        // Check if apartment with same name already exists
        const { data: existingApt } = await supabase
          .from('apartments')
          .select('id')
          .eq('team_id', teamId)
          .eq('name', apartment.name)
          .maybeSingle();

        let apartmentId: string;

        if (existingApt) {
          // Use existing apartment
          apartmentId = existingApt.id;
        } else {
          // Create new apartment
          const { data: newApt, error: aptError } = await supabase
            .from('apartments')
            .insert({
              team_id: teamId,
              name: apartment.name,
              floors: apartment.floors,
              units_per_floor: apartment.units_per_floor,
              target_amount: apartment.target_amount || 0,
              created_at: apartment.created_at,
            })
            .select()
            .single();

          if (aptError) {
            console.error('Error restoring apartment:', aptError.message);
            continue;
          }

          apartmentId = newApt.id;
          restoredApartments++;
        }

        // Restore rooms for this apartment
        for (const room of rooms) {
          // Check if room already exists
          const { data: existingRoom } = await supabase
            .from('rooms')
            .select('id')
            .eq('apartment_id', apartmentId)
            .eq('floor', room.floor)
            .eq('room_number', room.room_number)
            .maybeSingle();

          if (existingRoom) {
            // Update existing room if it has data
            if (room.status !== 'unvisited') {
              await supabase
                .from('rooms')
                .update({
                  status: room.status,
                  visitor_name: room.visitor_name,
                  remark: room.remark,
                  note: room.note,
                  donor_phone: room.donor_phone,
                  donor_email: room.donor_email,
                  donor_address: room.donor_address,
                  donor_pan: room.donor_pan,
                  amount_donated: room.amount_donated,
                  supports_count: room.supports_count,
                  payment_mode: room.payment_mode,
                  receipt_number: room.receipt_number,
                  entered_by: user.id,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingRoom.id);
              restoredRooms++;
            }
          } else {
            // Create new room
            const { error: roomError } = await supabase
              .from('rooms')
              .insert({
                apartment_id: apartmentId,
                floor: room.floor,
                room_number: room.room_number,
                status: room.status,
                visitor_name: room.visitor_name,
                remark: room.remark,
                note: room.note,
                donor_phone: room.donor_phone,
                donor_email: room.donor_email,
                donor_address: room.donor_address,
                donor_pan: room.donor_pan,
                amount_donated: room.amount_donated || 0,
                supports_count: room.supports_count || 0,
                payment_mode: room.payment_mode,
                receipt_number: room.receipt_number,
                collected_by: room.collected_by,
                entered_by: user.id,
                created_at: room.created_at,
              });

            if (!roomError) {
              restoredRooms++;
            }
          }
        }
      }
    }

    // Restore business data
    if (backupData.business?.campaigns) {
      for (const { campaign, businesses } of backupData.business.campaigns) {
        // Check if campaign with same name already exists
        const { data: existingCamp } = await supabase
          .from('business_campaigns')
          .select('id')
          .eq('team_id', teamId)
          .eq('name', campaign.name)
          .maybeSingle();

        let campaignId: string;

        if (existingCamp) {
          // Use existing campaign
          campaignId = existingCamp.id;
        } else {
          // Create new campaign
          const { data: newCamp, error: campError } = await supabase
            .from('business_campaigns')
            .insert({
              team_id: teamId,
              name: campaign.name,
              area: campaign.area,
              target_amount: campaign.target_amount || 0,
              created_at: campaign.created_at,
            })
            .select()
            .single();

          if (campError) {
            console.error('Error restoring campaign:', campError.message);
            continue;
          }

          campaignId = newCamp.id;
          restoredCampaigns++;
        }

        // Restore businesses for this campaign
        for (const biz of businesses) {
          // Check if business with same name already exists in this campaign
          const { data: existingBiz } = await supabase
            .from('businesses')
            .select('id')
            .eq('campaign_id', campaignId)
            .eq('name', biz.name)
            .maybeSingle();

          if (existingBiz) {
            // Update existing business if it has data
            if (biz.status !== 'unvisited') {
              await supabase
                .from('businesses')
                .update({
                  contact_person: biz.contact_person,
                  phone: biz.phone,
                  email: biz.email,
                  address: biz.address,
                  category: biz.category,
                  status: biz.status,
                  note: biz.note,
                  amount_donated: biz.amount_donated,
                  amount_pledged: biz.amount_pledged,
                  next_follow_up: biz.next_follow_up,
                  entered_by: user.id,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingBiz.id);
              restoredBusinesses++;
            }
          } else {
            // Create new business
            const { error: bizError } = await supabase
              .from('businesses')
              .insert({
                campaign_id: campaignId,
                name: biz.name,
                contact_person: biz.contact_person,
                phone: biz.phone,
                email: biz.email,
                address: biz.address,
                category: biz.category,
                status: biz.status,
                note: biz.note,
                amount_donated: biz.amount_donated || 0,
                amount_pledged: biz.amount_pledged || 0,
                next_follow_up: biz.next_follow_up,
                collected_by: biz.collected_by,
                entered_by: user.id,
                created_at: biz.created_at,
              });

            if (!bizError) {
              restoredBusinesses++;
            }
          }
        }
      }
    }

    return {
      success: true,
      restored: {
        apartments: restoredApartments,
        rooms: restoredRooms,
        campaigns: restoredCampaigns,
        businesses: restoredBusinesses,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to restore backup';
    return { success: false, error: message };
  }
}

/**
 * Helper function to trigger JSON download
 */
function downloadJSON(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Reads and parses a backup file
 * Returns the parsed backup data or an error
 */
export async function readBackupFile(
  file: File
): Promise<{ success: boolean; data?: BackupData; error?: string }> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    const validation = validateBackup(data);
    if (!validation.valid) {
      return { success: false, error: `Invalid backup file: ${validation.errors.join(', ')}` };
    }

    return { success: true, data: data as BackupData };
  } catch (err) {
    if (err instanceof SyntaxError) {
      return { success: false, error: 'Invalid JSON format in backup file' };
    }
    const message = err instanceof Error ? err.message : 'Failed to read backup file';
    return { success: false, error: message };
  }
}
