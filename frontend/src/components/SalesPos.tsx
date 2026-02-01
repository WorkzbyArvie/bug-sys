import { useState } from 'react';
import { 
  Calculator, 
  Scale, 
  Building2, 
  AlertCircle, 
  Loader2, 
  MapPin, 
  Phone, 
  User 
} from 'lucide-react';
import { useToast } from '../App'; // Ensure App.tsx exports useToast
import { supabase } from '../lib/supabaseClient';

// Interface matches the props passed from App.tsx
interface SalesPosProps {
  branchId: string | null;
  setActiveTab: (tab: string) => void;
}

export function SalesPos({ branchId, setActiveTab }: SalesPosProps) {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    customerName: '',
    customerAddress: '',
    customerContact: '',
    itemCategory: '',
    weight: ''
  });

  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [recommendedAmount, setRecommendedAmount] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayBranchName = branchId ? `Branch: ${String(branchId).slice(0, 8)}` : "PawnGold HQ";

  const itemCategories = [
    'Gold Jewelry', 'Silver Jewelry', 'Gold Bars', 
    'Silver Coins', 'Watches', 'Electronics', 'Appliances'
  ];

  const calculateRisk = () => {
    const weight = parseFloat(formData.weight);
    if (isNaN(weight) || weight <= 0) {
      showToast("Please enter a valid weight.", "error");
      return;
    }
    
    let risk = 0;
    if (formData.itemCategory.includes('Gold')) {
      risk = weight > 50 ? 15 : 25;
    } else if (formData.itemCategory.includes('Silver')) {
      risk = weight > 100 ? 20 : 35;
    } else {
      risk = 45;
    }

    setRiskScore(risk);

    let baseRate = formData.itemCategory.includes('Gold') ? 3500 : 
                   formData.itemCategory.includes('Silver') ? 45 : 500;

    const amount = weight * baseRate * 0.7; 
    setRecommendedAmount(Math.round(amount));
  };

  const handleApprove = async () => {
    if (!recommendedAmount) {
      showToast("Please calculate the loan amount first.", "error");
      return;
    }

    if (!branchId) {
      showToast("Critical Error: No Branch UUID detected.", "error");
      return;
    }
    
    setIsSubmitting(true);
    try {
      let customerId;

      // 1. Customer Scoped to Branch UUID
      const { data: existingCustomer } = await supabase
        .from('customer')
        .select('id')
        .eq('full_name', formData.customerName)
        .eq('pawnshop_id', branchId) 
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        await supabase
          .from('customer')
          .update({ 
            address: formData.customerAddress, 
            contact_number: formData.customerContact 
          })
          .eq('id', customerId);
      } else {
        const newId = `CUST-${Date.now()}`; 
        const { data: newCustomer, error: customerError } = await supabase
          .from('customer')
          .insert([{ 
            id: newId,
            full_name: formData.customerName, 
            contact_number: formData.customerContact,
            address: formData.customerAddress,
            pawnshop_id: branchId 
          }])
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // 2. Ticket Creation
      const generatedTicketNumber = `TKT-${Math.floor(Date.now() / 1000)}`;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      const { data: ticketData, error: ticketError } = await supabase
        .from('ticket')
        .insert([{
          ticket_number: generatedTicketNumber,
          customer_id: customerId, 
          pawnshop_id: branchId,
          category: formData.itemCategory,
          description: `Pawned ${formData.itemCategory}`,
          weight: parseFloat(formData.weight),
          loan_amount: recommendedAmount,
          expiry_date: expiryDate.toISOString(),
          status: 'ACTIVE',
          ishighrisk: (riskScore || 0) > 40,
          interest_rate: 3.5 
        }])
        .select()
        .single();

      if (ticketError) throw ticketError;

      // 3. Loan Creation
      const { error: loanError } = await supabase
        .from('loan') 
        .insert([{
          ticketid: ticketData.id,
          principalamount: recommendedAmount,
          interestamount: Math.round(recommendedAmount * 0.035), 
          customername: formData.customerName,
          category: formData.itemCategory,
          weight: parseFloat(formData.weight),
          riskscore: riskScore,
          pawnshop_id: branchId,
          status: 'active'
        }]);

      if (loanError) throw loanError;

      showToast(`Transaction Approved! Ticket: ${generatedTicketNumber}`, "success");
      setActiveTab('dashboard'); 
      
    } catch (error: any) {
      console.error("Database Error:", error);
      showToast(error.message || "Failed to save transaction", "error"); 
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRiskStyle = (score: number) => {
    if (score < 30) return { color: 'text-green-600', bg: 'bg-green-50', label: 'Low Risk' };
    if (score < 50) return { color: 'text-amber-600', bg: 'bg-amber-50', label: 'Medium Risk' };
    return { color: 'text-red-600', bg: 'bg-red-50', label: 'High Risk' };
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen text-left animate-in fade-in duration-500">
      
      {!branchId && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600">
          <AlertCircle size={18} />
          <p className="text-xs font-bold uppercase tracking-tight">Warning: No Pawnshop context detected. Transactions disabled.</p>
        </div>
      )}

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-[#030213] uppercase italic tracking-tighter">
            Loan <span className="text-indigo-600">Management</span>
          </h1>
          <p className="text-slate-500 text-xs font-bold flex items-center gap-2 uppercase tracking-wide">
            <Building2 size={14} className="text-indigo-500" /> {displayBranchName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border-none">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Calculator className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 uppercase tracking-tight">New Appraisal Form</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Enter item and customer details</p>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); calculateRisk(); }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-900 pl-14"
                      placeholder="Enter customer name"
                      required
                    />
                    <User className="w-5 h-5 text-slate-300 absolute left-5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Category</label>
                  <select
                    value={formData.itemCategory}
                    onChange={(e) => setFormData({ ...formData, itemCategory: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-900 appearance-none"
                    required
                  >
                    <option value="">Select category</option>
                    {itemCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.customerContact}
                      onChange={(e) => setFormData({ ...formData, customerContact: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-900 pl-14"
                      placeholder="09XXXXXXXXX"
                      required
                    />
                    <Phone className="w-5 h-5 text-slate-300 absolute left-5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Address</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.customerAddress}
                      onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                      className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-900 pl-14"
                      placeholder="Enter full address"
                      required
                    />
                    <MapPin className="w-5 h-5 text-slate-300 absolute left-5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weight (grams)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-900 pl-14"
                    placeholder="0.00"
                    required
                  />
                  <Scale className="w-6 h-6 text-slate-300 absolute left-5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl transition-all">
                Calculate Risk & Loan Amount
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border-none sticky top-8">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Decision Support</h3>

            {riskScore === null ? (
              <div className="text-center py-20">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Awaiting calculations...</p>
              </div>
            ) : (
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                <div>
                  <p className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">Risk Score</p>
                  <div className={`rounded-3xl p-6 ${getRiskStyle(riskScore).bg}`}>
                    <div className="flex items-center gap-5">
                      <p className={`text-4xl font-black tracking-tighter ${getRiskStyle(riskScore).color}`}>{riskScore}%</p>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${getRiskStyle(riskScore).color}`}>{getRiskStyle(riskScore).label}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">Loan Recommendation</p>
                  <div className="rounded-3xl p-6 bg-indigo-50/50 border border-indigo-100/50">
                    <p className="text-4xl font-black text-indigo-900 tracking-tighter">₱{recommendedAmount?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-4 pt-6">
                  <button 
                    onClick={handleApprove}
                    disabled={isSubmitting || !branchId}
                    className="w-full bg-[#030213] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Approve Transaction'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}