/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { type DashData, type AnalysisReport, type NewsItem, type ChartPoint } from "./api";

let genAI: GoogleGenAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export async function analyzeMarket(
  data: DashData, 
  history: ChartPoint[], 
  news: NewsItem[]
): Promise<AnalysisReport> {
  const prompt = `
    Analyze the following market data for DASH/USD and provide a comprehensive financial report in JSON format.
    
    Current Data:
    - Price: $${data.price}
    - 24h Change: ${data.changePercent24h.toFixed(2)}%
    - RSI (14): ${data.indicators.rsi.toFixed(2)}
    - SMA (20): $${data.indicators.sma20.toFixed(2)}
    - SMA (50): $${data.indicators.sma50.toFixed(2)}
    - Technical Signal: ${data.indicators.signal}
    
    Recent History (Last 5 points):
    ${history.slice(-5).map(h => `$${h.price}`).join(', ')}
    
    Recent News:
    ${news.map(n => `- ${n.title} (Sentiment: ${n.sentiment})`).join('\n')}
    
    Your report must include:
    1. Descriptive Analysis: A summary of the current market state.
    2. Diagnostic Analysis: Explaining WHY the market is moving this way based on technicals and news.
    3. Predictive Analysis: How the market is expected to move in the next 24-48 hours.
    4. Prescriptive Analysis: Specific trading recommendations, including entry price zones, take profit levels, and stop loss suggestions.
    5. Final Recommendation: One of STRONG_BUY, BUY, HOLD, SELL, STRONG_SELL.
  `;

  try {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            descriptive: { type: Type.STRING },
            diagnostic: { type: Type.STRING },
            predictive: { type: Type.STRING },
            prescriptive: { type: Type.STRING },
            recommendation: { 
              type: Type.STRING,
              enum: ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL']
            },
          },
          required: ["descriptive", "diagnostic", "predictive", "prescriptive", "recommendation"]
        }
      }
    });

    const report = JSON.parse(response.text);
    return report as AnalysisReport;
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return {
      descriptive: "Current market shows moderate volatility. Price is stabilizing near support levels.",
      diagnostic: "Movement driven by standard crypto market trends and technical RSI levels.",
      predictive: "Expect consolidation in the current range unless a major volume break occurs.",
      prescriptive: "Maintain current positions. Buy entry recommended near $${(data.price * 0.98).toFixed(2)}. Sell target around $${(data.price * 1.05).toFixed(2)}.",
      recommendation: data.indicators.signal === 'BUY' ? 'BUY' : 'HOLD'
    };
  }
}

export async function chatWithPulse(
  message: string,
  marketData: DashData,
  history: any[]
): Promise<string> {
  const prompt = `
    You are DashPulse AI, a professional trading assistant for DASH/USD.
    Current Price: $${marketData.price}
    RSI: ${marketData.indicators.rsi.toFixed(2)}
    Signal: ${marketData.indicators.signal}
    
    User Query: "${message}"
    
    Provide a concise, professional, and data-driven response. If they ask about buying or selling, give specific reasoning based on the current metrics. Be friendly but maintain high technical authority. Don't mention you are an AI.
  `;

  try {
    const ai = getGenAI();
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return result.text;
  } catch (error) {
    return "Node communication error. Please try again shortly.";
  }
}
