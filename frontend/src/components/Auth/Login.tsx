import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock, Mail, AlertTriangle } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Try Supabase Auth first
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      let profile: any = null;

      if (!authError && authData?.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(`role, pawnshop_id, full_name`)
          .eq('id', authData.user.id)
          .maybeSingle();

        if (profileError) throw new Error('Failed to fetch profile from database');
        profile = profileData;
      } else if (!authError) {
        // Supabase auth succeeded but no user returned
        throw authError || new Error('Authentication returned no user');
      }

      // 2. If Supabase auth failed or no profile, try local dev fallback
      if (!profile && import.meta.env.MODE === 'development') {
        try {
          const resp = await fetch('http://localhost:3000/auth/local-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });

          if (resp.ok) {
            const json = await resp.json();
            profile = json.profile || { role: json.staff?.role };
          } else {
            throw authError || new Error('Authentication failed');
          }
        } catch (localErr) {
          // Local fallback also failed - show original error
          throw authError || localErr;
        }
      } else if (!profile) {
        throw authError || new Error('No profile found and local auth unavailable in production');
      }

      // 3. Normalize role strings and set Session Context
      const rawRole = profile.role || 'Staff';
      const cleaned = rawRole.toString().toUpperCase().replace(/[_\s]/g, '');
      const userRole = ((): string => {
        switch (cleaned) {
          case 'SUPERADMIN':
          case 'SUPER':
          case 'SUPER_ADMIN':
            return 'Super Admin';
          case 'BRANCHADMIN':
          case 'BRANCH_ADMIN':
          case 'ADMIN':
            return 'Branch Admin';
          case 'MANAGER':
            return 'Manager';
          case 'OWNER':
            return 'Owner';
          case 'STAFF':
          default:
            return rawRole.split(/[_\s]+/).map((w: string) => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
      })();

      // 4. Store session data
      localStorage.setItem('user_role', userRole);
      
      // 5. Role-Based Redirection
      if (userRole === 'Super Admin') {
        navigate("/platform-control", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
      
    } catch (err: any) {
      console.error('[LOGIN_ERROR]', err);
      setError(err.message || 'Authentication failed');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <Card className="w-full max-w-md rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
        <CardHeader className="bg-[#030213] text-white p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/50">
              <Lock className="text-white w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl font-black uppercase italic tracking-tighter">
            PAWNGOLD <span className="text-indigo-400">SECURE</span>
          </CardTitle>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Enterprise Access Control</p>
        </CardHeader>

        <CardContent className="p-8 space-y-6 bg-white">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 transition-all"
                  placeholder="admin@pawngold.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-[11px] font-bold rounded-2xl border border-red-100 italic text-left flex items-start gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-[#030213] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Verifying Identity...</span>
                </>
              ) : (
                "Authenticate Access"
              )}
            </button>
          </form>
          
          <div className="text-center pt-2">
            <button 
              type="button"
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
            >
              Reset Session Cache
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}