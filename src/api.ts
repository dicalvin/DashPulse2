/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface KrakenTickerResponse {
  error: string[];
  result: {
    [pair: string]: {
      a: string[]; // ask
      b: string[]; // bid
      c: string[]; // last trade
      v: string[]; // volume
      p: string[]; // weighted avg price
      t: number[]; // number of trades
      l: string[]; // low
      h: string[]; // high
      o: string;   // opening price
    };
  };
}

export interface KrakenOHLCResponse {
  error: string[];
  result: {
    [pair: string]: any; // Use any or a more complex union to handle both history and 'last'
    last: number;
  };
}

export interface TechnicalIndicators {
  rsi: number;
  sma20: number;
  sma50: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  time: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface AnalysisReport {
  descriptive: string;
  diagnostic: string;
  predictive: string;
  prescriptive: string;
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
}

export interface DashData {
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  lastUpdate: Date;
  indicators: TechnicalIndicators;
}

export interface ChartPoint {
  time: number;
  price: number;
}

export interface ChartPoint {
  time: number;
  price: number;
}

const KRAKEN_BASE = 'https://api.kraken.com/0/public';
const PAIR = 'DASHUSD';

function calculateRSI(prices: number[], periods: number = 14): number {
  if (prices.length < periods + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = prices.length - periods; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const rs = gains / (losses || 1);
  return 100 - (100 / (1 + rs));
}

function calculateSMA(prices: number[], periods: number): number {
  if (prices.length < periods) return prices[prices.length - 1];
  const slice = prices.slice(-periods);
  return slice.reduce((a, b) => a + b, 0) / periods;
}

export async function fetchDashPrice(): Promise<DashData> {
  const [tickerRes, historyRes] = await Promise.all([
    fetch(`${KRAKEN_BASE}/Ticker?pair=${PAIR}`),
    fetch(`${KRAKEN_BASE}/OHLC?pair=${PAIR}&interval=60`)
  ]);

  if (!tickerRes.ok || !historyRes.ok) throw new Error('Failed to fetch data');
  
  const tickerData: KrakenTickerResponse = await tickerRes.json();
  const ohlcData: KrakenOHLCResponse = await historyRes.json();

  const stats = tickerData.result[PAIR] || tickerData.result[Object.keys(tickerData.result)[0]];
  const pairKey = Object.keys(ohlcData.result).find(key => key !== 'last') || PAIR;
  const history = ohlcData.result[pairKey] as (string | number)[][];
  const closePrices = history.map(h => parseFloat(h[4] as string));

  const currentPrice = parseFloat(stats.c[0]);
  const openPrice = parseFloat(stats.o);
  const change24h = currentPrice - openPrice;
  const changePercent24h = (change24h / openPrice) * 100;

  const rsi = calculateRSI(closePrices);
  const sma20 = calculateSMA(closePrices, 20);
  const sma50 = calculateSMA(closePrices, 50);

  let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  if (rsi < 30 || currentPrice > sma50) signal = 'BUY';
  else if (rsi > 70 || currentPrice < sma50) signal = 'SELL';

  return {
    price: currentPrice,
    change24h,
    changePercent24h,
    high24h: parseFloat(stats.h[1]),
    low24h: parseFloat(stats.l[1]),
    volume24h: parseFloat(stats.v[1]),
    lastUpdate: new Date(),
    indicators: { rsi, sma20, sma50, signal }
  };
}

export async function fetchNews(): Promise<NewsItem[]> {
  // Simulated news for DASH
  return [
    {
      id: '1',
      title: 'Dash Core Group Announces Network Upgrade',
      summary: 'The latest Dash platform update promises improved scalability and lower transaction fees for Masternodes.',
      source: 'CryptoGlobe',
      time: '2h ago',
      sentiment: 'positive'
    },
    {
      id: '2',
      title: 'Global Crypto Market Sees Volatility Amid Fed Comments',
      summary: 'Markets react as the Federal Reserve hints at potential rate adjustments in Q3.',
      source: 'MarketWatch',
      time: '5h ago',
      sentiment: 'neutral'
    },
    {
      id: '3',
      title: 'Privacy Coins Facing New Regulatory Scrutiny',
      summary: 'EU regulators propose new guidelines for privacy-enhanced assets, affecting Dash and Monero.',
      source: 'Coindesk',
      time: '8h ago',
      sentiment: 'negative'
    }
  ];
}

export async function fetchDashHistory(): Promise<ChartPoint[]> {
  // interval=60 (1 hour), interval=1440 (1 day)
  const response = await fetch(`${KRAKEN_BASE}/OHLC?pair=${PAIR}&interval=60`);
  if (!response.ok) throw new Error('Failed to fetch history from Kraken');
  
  const data: KrakenOHLCResponse = await response.json();
  if (data.error && data.error.length > 0) throw new Error(data.error[0]);

  const pairKey = Object.keys(data.result).find(key => key !== 'last') || PAIR;
  const history = data.result[pairKey];

  return history.map((item) => ({
    time: Number(item[0]) * 1000, // kraken returns seconds
    price: parseFloat(item[4] as string), // close price
  }));
}
