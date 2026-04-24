/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCcw, 
  Activity, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  Database,
  BarChart3,
  ExternalLink,
  BrainCircuit,
  Newspaper,
  ShieldAlert,
  Zap,
  ChevronRight,
  Sparkles,
  Info,
  CircleDot,
  MessageSquare,
  Wallet,
  BookOpen,
  Send,
  User,
  Bot,
  Scale,
  History,
  TrendingUpDown,
  MoveUpRight,
  MoveDownRight
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Toaster, toast } from 'react-hot-toast';
import { fetchDashPrice, fetchDashHistory, fetchNews, type DashData, type ChartPoint, type NewsItem, type AnalysisReport } from './api';
import { analyzeMarket, chatWithPulse } from './geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Custom Tooltip component for better Design
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#121214] border border-zinc-800 p-3 rounded-xl shadow-2xl backdrop-blur-xl">
        <p className="text-[10px] font-mono text-zinc-500 mb-1">{payload[0].payload.displayTime}</p>
        <p className="text-sm font-bold text-[#008CE7]">${payload[0].value.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

export default function App() {
  const [data, setData] = useState<DashData | null>(null);
  const [history, setHistory] = useState<ChartPoint[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'news' | 'simulator' | 'learn'>('overview');

  // Simulation State
  const [balance, setBalance] = useState(10000); // $10,000 baseline
  const [holdings, setHoldings] = useState(0); // DASH amount
  const [tradeHistory, setTradeHistory] = useState<{ id: string; type: 'BUY' | 'SELL'; price: number; amount: number; time: Date }[]>([]);

  // Chat State
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      const [priceData, historyData, newsData] = await Promise.all([
        fetchDashPrice(),
        fetchDashHistory(),
        fetchNews()
      ]);
      setData(priceData);
      setHistory(historyData);
      setNews(newsData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Network sync failed. Retrying nodes...');
    } finally {
      if (isInitial) setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const runAnalysis = async () => {
    if (!data || history.length === 0) return;
    setIsAnalyzing(true);
    try {
      const report = await analyzeMarket(data, history, news);
      setAnalysis(report);
      toast.success('Market Intelligence Updated', {
        style: { background: '#121214', color: '#fff', border: '1px solid #333' }
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTrade = (type: 'BUY' | 'SELL') => {
    if (!data) return;
    const currentPrice = data.price;
    
    if (type === 'BUY') {
      if (balance <= 0) return toast.error('Insufficient Credits');
      const amount = balance / currentPrice;
      setTradeHistory([{ id: Math.random().toString(36), type: 'BUY', price: currentPrice, amount, time: new Date() }, ...tradeHistory]);
      setHoldings(holdings + amount);
      setBalance(0);
      toast.success(`Purchased ${amount.toFixed(4)} DASH`);
    } else {
      if (holdings <= 0) return toast.error('No DASH detected in node');
      const totalReturn = holdings * currentPrice;
      setTradeHistory([{ id: Math.random().toString(36), type: 'SELL', price: currentPrice, amount: holdings, time: new Date() }, ...tradeHistory]);
      setBalance(totalReturn);
      setHoldings(0);
      toast.success(`Liquidated for $${totalReturn.toFixed(2)}`);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || !data) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatting(true);
    
    try {
      const resp = await chatWithPulse(userMsg, data, history);
      setMessages(prev => [...prev, { role: 'assistant', content: resp }]);
    } catch (e) {
      toast.error('AI Sync Interrupted');
    } finally {
      setIsChatting(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const chartData = useMemo(() => {
    return history.slice(-48).map(h => ({
      ...h,
      formattedTime: format(new Date(h.time), 'HH:mm'),
      displayTime: format(new Date(h.time), 'MMM d, HH:mm')
    }));
  }, [history]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-[#008CE7]/20 blur-[60px] animate-pulse" />
          <Activity className="w-16 h-16 text-[#008CE7] animate-pulse relative z-10" />
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 text-center"
        >
          <p className="text-zinc-600 font-mono tracking-widest uppercase text-[10px] mb-2">Syncing DASH/USD Network</p>
          <div className="w-48 h-[2px] bg-zinc-900 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[#008CE7]"
              animate={{ x: [-192, 192] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  const isPositive = (data?.changePercent24h ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-[#008CE7]/30 overflow-x-hidden">
      {/* Immersive Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#008CE7]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00FF9D]/3 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <Toaster position="top-right" />
      <header className="border-b border-zinc-800/30 bg-black/40 backdrop-blur-2xl sticky top-0 z-[60]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ rotate: 180 }}
              onClick={() => setActiveTab('overview')}
              className="w-10 h-10 cursor-pointer rounded-xl bg-gradient-to-br from-[#008CE7] to-[#015C9C] flex items-center justify-center shadow-lg shadow-[#008CE7]/20"
            >
              <Zap className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="font-black text-xl tracking-tighter uppercase italic">DashPulse<span className="text-[#008CE7] not-italic">.AI</span></h1>
              <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-500 uppercase tracking-widest leading-none">
                Autonomous Intelligence Platform v4
              </div>
            </div>
          </div>
          
          <nav className="hidden lg:flex items-center gap-2 bg-zinc-900/50 border border-zinc-800/50 p-1 rounded-xl">
            {(['overview', 'analysis', 'news', 'simulator', 'learn'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] transition-all",
                  activeTab === tab ? "bg-[#008CE7] text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 border border-zinc-800/50 rounded-xl bg-zinc-900/30">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-mono text-zinc-500 leading-none mb-1 uppercase tracking-tighter">Live Feed</span>
                <span className="text-xs font-bold text-emerald-400 tabular-nums">1.2ms</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <button 
              onClick={() => fetchData()}
              disabled={isRefreshing}
              className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors disabled:opacity-50 group"
            >
              <RefreshCcw className={cn("w-5 h-5 text-zinc-400 transition-transform group-active:rotate-180", isRefreshing && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Market Hero Card */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 group relative">
                  <div className="absolute inset-0 bg-[#008CE7]/5 blur-[80px] rounded-[2rem] transition-opacity group-hover:opacity-100 opacity-50" />
                  <div className="relative bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2rem] p-8 sm:p-12 shadow-3xl overflow-hidden min-h-[400px] flex flex-col justify-between">
                    <div className="space-y-8">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="px-3 py-1 bg-zinc-800/80 rounded-full border border-zinc-700/50 text-[10px] font-mono tracking-widest text-[#008CE7] uppercase">Current Exchange Index</div>
                          </div>
                          <motion.h2 
                            key={data?.price}
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-6xl sm:text-8xl font-black tracking-tighter tabular-nums leading-none"
                          >
                            ${data?.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="text-zinc-700 text-3xl ml-4 font-medium uppercase tracking-widest">USD</span>
                          </motion.h2>
                        </div>
                        <div className={cn(
                          "px-6 py-3 rounded-2xl border-2 font-black text-lg flex items-center gap-2 shadow-2xl backdrop-blur-md",
                          isPositive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
                        )}>
                          {isPositive ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                          {isPositive ? '+' : ''}{data?.changePercent24h.toFixed(2)}%
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
                        <div className="space-y-1">
                          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">24h Peak</p>
                          <p className="text-xl font-bold text-emerald-400 tabular-nums">${data?.high24h.toFixed(2)}</p>
                          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500/50 w-[70%]" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">24h Floor</p>
                          <p className="text-xl font-bold text-red-400 tabular-nums">${data?.low24h.toFixed(2)}</p>
                          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500/50 w-[30%]" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">RSI (14)</p>
                          <p className="text-xl font-bold tabular-nums text-[#00FF9D]">{data?.indicators.rsi.toFixed(1)}</p>
                          <p className="text-[9px] text-zinc-600 font-mono italic">
                            {data && data.indicators.rsi > 70 ? 'OVERBOUGHT' : data && data.indicators.rsi < 30 ? 'OVERSOLD' : 'NEUTRAL'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Market Cap Vol</p>
                          <p className="text-xl font-bold tabular-nums">${( (data?.volume24h ?? 0) * (data?.price ?? 0) ).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                          <p className="text-[9px] font-mono text-zinc-600 mt-1 uppercase">24h USD equivalent</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                  {/* Automated Signal Card */}
                  <div className="bg-zinc-900 shadow-2xl border border-zinc-800 rounded-[2rem] p-8 flex flex-col justify-between h-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <ShieldAlert className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-8">
                        <Zap className="w-5 h-5 text-[#00FF9D]" />
                        <h3 className="text-xs font-mono font-black uppercase tracking-[0.2em] text-[#00FF9D]">Market Pulse Signal</h3>
                      </div>
                      
                      <div className="space-y-2">
                        <span className="text-zinc-500 text-[10px] font-mono uppercase">Calculated Status</span>
                        <div className={cn(
                          "text-5xl font-black italic tracking-tighter",
                          data?.indicators.signal === 'BUY' ? "text-emerald-400" : data?.indicators.signal === 'SELL' ? "text-red-400" : "text-zinc-300"
                        )}>
                          {data?.indicators.signal}
                        </div>
                        <p className="text-sm text-zinc-400 leading-relaxed max-w-[200px]">
                          Node suggests {data?.indicators.signal.toLowerCase()} based on RSI and moving average crossover analysis.
                        </p>
                      </div>
                    </div>

                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setActiveTab('analysis'); runAnalysis(); }}
                      className="mt-12 w-full py-4 bg-[#008CE7] hover:bg-[#007AC9] text-white rounded-2xl font-bold shadow-xl shadow-[#008CE7]/20 flex items-center justify-center gap-3 transition-colors"
                    >
                      <BrainCircuit className="w-5 h-5" />
                      Run AI Analysis
                    </motion.button>
                  </div>
                </div>
              </section>

              {/* Chart & Analysis Section */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-[#0A0A0A] border border-zinc-800 rounded-[2rem] overflow-hidden group">
                  <div className="p-8 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center group-hover:bg-[#008CE7]/20 transition-colors">
                        <BarChart3 className="w-5 h-5 text-[#008CE7]" />
                      </div>
                      <div>
                        <h3 className="font-black text-sm uppercase tracking-wider">Historical Vector</h3>
                        <p className="text-[10px] font-mono text-zinc-500">48H OHLC SNAPSHOT</p>
                      </div>
                    </div>
                    <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                      <button className="px-3 py-1 text-[10px] font-bold text-white bg-zinc-800 rounded-md">24H</button>
                      <button className="px-3 py-1 text-[10px] font-bold text-zinc-500 hover:text-zinc-300">48H</button>
                    </div>
                  </div>
                  
                  <div className="h-[450px] w-full p-8 pt-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#008CE7" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#008CE7" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" vertical={false} />
                        <XAxis 
                          dataKey="formattedTime" 
                          stroke="#333" 
                          fontSize={10} 
                          tickLine={false}
                          axisLine={false}
                          minTickGap={60}
                        />
                        <YAxis 
                          stroke="#333" 
                          fontSize={10} 
                          tickLine={false}
                          axisLine={false}
                          domain={['auto', 'auto']}
                          tickFormatter={(val) => `$${val}`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                          type="monotone" 
                          dataKey="price" 
                          stroke="#008CE7" 
                          strokeWidth={4}
                          fillOpacity={1} 
                          fill="url(#colorPrice)" 
                          animationDuration={2000}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Vertical Info / Analysis Meta */}
                <div className="space-y-6">
                  <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 backdrop-blur-md">
                    <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-6 flex items-center gap-2">
                       <Zap className="w-3 h-3" /> Technical Analysis
                    </h4>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-zinc-800/30">
                        <span className="text-zinc-400 text-xs">SMA (20)</span>
                        <span className="font-bold tabular-nums text-emerald-400">${data?.indicators.sma20.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-zinc-800/30">
                        <span className="text-zinc-400 text-xs">SMA (50)</span>
                        <span className="font-bold tabular-nums text-red-500">${data?.indicators.sma50.toFixed(2)}</span>
                      </div>
                      <div className="p-4 bg-[#008CE7]/5 rounded-2xl border border-[#008CE7]/20 flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-[#008CE7]" />
                        <span className="text-[11px] leading-relaxed text-zinc-300">
                          Price is trading {data && data.price > data.indicators.sma20 ? 'above' : 'below'} the 20-period moving average. 
                          {data && data.price > data.indicators.sma50 ? ' Upward momentum confirmed.' : ' Bearish trend localized.'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl p-8">
                     <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-4">Network Logistics</p>
                     <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                           <Database className="w-3 h-3" />
                           Node Authority: Kraken L2
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                           <Activity className="w-3 h-3" />
                           Uptime: 99.99% Virtualized
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                           <Clock className="w-3 h-3" />
                           Precision: 0.00000001 DASH
                        </div>
                     </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'analysis' && (
            <motion.div 
              key="analysis"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-8 max-w-4xl mx-auto"
            >
              <div className="text-center space-y-4 mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#008CE7]/10 border border-[#008CE7]/20">
                  <BrainCircuit className="w-4 h-4 text-[#008CE7]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#008CE7]">Neural Analysis Engine</span>
                </div>
                <h2 className="text-4xl font-black italic tracking-tighter">Market Intelligence Report</h2>
                <p className="text-zinc-500 max-w-lg mx-auto leading-relaxed">
                  Deep learning synthesis of technical indicators, historical vectors, and global sentiment.
                </p>
              </div>

              {!analysis && !isAnalyzing && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-12 text-center space-y-8">
                  <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto">
                    <Activity className="w-10 h-10 text-zinc-600" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Analysis Engine Offline</h3>
                    <p className="text-zinc-500 text-sm">Synchronize market data and trigger a new analysis sequence.</p>
                  </div>
                  <button 
                    onClick={runAnalysis}
                    className="px-10 py-5 bg-[#008CE7] text-white rounded-2xl font-bold shadow-2xl shadow-[#008CE7]/30 hover:bg-[#007AC9] transition-all"
                  >
                    Generate Pulse Report
                  </button>
                </div>
              )}

              {isAnalyzing && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-20 text-center space-y-6">
                  <div className="relative w-24 h-24 mx-auto mb-12">
                    <div className="absolute inset-0 border-4 border-[#008CE7]/20 rounded-full" />
                    <motion.div 
                      className="absolute inset-0 border-4 border-t-[#008CE7] rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    />
                    <BrainCircuit className="w-10 h-10 absolute inset-0 m-auto text-[#008CE7] animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-zinc-300 font-bold text-lg">Thinking...</p>
                    <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-widest animate-pulse">Running Diagnostic Scenarios</p>
                  </div>
                </div>
              )}

              {analysis && (
                <div className="grid grid-cols-1 gap-6">
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 space-y-4">
                      <div className="flex items-center gap-2 text-[#008CE7]">
                        <Info className="w-4 h-4" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest">Descriptive</h3>
                      </div>
                      <p className="text-zinc-300 leading-relaxed text-sm">{analysis.descriptive}</p>
                    </div>
                    <div className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 space-y-4">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Activity className="w-4 h-4" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest">Diagnostic</h3>
                      </div>
                      <p className="text-zinc-300 leading-relaxed text-sm">{analysis.diagnostic}</p>
                    </div>
                  </section>

                  <div className="bg-gradient-to-br from-[#008CE7]/20 to-black p-10 rounded-[2.5rem] border border-[#008CE7]/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                       <Sparkles className="w-40 h-40" />
                    </div>
                    <div className="flex items-center gap-4 mb-8">
                       <Zap className="w-8 h-8 text-[#008CE7]" />
                       <div>
                         <h3 className="text-xs font-black uppercase tracking-[0.3em] text-[#008CE7]">Master Recommendation</h3>
                         <div className="text-4xl font-black italic tracking-tighter italic text-white uppercase">{analysis.recommendation.replace('_', ' ')}</div>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t border-white/5 pt-10">
                      <div className="space-y-4">
                        <h4 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                           <Clock className="w-3 h-3 text-[#00FF9D]" /> Predictive Vector
                        </h4>
                        <p className="text-white text-sm leading-relaxed">{analysis.predictive}</p>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                           <ShieldAlert className="w-3 h-3 text-red-500" /> Prescriptive Action
                        </h4>
                        <p className="text-white text-sm leading-relaxed">{analysis.prescriptive}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'news' && (
            <motion.div 
              key="news"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto space-y-6"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black italic tracking-tight uppercase">Intelligence Feed</h2>
                  <p className="text-zinc-500 text-sm">Global market signals and DASH ecosystem sensory data.</p>
                </div>
                <Newspaper className="w-10 h-10 text-zinc-800" />
              </div>
              
              <div className="space-y-4">
                {news.map((item, idx) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-zinc-900/40 hover:bg-zinc-900/60 transition-all border border-zinc-800 rounded-3xl p-8 group cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-3">
                         <div className={cn(
                           "w-2 h-2 rounded-full",
                           item.sentiment === 'positive' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 
                           item.sentiment === 'negative' ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-zinc-500'
                         )} />
                         <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{item.source} • {item.time}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-[#008CE7] transition-colors" />
                    </div>
                    <h3 className="text-xl font-bold group-hover:text-white transition-colors mb-3 leading-tight uppercase italic">{item.title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">{item.summary}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'simulator' && (
            <motion.div
              key="simulator"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-6xl mx-auto space-y-8"
            >
               <div className="flex items-center justify-between border-b border-zinc-800 pb-8">
                  <div className="space-y-2">
                     <h2 className="text-4xl font-black italic tracking-tighter uppercase">Paper Trading Terminal</h2>
                     <p className="text-zinc-500 text-sm">Risk-free execution environment using real-time market nodes.</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[11px] font-mono text-zinc-600 uppercase tracking-[0.2em] mb-2">Available USD Credits</p>
                     <div className="text-4xl font-black text-[#008CE7] tabular-nums">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-4 space-y-6">
                     <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] space-y-8">
                        <div className="space-y-4">
                           <h3 className="text-xs font-black uppercase text-zinc-500 tracking-[0.2em] mb-4">Market Execution</h3>
                           <div className="space-y-2">
                              <div className="flex justify-between text-xs mb-1">
                                 <span className="text-zinc-500">Asset</span>
                                 <span className="text-white">DASH / USD</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                 <span className="text-zinc-500">Node Price</span>
                                 <span className="text-white font-mono">${data?.price.toFixed(4)}</span>
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <button 
                             onClick={() => handleTrade('BUY')}
                             className="py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl font-black italic hover:bg-emerald-500 hover:text-white transition-all uppercase"
                           >
                             BUY DASH
                           </button>
                           <button 
                             onClick={() => handleTrade('SELL')}
                             className="py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-black italic hover:bg-red-500 hover:text-white transition-all uppercase"
                           >
                             SELL DASH
                           </button>
                        </div>

                        <div className="p-4 bg-zinc-800/50 rounded-2xl space-y-4 border border-zinc-800/50">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                                 <Wallet className="w-4 h-4 text-[#008CE7]" />
                              </div>
                              <div>
                                 <p className="text-[10px] text-zinc-500 uppercase font-mono leading-none mb-1">Portfolio Position</p>
                                 <p className="text-sm font-bold text-white italic">{holdings.toFixed(4)} DASH</p>
                              </div>
                           </div>
                           <div className="flex justify-between items-center text-xs">
                              <span className="text-zinc-500">Current Value</span>
                              <span className="text-white font-bold">${((data?.price ?? 0) * holdings).toFixed(2)}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="lg:col-span-8">
                     <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden">
                        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-3">
                           <History className="w-5 h-5 text-zinc-500" />
                           <h3 className="text-xs font-black uppercase tracking-widest">Global Order History</h3>
                        </div>
                        <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
                           {tradeHistory.length === 0 ? (
                              <div className="p-20 text-center space-y-4">
                                 <CircleDot className="w-12 h-12 text-zinc-800 mx-auto animate-pulse" />
                                 <p className="text-zinc-600 text-sm font-mono tracking-widest uppercase">No verified transactions locally stored</p>
                              </div>
                           ) : tradeHistory.map((trade) => (
                              <div key={trade.id} className="p-6 flex items-center justify-between group hover:bg-white/5 transition-colors">
                                 <div className="flex items-center gap-6">
                                    <div className={cn(
                                       "w-12 h-12 rounded-xl flex items-center justify-center font-black",
                                       trade.type === 'BUY' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                                    )}>
                                       {trade.type[0]}
                                    </div>
                                    <div>
                                       <p className="font-bold text-sm tracking-tight">{trade.type} {trade.amount.toFixed(4)} DASH</p>
                                       <p className="text-[10px] font-mono text-zinc-500 uppercase">{format(trade.time, 'HH:mm:ss MMM d')}</p>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-sm font-mono text-zinc-300 font-bold italic">${trade.price.toFixed(2)}</p>
                                    <p className="text-[9px] text-zinc-600 font-mono uppercase">Avg Execution Price</p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeTab === 'learn' && (
            <motion.div
              key="learn"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-5xl mx-auto space-y-12"
            >
               <div className="text-center space-y-4 max-w-xl mx-auto">
                  <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                     <BookOpen className="w-10 h-10 text-[#008CE7]" />
                  </div>
                  <h2 className="text-5xl font-black italic tracking-tighter uppercase">Trading Academy</h2>
                  <p className="text-zinc-500 leading-relaxed italic">Master technical analysis and DASH ecosystem dynamics.</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { title: 'The RSI Factor', desc: 'Understanding relative strength for extreme market conditions.', icon: MoveUpRight },
                    { title: 'MA Crossovers', desc: 'Leveraging SMA20/50 for directional confirmation.', icon: Scale },
                    { title: 'Dash Platform', desc: 'How Masternodes and Proof of Service shake the network.', icon: Database },
                    { title: 'Volatility Index', desc:'Calculating risk reward ratios in 30-day windows.', icon: TrendingUpDown },
                    { title: 'Sentiment Logic', desc: 'Translating global news into tradeable directional bias.', icon: Newspaper },
                    { title: 'Pulse Protocols', desc: 'Using AI to filter systemic noise from true patterns.', icon: Sparkles }
                  ].map((card, i) => (
                    <motion.div 
                      key={card.title} 
                      whileHover={{ y: -10 }}
                      className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] group cursor-pointer hover:border-[#008CE7]/40 transition-all shadow-2xl"
                    >
                      <div className="w-12 h-12 bg-black/40 rounded-2xl flex items-center justify-center mb-6 text-[#008CE7] group-hover:scale-110 transition-transform">
                        <card.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-black italic uppercase tracking-tight mb-3">{card.title}</h3>
                      <p className="text-zinc-500 text-sm leading-relaxed">{card.desc}</p>
                    </motion.div>
                  ))}
               </div>

               <div className="bg-[#008CE7]/5 rounded-[3rem] p-12 border border-[#008CE7]/20 flex flex-col md:flex-row items-center gap-10">
                  <div className="flex-1 space-y-6">
                     <h3 className="text-3xl font-black italic uppercase tracking-tight">Need a Personalized Strategy?</h3>
                     <p className="text-zinc-400 leading-relaxed italic">Our AI model can help you build custom trading models based on your risk profile and market conditions.</p>
                     <button 
                       onClick={() => setIsChatOpen(true)}
                       className="px-8 py-4 bg-[#008CE7] rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center gap-3"
                     >
                       <MessageSquare className="w-4 h-4" /> Start AI Consult
                     </button>
                  </div>
                  <div className="w-full md:w-[300px] aspect-square relative">
                     <div className="absolute inset-0 bg-[#008CE7]/10 blur-[80px] rounded-full animate-pulse" />
                     <BrainCircuit className="w-full h-full text-[#008CE7] relative z-10" />
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Chat / AI Assistant */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-20 right-6 w-[400px] h-[600px] max-w-[calc(100vw-48px)] bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col z-[100] overflow-hidden"
          >
             <header className="p-6 bg-black/40 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#008CE7] to-[#015C9C] flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                   </div>
                   <div>
                      <h4 className="font-black italic uppercase tracking-tighter leading-none">DashPulse.GPT</h4>
                      <div className="flex items-center gap-2 mt-1">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                         <span className="text-[10px] uppercase font-mono text-zinc-500 tracking-widest">Thinking Node Active</span>
                      </div>
                   </div>
                </div>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 transition-colors"
                >
                   <ChevronRight className="w-5 h-5 rotate-90" />
                </button>
             </header>

             <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                     <Bot className="w-12 h-12 text-zinc-800" />
                     <div className="space-y-2">
                        <p className="text-zinc-200 font-bold italic">Node Synced & Waiting</p>
                        <p className="text-zinc-600 text-[10px] uppercase tracking-widest max-w-[200px]">Ask me about current price vectors, entry signals, or network news.</p>
                     </div>
                  </div>
                ) : messages.map((m, i) => (
                  <div key={i} className={cn(
                    "flex gap-4",
                    m.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}>
                     <div className={cn(
                       "w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0",
                       m.role === 'user' ? "bg-zinc-800" : "bg-[#008CE7]"
                     )}>
                        {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                     </div>
                     <div className={cn(
                       "p-4 rounded-2xl text-xs leading-relaxed max-w-[80%]",
                       m.role === 'user' ? "bg-zinc-800 text-white" : "bg-zinc-100 text-zinc-900 font-medium"
                     )}>
                        {m.content}
                     </div>
                  </div>
                ))}
                {isChatting && (
                  <div className="flex gap-4">
                     <div className="w-8 h-8 rounded-lg bg-[#008CE7] flex items-center justify-center text-white shrink-0">
                        <Bot className="w-4 h-4" />
                     </div>
                     <div className="bg-zinc-100 p-4 rounded-2xl flex gap-1">
                        <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                     </div>
                  </div>
                )}
             </div>

             <div className="p-6 border-t border-zinc-800 bg-black/20">
                <div className="relative group">
                   <input 
                     type="text" 
                     value={chatInput}
                     onChange={(e) => setChatInput(e.target.value)}
                     onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                     placeholder="Query the node..."
                     className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-6 pr-14 text-sm focus:outline-none focus:border-[#008CE7] focus:ring-1 focus:ring-[#008CE7]/50 transition-all placeholder:text-zinc-700"
                   />
                   <button 
                     onClick={handleChat}
                     disabled={isChatting || !chatInput.trim()}
                     className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-[#008CE7] hover:bg-[#007AC9] text-white rounded-xl disabled:opacity-50 transition-colors"
                   >
                     <Send className="w-5 h-5" />
                   </button>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsChatOpen(true)}
        className={cn(
          "fixed bottom-24 right-6 w-14 h-14 rounded-2xl bg-[#008CE7] shadow-2xl shadow-[#008CE7]/40 flex items-center justify-center transition-all hover:scale-110 z-[50]",
          isChatOpen && "scale-0 opacity-0"
        )}
      >
        <MessageSquare className="w-7 h-7 text-white" />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#050505]" />
      </button>

      {/* Ticker / Status Bar */}
      <footer className="fixed bottom-0 w-full bg-black/80 backdrop-blur-md border-t border-zinc-800/50 py-4 px-6 text-[10px] font-mono tracking-widest text-zinc-600 relative z-[60]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
           <div className="flex items-center gap-6 overflow-hidden">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <CircleDot className="w-3 h-3 text-[#00FF9D] animate-pulse" />
                DASH PROBE ACTIVE
              </div>
              <div className="hidden sm:flex items-center gap-2 whitespace-nowrap text-zinc-700 uppercase">
                | SESSION CORE: {format(new Date(), 'yyyyMMdd.HHmmss')}
              </div>
              <div className="hidden lg:flex items-center gap-2 whitespace-nowrap text-zinc-700">
                | POWERED BY CDR TECHNOLOGIES
              </div>
           </div>
           <div className="flex items-center gap-3">
              <span className="text-[#008CE7] font-black italic uppercase tracking-tighter">DashPulse AI Infrastructure v4.2.1</span>
           </div>
        </div>
      </footer>
    </div>
  );
}
