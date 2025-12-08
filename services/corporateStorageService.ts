import { Business, BusinessCampaign, BusinessStatus, BusinessCategory } from '../types';
import { LS_KEY_CORPORATE } from '../constants';

const uid = () => Math.random().toString(36).slice(2, 9);

// --- Service Methods ---

export const loadCampaigns = (): BusinessCampaign[] => {
  try {
    const raw = localStorage.getItem(LS_KEY_CORPORATE);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load corporate data from localStorage", e);
    return [];
  }
};

export const saveCampaigns = (campaigns: BusinessCampaign[]) => {
  try {
    localStorage.setItem(LS_KEY_CORPORATE, JSON.stringify(campaigns));
  } catch (e) {
    console.error("Failed to save corporate data to localStorage", e);
  }
};

export const createNewCampaign = (name: string, area: string, targetAmount?: number): BusinessCampaign => {
  return {
    id: uid(),
    name,
    area,
    createdAt: Date.now(),
    targetAmount: targetAmount || 0,
    businesses: [],
  };
};

export const createNewBusiness = (
  name: string,
  category: BusinessCategory,
  contactPerson?: string,
  phone?: string,
  address?: string
): Business => {
  return {
    id: uid(),
    name,
    contactPerson: contactPerson || '',
    phone: phone || '',
    email: '',
    address: address || '',
    category,
    status: 'unvisited',
    note: '',
    updatedAt: null,
    amountDonated: 0,
    amountPledged: 0,
    nextFollowUp: null,
  };
};

export const addBusinessToCampaign = (
  campaigns: BusinessCampaign[],
  campaignId: string,
  business: Business
): BusinessCampaign[] => {
  return campaigns.map(c => {
    if (c.id !== campaignId) return c;
    return { ...c, businesses: [business, ...c.businesses] };
  });
};

export const updateBusinessInCampaign = (
  campaigns: BusinessCampaign[],
  campaignId: string,
  businessId: string,
  updates: Partial<Business>
): BusinessCampaign[] => {
  return campaigns.map(c => {
    if (c.id !== campaignId) return c;
    return {
      ...c,
      businesses: c.businesses.map(b => {
        if (b.id !== businessId) return b;
        return { ...b, ...updates, updatedAt: updates.updatedAt !== undefined ? updates.updatedAt : Date.now() };
      })
    };
  });
};

export const deleteBusinessFromCampaign = (
  campaigns: BusinessCampaign[],
  campaignId: string,
  businessId: string
): BusinessCampaign[] => {
  return campaigns.map(c => {
    if (c.id !== campaignId) return c;
    return { ...c, businesses: c.businesses.filter(b => b.id !== businessId) };
  });
};

export const updateCampaign = (
  campaigns: BusinessCampaign[],
  campaignId: string,
  updates: Partial<BusinessCampaign>
): BusinessCampaign[] => {
  return campaigns.map(c => {
    if (c.id !== campaignId) return c;
    return { ...c, ...updates };
  });
};

export const exportCorporateToCSV = (campaigns: BusinessCampaign[]) => {
  const rows = [
    ["Campaign", "Area", "Business Name", "Category", "Contact Person", "Phone", "Email", "Address", "Status", "Notes", "Last Updated", "Donated", "Pledged"]
  ];

  campaigns.forEach(campaign => {
    campaign.businesses.forEach(biz => {
      rows.push([
        campaign.name,
        campaign.area,
        biz.name,
        biz.category,
        biz.contactPerson || "",
        biz.phone || "",
        biz.email || "",
        biz.address || "",
        biz.status,
        biz.note || "",
        biz.updatedAt ? new Date(biz.updatedAt).toISOString() : "",
        biz.amountDonated ? biz.amountDonated.toString() : "0",
        biz.amountPledged ? biz.amountPledged.toString() : "0"
      ]);
    });
  });

  const csvContent = rows.map(e => e.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `corporate_export_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
};

export const validateAndParseCorporateImport = async (file: File): Promise<BusinessCampaign[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!Array.isArray(json)) {
          throw new Error("Invalid format: Root must be an array");
        }
        if (json.length > 0 && (!json[0].id || !json[0].businesses)) {
          throw new Error("Invalid format: Missing required campaign fields");
        }
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};
