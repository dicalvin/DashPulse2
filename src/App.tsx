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
  X,
  Menu,
  LogOut,
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
import { supabase } from './supabase';
import Auth from './components/Auth';
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
  const [session, setSession] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUserLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

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

  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');

  const handleTrade = (type: 'BUY' | 'SELL', customAmount?: number) => {
    if (!data) return;
    const currentPrice = data.price;
    
    if (type === 'BUY') {
      const spendAmount = customAmount || parseFloat(buyAmount);
      if (!spendAmount || spendAmount <= 0) return toast.error('Enter valid USDT amount');
      if (spendAmount > balance) return toast.error('Insufficient Credits');
      
      const dashAmount = spendAmount / currentPrice;
      setTradeHistory([{ id: Math.random().toString(36), type: 'BUY', price: currentPrice, amount: dashAmount, time: new Date() }, ...tradeHistory]);
      setHoldings(prev => prev + dashAmount);
      setBalance(prev => prev - spendAmount);
      setBuyAmount('');
      toast.success(`Executed BUY for ${dashAmount.toFixed(4)} DASH`);
    } else {
      const dashToSell = customAmount || parseFloat(sellAmount);
      if (!dashToSell || dashToSell <= 0) return toast.error('Enter valid DASH amount');
      if (dashToSell > holdings) return toast.error('Insufficient DASH holdings');
      
      const returnUsdt = dashToSell * currentPrice;
      setTradeHistory([{ id: Math.random().toString(36), type: 'SELL', price: currentPrice, amount: dashToSell, time: new Date() }, ...tradeHistory]);
      setBalance(prev => prev + returnUsdt);
      setHoldings(prev => prev - dashToSell);
      setSellAmount('');
      toast.success(`Executed SELL for $${returnUsdt.toFixed(2)}`);
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

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Activity className="w-10 h-10 text-[#008CE7] animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

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
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-red-500/10 hover:border-red-500/30 text-zinc-500 hover:text-red-400 transition-all"
              title="Logout Node"
            >
              <LogOut className="w-5 h-5" />
            </button>
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

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="fixed inset-0 z-[70] lg:hidden"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
            <motion.div className="absolute top-0 left-0 bottom-0 w-72 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col shadow-2xl">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-[#008CE7]" />
                  <span className="font-black italic uppercase tracking-tighter">DashPulse</span>
                </div>
                <button onClick={() => setIsMenuOpen(false)}>
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>
              <nav className="flex flex-col gap-2">
                {(['overview', 'analysis', 'news', 'simulator', 'learn'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setIsMenuOpen(false); }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                      activeTab === tab ? "bg-[#008CE7] text-white shadow-lg" : "text-zinc-500 hover:bg-zinc-800/50"
                    )}
                  >
                    {tab === 'overview' && <Activity className="w-4 h-4" />}
                    {tab === 'analysis' && <BrainCircuit className="w-4 h-4" />}
                    {tab === 'news' && <Newspaper className="w-4 h-4" />}
                    {tab === 'simulator' && <TrendingUpDown className="w-4 h-4" />}
                    {tab === 'learn' && <BookOpen className="w-4 h-4" />}
                    {tab}
                  </button>
                ))}
              </nav>
              <div className="mt-auto pt-6 border-t border-zinc-800">
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="w-full flex items-center gap-3 px-4 py-4 text-red-500 font-bold text-[10px] uppercase tracking-[0.2em]"
                >
                  <LogOut className="w-4 h-4" /> Sign Out Node
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-[calc(100vh-140px)] -mt-10 -mx-6 lg:-mx-12 flex flex-col lg:flex-row bg-[#0b0e11] text-[#eaecef]"
            >
              {/* Left Sidebar: Order Book (Simulated) */}
              <div className="w-full lg:w-64 border-r border-zinc-800 flex flex-col shrink-0">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Order Book</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-sm bg-emerald-500 opacity-50" />
                    <div className="w-2 h-2 rounded-sm bg-red-500 opacity-50" />
                  </div>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col">
                  {/* Sells */}
                  <div className="flex-1 px-4 py-2 space-y-0.5 overflow-hidden font-mono text-[10px]">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="flex justify-between relative">
                        <span className="text-[#f6465d] relative z-10">{(data?.price ?? 0 + (i * 0.05)).toFixed(2)}</span>
                        <span className="text-[#eaecef] relative z-10">{(Math.random() * 50).toFixed(2)}</span>
                        <div className="absolute right-0 top-0 bottom-0 bg-[#f6465d]/10" style={{ width: `${Math.random() * 80}%` }} />
                      </div>
                    ))}
                  </div>
                  {/* Current Price */}
                  <div className="px-4 py-3 bg-zinc-900 flex flex-col items-center justify-center border-y border-zinc-800">
                    <span className={cn("text-lg font-black italic", isPositive ? "text-[#0ecb81]" : "text-[#f6465d]")}>
                      ${data?.price.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-zinc-500">Last Node Update</span>
                  </div>
                  {/* Buys */}
                  <div className="flex-1 px-4 py-2 space-y-0.5 overflow-hidden font-mono text-[10px]">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="flex justify-between relative">
                        <span className="text-[#0ecb81] relative z-10">{(data?.price ?? 0 - (i * 0.05)).toFixed(2)}</span>
                        <span className="text-[#eaecef] relative z-10">{(Math.random() * 50).toFixed(2)}</span>
                        <div className="absolute left-0 top-0 bottom-0 bg-[#0ecb81]/10" style={{ width: `${Math.random() * 80}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Content: Chart + History */}
              <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <div className="flex-1 min-h-[300px] border-b border-zinc-800 p-4">
                  <div className="flex items-center gap-6 mb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">DASH/USDT</span>
                      <span className="text-lg font-black text-[#fcd535] italic">DASHPROBE.LIVE</span>
                    </div>
                    <div className="flex gap-6">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-500 uppercase">24h Change</span>
                        <span className={cn("text-xs font-bold", isPositive ? "text-[#0ecb81]" : "text-[#f6465d]")}>
                          {isPositive ? '+' : ''}{data?.changePercent24h.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-500 uppercase">24h High</span>
                        <span className="text-xs font-bold">{(data?.price ?? 0 * 1.05).toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-zinc-500 uppercase">24h Low</span>
                        <span className="text-xs font-bold">{(data?.price ?? 0 * 0.95).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Reuse Chart with more technical style */}
                  <div className="h-[calc(100%-60px)]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history}>
                        <defs>
                          <linearGradient id="binanceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fcd535" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#fcd535" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="displayTime" 
                          stroke="#474d57" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          interval={Math.floor(history.length / 6)}
                        />
                        <YAxis 
                          domain={['auto', 'auto']} 
                          orientation="right"
                          stroke="#474d57" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(val) => val.toFixed(2)}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e2329', border: 'none', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                          itemStyle={{ color: '#eaecef', fontSize: '11px', fontWeight: 'bold' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="price" 
                          stroke="#fcd535" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#binanceGradient)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Account & History */}
                <div className="h-64 flex flex-col p-4 bg-[#161a1e]">
                  <div className="flex items-center gap-4 border-b border-zinc-800 pb-2 mb-4">
                     <button className="text-xs font-bold text-[#fcd535] border-b-2 border-[#fcd535] pb-2">Order History</button>
                     <button className="text-xs font-bold text-zinc-500 pb-2">Trade History</button>
                     <button className="text-xs font-bold text-zinc-500 pb-2">Funds</button>
                  </div>
                  <div className="flex-1 overflow-auto scrollbar-thin">
                    <table className="w-full text-[10px] font-mono">
                       <thead className="sticky top-0 bg-[#161a1e] text-zinc-500 uppercase">
                          <tr>
                             <th className="text-left pb-2">Time</th>
                             <th className="text-left pb-2">Type</th>
                             <th className="text-right pb-2">Price</th>
                             <th className="text-right pb-2">Amount</th>
                             <th className="text-right pb-2">Total</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-zinc-800/30">
                          {tradeHistory.map((trade) => (
                             <tr key={trade.id} className="hover:bg-white/5">
                                <td className="py-2 text-zinc-500">{format(trade.time, 'MM-dd HH:mm:ss')}</td>
                                <td className={cn("py-2 font-bold", trade.type === 'BUY' ? "text-[#0ecb81]" : "text-[#f6465d]")}>{trade.type}</td>
                                <td className="py-2 text-right">${trade.price.toFixed(2)}</td>
                                <td className="py-2 text-right">{trade.amount.toFixed(4)} DASH</td>
                                <td className="py-2 text-right">${(trade.price * trade.amount).toFixed(2)}</td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Sidebar: Execution Panel */}
              <div className="w-full lg:w-80 border-l border-zinc-800 p-6 flex flex-col gap-6 shrink-0 bg-[#1e2329]">
                 <div className="flex border-b border-zinc-800 pb-2 gap-4">
                    <button className="text-xs font-bold text-[#fcd535] border-b-2 border-[#fcd535] pb-2">Market</button>
                    <button className="text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors">Limit</button>
                    <button className="text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors">Stop-limit</button>
                 </div>

                 <div className="space-y-4">
                    <div className="flex justify-between text-[11px]">
                       <span className="text-zinc-500">Available</span>
                       <span className="text-white font-bold">{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT</span>
                    </div>

                    <div className="space-y-3">
                       <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-500">Price</span>
                          <input 
                            readOnly 
                            value={data?.price.toFixed(2)}
                            className="w-full bg-[#2b3139] border border-transparent rounded h-10 px-12 text-right text-sm font-bold text-zinc-400 focus:border-[#fcd535] outline-none" 
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-300">USDT</span>
                       </div>

                       <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-500">Spend</span>
                          <input 
                            type="number"
                            value={buyAmount}
                            onChange={(e) => setBuyAmount(e.target.value)}
                            placeholder="Amount in USDT"
                            className="w-full bg-[#2b3139] border border-zinc-700/50 rounded h-10 px-12 text-right text-sm font-bold text-white focus:border-[#fcd535] outline-none transition-all" 
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-300">USDT</span>
                       </div>

                       <div className="grid grid-cols-4 gap-1">
                          {[25, 50, 75, 100].map(p => (
                             <button 
                               key={p}
                               onClick={() => setBuyAmount((balance * (p/100)).toFixed(2))}
                               className="py-1.5 bg-[#2b3139] hover:bg-[#3b4149] rounded text-[9px] font-bold text-zinc-400 transition-colors"
                             >
                               {p}%
                             </button>
                          ))}
                       </div>

                       <button 
                         onClick={() => handleTrade('BUY')}
                         className="w-full py-3 bg-[#0ecb81] hover:bg-[#0bbd77] text-[#0b0e11] font-black text-xs uppercase transition-all active:scale-[0.98] mt-2 rounded"
                       >
                         Buy DASH
                       </button>
                    </div>
                 </div>

                 <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <div className="flex justify-between text-[11px]">
                       <span className="text-zinc-500">Available</span>
                       <span className="text-white font-bold">{holdings.toFixed(4)} DASH</span>
                    </div>

                    <div className="space-y-3">
                       <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-500">Price</span>
                          <input 
                            readOnly 
                            value={data?.price.toFixed(2)}
                            className="w-full bg-[#2b3139] border border-transparent rounded h-10 px-12 text-right text-sm font-bold text-zinc-400 focus:border-[#fcd535] outline-none" 
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-300">USDT</span>
                       </div>

                       <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-500">Amount</span>
                          <input 
                            type="number"
                            value={sellAmount}
                            onChange={(e) => setSellAmount(e.target.value)}
                            placeholder="Amount in DASH"
                            className="w-full bg-[#2b3139] border border-zinc-700/50 rounded h-10 px-12 text-right text-sm font-bold text-white focus:border-[#fcd535] outline-none transition-all" 
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-300">DASH</span>
                       </div>

                       <div className="grid grid-cols-4 gap-1">
                          {[25, 50, 75, 100].map(p => (
                             <button 
                               key={p}
                               onClick={() => setSellAmount((holdings * (p/100)).toFixed(4))}
                               className="py-1.5 bg-[#2b3139] hover:bg-[#3b4149] rounded text-[9px] font-bold text-zinc-400 transition-colors"
                             >
                               {p}%
                             </button>
                          ))}
                       </div>

                       <button 
                         onClick={() => handleTrade('SELL')}
                         className="w-full py-3 bg-[#f6465d] hover:bg-[#eb4057] text-[#0b0e11] font-black text-xs uppercase transition-all active:scale-[0.98] mt-2 rounded"
                       >
                         Sell DASH
                       </button>
                    </div>
                 </div>

                 <div className="mt-auto pt-6 border-t border-zinc-800 space-y-3">
                    <div className="flex items-center gap-2">
                       <ShieldAlert className="w-4 h-4 text-[#fcd535]" />
                       <span className="text-[10px] text-zinc-500 italic">Paper Trading Mode</span>
                    </div>
                    <div className="p-3 bg-[#fcd535]/5 rounded border border-[#fcd535]/10">
                       <p className="text-[9px] text-[#fcd535] leading-relaxed font-medium">
                         Your trades are executed against live node data but finalized in a local virtual sandbox for strategy testing.
                       </p>
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
                   <X className="w-5 h-5" />
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
