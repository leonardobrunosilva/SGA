
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

  // Estados para Busca Global (Dossiê)
  const [searchGlobalChip, setSearchGlobalChip] = useState('');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [animalTimeline, setAnimalTimeline] = useState<any[]>([]);
  const [isSearchingHistory, setIsSearchingHistory] = useState(false);

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
          supabase.from('worklist_outros').select('*', { count: 'exact', head: true }).neq('status', 'FAL')
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

  const handleGlobalSearch = async () => {
    if (!searchGlobalChip.trim()) return;

    setIsSearchingHistory(true);
    try {
      // Busca nas Apreensões
      const { data: entradas, error: errEntradas } = await supabase
        .from('apreensoes')
        .select('*')
        .eq('chip', searchGlobalChip.trim());

      // Busca nas Saídas
      const { data: saidas, error: errSaidas } = await supabase
        .from('saidas')
        .select('*')
        .eq('chip', searchGlobalChip.trim());

      if (errEntradas) throw errEntradas;
      if (errSaidas) throw errSaidas;

      const entradasMapped = (entradas || []).map(item => ({
        ...item,
        tipo_registro: 'ENTRADA',
        data_relevante: item.date_in
      }));

      const saidasMapped = (saidas || []).map(item => ({
        ...item,
        tipo_registro: 'SAIDA',
        data_relevante: item.date_out
      }));

      const combined = [...entradasMapped, ...saidasMapped];

      if (combined.length === 0) {
        alert('Nenhum histórico encontrado para o chip informado.');
        setIsSearchingHistory(false);
        return;
      }

      // Ordenar cronologicamente do mais recente para o mais antigo
      combined.sort((a, b) => {
        const dateA = new Date(a.data_relevante || 0).getTime();
        const dateB = new Date(b.data_relevante || 0).getTime();
        return dateB - dateA;
      });

      setAnimalTimeline(combined);
      setIsHistoryModalOpen(true);
    } catch (error) {
      console.error('Erro na busca global:', error);
      alert('Erro ao buscar histórico do animal.');
    } finally {
      setIsSearchingHistory(false);
    }
  };

  return (
    <>
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

            {/* Busca Global */}
            <div className="px-4 pb-4 border-b border-white/10">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Dossiê por Chip..."
                  value={searchGlobalChip}
                  onChange={(e) => setSearchGlobalChip(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch()}
                  className="w-full bg-black/20 text-white placeholder-white/40 text-[11px] font-bold uppercase tracking-wider rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-1 focus:ring-primary/50 transition-all border border-white/5"
                />
                <span className="material-symbols-outlined absolute left-3 top-3  text-[18px] text-white/40">search</span>
                {isSearchingHistory && (
                  <span className="material-symbols-outlined absolute right-3 top-3 text-[18px] text-white/40 animate-spin">refresh</span>
                )}
              </div>
            </div>

            <nav className="flex flex-col gap-1 p-4 pt-4">
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

          <div className="mt-auto flex flex-col gap-4 px-4 pb-4">
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

      {/* Modal Histórico (Dossiê) */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header do Modal */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 tracking-tighter">
                  <span className="material-symbols-outlined text-gdf-blue">history</span>
                  Dossiê do Animal - Chip: {searchGlobalChip}
                </h2>
                <p className="text-sm text-gray-500 font-medium mt-1">Histórico completo de incidentes.</p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                title="Fechar"
              >
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>

            {/* Corpo do Modal (Timeline) */}
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              <div className="relative border-l-2 border-gray-200 ml-4 py-2 flex flex-col gap-8">
                {animalTimeline.map((item, index) => {
                  const isEntrada = item.tipo_registro === 'ENTRADA';
                  // Evita bug de D-1 por timezone em strings "YYYY-MM-DD"
                  const safeDateStr = item.data_relevante && !item.data_relevante.includes('T')
                    ? `${item.data_relevante}T12:00:00`
                    : item.data_relevante;
                  const dataRender = safeDateStr ? new Date(safeDateStr).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'N/I';

                  let borderColor = 'border-l-blue-500';
                  let textColor = 'text-blue-500';
                  let bgBadge = 'bg-blue-50 text-blue-700';

                  if (!isEntrada) {
                    if (item.destination?.includes('Eutanásia') || item.destination?.includes('Óbito')) {
                      borderColor = 'border-l-red-500';
                      textColor = 'text-red-500';
                      bgBadge = 'bg-red-50 text-red-700';
                    } else {
                      borderColor = 'border-l-emerald-500';
                      textColor = 'text-emerald-500';
                      bgBadge = 'bg-emerald-50 text-emerald-700';
                    }
                  }

                  return (
                    <div key={index} className="relative pl-8 animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                      <div className={`absolute -left-[17px] top-2 p-1.5 rounded-full border-4 border-gray-50 bg-white shadow-sm ${textColor}`}>
                        <span className="material-symbols-outlined text-[16px] font-bold">
                          {isEntrada ? 'login' : 'logout'}
                        </span>
                      </div>

                      <div className={`bg-white rounded-xl shadow-sm border-l-4 p-5 ${borderColor}`}>
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            {isEntrada ? 'Apreensão (Entrada)' : `Destinação / Saída`}
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${bgBadge}`}>
                              {isEntrada ? (item.status || 'Admitido') : (item.destination || 'N/I')}
                            </span>
                          </h3>
                          <span className="text-xs font-black text-gray-400 bg-gray-100 border border-gray-200 px-2 py-1.5 rounded-md flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                            {dataRender}
                          </span>
                        </div>

                        {isEntrada ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <span className="text-gray-400 font-bold uppercase tracking-wider block mb-1">Solicitante:</span>
                              <p className="font-bold text-slate-700">{item.organ || 'N/I'}</p>
                            </div>
                            <div>
                              <span className="text-gray-400 font-bold uppercase tracking-wider block mb-1">RA (Origem):</span>
                              <p className="font-bold text-slate-700">{item.origin || 'N/I'}</p>
                            </div>
                            <div className="md:col-span-2">
                              <span className="text-gray-400 font-bold uppercase tracking-wider block mb-1">Ordem de Serviço (OS):</span>
                              <p className="font-mono font-medium text-slate-700">{item.os_number || 'N/I'}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div className="md:col-span-2">
                              <span className="text-gray-400 font-bold uppercase tracking-wider block mb-1">Responsável:</span>
                              <p className="font-bold text-slate-700">{item.receiver_name || 'N/I'} <span className="font-normal text-gray-500">{item.receiver_cpf ? `(${item.receiver_cpf})` : ''}</span></p>
                            </div>
                            <div>
                              <span className="text-gray-400 font-bold uppercase tracking-wider block mb-1">Proc. SEI:</span>
                              <p className="font-mono font-medium text-slate-700">{item.sei_process || 'N/I'}</p>
                            </div>
                            <div>
                              <span className="text-gray-400 font-bold uppercase tracking-wider block mb-1">Nº O.S.:</span>
                              <p className="font-mono font-medium text-slate-700">{item.os_number || 'N/I'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
