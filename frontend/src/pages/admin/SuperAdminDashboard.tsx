
import { PlatformControl } from './PlatformControl';
import { SystemSettings } from './SystemSettings';
import { Zap, ShieldCheck, Building2, Settings, BarChart3 } from 'lucide-react'; 

interface SuperAdminDashboardProps {
  setActiveTab: (tab: string) => void;
  activeTab: string; 
  globalConfig: any; 
  setGlobalConfig: (config: any) => void;
}

export function SuperAdminDashboard({ 
  setActiveTab, 
  activeTab, 
  globalConfig, 
  setGlobalConfig 
}: SuperAdminDashboardProps) {

  // Role constant aligned with your profiles table schema [cite: 2026-01-22]
  const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';

  return (
    <div className="animate-in fade-in duration-500">
      
      {/* 1. DEFAULT DASHBOARD VIEW */}
      {activeTab === 'dashboard' && (
        <div className="p-8 space-y-10">
          
          <div className="flex justify-between items-end">
            <div className="text-left">
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
                Network <span className="text-indigo-600">Commander</span>
              </h1>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                Global Platform Oversight & Administration
              </p>
            </div>
          </div>

          {/* QUICK ACTIONS SECTION - Mapped to Role Access Guidelines [cite: 2026-01-22] */}
          <div className="mt-12">
            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic mb-8 flex items-center gap-2">
              <Zap className="text-indigo-600" size={20} />
              Administrative <span className="text-indigo-600">Gateways</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* ACTION: PLATFORM CONTROL (Super Admin Access) */}
              <button 
                onClick={() => setActiveTab('platform-control')}
                className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl shadow-indigo-100/50 hover:shadow-indigo-200/60 hover:-translate-y-1 transition-all group text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                  <Building2 size={120} />
                </div>
                <div className="relative z-10">
                  <div className="p-4 w-fit bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-6">
                    <Building2 size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Platform Control</h3>
                  <p className="text-sm text-slate-500 font-bold mb-8 leading-relaxed uppercase tracking-tight opacity-70">
                    Onboard new shop locations, manage branch administrators, and monitor network health.
                  </p>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 flex items-center gap-2">
                    Access Infrastructure <span className="group-hover:translate-x-2 transition-transform">→</span>
                  </div>
                </div>
              </button>

              {/* ACTION: SYSTEM SETTINGS (Super Admin Access) */}
              <button 
                onClick={() => setActiveTab('system-settings')}
                className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-2xl shadow-slate-200/40 hover:shadow-indigo-100 hover:-translate-y-1 transition-all group text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                  <Settings size={120} />
                </div>
                <div className="relative z-10">
                  <div className="p-4 w-fit bg-slate-900 rounded-2xl text-white mb-6">
                    <ShieldCheck size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">System Control</h3>
                  <p className="text-sm text-slate-500 font-bold mb-8 leading-relaxed uppercase tracking-tight opacity-70">
                    Configure interest caps, audit logs, and global security protocols for all tenants.
                  </p>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                    Open Protocols <span className="group-hover:translate-x-2 transition-transform">→</span>
                  </div>
                </div>
              </button>

              {/* ACTION: NETWORK INSIGHTS (Placeholder) */}
              <button 
                className="bg-slate-50/50 p-10 rounded-[48px] border border-dashed border-slate-200 transition-all text-left opacity-60 group relative overflow-hidden cursor-not-allowed"
              >
                <div className="relative z-10">
                  <div className="p-4 w-fit bg-white rounded-2xl text-slate-400 mb-6">
                    <BarChart3 size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-400 mb-2 uppercase tracking-tighter">Network Insights</h3>
                  <p className="text-sm text-slate-400 font-bold mb-8 leading-relaxed uppercase tracking-tight">
                    Unified analytics across all branches including total principal and expected revenue.
                  </p>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Module Locked</div>
                </div>
              </button>

            </div>
          </div>
        </div>
      )}

      {/* 2. TAB: PLATFORM CONTROL */}
      {activeTab === 'platform-control' && (
        <PlatformControl 
          setActiveTab={setActiveTab} 
          userRole={SUPER_ADMIN_ROLE} 
        />
      )}

      {/* 3. TAB: SYSTEM SETTINGS */}
      {activeTab === 'system-settings' && (
        <div className="p-0">
          <SystemSettings 
            config={globalConfig} 
            setConfig={setGlobalConfig} 
            userRole={SUPER_ADMIN_ROLE} 
          />
        </div>
      )}
    </div>
  );
}