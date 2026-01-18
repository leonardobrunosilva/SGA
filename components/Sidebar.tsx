
import React from 'react';
import { PageType } from '../types';

interface SidebarProps {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, onLogout }) => {
  const navItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'Apreensoes', label: 'Apreensões', icon: 'fence' },
    { id: 'Destinacoes', label: 'Destinações', icon: 'output' },
    { id: 'Restituicao', label: 'Restituição', icon: 'assignment_return' },
    { id: 'Adocao', label: 'Adoção', icon: 'volunteer_activism' },
    { id: 'Prontuario', label: 'Prontuário Eletrônico', icon: 'medical_services' },
    { id: 'OutrosOrgaos', label: 'Outros Órgãos', icon: 'account_balance' },
    { id: 'RegiaoAdm', label: 'Região Adm', icon: 'map' },
  ];

  return (
    <aside className="no-print flex w-64 flex-col bg-sidebar-blue flex-shrink-0 z-20 overflow-y-auto h-screen fixed left-0 top-0 shadow-xl border-r border-white/5">
      <div className="flex h-full flex-col justify-between p-4">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 px-2 py-4 border-b border-white/10">
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12 border-2 border-primary/50 shadow-lg shadow-black/20"
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCzwStYdbgLLiqPuHT5UKxcWi9Fz1AaLnoR2H6HUK9Wu-7n-knNr_6Kkj3wOjofh_nfLqpM5RaDFQahkykN1dCLb-N4CdDkAKQ0fBMF62P6XUQyXaAcdoEpkI_BkKYHw_ZP_A_-mUX-kj8Q4VV-_ZojZaYn63zUpywH4bKom2MTfEjlc4j4dVj9lIRpYIVQQa3k5N5dn-S_F-XnXhOEAwMwUTVZbiIevctPnOhx9qUzF_K3nMzuikhCcZphEGZYFUwdDsFVw1TN2g")' }}
            ></div>
            <div className="flex flex-col text-left">
              <h1 className="text-white text-base font-bold leading-normal">Dr. Silva</h1>
              <p className="text-gray-300 text-[10px] font-black uppercase tracking-widest leading-normal opacity-70">Fiscal Agropecuário</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id as PageType)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 text-left group ${currentPage === item.id
                  ? 'bg-white/10 border-l-4 border-primary text-white font-black'
                  : 'text-gray-300 hover:bg-white/5 hover:text-white text-sm font-bold'
                  }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${currentPage === item.id ? 'text-primary' : 'text-gray-400 group-hover:text-white'}`}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto flex flex-col gap-4 px-2">
          {/* Status do Curral */}
          <div className="p-4 bg-black/30 rounded-2xl text-left border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Capacidade</p>
              <span className="text-[10px] font-black text-primary">75%</span>
            </div>
            <div className="w-full bg-black/40 rounded-full h-1.5 mb-2 overflow-hidden">
              <div className="bg-primary h-1.5 rounded-full" style={{ width: '75%' }}></div>
            </div>
            <p className="text-[11px] text-white font-black uppercase tracking-tight">45 / 80 Animais</p>
          </div>

          {/* Botão de Logout */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all font-black text-xs uppercase tracking-widest group border border-transparent hover:border-red-500/20 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[20px] group-hover:rotate-180 transition-transform duration-500">logout</span>
            Sair do Sistema
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
