
import React, { useState, useEffect } from 'react';
import { PageType } from '../types';
import { supabase } from '../supabaseClient';

interface SidebarProps {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, onLogout }) => {
  const [profile, setProfile] = useState<{ nome: string; avatarUrl: string; cargo: string } | null>(null);
  const [capacity, setCapacity] = useState({ total: 0, percent: 0, status: 'Normal', color: 'text-blue-400', barColor: 'bg-blue-500' });
  const MAX_CAPACITY = 80;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // 1. Perfil do Usuário
          const { data: profileData } = await supabase
            .from('profiles')
            .select('nome, avatar_url, cargo')
            .eq('id', user.id)
            .single();

          if (profileData) {
            setProfile({
              nome: profileData.nome || user.email?.split('@')[0] || 'Usuário',
              avatarUrl: profileData.avatar_url || '',
              cargo: profileData.cargo || 'Servidor'
            });
          }
        }

        // 2. Capacidade Dinâmica
        const [adocao, restituicao, outros] = await Promise.all([
          supabase.from('worklist_adocao').select('*', { count: 'exact', head: true }),
          supabase.from('worklist_restituicao').select('*', { count: 'exact', head: true }),
          supabase.from('worklist_outros').select('*', { count: 'exact', head: true })
        ]);

        const total = (adocao.count || 0) + (restituicao.count || 0) + (outros.count || 0);
        const percent = (total / MAX_CAPACITY) * 100;

        let status = 'Normal';
        let color = 'text-blue-400';
        let barColor = 'bg-blue-500';

        if (percent <= 40) {
          status = 'Baixa';
          color = 'text-teal-400';
          barColor = 'bg-teal-500';
        } else if (percent <= 60) {
          status = 'Normal';
          color = 'text-blue-400';
          barColor = 'bg-blue-500';
        } else if (percent <= 80) {
          status = 'Máxima';
          color = 'text-orange-400';
          barColor = 'bg-orange-500';
        } else {
          status = 'Crítica';
          color = 'text-red-500';
          barColor = 'bg-red-600';
        }

        setCapacity({ total, percent, status, color, barColor });

      } catch (error) {
        console.error('Erro ao carregar dados da sidebar:', error);
      }
    };

    fetchData();
  }, []);

  const navItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'Apreensoes', label: 'Apreensões', icon: 'fence' },
    { id: 'Destinacoes', label: 'Destinações', icon: 'output' },
    { id: 'Restituicao', label: 'Restituição', icon: 'assignment_return' },
    { id: 'Adocao', label: 'Adoção', icon: 'volunteer_activism' },
    { id: 'Prontuario', label: 'Prontuário Eletrônico', icon: 'medical_services' },
    { id: 'OutrosOrgaos', label: 'Outros Órgãos', icon: 'account_balance' },
    { id: 'Exames', label: 'Controle de Exames', icon: 'science' },
  ];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <aside className="no-print flex w-64 flex-col bg-sidebar-blue flex-shrink-0 z-20 overflow-y-auto h-screen fixed left-0 top-0 shadow-xl border-r border-white/5">
      <div className="flex h-full flex-col justify-between p-4">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 px-2 py-4 border-b border-white/10">
            {profile?.avatarUrl ? (
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12 border-2 border-primary/50 shadow-lg shadow-black/20 transition-transform hover:scale-105"
                style={{ backgroundImage: `url("${profile.avatarUrl}")` }}
              ></div>
            ) : (
              <div className="size-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 border-2 border-primary/50 flex items-center justify-center shadow-lg shadow-black/20 transition-transform hover:scale-105">
                <span className="text-primary font-black text-sm tracking-tighter">
                  {profile ? getInitials(profile.nome) : '...'}
                </span>
              </div>
            )}
            <div className="flex flex-col text-left truncate">
              <h1 className="text-white text-sm font-bold leading-normal truncate">{profile?.nome || 'Carregando...'}</h1>
              <p className="text-white/50 text-[9px] font-black uppercase tracking-widest leading-normal truncate">{profile?.cargo || '---'}</p>
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
          {/* Status do Curral Dinâmico */}
          <div className="p-4 bg-black/30 rounded-2xl text-left border border-white/5 relative overflow-hidden group">
            <div className="flex justify-between items-center mb-2">
              <p className="text-[9px] text-white/40 font-black uppercase tracking-widest leading-none">Capacidade {capacity.status}</p>
              <span className={`text-[11px] font-black ${capacity.color} tabular-nums`}>{capacity.percent.toFixed(0)}%</span>
            </div>

            <div className="w-full bg-white/5 rounded-full h-1.5 mb-2 overflow-hidden ring-1 ring-white/5">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${capacity.barColor}`}
                style={{ width: `${Math.min(capacity.percent, 100)}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center mt-1">
              <p className="text-[10px] text-white/70 font-black tracking-tight">{capacity.total} / {MAX_CAPACITY} Animais</p>
              {capacity.percent > 100 && (
                <span className="text-[9px] text-red-500 font-black animate-pulse">
                  +{(capacity.percent - 100).toFixed(0)}% ACIMA
                </span>
              )}
            </div>
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
