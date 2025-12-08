import { Apartment, Room, SUPPORT_VALUE } from '../types';

// Generate PDF report using browser's print functionality
export const generatePDFReport = (apartments: Apartment[], reportType: 'summary' | 'detailed' | 'forms') => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate PDF');
    return;
  }

  const html = generateReportHTML(apartments, reportType);
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load then print
  printWindow.onload = () => {
    printWindow.print();
  };
};

const generateReportHTML = (apartments: Apartment[], reportType: 'summary' | 'detailed' | 'forms'): string => {
  const date = new Date().toLocaleDateString('en-IN', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });

  // Calculate totals
  let totalRooms = 0, totalVisited = 0, totalDonated = 0, totalAmount = 0, totalSupports = 0;
  const allDonations: { apt: string; room: Room; floor: string }[] = [];

  apartments.forEach(apt => {
    Object.entries(apt.rooms).forEach(([floor, rooms]) => {
      (rooms as Room[]).forEach(room => {
        totalRooms++;
        if (room.status !== 'unvisited') totalVisited++;
        if (room.status === 'donated') {
          totalDonated++;
          totalAmount += room.amountDonated || 0;
          totalSupports += room.supportsCount || Math.floor((room.amountDonated || 0) / SUPPORT_VALUE);
          allDonations.push({ apt: apt.name, room, floor });
        }
      });
    });
  });

  const styles = `
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
      .section { margin-bottom: 32px; }
      .section h2 { font-size: 18px; color: #1e293b; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { background: #f1f5f9; padding: 12px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; }
      td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
      tr:hover { background: #f8fafc; }
      .status { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
      .status.donated { background: #dcfce7; color: #166534; }
      .status.callback { background: #fef3c7; color: #92400e; }
      .status.not_interested { background: #fee2e2; color: #991b1b; }
      .amount { font-weight: 600; color: #059669; }
      .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
      @media print { 
        body { padding: 20px; }
        .summary-grid { grid-template-columns: repeat(4, 1fr); }
      }
    </style>
  `;

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
      apartments.forEach(apt => {
        let aptTotal = 0, aptDonated = 0, aptAmount = 0;
        Object.values(apt.rooms).forEach((floor: Room[]) => {
          floor.forEach(room => {
            aptTotal++;
            if (room.status === 'donated') {
              aptDonated++;
              aptAmount += room.amountDonated || 0;
            }
          });
        });

        content += `
          <div class="section">
            <h2>${apt.name} - ${aptDonated} donations (₹${aptAmount.toLocaleString()})</h2>
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
                ${Object.entries(apt.rooms).sort((a, b) => Number(b[0]) - Number(a[0])).map(([floor, rooms]) => 
                  (rooms as Room[]).filter(r => r.status !== 'unvisited').map(room => `
                    <tr>
                      <td>${floor}</td>
                      <td>${room.roomNumber}</td>
                      <td><span class="status ${room.status}">${room.status.replace('_', ' ')}</span></td>
                      <td>${room.visitorName || '-'}</td>
                      <td class="amount">${room.status === 'donated' ? '₹' + (room.amountDonated || 0).toLocaleString() : '-'}</td>
                      <td>${room.supportsCount || '-'}</td>
                    </tr>
                  `).join('')
                ).join('')}
              </tbody>
            </table>
          </div>
        `;
      });
    }
  }

  if (reportType === 'forms') {
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
                <td>${room.roomNumber}</td>
                <td>${room.visitorName || '-'}</td>
                <td>${room.donorPhone || '-'}</td>
                <td class="amount">₹${(room.amountDonated || 0).toLocaleString()}</td>
                <td>${room.supportsCount || Math.floor((room.amountDonated || 0) / SUPPORT_VALUE)}</td>
                <td>${room.paymentMode || 'cash'}</td>
                <td>${room.receiptNumber || '-'}</td>
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
      <title>DoorStep Report - ${date}</title>
      ${styles}
    </head>
    <body>
      <div class="header">
        <h1>DoorStep Campaign Report</h1>
        <p>Generated on ${date}</p>
      </div>
      ${content}
      <div class="footer">
        <p>Generated by DoorStep App • ${apartments.length} campaigns</p>
      </div>
    </body>
    </html>
  `;
};

// ===== CORPORATE PDF EXPORT =====
import { BusinessCampaign, Business } from '../types';

export const generateCorporatePDFReport = (campaigns: BusinessCampaign[], reportType: 'summary' | 'detailed' | 'donations') => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate PDF');
    return;
  }

  const html = generateCorporateReportHTML(campaigns, reportType);
  printWindow.document.write(html);
  printWindow.document.close();
  
  printWindow.onload = () => {
    printWindow.print();
  };
};

const generateCorporateReportHTML = (campaigns: BusinessCampaign[], reportType: 'summary' | 'detailed' | 'donations'): string => {
  const date = new Date().toLocaleDateString('en-IN', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });

  // Calculate totals
  let totalBusinesses = 0, totalVisited = 0, totalDonated = 0, totalAmount = 0, totalPledged = 0;
  const allDonations: { campaign: string; business: Business }[] = [];

  campaigns.forEach(camp => {
    camp.businesses.forEach(biz => {
      totalBusinesses++;
      if (biz.status !== 'unvisited') totalVisited++;
      if (biz.status === 'donated') {
        totalDonated++;
        totalAmount += biz.amountDonated || 0;
        allDonations.push({ campaign: camp.name, business: biz });
      }
      totalPledged += biz.amountPledged || 0;
    });
  });

  const styles = `
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
      campaigns.forEach(camp => {
        const campDonated = camp.businesses.filter(b => b.status === 'donated').length;
        const campAmount = camp.businesses.reduce((sum, b) => sum + (b.amountDonated || 0), 0);

        content += `
          <div class="section">
            <h2>${camp.name} (${camp.area}) - ${campDonated} donations (₹${campAmount.toLocaleString()})</h2>
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
                ${camp.businesses.filter(b => b.status !== 'unvisited').map(biz => `
                  <tr>
                    <td>${biz.name}</td>
                    <td>${biz.category}</td>
                    <td>${biz.contactPerson || '-'}</td>
                    <td>${biz.phone || '-'}</td>
                    <td><span class="status ${biz.status}">${biz.status.replace('_', ' ')}</span></td>
                    <td class="amount">${biz.status === 'donated' ? '₹' + (biz.amountDonated || 0).toLocaleString() : '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      });
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
                <td>${business.contactPerson || '-'}</td>
                <td>${business.phone || '-'}</td>
                <td>${business.email || '-'}</td>
                <td class="amount">₹${(business.amountDonated || 0).toLocaleString()}</td>
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
      <title>Corporate Report - ${date}</title>
      ${styles}
    </head>
    <body>
      <div class="header">
        <h1>Corporate Campaign Report</h1>
        <p>Generated on ${date}</p>
      </div>
      ${content}
      <div class="footer">
        <p>Generated by DoorStep App • ${campaigns.length} campaigns</p>
      </div>
    </body>
    </html>
  `;
};
