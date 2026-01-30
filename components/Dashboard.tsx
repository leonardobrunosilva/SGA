
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell } from 'recharts';
import { supabase } from '../supabaseClient';
import { apreensoesService } from '../services/apreensoesService';
import { saidasService } from '../services/saidasService';

const Dashboard: React.FC = () => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [albergadosCount, setAlbergadosCount] = useState(0);
  const MAX_CAPACITY = 80;
  const [metrics, setMetrics] = useState<any[]>([]);

  const [organsData, setOrgansData] = useState<any[]>([]);
  const [flowData, setFlowData] = useState<any[]>([]);

  const years = [2024, 2025, 2026];
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [customPeriod, setCustomPeriod] = useState({ start: '', end: '' });

  const [appliedFilters, setAppliedFilters] = useState({
    year: '',
    month: '',
    period: { start: '', end: '' }
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Basic Metrics via Promise.all
        const [
          { count: totalApreensoes },
          { count: activeAdocao },
          { count: activeRestituicao },
          { count: activeOutros },
          { count: hvetAdocao },
          { count: hvetRestituicao },
          { count: hvetOutros },
          { count: histAdocao },
          { count: histRestituicao },
          { count: histObito },
          { count: histFurto }
        ] = await Promise.all([
          // Apreensões (Estoque Total Histórico)
          supabase.from('apreensoes').select('*', { count: 'exact', head: true }),

          // Worklists (Saldos Atuais)
          supabase.from('worklist_adocao').select('*', { count: 'exact', head: true }),
          supabase.from('worklist_restituicao').select('*', { count: 'exact', head: true }),
          supabase.from('worklist_outros').select('*', { count: 'exact', head: true }),

          // HVET (Contagem exata do status "HVET" nas worklists)
          supabase.from('worklist_adocao').select('*', { count: 'exact', head: true }).eq('status', 'HVET'),
          supabase.from('worklist_restituicao').select('*', { count: 'exact', head: true }).eq('status', 'HVET'),
          supabase.from('worklist_outros').select('*', { count: 'exact', head: true }).eq('status', 'HVET'),

          // Destinações (Histórico de Saídas - filtros exatos conforme feedback)
          supabase.from('saidas').select('*', { count: 'exact', head: true }).or('destination.eq.Adoção,destination.eq.Adotado,destination.eq.Adotados'),
          supabase.from('saidas').select('*', { count: 'exact', head: true }).or('destination.eq.Restituído,destination.eq.Restituição,destination.eq.Restituidos'),
          supabase.from('saidas').select('*', { count: 'exact', head: true }).or('destination.eq.Eutanásia,destination.eq.Óbito'),
          supabase.from('saidas').select('*', { count: 'exact', head: true }).eq('destination', 'Furto')
        ]);

        const albergadosTotal = (activeAdocao || 0) + (activeRestituicao || 0) + (activeOutros || 0);
        const hvetTotal = (hvetAdocao || 0) + (hvetRestituicao || 0) + (hvetOutros || 0);

        setAlbergadosCount(albergadosTotal);
        setMetrics([
          { label: 'Total Apreendidos', value: (totalApreensoes || 0).toLocaleString(), change: '+0%', icon: 'fence', color: 'blue' },
          { label: 'Albergados (Saldo Atual)', value: (albergadosTotal || 0).toLocaleString(), change: '+0%', icon: 'home', color: 'green' },
          {
            label: 'Restituídos',
            value: (histRestituicao || 0).toLocaleString(),
            change: '+0%',
            icon: 'assignment_return',
            color: 'blue',
            subLabel: `Disponíveis: ${activeRestituicao || 0}`
          },
          {
            label: 'Adotados',
            value: (histAdocao || 0).toLocaleString(),
            change: '+0%',
            icon: 'volunteer_activism',
            color: 'purple',
            subLabel: `Disponíveis: ${activeAdocao || 0}`
          },
          { label: 'Eutanásia/Óbito', value: (histObito || 0).toLocaleString(), change: '+0%', icon: 'medical_services', color: 'red' },
          { label: 'Furtos', value: (histFurto || 0).toLocaleString(), change: '0%', icon: 'warning', color: 'orange' },
          { label: 'HVET', value: (hvetTotal || 0).toLocaleString(), change: '+0%', icon: 'local_hospital', color: 'cyan' },
          { label: 'Outros Órgãos', value: (activeOutros || 0).toLocaleString(), change: '+0%', icon: 'account_balance', color: 'indigo' },
        ]);

        // 2. Fetch All Data for Charts (Frontend Aggregation)
        const [
          { data: allEntries },
          { data: allExits }
        ] = await Promise.all([
          supabase.from('apreensoes').select('date_in, organ'),
          supabase.from('saidas').select('dateOut, destination')
        ]);

        // Process Organ Distribution (Top 5)
        const organCounts: Record<string, number> = {};
        allEntries?.forEach(e => {
          const org = e.organ || 'Outros';
          organCounts[org] = (organCounts[org] || 0) + 1;
        });

        const sortedOrgans = Object.entries(organCounts)
          .map(([name, val]) => ({ name, val }))
          .sort((a, b) => b.val - a.val)
          .slice(0, 5)
          .map((item, idx) => ({
            ...item,
            color: ['#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777'][idx % 5]
          }));
        setOrgansData(sortedOrgans);

        // Process Monthly Data (Fluxo e Evolução)
        const monthsLabel = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const monthlyStats = monthsLabel.map(m => ({
          month: m,
          in: 0,
          out: 0,
          restituicao: 0,
          adocao: 0
        }));

        // Aggregate Entries
        allEntries?.forEach(e => {
          const dateStr = e.date_in;
          if (!dateStr) return;
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return;
          const monthIdx = date.getMonth();
          if (monthlyStats[monthIdx]) {
            monthlyStats[monthIdx].in += 1;
          }
        });

        // Aggregate Exits
        allExits?.forEach(s => {
          const dateStr = s.dateOut;
          if (!dateStr) return;
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return;
          const monthIdx = date.getMonth();
          if (monthlyStats[monthIdx]) {
            monthlyStats[monthIdx].out += 1;

            const dest = (s.destination || '').toLowerCase();
            if (dest.includes('restitu')) {
              monthlyStats[monthIdx].restituicao += 1;
            } else if (dest.includes('ado')) {
              monthlyStats[monthIdx].adocao += 1;
            }
          }
        });

        setFlowData(monthlyStats);

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [appliedFilters]);

  // Lógica para o Gráfico de Indicadores Anuais
  const [chartView, setChartView] = useState<'Apreendido' | 'Restituído' | 'Adotado'>('Apreendido');

  const annualChartData = useMemo(() => {
    return flowData.map(f => ({
      name: f.month,
      val: chartView === 'Apreendido' ? f.in :
        chartView === 'Restituído' ? f.restituicao :
          f.adocao
    }));
  }, [flowData, chartView]);

  const monthlyFlowData = flowData;

  const handleApplyFilters = () => {
    setAppliedFilters({
      year: selectedYear,
      month: selectedMonth,
      period: customPeriod
    });
    setIsFilterOpen(false);
  };

  const handleClearFilters = () => {
    setSelectedYear('');
    setSelectedMonth('');
    setCustomPeriod({ start: '', end: '' });
    setAppliedFilters({
      year: '',
      month: '',
      period: { start: '', end: '' }
    });
    setIsFilterOpen(false);
  };


  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header com Título e Filtro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1 text-left">
          <h2 className="text-3xl font-black tracking-tight text-slate-800">Visão Geral do Sistema</h2>
          <p className="text-slate-500 text-sm">Acompanhamento em tempo real dos indicadores de apreensão e fluxo de animais.</p>
        </div>
        <button
          onClick={() => setIsFilterOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg border-2 border-slate-200 bg-white px-5 py-2.5 text-slate-600 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]">filter_list</span>
          Filtrar Dados
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg ${m.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                m.color === 'green' ? 'bg-green-50 text-green-600' :
                  m.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                    m.color === 'red' ? 'bg-red-50 text-red-600' :
                      m.color === 'orange' ? 'bg-orange-50 text-orange-600' :
                        m.color === 'cyan' ? 'bg-cyan-50 text-cyan-600' :
                          m.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                            'bg-gray-100 text-gray-600'
                }`}>
                <span className="material-symbols-outlined">{m.icon}</span>
              </div>
              <span className={`flex items-center text-xs font-bold px-2 py-1 rounded ${m.change.startsWith('+') ? 'text-green-700 bg-green-50' : m.change === '0%' ? 'text-gray-500 bg-gray-50' : 'text-red-600 bg-red-50'
                }`}>
                {m.change}
              </span>
            </div>
            <p className="text-gray-500 text-sm font-medium">{m.label}</p>
            <h3 className="text-3xl font-bold text-gray-900 mt-1 group-hover:text-blue-600 transition-colors">{m.value}</h3>
            {m.subLabel && (
              <p className="text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-tight">{m.subLabel}</p>
            )}
          </div>
        ))}
      </div>

      {/* Row 2: Occupancy and Monthly Flow */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:16px_16px]"></div>
          <div className="relative z-10">
            {/* Lógica de Ocupação */}
            {(() => {
              const occupancyRate = (albergadosCount / MAX_CAPACITY) * 100;
              const isOverCapacity = albergadosCount > MAX_CAPACITY;
              const excessPercentage = isOverCapacity ? ((albergadosCount - MAX_CAPACITY) / MAX_CAPACITY) * 100 : 0;

              let statusLabel = "Normal";
              let statusColor = "text-green-600 bg-green-100 border-green-200";

              if (occupancyRate > 90) {
                statusLabel = "Capacidade Crítica";
                statusColor = "text-red-600 bg-red-100 border-red-200";
              } else if (occupancyRate > 70) {
                statusLabel = "Atenção";
                statusColor = "text-amber-600 bg-amber-100 border-amber-200";
              }

              return (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-gray-900 text-lg font-bold">Ocupação do Curral</h3>
                    <span className={`flex size-2 rounded-full ${occupancyRate > 90 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                  </div>
                  <p className="text-gray-500 text-sm mb-6 uppercase font-bold tracking-wider">Lotação: {albergadosCount} / {MAX_CAPACITY} Animais</p>

                  <div className="flex items-end justify-between mb-2">
                    <div className="flex flex-col">
                      <span className="text-4xl font-black text-gray-900">{Math.round(occupancyRate)}%</span>
                      {isOverCapacity && (
                        <span className="text-[10px] font-black text-red-600 uppercase tracking-tighter">
                          +{Math.round(excessPercentage)}% acima do limite
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-black px-2 py-1 rounded mb-1 border uppercase tracking-wider ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>

                  <div className="relative h-6 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-inner">
                    {/* Barra de Progresso Real */}
                    <div
                      className="h-full bg-gradient-to-r from-green-500 via-yellow-400 to-red-500 transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                    ></div>

                    {/* Barra de Excesso (Superlotação) */}
                    {isOverCapacity && (
                      <div
                        className="absolute top-0 left-0 h-full bg-red-600/30 animate-pulse"
                        style={{ width: '100%' }}
                      ></div>
                    )}

                    {/* Marcador de 100% (80 Animais) */}
                    <div className="absolute top-0 bottom-0 left-[100%] w-0.5 bg-slate-900 z-20 shadow-[0_0_8px_rgba(0,0,0,0.5)]">
                      <div className="absolute -top-1 -left-1 size-2 rounded-full bg-slate-900"></div>
                      <div className="absolute -bottom-1 -left-1 size-2 rounded-full bg-slate-900"></div>
                    </div>
                  </div>

                  <div className="flex justify-between mt-3 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                    <span>Vazio</span>
                    <span className="text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Limite: 80</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        <div className="xl:col-span-2 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-gray-900 text-lg font-bold">Fluxo Mensal</h3>
              <p className="text-gray-500 text-sm">Comparativo de Entradas vs Saídas em {appliedFilters.year || 'Todos os Anos'}</p>
            </div>
            <div className="flex gap-4 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-[#13ec80]"></div>
                <span className="text-slate-600">Entradas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-[#cbd5e1]"></div>
                <span className="text-slate-600">Saídas</span>
              </div>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyFlowData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="out" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={14} name="Saídas" />
                <Bar dataKey="in" fill="#13ec80" radius={[4, 4, 0, 0]} barSize={14} name="Entradas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Annual Indicators and Distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
            <div>
              <h3 className="text-gray-900 text-lg font-bold">Evolução de {chartView}s</h3>
              <p className="text-gray-500 text-sm">Distribuição de ocorrências em {appliedFilters.year || 'Todos os Anos'}</p>
            </div>
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setChartView('Apreendido')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${chartView === 'Apreendido' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Apreensões
              </button>
              <button
                onClick={() => setChartView('Restituído')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${chartView === 'Restituído' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Restituições
              </button>
              <button
                onClick={() => setChartView('Adotado')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${chartView === 'Adotado' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Adoções
              </button>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={annualChartData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartView === 'Apreendido' ? '#13ec80' : chartView === 'Restituído' ? '#3b82f6' : '#8b5cf6'} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={chartView === 'Apreendido' ? '#13ec80' : chartView === 'Restituído' ? '#3b82f6' : '#8b5cf6'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke={chartView === 'Apreendido' ? '#13ec80' : chartView === 'Restituído' ? '#3b82f6' : '#8b5cf6'}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorVal)"
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-gray-900 text-lg font-bold">Distribuição por Órgãos</h3>
              <p className="text-gray-500 text-sm">Quantidade Total de Animais por órgão</p>
            </div>
          </div>
          <div className="space-y-5">
            {organsData.map((o) => (
              <div key={o.name} className="flex items-center gap-4">
                <div className="w-16 text-xs font-semibold text-gray-600 text-right">{o.name}</div>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: organsData[0].val > 0 ? `${(o.val / organsData[0].val) * 100}%` : '0%', backgroundColor: o.color }}></div>
                </div>
                <div className="w-10 text-right text-xs font-bold text-gray-900">{o.val}</div>
              </div>
            ))}
          </div>
          <button className="w-full mt-8 py-2 text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center justify-center gap-1 border border-blue-100 rounded-lg hover:bg-blue-50 transition-all">
            Ver Detalhes Completos <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Modal de Filtros Avançados */}
      {isFilterOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Background semitransparente com blur */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsFilterOpen(false)}
          ></div>

          {/* Card do Filtro */}
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">tune</span>
                Filtros Avançados
              </h3>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-slate-400 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ano</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm focus:border-gdf-blue outline-none transition-all"
                  >
                    <option value="">Selecione o Ano</option>
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mês</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm focus:border-gdf-blue outline-none transition-all"
                  >
                    <option value="">Selecione o Mês</option>
                    {months.map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Período Personalizado</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[18px]">calendar_today</span>
                    <input
                      type="date"
                      value={customPeriod.start}
                      onChange={(e) => setCustomPeriod({ ...customPeriod, start: e.target.value })}
                      className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:border-gdf-blue outline-none"
                      placeholder="De"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[18px]">calendar_today</span>
                    <input
                      type="date"
                      value={customPeriod.end}
                      onChange={(e) => setCustomPeriod({ ...customPeriod, end: e.target.value })}
                      className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:border-gdf-blue outline-none"
                      placeholder="Até"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={handleClearFilters}
                className="flex-1 px-6 py-3 bg-white border border-gray-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-gray-100 transition-all shadow-sm"
              >
                Limpar
              </button>
              <button
                onClick={handleApplyFilters}
                className="flex-1 px-6 py-3 bg-gdf-blue text-white text-sm font-black rounded-xl hover:bg-gdf-blue-dark transition-all shadow-lg shadow-blue-900/20"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
