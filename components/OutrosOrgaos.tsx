
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell } from 'recharts';
import { apreensoesService } from '../services/apreensoesService';

// Status Options
const STATUS_OPTIONS = ['Curral de Apreensão', 'HVET', 'Experimento'];

// Chart Data (Mock)
const DATA_ORGAOS = [
  { name: 'Bat. Rural', val: 85 },
  { name: 'DER-DF', val: 45 },
  { name: 'Zoonoses', val: 30 },
  { name: 'GDF', val: 65 },
];

const DATA_PERMANENCIA = [
  { month: 'Jan', dias: 12 },
  { month: 'Fev', dias: 10 },
  { month: 'Mar', dias: 11 },
  { month: 'Abr', dias: 8 },
  { month: 'Mai', dias: 5 },
  { month: 'Jun', dias: 6 },
];

// Animal Interface
interface AnimalItem {
  id: string;
  chip: string;
  especie: string;
  sexo: string;
  pelagem: string;
  observacoes: string;
  os: string;
  dataEntrada: string;
  status: string;
  orgao: string;
}

const STORAGE_KEY = 'outros_orgaos_lista';

const OutrosOrgaos: React.FC = () => {
  // --- STATE ---
  const [animals, setAnimals] = useState<AnimalItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
      }
    }
    return [];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [newStatus, setNewStatus] = useState(STATUS_OPTIONS[0]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [foundEntry, setFoundEntry] = useState<any>(null);

  // Multi-entry modal
  const [multipleEntries, setMultipleEntries] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- PERSISTENCE ---
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(animals));
  }, [animals]);

  // --- HELPERS ---
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const calculateDaysIn = (dateStr: string): number => {
    if (!dateStr) return 0;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return 0;
    const entryDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - entryDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // --- ACTIONS ---
  const addAnimalToList = (entry: any) => {
    // Handle both DB_ENTRADAS format (PT) and Supabase format (EN)
    const chip = String(entry.chip || entry['CHIP'] || '');
    const dateIn = entry.dateIn || entry.date_in || entry['Data de Entrada'] || '-';

    // Format date if it's ISO format (YYYY-MM-DD)
    const formattedDate = dateIn.includes('-')
      ? dateIn.split('-').reverse().join('/')
      : dateIn;

    if (animals.some(a => a.chip === chip && a.dataEntrada === formattedDate)) {
      showNotification("Este registro já está na lista.", "info");
      return;
    }

    const newAnimal: AnimalItem = {
      id: String(Date.now()),
      chip: chip,
      especie: entry.specie || entry['Espécie'] || 'Desconhecido',
      sexo: entry.gender || entry['Sexo'] || '-',
      pelagem: entry.color || entry['Pelagem'] || '-',
      observacoes: entry.observations || entry['Observações'] || entry['Observações Complementares'] || '',
      os: entry.osNumber || entry.os_number || entry['Ordem de Serviço (OS)'] || '-',
      dataEntrada: formattedDate,
      status: newStatus,
      orgao: entry.organ || entry['Órgão'] || entry.origin || entry['Região Administrativa'] || 'Não informado',
    };

    setAnimals(prev => [newAnimal, ...prev]);
    setSearchTerm('');
    setFoundEntry(null);
    setIsModalOpen(false);
    showNotification("Animal adicionado à lista!", "success");
  };

  // Search preview (async with Supabase)
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      showNotification("Digite o número do CHIP.", "info");
      return;
    }

    try {
      const entries = await apreensoesService.getByChip(searchTerm.trim());

      if (entries.length === 0) {
        setFoundEntry(null);
        showNotification("Animal não encontrado.", "error");
      } else if (entries.length === 1) {
        setFoundEntry(entries[0]);
        showNotification(`Animal encontrado: ${entries[0].specie}`, "success");
      } else {
        // Multiple entries - open modal for selection
        setMultipleEntries(entries);
        setIsModalOpen(true);
      }
    } catch (error) {
      showNotification("Erro ao buscar no banco de dados.", "error");
      console.error(error);
    }
  };

  // Add from preview or modal
  const handleAdd = () => {
    if (!foundEntry) {
      showNotification("Busque um animal primeiro.", "info");
      return;
    }
    addAnimalToList(foundEntry);
  };

  const handleSelectEntry = (entry: any) => {
    setFoundEntry(entry);
    setIsModalOpen(false);
    showNotification(`Selecionado: ${entry['Espécie']} - ${entry['Data de Entrada']}`, "success");
  };

  const handleRemove = (id: string) => {
    setAnimals(prev => prev.filter(a => a.id !== id));
    showNotification("Animal removido da lista.", "info");
  };

  // --- KPI CALCULATIONS ---
  const totalAnimals = animals.length;
  const avgStay = animals.length > 0
    ? Math.round(animals.reduce((sum, a) => sum + calculateDaysIn(a.dataEntrada), 0) / animals.length)
    : 0;

  // --- DYNAMIC CHART DATA ---
  const chartDataOrgaos = useMemo(() => {
    const grouped: Record<string, number> = {};
    animals.forEach(a => {
      const orgao = a.orgao || 'Não informado';
      grouped[orgao] = (grouped[orgao] || 0) + 1;
    });
    return Object.entries(grouped).map(([name, val]) => ({ name, val }));
  }, [animals]);

  // --- PAGINATION ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAnimals = animals.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(animals.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in text-left">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-fade-in-up ${notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
          <span className="material-symbols-outlined">
            {notification.type === 'success' ? 'check_circle' : notification.type === 'error' ? 'error' : 'info'}
          </span>
          <p className="text-sm font-black">{notification.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm">
          <a className="text-gray-500 hover:text-gdf-blue transition-colors" href="#">Home</a>
          <span className="text-gray-400">/</span>
          <span className="text-gdf-blue font-bold">Animais de Outros Órgãos</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Animais de Outros Órgãos</h2>
            <p className="text-gray-500 text-base max-w-2xl">
              Controle e gestão de semoventes de grande porte pertencentes ou sob responsabilidade de órgãos parceiros.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-3 relative overflow-hidden shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start z-10">
            <div className="flex flex-col gap-1">
              <p className="text-gray-500 text-sm font-medium">Animais de Outros Órgãos</p>
              <h3 className="text-3xl font-bold text-slate-800">{totalAnimals}</h3>
            </div>
            <div className="size-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined">pets</span>
            </div>
          </div>
          <div className="h-1 w-full bg-gray-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${Math.min(totalAnimals * 5, 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-3 relative overflow-hidden shadow-sm hover:shadow-md transition-all group">
          <div className="flex justify-between items-start z-10">
            <div className="flex flex-col gap-1">
              <p className="text-gray-500 text-sm font-medium">Tempo Médio (dias)</p>
              <h3 className="text-3xl font-bold text-slate-800">{avgStay}</h3>
            </div>
            <div className="size-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
              <span className="material-symbols-outlined">schedule</span>
            </div>
          </div>
          <div className="h-1 w-full bg-gray-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-orange-400" style={{ width: `${Math.min(avgStay * 3, 100)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Inclusion Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-slate-800 font-bold text-lg mb-4">Nova Inclusão</h3>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 relative">
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Buscar por CHIP</label>
            <div className="relative">
              <input
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setFoundEntry(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className={`w-full border ${foundEntry ? 'border-green-500 bg-green-50' : 'border-gray-300'} rounded-lg pl-3 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-gdf-blue transition-all`}
                placeholder="Ex: 982000..."
              />
              <button type="button" onClick={handleSearch} className="absolute right-2 top-2 text-gray-400 hover:text-gdf-blue transition-colors">
                <span className="material-symbols-outlined">search</span>
              </button>
            </div>
            {/* Preview */}
            {foundEntry && (
              <p className="absolute top-full left-0 mt-1 text-xs text-green-700 font-bold whitespace-nowrap">
                Selecionado: {foundEntry.specie || foundEntry['Espécie']} - {foundEntry.dateIn || foundEntry.date_in || foundEntry['Data de Entrada']}
              </p>
            )}
          </div>
          <div className="w-full md:w-48">
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Status Inicial</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-gdf-blue transition-all"
            >
              {STATUS_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
            </select>
          </div>
          <button
            onClick={handleAdd}
            disabled={!foundEntry}
            className={`flex items-center justify-center gap-2 h-11 px-6 rounded-lg font-bold transition-all shadow-lg active:scale-95 ${foundEntry ? 'bg-gdf-blue hover:bg-blue-800 text-white shadow-blue-900/20' : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'}`}
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Incluir
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex flex-col gap-4 bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-slate-800 font-bold text-lg">Lista de Trabalho</h3>
            <p className="text-gray-500 text-sm">Animais incluídos manualmente para gestão</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Órgão / Origem</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Animal / Detalhes</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">CHIP</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Observações</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">O.S.</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Entrada</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estadia</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {currentAnimals.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400 italic">Nenhum animal na lista.</td></tr>
              ) : (
                currentAnimals.map((row) => (
                  <tr key={row.id} className="group hover:bg-blue-50/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-bold text-slate-700">{row.orgao}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{row.especie}</span>
                        <span className="text-xs text-gray-500">{row.sexo} • {row.pelagem}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gdf-blue font-mono font-bold">{row.chip}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={row.observacoes}>{row.observacoes || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">{row.os}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{row.dataEntrada}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-orange-600">{calculateDaysIn(row.dataEntrada)} dias</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tight bg-blue-100 text-blue-700 border border-blue-200">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button className="text-gray-400 hover:text-gdf-blue transition-colors p-1.5 rounded-lg hover:bg-blue-50" title="Visualizar">
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                        <button className="text-gray-400 hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-green-50" title="Editar">
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button onClick={() => handleRemove(row.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50" title="Excluir">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {animals.length > 0 && (
          <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-200 flex justify-between items-center text-xs text-slate-500">
            <p>Exibindo <span className="font-bold text-slate-900">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, animals.length)}</span> de <span className="font-bold text-slate-900">{animals.length}</span></p>
            <div className="flex gap-1">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}
                className={`px-2 py-1 rounded border border-gray-200 bg-white transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                Anterior
              </button>
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                  return (
                    <button key={page} onClick={() => handlePageChange(page)}
                      className={`px-2 py-1 rounded border ${currentPage === page ? 'border-gdf-blue bg-gdf-blue text-white font-bold' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-1 text-slate-400">...</span>;
                }
                return null;
              })}
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0}
                className={`px-2 py-1 rounded border border-gray-200 bg-white transition-colors ${currentPage === totalPages || totalPages === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-black text-slate-800">Múltiplos Registros Encontrados</h3>
                <p className="text-xs text-slate-500 font-medium">O chip pesquisado possui mais de uma entrada.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="size-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-slate-600 mb-4">Selecione qual registro de entrada você deseja utilizar:</p>
              <div className="flex flex-col gap-3">
                {multipleEntries.map((entry, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectEntry(entry)}
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-gdf-blue hover:bg-blue-50/50 transition-all text-left group"
                  >
                    <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-gdf-blue group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined">calendar_month</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Entrada: {entry.dateIn || entry.date_in || entry['Data de Entrada']}</p>
                      <p className="text-xs text-slate-500">Origem: {entry.origin || entry.organ || entry['Região Administrativa'] || 'Não informado'}</p>
                    </div>
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-gdf-blue">arrow_forward</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-gray-200 rounded-lg transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section (Preserved) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-6 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-slate-800 font-bold text-lg">Apreensões por Órgão</h3>
              <p className="text-gray-500 text-sm">Distribuição atual de animais parceiros</p>
            </div>
            <button className="text-gray-400 hover:text-slate-800"><span className="material-symbols-outlined">more_horiz</span></button>
          </div>
          <div className="h-48 w-full">
            {chartDataOrgaos.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataOrgaos} margin={{ top: 0, right: 0, left: -40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} hide />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="val" radius={[4, 4, 0, 0]} barSize={40}>
                    {chartDataOrgaos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#0c3285" fillOpacity={0.4 + (index * 0.15)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">
                Nenhum animal na lista
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-6 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-slate-800 font-bold text-lg">Evolução de Permanência</h3>
              <p className="text-gray-500 text-sm">Média de dias (Últimos 6 meses)</p>
            </div>
            <button className="text-gray-400 hover:text-slate-800"><span className="material-symbols-outlined">calendar_month</span></button>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DATA_PERMANENCIA} margin={{ top: 10, right: 10, left: -40, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGradientOrgaos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0c3285" stopOpacity={0.2}></stop>
                    <stop offset="100%" stopColor="#0c3285" stopOpacity={0}></stop>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} hide />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area
                  type="monotone"
                  dataKey="dias"
                  stroke="#0c3285"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#chartGradientOrgaos)"
                  dot={{ r: 4, fill: '#fff', stroke: '#0c3285', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#0c3285' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutrosOrgaos;
