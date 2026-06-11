"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Phone, ArrowLeft, Loader2, EyeOff, ShieldCheck, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SITE_CONFIG } from '../config';

// --- PHONE BRIDGE POPUP ---
const VisitorPhoneModal = ({ isOpen, onClose, onConfirm, residentName }: any) => {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-blue-500">Connect to Resident</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Calling {residentName}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-slate-500"><X size={20}/></button>
        </div>
        
        <input 
          type="text" 
          placeholder="Your Full Name"
          className="w-full bg-black border border-white/10 p-5 rounded-2xl text-xl text-center font-black text-white outline-none mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input 
          type="tel" 
          placeholder="(770) 000-0000"
          className="w-full bg-black border border-white/10 p-5 rounded-2xl text-2xl text-center font-black text-white outline-none mb-6"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />

        <button 
          onClick={() => onConfirm(name, number)}
          disabled={number.length < 10 || name.trim() === ''}
          className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase italic text-sm disabled:opacity-30 transition-opacity"
        >
          Initiate Secure Call
        </button>
      </div>
    </div>
  );
};

export default function SecureDirectory() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [callingId, setCallingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<any>(null);

  useEffect(() => {
    async function fetchResidents() {
      try {
        const response = await fetch(`/api/brivo?t=${Date.now()}`, { 
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache' } 
        });
        const data = await response.json();
        setResidents(Array.isArray(data) ? data : (data.users || []));
      } catch (e) {
        console.error("Directory fetch failed:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchResidents();
  }, []);

  const filteredResidents = useMemo(() => {
    if (searchTerm.length < 3) return [];
    return residents.filter((res: any) => 
      res?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res?.firstName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [residents, searchTerm]);

  const handlePrivacyCall = async (visitorName: string, visitorPhone: string) => {
    setIsModalOpen(false);
    setCallingId(selectedResident.id);
    try {
      await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          visitorName: visitorName,
          visitorPhone: `+1${visitorPhone.replace(/\D/g, '')}`,
          residentPhone: selectedResident.phoneNumber,
          residentName: `${selectedResident.firstName} ${selectedResident.lastName}`
        })
      });
      alert("Call initiated! Answer your phone to connect.");
    } catch (e) {
      alert("Error. Please try again.");
    } finally {
      setCallingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center font-sans overflow-hidden">
      
      <VisitorPhoneModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onConfirm={handlePrivacyCall} 
        residentName={selectedResident ? `${selectedResident.firstName} ${selectedResident.lastName}` : ''} 
      />
      
      <div className="w-full max-w-md p-6 flex flex-col flex-grow">
        <header className="w-full flex items-center justify-between mb-8 pt-4">
          <button onClick={() => router.push('/')} className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:bg-white/10 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 italic">Directory</span>
            <div className="text-[9px] font-bold text-slate-700 uppercase">{SITE_CONFIG.propertyName}</div>
          </div>
        </header>

        <div className="w-full relative mb-12">
          <Search className="absolute left-4 top-5 text-slate-700" size={20} />
          <input 
            type="text" 
            placeholder="Search Residents..." 
            className="w-full bg-[#0a0a0a] border border-white/5 p-5 pl-12 rounded-2xl text-slate-200 outline-none focus:border-blue-500/30 font-bold transition-colors" 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
          <p className="text-[9px] text-slate-800 mt-4 font-black uppercase tracking-[0.2em] text-center italic">
              Search by First or Last Name
          </p>
        </div>

        <div className="w-full space-y-3">
          {loading ? (
            <div className="flex flex-col items-center mt-12 gap-4">
              <Loader2 className="animate-spin text-blue-600" size={30} />
              <span className="text-[9px] font-black uppercase text-slate-800 tracking-[0.3em]">Syncing Brivo...</span>
            </div>
          ) : filteredResidents.map((res: any) => (
            <div key={res.id} className="bg-[#0a0a0a] border border-white/5 p-5 rounded-[2rem] flex justify-between items-center transition-all animate-in fade-in zoom-in-95 duration-500">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-blue-600/10 rounded-full flex items-center justify-center text-blue-500 font-black text-sm border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]">
                  {res.lastName?.[0]}
                </div>
                <div>
                  <p className="text-lg font-black text-slate-200 uppercase tracking-tighter italic leading-none">{res.firstName} {res.lastName}</p>
                  <div className="flex items-center gap-1 text-[9px] font-black text-slate-700 uppercase tracking-widest mt-1">
                    <EyeOff size={10} /> Caller ID Protected
                  </div>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedResident(res); setIsModalOpen(true); }}
                disabled={callingId === res.id}
                className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg active:scale-95 disabled:opacity-50 transition-all hover:bg-blue-500"
              >
                {callingId === res.id ? <Loader2 className="animate-spin" size={20} /> : <Phone size={20} fill="currentColor" />}
              </button>
            </div>
          ))}

          {searchTerm.length >= 3 && filteredResidents.length === 0 && !loading && (
            <div className="text-center py-20 border border-dashed border-white/5 rounded-[2.5rem] opacity-30">
              <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">No Matching Residents</p>
            </div>
          )}
        </div>
        
        <footer className="mt-auto py-8 opacity-20 flex items-center justify-center gap-2">
          <ShieldCheck size={12} className="text-blue-500" />
          <span className="text-[8px] font-black uppercase tracking-[0.5em]">{SITE_CONFIG.footerText}</span>
        </footer>
      </div>
    </div>
  );
}
