"use client";
import React, { useState, useEffect } from 'react';
import { Package, Phone, ArrowLeft, X, ShieldCheck, ChevronRight, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SITE_CONFIG } from '../config';

// --- TWILIO BRIDGE MODAL (For Delivery Drivers) ---
const DeliveryModal = ({ isOpen, onClose, onConfirm, isOfficeOpen }: any) => {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#111] border-2 border-white/20 rounded-[2.5rem] p-8 shadow-2xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-blue-400">
              {isOfficeOpen ? "Call Office" : "Office Closed"}
            </h3>
            <p className="text-white text-xs font-bold uppercase tracking-widest mt-1">Delivery Log</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition"><X size={24}/></button>
        </div>
        
        <input 
          type="text" 
          placeholder="Courier Name / Company"
          className="w-full bg-black border-2 border-white/20 p-5 rounded-2xl text-xl text-center font-bold text-white outline-none mb-3 focus:border-blue-500"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input 
          type="tel" 
          placeholder="Your Mobile Number"
          className="w-full bg-black border-2 border-white/20 p-5 rounded-2xl text-xl text-center font-bold text-white outline-none mb-6 focus:border-blue-500"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />
        <button 
          onClick={() => onConfirm(name, number)}
          disabled={number.length < 10 || name.trim() === '' || !isOfficeOpen}
          className="w-full bg-blue-600 py-6 rounded-2xl font-black uppercase italic text-lg disabled:opacity-30 text-white transition-opacity"
        >
          {isOfficeOpen ? "Request Gate Access" : "Cannot Accept Deliveries"}
        </button>
      </div>
    </div>
  );
};

export default function PackagesPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOfficeOpen, setIsOfficeOpen] = useState(false);

  useEffect(() => {
    const checkIsOpen = () => {
      const now = new Date();
      const day = now.getDay(); 
      const hour = now.getHours();
      const { hours } = SITE_CONFIG;
      if (day === 0) return !hours.sunday.closed; 
      if (day === 6) return hour >= hours.saturday.open && hour < hours.saturday.close;
      return hour >= hours.weekdays.open && hour < hours.weekdays.close;
    };
    setIsOfficeOpen(checkIsOpen());
  }, []);

  const handleDeliveryCall = async (visitorName: string, visitorPhone: string) => {
    setIsModalOpen(false);
    try {
      await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          visitorName: visitorName,
          visitorPhone: `+1${visitorPhone.replace(/\D/g, '')}`, 
          residentPhone: `+1${SITE_CONFIG.officePhone}`, 
          residentName: "Leasing Office (Delivery)", 
          reason: "Package / Delivery Courier"
        })
      });
      alert("Call initiated! The Leasing Office has been notified.");
    } catch (e) {
      alert("Error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center font-sans overflow-hidden">
      
      <DeliveryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onConfirm={handleDeliveryCall}
        isOfficeOpen={isOfficeOpen}
      />

      <div className="w-full max-w-md p-6 flex flex-col flex-grow">
        
        {/* HEADER SECTION */}
        <header className="w-full flex items-center justify-between mb-8 pt-4">
          <button onClick={() => router.push('/')} className="p-3 bg-white/10 rounded-2xl text-white hover:bg-white/20 transition">
            <ArrowLeft size={24} />
          </button>
          <div className="text-right">
            <span className="text-xs font-black uppercase tracking-widest text-blue-400 italic">Packages</span>
            <div className="text-[10px] font-bold text-gray-400 uppercase">{SITE_CONFIG.propertyName}</div>
          </div>
        </header>

        {/* PACKAGE ICON BOX */}
        <div className="w-full bg-[#111] border-2 border-blue-500/30 p-8 rounded-[2.5rem] mb-8 relative overflow-hidden text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -mt-10"></div>
          
          <div className="flex justify-center mb-6 relative z-10">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center animate-bounce shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              <Package size={40} className="text-blue-400" />
            </div>
          </div>
          
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-4 relative z-10">Deliveries</h2>
          
          {/* SAAS DYNAMIC INSTRUCTIONS VARIABLE */}
          <p className="text-gray-300 text-sm leading-relaxed font-medium relative z-10">
            {process.env.NEXT_PUBLIC_DELIVERY_INSTRUCTIONS || "All couriers must log their details to request gate access. Packages cannot be left at the gate."}
          </p>
        </div>

        {/* BUTTON LAYOUT */}
        <div className="w-full space-y-4">
          
          {/* OPTION 1: Call Office */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className={`w-full bg-[#111] border-2 p-6 rounded-[2.5rem] flex items-center justify-between group transition-all ${!isOfficeOpen ? 'border-red-900/50 opacity-60' : 'border-blue-500/60 hover:bg-blue-900/30'}`}
          >
            <div className="flex items-center gap-5">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${isOfficeOpen ? 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.6)]' : 'bg-gray-700'}`}>
                <Phone size={28} className="text-white" />
              </div>
              <div className="text-left">
                <span className="text-2xl font-black uppercase italic tracking-tighter text-white block leading-none">Call Office</span>
                <span className={`text-xs font-bold uppercase tracking-widest mt-2 block ${isOfficeOpen ? 'text-blue-400' : 'text-red-400'}`}>
                  {isOfficeOpen ? "Request Entry" : "Office Closed"}
                </span>
              </div>
            </div>
            {isOfficeOpen && <ChevronRight size={28} className="text-blue-400 group-hover:translate-x-2 transition-transform" />}
          </button>

          {/* VISUAL DIVIDER */}
          <div className="w-full flex items-center justify-center space-x-3 my-2 opacity-50">
            <div className="h-px bg-white/20 flex-1"></div>
            <span className="text-white text-[10px] font-black uppercase tracking-[0.3em]">Or</span>
            <div className="h-px bg-white/20 flex-1"></div>
          </div>

          {/* OPTION 2: Directory Lookup */}
          <Link href="/directory" className="w-full block">
            <button className="w-full bg-[#111] border-2 border-slate-700/60 hover:bg-slate-800/50 p-6 rounded-[2.5rem] flex items-center justify-between group transition-all">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center shadow-lg">
                  <Users size={28} className="text-slate-300" />
                </div>
                <div className="text-left">
                  <span className="text-2xl font-black uppercase italic tracking-tighter text-white block leading-none">Directory</span>
                  <span className="text-xs font-bold uppercase tracking-widest mt-2 block text-slate-400">
                    Look Up Resident
                  </span>
                </div>
              </div>
              <ChevronRight size={28} className="text-slate-500 group-hover:translate-x-2 transition-transform" />
            </button>
          </Link>

        </div>

        <footer className="mt-auto py-10 opacity-40 flex items-center justify-center gap-2">
          <ShieldCheck size={16} className="text-white" />
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white">{SITE_CONFIG.footerText}</span>
        </footer>

      </div>
    </div>
  );
}
