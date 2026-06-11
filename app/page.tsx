"use client";
import React, { useState, useEffect } from 'react';
import { Users, Phone, Package, AlertTriangle, ChevronRight, X, ShieldCheck, Globe, Moon, Sun } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { SITE_CONFIG } from './config';

const t = {
  en: {
    welcome: "Welcome To",
    systemActive: "System Active",
    directory: "Directory",
    callLeasing: "Call Leasing",
    officeClosed: "Office Closed",
    packages: "Packages",
    emergency: "Emergency",
    callLeasingTitle: "Call Leasing Office",
    visitorReg: "Visitor Registration",
    fullName: "Full Name",
    email: "Email Address",
    mobile: "Mobile Number",
    reason: "Select Reason for Visit",
    reasons: { leasing: "Interest in Leasing", delivery: "Package / Delivery Courier", support: "Current Resident Support", maintenance: "Maintenance / Vendor", general: "General Inquiry" },
    initiate: "Initiate Secure Call",
    toggleLang: "ES"
  },
  es: {
    welcome: "Bienvenido A",
    systemActive: "Sistema Activo",
    directory: "Directorio",
    callLeasing: "Oficina de Alquiler",
    officeClosed: "Oficina Cerrada",
    packages: "Paquetes",
    emergency: "Emergencia",
    callLeasingTitle: "Llamar a la Oficina",
    visitorReg: "Registro de Visitantes",
    fullName: "Nombre Completo",
    email: "Correo Electrónico",
    mobile: "Número de Teléfono",
    reason: "Seleccione el Motivo",
    reasons: { leasing: "Interés en Alquilar", delivery: "Paquete / Repartidor", support: "Soporte para Residentes", maintenance: "Mantenimiento / Proveedor", general: "Consulta General" },
    initiate: "Iniciar Llamada Segura",
    toggleLang: "EN"
  }
};

const LeasingPhoneModal = ({ isOpen, onClose, onConfirm, lang }: { isOpen: boolean, onClose: () => void, onConfirm: any, lang: 'en' | 'es' }) => {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  
  if (!isOpen) return null;
  const text = t[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/95 backdrop-blur-sm transition-all duration-300">
      <div className="w-full max-w-md bg-white dark:bg-[#111] border-2 border-gray-200 dark:border-white/20 rounded-[2.5rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-blue-600 dark:text-blue-400">{text.callLeasingTitle}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">{text.visitorReg}</p>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-100 dark:bg-white/10 rounded-full text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20"><X size={24}/></button>
        </div>
        
        <input type="text" placeholder={text.fullName} className="w-full bg-gray-50 dark:bg-black border-2 border-gray-200 dark:border-white/20 p-5 rounded-2xl text-xl text-center font-bold text-gray-900 dark:text-white outline-none mb-3 focus:border-blue-500 transition-colors" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="email" placeholder={text.email} className="w-full bg-gray-50 dark:bg-black border-2 border-gray-200 dark:border-white/20 p-5 rounded-2xl text-xl text-center font-bold text-gray-900 dark:text-white outline-none mb-3 focus:border-blue-500 transition-colors" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="tel" placeholder={text.mobile} className="w-full bg-gray-50 dark:bg-black border-2 border-gray-200 dark:border-white/20 p-5 rounded-2xl text-xl text-center font-bold text-gray-900 dark:text-white outline-none mb-3 focus:border-blue-500 transition-colors" value={number} onChange={(e) => setNumber(e.target.value)} />
        <select className="w-full bg-gray-50 dark:bg-black border-2 border-gray-200 dark:border-white/20 p-5 rounded-2xl text-xl text-center font-bold text-gray-900 dark:text-white outline-none mb-6 focus:border-blue-500 appearance-none transition-colors" value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="" disabled>{text.reason}</option>
          <option value="Interest in Leasing">{text.reasons.leasing}</option>
          <option value="Package / Delivery Courier">{text.reasons.delivery}</option>
          <option value="Current Resident Support">{text.reasons.support}</option>
          <option value="Maintenance / Vendor">{text.reasons.maintenance}</option>
          <option value="General Inquiry">{text.reasons.general}</option>
        </select>

        <button onClick={() => onConfirm(name, number, email, reason)} disabled={number.length < 10 || name.trim() === '' || email.trim() === '' || reason === ''} className="w-full bg-blue-600 py-6 rounded-2xl font-black uppercase italic text-lg disabled:opacity-30 text-white transition-opacity">
          {text.initiate}
        </button>
      </div>
    </div>
  );
};

export default function LandingPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [isLeasingModalOpen, setIsLeasingModalOpen] = useState(false);
  const [isOfficeOpen, setIsOfficeOpen] = useState(false);

  const text = t[lang];

  useEffect(() => {
    setMounted(true);
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

  const handleLeasingCall = async (visitorName: string, visitorPhone: string, email: string, reason: string) => {
    setIsLeasingModalOpen(false);
    try {
      await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          visitorName,
          visitorPhone: `+1${visitorPhone.replace(/\D/g, '')}`, 
          residentPhone: `+1${SITE_CONFIG.officePhone}`, 
          residentName: "Leasing Office",
          email,        
          reason        
        })
      });
      alert(lang === 'es' ? "¡Llamada iniciada!" : "Call initiated! Answer your phone.");
    } catch (e) {
      alert("Error. Please try again.");
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f0f4f8] dark:bg-[#0a0a0a] bg-[linear-gradient(to_right,#80808015_1px,transparent_1px),linear-gradient(to_bottom,#80808015_1px,transparent_1px)] bg-[size:24px_24px] text-gray-900 dark:text-white flex flex-col items-center font-sans overflow-hidden relative transition-colors duration-300">
      
      <div className="absolute top-6 right-6 flex items-center gap-3 z-10">
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 bg-white dark:bg-white/10 border-2 border-gray-200 dark:border-white/20 rounded-full hover:bg-gray-100 dark:hover:bg-white/20 transition-all shadow-sm">
          {theme === 'dark' ? <Sun size={18} className="text-white" /> : <Moon size={18} className="text-gray-800" />}
        </button>
        <button onClick={() => setLang(lang === 'en' ? 'es' : 'en')} className="flex items-center gap-2 bg-white dark:bg-white/10 border-2 border-gray-200 dark:border-white/20 px-4 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/20 transition-all shadow-sm">
          <Globe size={18} className="text-gray-800 dark:text-white" />
          <span className="font-black text-gray-800 dark:text-white">{text.toggleLang}</span>
        </button>
      </div>

      <LeasingPhoneModal isOpen={isLeasingModalOpen} onClose={() => setIsLeasingModalOpen(false)} onConfirm={handleLeasingCall} lang={lang} />

      <div className="w-full max-w-md p-6 flex flex-col items-center flex-grow pt-24">
       <div className="text-center mb-8 flex flex-col items-center">
          <img 
            src="/Logo.jpg" 
            alt="Property Logo" 
            className="h-20 sm:h-24 w-auto max-w-[85%] object-contain mx-auto mb-8 drop-shadow-md rounded-xl" 
          />
          <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400 mb-2">{text.welcome}</p>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white leading-none mb-2">{SITE_CONFIG.propertyName}</h1>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{SITE_CONFIG.propertyAddress}</p>
        </div>

        <div className="w-full flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 border-2 border-blue-500/50 bg-blue-50 dark:bg-blue-500/20 px-5 py-2 rounded-full">
            <span className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-700 dark:text-blue-100">{text.systemActive}</span>
          </div>
        </div>

        <div className="w-full space-y-5">
          <button onClick={() => router.push('/directory')} className="w-full bg-white dark:bg-[#111] border-2 border-blue-200 dark:border-blue-500/60 p-6 rounded-[2.5rem] flex items-center justify-between group hover:border-blue-400 dark:hover:bg-blue-900/30 transition-all shadow-sm">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-md dark:shadow-[0_0_20px_rgba(37,99,235,0.6)]">
                <Users size={28} className="text-white" />
              </div>
              <span className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white">{text.directory}</span>
            </div>
            <ChevronRight size={28} className="text-blue-500 dark:text-blue-400 group-hover:translate-x-2 transition-transform" />
          </button>

          <button onClick={() => isOfficeOpen ? setIsLeasingModalOpen(true) : null} className={`w-full bg-white dark:bg-[#111] border-2 p-6 rounded-[2.5rem] flex items-center justify-between transition-all shadow-sm ${!isOfficeOpen ? 'border-red-200 dark:border-red-900/50 opacity-60 cursor-not-allowed' : 'border-gray-200 dark:border-gray-500/60 hover:bg-gray-50 dark:hover:bg-white/10 cursor-pointer'}`}>
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Phone size={28} className={isOfficeOpen ? "text-gray-700 dark:text-white" : "text-gray-400"} />
              </div>
              <div className="text-left">
                <span className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white block leading-none">{text.callLeasing}</span>
                {!isOfficeOpen && <span className="text-xs font-bold uppercase tracking-widest text-red-500 dark:text-red-400 mt-2 block">{text.officeClosed}</span>}
              </div>
            </div>
            {isOfficeOpen && <ChevronRight size={28} className="text-gray-400" />}
          </button>

          <button onClick={() => router.push('/packages')} className="w-full bg-white dark:bg-[#111] border-2 border-gray-200 dark:border-gray-500/60 p-6 rounded-[2.5rem] flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-sm">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Package size={28} className="text-gray-700 dark:text-white" />
              </div>
              <span className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white">{text.packages}</span>
            </div>
            <ChevronRight size={28} className="text-gray-400" />
          </button>

          <button onClick={() => router.push('/emergency')} className="w-full bg-red-50 dark:bg-[#1a0505] border-2 border-red-200 dark:border-red-500/80 p-6 rounded-[2.5rem] flex items-center justify-between hover:bg-red-100 dark:hover:bg-red-900/50 transition-all mt-8 shadow-sm">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-600/20 rounded-full flex items-center justify-center border border-red-200 dark:border-red-500/50">
                <AlertTriangle size={28} className="text-red-600 dark:text-red-400" />
              </div>
              <span className="text-2xl font-black uppercase italic tracking-tighter text-red-600 dark:text-red-400">{text.emergency}</span>
            </div>
            <ChevronRight size={28} className="text-red-500" />
          </button>
        </div>

        <footer className="mt-auto py-10 flex items-center justify-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
          <ShieldCheck size={16} className="text-gray-500 dark:text-white" />
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 dark:text-white">{SITE_CONFIG.footerText}</span>
        </footer>
      </div>
    </div>
  );
}
