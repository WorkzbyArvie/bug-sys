import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Wallet, 
  Gavel, 
  LineChart, 
  ShieldCheck, 
  Settings2,
  Package,
  BellRing,
  BrainCircuit,
  Users2,
  ShieldAlert,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface SystemSettingsProps {
  config: {
    vault_enabled: boolean;
    finance_enabled: boolean;
    hr_enabled: boolean;
    auction_enabled: boolean;
    decision_enabled: boolean;
    crm_enabled: boolean;
    market_enabled: boolean;
    alerts_enabled: boolean;
  };
  setConfig: React.Dispatch<React.SetStateAction<any>>;
  userRole: string; 
}

export function SystemSettings({ config, setConfig, userRole }: SystemSettingsProps) {
  // State for Confirmation Workflow
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  // Load settings from database on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (isSuperAdmin) {
          // Load global settings from first pawnshop
          const { data, error } = await supabase
            .from('pawnshops')
            .select('settings')
            .limit(1)
            .single();
          
          if (error) {
            console.error('Error loading settings:', error);
            return;
          }

          if (data?.settings) {
            console.log('Loaded settings from DB:', data.settings);
            setConfig(data.settings);
          } else {
            console.log('No settings found in DB, using defaults');
          }
        } else {
          // Load branch settings from localStorage
          const saved = localStorage.getItem('branch_config');
          if (saved) {
            setConfig(JSON.parse(saved));
          }
        }
      } catch (error) {
        console.error('Error in loadSettings:', error);
      }
    };
    
    loadSettings();
  }, [isSuperAdmin, setConfig]);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // HELPER: Determine if a feature is globally disabled by Super Admin
  const isGloballyOverridden = (id: string) => {
    if (isSuperAdmin) return false; 
    const globalSaved = localStorage.getItem('global_system_config');
    if (globalSaved) {
      const globalConfig = JSON.parse(globalSaved);
      return globalConfig[id] === false; 
    }
    return false;
  };

  const featureList = [
    { id: 'vault_enabled', name: 'Inventory Vault', description: 'Secured asset repository and automated collateral tracking system.', icon: Package, category: 'Operations' },
    { id: 'finance_enabled', name: 'Finance & Treasury', description: 'Monitor liquidity, interest accruals, and branch cashflow.', icon: Wallet, category: 'Management' },
    { id: 'crm_enabled', name: 'Customer CRM', description: 'Advanced KYC, risk scoring, and customer transaction history.', icon: Users2, category: 'Management' },
    { id: 'hr_enabled', name: 'Staff Matrix', description: 'Manage employee performance, permissions, and attendance.', icon: Users, category: 'Management' },
    { id: 'market_enabled', name: 'Market Watch', description: 'Live gold spot price integration and margin protection.', icon: LineChart, category: 'Operations' },
    { id: 'auction_enabled', name: 'Auction House', description: 'Liquidation engine for unredeemed items with digital bidding.', icon: Gavel, category: 'Operations' },
    { id: 'decision_enabled', name: 'Decision Support', description: 'Algorithmic appraisal assistance and market volatility protection.', icon: BrainCircuit, category: 'Security' },
    { id: 'alerts_enabled', name: 'Auto-Reminders', description: 'Automated SMS and Email alerts for expiring pawn tickets.', icon: BellRing, category: 'Security' },
  ];

  const toggleFeature = (id: string) => {
    if (isGloballyOverridden(id)) return;
    setConfig((prev: any) => ({ ...prev, [id]: !prev[id] }));
  };

  // ASYNC SAVE HANDLER
  const handleConfirmSave = async () => {
    setIsSaving(true);
    
    try {
      if (isSuperAdmin) {
        console.log('=== SAVING SETTINGS ===');
        console.log('Current config:', config);
        
        // Get all pawnshops first
        const { data: pawnshops, error: fetchError } = await supabase
          .from('pawnshops')
          .select('id, name')
          .limit(10);
        
        if (fetchError) throw fetchError;
        console.log('Found pawnshops:', pawnshops?.map(p => ({ id: p.id, name: p.name })));

        // Update all pawnshops with the settings
        const { error: updateError } = await supabase
          .from('pawnshops')
          .update({ settings: config });
        
        if (updateError) {
          console.error('Error updating settings in DB:', updateError);
          throw updateError;
        }
        
        console.log('Settings saved successfully to DB');
        
        // Verify by reading back
        const { data: verifyData } = await supabase
          .from('pawnshops')
          .select('settings')
          .limit(1)
          .single();
        
        console.log('Verified saved settings:', verifyData?.settings);
        
        localStorage.setItem('global_system_config', JSON.stringify(config));
      } else {
        // Save branch settings to localStorage (for branch-level override)
        localStorage.setItem('branch_config', JSON.stringify(config));
      }

      setIsSaving(false);
      setIsModalOpen(false);
      setShowToast(true);
    } catch (error) {
      console.error('Error saving settings:', error);
      setIsSaving(false);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 font-inter pb-20 text-left relative">
      
      {/* SUCCESS TOAST */}
      {showToast && (
        <div className="fixed top-8 right-8 z-[200] animate-in slide-in-from-right-10 fade-in duration-500">
          <div className="bg-slate-900 border border-slate-800 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4">
            <div className="bg-emerald-500/20 p-2 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-widest leading-none">Changes Saved</p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">System configuration synchronized.</p>
            </div>
            <button onClick={() => setShowToast(false)} className="ml-4 text-slate-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic leading-none">
            {isSuperAdmin ? 'Platform Control' : 'Branch Settings'}
          </h2>
          <p className="text-slate-500 font-medium mt-2">
            {isSuperAdmin 
              ? 'Manage global feature availability for all tenants.' 
              : 'Configure active modules for this specific branch.'}
          </p>
        </div>
        <div className={`p-4 rounded-2xl border shadow-sm group hover:rotate-90 transition-transform duration-500 ${
          isSuperAdmin ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-100'
        }`}>
          {isSuperAdmin ? <ShieldAlert className="w-6 h-6 text-indigo-600" /> : <Settings2 className="w-6 h-6 text-blue-600" />}
        </div>
      </div>

      {/* SUPER ADMIN BANNER */}
      {isSuperAdmin && (
        <div className="bg-indigo-600 rounded-[2rem] p-6 text-white flex items-center gap-6 shadow-xl shadow-indigo-200">
          <div className="bg-white/20 p-4 rounded-2xl">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h4 className="font-black uppercase tracking-widest text-sm">Global Master Switches</h4>
            <p className="text-indigo-100 text-xs mt-1">
              Changes made here are <span className="underline decoration-indigo-300">authoritative</span>.
            </p>
          </div>
        </div>
      )}

      {/* FEATURE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {featureList.map((feature) => {
          const globalDisabled = isGloballyOverridden(feature.id);
          const isEnabled = globalDisabled ? false : (config as any)[feature.id];
          
          return (
            <div 
              key={feature.id}
              className={`group bg-white rounded-[2.8rem] p-8 border-2 transition-all duration-500 shadow-xl ${
                globalDisabled ? 'opacity-50 grayscale-[0.4]' : ''
              } ${isEnabled ? (isSuperAdmin ? 'border-indigo-500/10' : 'border-blue-500/10') : 'border-transparent opacity-70'}`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className={`p-4 rounded-2xl transition-all duration-500 ${
                  isEnabled ? (isSuperAdmin ? 'bg-indigo-600 shadow-indigo-600/20' : 'bg-blue-600 shadow-blue-600/20') : 'bg-slate-50 text-slate-400'
                } text-white shadow-lg`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                
                <button
                  onClick={() => toggleFeature(feature.id)}
                  disabled={globalDisabled}
                  className={`w-14 h-8 rounded-full transition-all duration-300 relative p-1 outline-none ${
                    globalDisabled ? 'bg-slate-300 cursor-not-allowed' : (isEnabled ? (isSuperAdmin ? 'bg-indigo-600' : 'bg-blue-600') : 'bg-slate-200')
                  }`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-300 ${isEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isEnabled ? (isSuperAdmin ? 'text-indigo-500' : 'text-blue-500') : 'text-slate-400'}`}>
                    {feature.category}
                  </span>
                  {globalDisabled && (
                    <span className="bg-rose-50 text-rose-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-1">
                      <ShieldAlert size={8} /> Restricted
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">{feature.name}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{feature.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* PERSISTENCE FOOTER */}
      <div className={`rounded-[2.5rem] p-8 text-white flex items-center justify-between overflow-hidden relative shadow-2xl transition-colors duration-500 ${
        isSuperAdmin ? 'bg-indigo-950' : 'bg-slate-900'
      }`}>
        <div className="relative z-10">
          <h3 className="text-xl font-black mb-1 italic uppercase tracking-tighter">
            Save {isSuperAdmin ? 'Global' : 'Branch'} Changes?
          </h3>
          <p className="text-slate-400 text-sm font-medium italic">Confirmation required to proceed.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className={`relative z-10 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg ${
          isSuperAdmin ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
        }`}>
          Apply Changes
        </button>
      </div>

      {/* CONFIRMATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => !isSaving && setIsModalOpen(false)} 
          />
          
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${isSuperAdmin ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}`}>
                  {isSaving ? <Loader2 className="w-8 h-8 animate-spin" /> : <AlertTriangle className="w-8 h-8" />}
                </div>
                {!isSaving && (
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                )}
              </div>

              <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight mb-2">
                {isSaving ? 'Processing...' : 'Confirm Update'}
              </h2>
              <p className="text-slate-500 font-medium leading-relaxed mb-8">
                {isSaving 
                  ? "Writing configuration to the system registry. Please do not close this window."
                  : "Are you sure you want to proceed? These changes will take effect immediately across your terminal."}
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConfirmSave}
                  disabled={isSaving}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-white shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                    isSuperAdmin ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-blue-600 hover:bg-blue-500'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSaving ? 'Synchronizing...' : 'Yes, Apply Changes'}
                </button>
                {!isSaving && (
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}