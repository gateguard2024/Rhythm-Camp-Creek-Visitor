"use client";
import React, { useState } from 'react';
import { AlertTriangle, Phone, ArrowLeft, ShieldAlert, X, Activity, Grid3X3, Delete, Unlock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SITE_CONFIG } from '../config';

// --- KEYPAD MODAL (Backup Entry for Responders) ---
const KeypadModal = ({ isOpen, onClose }: any) => {
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 8) setPin(prev => prev + num);
    setStatus('idle');
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setStatus('idle');
  };

  const handleSubmit = async () => {
    if (pin.length === 0) return;
    setStatus('loading');
    
    try {
      const response = await fetch('/api/brivo/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinCode: pin })
      });

      if (response.ok) {
        setStatus('success');
        setPin('');
        setTimeout(() => {
          onClose();
          setStatus('idle');
        }, 3000);
      } else {
        setStatus('error');
        setPin('');
      }
    } catch (e) {
      setStatus('error');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      <div className="w-full max-w-sm bg-[#111] border-2 border-blue-500/50 rounded-[2.5rem] p-6 shadow-2xl shadow-blue-900/20">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-blue-400">
              Responder Keypad
            </h3>
            <p className="text-white text-[10px] font-bold uppercase tracking-widest mt-1">Authorized Access Only</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition"><X size={20}/></button>
        </div>

        <div className={`w-full h-16 bg-black border-2 rounded-2xl flex items-center justify-center mb-6 transition-colors ${
          status === 'error' ? 'border-red-500' : status === 'success' ? 'border-green-500' : 'border-white/20'
        }`}>
          {status === 'loading' && <span className="text-blue-400 font-bold uppercase tracking-widest text-sm animate-pulse">Verifying...</span>}
          {status === 'success' && <span className="text-green-500 font-black uppercase tracking-widest flex items-center gap-2"><Unlock size={18}/> Gate Open</span>}
          {status === 'error' && <span className="text-red-500 font-bold uppercase tracking-widest text-sm">Invalid Code</span>}
          {status === 'idle' && (
            <span className="text-3xl font-black tracking-[0.5em] text-white">
              {pin.padEnd(4, '·')}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button 
              key={num} 
              onClick={() => handleKeyPress(num.toString())}
              className="bg-gray-800 hover:bg-gray-700 text-white font-black text-2xl py-4 rounded-2xl active:scale-95 transition-all shadow-md"
            >
              {num}
            </button>
          ))}
          <button 
            onClick={handleDelete}
            className="bg-red-950/40 text-red-400 flex items-center justify-center rounded-2xl active:scale-95 transition-all"
          >
            <Delete size={28} />
          </button>
          <button 
            onClick={() => handleKeyPress('0')}
            className="bg-gray-800 hover:bg-gray-700 text-white font-black text-2xl py-4 rounded-2xl active:scale-95 transition-all shadow-md"
          >
            0
          </button>
          <button 
            onClick={handleSubmit}
            disabled={pin.length === 0}
            className="bg-blue-600 disabled:opacity-50 text-white font-black uppercase text-sm tracking-widest rounded-2xl active:scale-95 transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  );
};

// --- AFTER HOURS CALL MODAL ---
const EmergencyModal = ({ isOpen, onClose, onConfirm }: any) => {
  const [number, setNumber] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#111] border-2 border-red-500/50 rounded-[2.5rem] p-8 shadow-2xl shadow-red-900/20">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-red-500">Emergency Call</h3>
            <p className="text-white text-xs font-bold uppercase tracking-widest mt-1">System Bridge</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition"><X size={24}/></button>
        </div>
        <p className="text-gray-300 text-sm mb-4 text-center font-medium">Enter your mobile number to be connected to the on-call staff.</p>
        <input 
          type="tel" 
          placeholder="Your Mobile Number"
          className="w-full bg-black border-2 border-white/20 p-5 rounded-2xl text-xl text-center font-bold text-white outline-none mb-6 focus:border-red-500"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
        />
        <button 
          onClick={() => onConfirm(number)}
          disabled={number.length < 10}
          className="w-full bg-red-600 py-6 rounded-2xl font-black uppercase italic text-lg disabled:opacity-30 text-white transition-opacity shadow-[0_0_20px_rgba(220,38,38,0.4)]"
        >
          Connect Call Now
        </button>
      </div>
    </div>
  );
};

export default function EmergencyPage() {
  const router = useRouter();
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isKeypadModalOpen, setIsKeypadModalOpen] = useState(false);

  const text911 = process.env.NEXT_PUBLIC_EMERGENCY_911_TEXT || "If this is a life-threatening emergency, please dial 911 immediately from your mobile device.";
  const responderText = process.env.NEXT_PUBLIC_FIRST_RESPONDER_INSTRUCTIONS || "Use YELP siren for 3 seconds to open gate, or use the Knox Box located on the left pillar.";
  const afterHoursLabel = process.env.NEXT_PUBLIC_AFTER_HOURS_LABEL || "Call After Hours";
  const emergencyPhone = process.env.NEXT_PUBLIC_EMERGENCY_PHONE || SITE_CONFIG.emergencyPhone;

  const handleEmergencyCall = async (visitorPhone: string) => {
    setIsPhoneModalOpen(false);
    try {
      await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          visitorName: "Emergency Caller",
          visitorPhone: `+1${visitorPhone.replace(/\D/g, '')}`, 
          residentPhone: `+1${emergencyPhone.replace(/\D/g, '')}`, 
          residentName: "After Hours / Emergency", 
          reason: "Emergency Gate Assistance"
        })
      });
      alert("Call initiated! Please answer your phone to be connected.");
    } catch (e) {
      alert("System Error. Please dial 911 if this is a life-threatening emergency.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center font-sans overflow-hidden">
      
      <EmergencyModal isOpen={isPhoneModalOpen} onClose={() => setIsPhoneModalOpen(false)} onConfirm={handleEmergencyCall} />
      <KeypadModal isOpen={isKeypadModalOpen} onClose={() => setIsKeypadModalOpen(false)} />

      <div className="w-full max-w-md p-6 flex flex-col flex-grow">
        
        <header className="w-full flex items-center justify-between mb-6 pt-4">
          <button onClick={() => router.push('/')} className="p-3 bg-white/10 rounded-2xl text-white hover:bg-white/20 transition">
            <ArrowLeft size={24} />
          </button>
          <div className="text-right">
            <span className="text-xs font-black uppercase tracking-widest text-red-500 italic">Emergency</span>
            <div className="text-[10px] font-bold text-gray-400 uppercase">{SITE_CONFIG.propertyName}</div>
          </div>
        </header>

        <div className="w-full bg-red-950/40 border-2 border-red-600/50 p-6 rounded-[2rem] mb-6 relative overflow-hidden text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-600/20 rounded-full blur-3xl -mt-10"></div>
          <div className="flex justify-center mb-4 relative z-10">
            <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.5)]">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
          </div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2 relative z-10">DIAL 911</h2>
          <p className="text-red-200 text-sm leading-relaxed font-bold relative z-10">{text911}</p>
        </div>

        <div className="w-full bg-[#111] border-2 border-blue-500/30 p-6 rounded-[2rem] mb-6 text-center">
          <div className="flex justify-center mb-3">
            <ShieldAlert size={28} className="text-blue-400" />
          </div>
          <h3 className="text-lg font-black uppercase tracking-widest text-white mb-2">First Responders</h3>
          <p className="text-gray-400 text-sm leading-relaxed font-medium mb-5">{responderText}</p>
          
          <button 
            onClick={() => setIsKeypadModalOpen(true)}
            className="w-full bg-blue-900/30 border border-blue-500/50 hover:bg-blue-800/40 py-4 rounded-xl flex items-center justify-center gap-3 transition-all"
          >
            <Grid3X3 size={20} className="text-blue-400" />
            <span className="font-black uppercase tracking-widest text-sm text-blue-100">Backup Entry Keypad</span>
          </button>
        </div>

        <div className="w-full mt-auto">
          <button 
            onClick={() => setIsPhoneModalOpen(true)}
            className="w-full bg-[#111] border-2 border-red-500/60 hover:bg-red-900/30 p-6 rounded-[2.5rem] flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.6)]">
                <Activity size={28} className="text-white" />
              </div>
              <div className="text-left">
                <span className="text-xl font-black uppercase italic tracking-tighter text-white block leading-none">{afterHoursLabel}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest mt-2 block text-red-400">Non-Life-Threatening Only</span>
              </div>
            </div>
          </button>
        </div>

        <footer className="mt-auto py-10 opacity-40 flex items-center justify-center gap-2">
          <ShieldAlert size={16} className="text-white" />
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white">{SITE_CONFIG.footerText}</span>
        </footer>

      </div>
    </div>
  );
}
