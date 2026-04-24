/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { supabase } from '../supabase';
import { motion } from 'motion/react';
import { Mail, Lock, User, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Check your email for confirmation!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Access Granted');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#008CE7]/10 blur-[150px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900/50 backdrop-blur-2xl border border-zinc-800 rounded-[2.5rem] p-10 relative z-10"
      >
        <div className="text-center mb-8">
           <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2">
             Terminal<span className="text-[#008CE7]">.Auth</span>
           </h2>
           <p className="text-zinc-500 text-sm italic">Synchronize your trade nodes across devices</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
           <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
              <input 
                type="email" 
                placeholder="Network Address (Email)" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black/40 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-[#008CE7] transition-all placeholder:text-zinc-700"
              />
           </div>
           <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
              <input 
                type="password" 
                placeholder="Access Key (Password)" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-black/40 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-[#008CE7] transition-all placeholder:text-zinc-700"
              />
           </div>

           <button 
             disabled={loading}
             className="w-full py-4 bg-[#008CE7] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-[#008CE7]/20 hover:bg-[#007AC9] transition-all disabled:opacity-50"
           >
              {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              {loading ? 'Processing Node...' : isSignUp ? 'Initialize Account' : 'Request Access'}
           </button>
        </form>

        <div className="mt-8 text-center">
           <button 
             onClick={() => setIsSignUp(!isSignUp)}
             className="text-xs text-zinc-500 hover:text-white transition-colors underline-offset-4 hover:underline"
           >
              {isSignUp ? 'Already connected? Return to Login' : 'New operator? Request Node Identity'}
           </button>
        </div>
      </motion.div>
    </div>
  );
}
