import { GoogleGenAI } from "@google/genai";
import { Apartment } from "../types";

// Lazy initialization to avoid top-level execution errors if environment is not ready
let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (aiClient) return aiClient;
  
  // Safely access process.env to prevent ReferenceError in browsers
  const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) || '';
  
  // Note: If apiKey is empty, GoogleGenAI might throw on request, not instantiation, 
  // or we can handle it here if needed.
  aiClient = new GoogleGenAI({ apiKey });
  return aiClient;
};

export const generateFundraisingInsights = async (apartments: Apartment[]) => {
  const ai = getAiClient();
  
  // Check if we effectively have an API key (mostly for dev/debug clarity)
  // The SDK usually handles auth errors, but we can fail fast if we know it's missing.
  if (typeof process !== 'undefined' && process.env?.API_KEY === undefined) {
    console.warn("API_KEY is missing in process.env");
  }

  // Prepare a lightweight summary to avoid token limits
  const summary = apartments.map(a => {
    let visitedCount = 0;
    let donatedCount = 0;
    let totalRooms = 0;

    Object.values(a.rooms).forEach(floorRooms => {
      floorRooms.forEach(r => {
        totalRooms++;
        if (r.status !== 'unvisited') visitedCount++;
        if (r.status === 'donated') donatedCount++;
      });
    });

    return {
      name: a.name,
      progress: `${visitedCount}/${totalRooms} visited`,
      donations: donatedCount
    };
  });

  const prompt = `
    You are an expert fundraising coach. Analyze this door-to-door campaign data:
    ${JSON.stringify(summary)}

    Provide a short, motivating 3-bullet point summary.
    1. Acknowledgment of progress.
    2. A strategic tip for the specific building with lowest performance.
    3. A motivational quote for the team.
    Keep it concise and professional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate insights.");
  }
};