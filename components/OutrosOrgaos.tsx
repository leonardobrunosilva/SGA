
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell } from 'recharts';
import { apreensoesService } from '../services/apreensoesService';
import { outrosOrgaosService } from '../services/worklistService';
import { formatDate } from '../utils';
import { ORGAOS_LIST, ESPECIES } from '../constants';
import EditModal, { FieldConfig } from './EditModal';

// Status Options
const STATUS_OPTIONS = ['Curral de Apreensão', 'HVET', 'Experimento', 'FAL'];

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
  const [animals, setAnimals] = useState<any[]>([]);

  // Load from Supabase
  useEffect(() => {
    loadAnimals();
  }, []);

  const loadAnimals = async () => {
    try {
      const data = await outrosOrgaosService.getAll();
      setAnimals(data || []);
    } catch (error: any) {
      showNotification(`Erro ao carregar lista: ${error.message || 'Desconhecido'}`, "error");
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [newStatus, setNewStatus] = useState(STATUS_OPTIONS[0]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [foundEntry, setFoundEntry] = useState<any>(null);
  const [viewingAnimal, setViewingAnimal] = useState<any | null>(null);

  // --- FILTERS STATE ---
  const [filterChip, setFilterChip] = useState('');
  const [filterOrgan, setFilterOrgan] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Multi-entry modal
  const [multipleEntries, setMultipleEntries] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnimalItem | null>(null);

  const editFields: FieldConfig[] = [
    { name: 'chip', label: 'Chip', readOnly: true },
    { name: 'especie', label: 'Espécie' },
    { name: 'orgao', label: 'Órgão' },
    { name: 'dataEntrada', label: 'Data Entrada', readOnly: true },
    { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS },
    { name: 'observacoes', label: 'Observações', type: 'textarea' },
  ];

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- PERSISTENCE REMOVED (Handled by DB) ---


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

  // --- RELATÓRIOS ---
  const handleExportCSV = () => {
    const headers = ['Chip', 'Espécie', 'Status', 'Data Entrada', 'Permanência', 'Origem'];

    const csvRows = [
      headers.join(','),
      ...filteredAnimals.map(item => {
        const animal = item.animal || {};
        const dateIn = animal.date_in || animal.dateIn || animal['Data de Entrada'];
        const dateInStr = formatDate(dateIn);
        return [
          `"${animal.chip}"`,
          `"${animal.specie}"`,
          `"${item.status}"`,
          `"${dateInStr}"`,
          `"${calculateDaysIn(dateInStr)} dias"`,
          `"${item.organ_destination || animal.origin}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `Relatorio_OutrosOrgaos_${today}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  // --- ACTIONS ---
  const addAnimalToList = async (entry: any) => {
    // Check duplicate
    if (animals.some(a => a.animal_id === entry.id)) {
      showNotification("Este animal já está na lista.", "info");
      return;
    }

    try {
      const organRaw = entry.organ || entry.origin || entry['Região Administrativa'] || 'Não informado';
      const organClean = organRaw.split(' - ')[0]; // Garante apenas a sigla
      await outrosOrgaosService.add(
        entry.id,
        newStatus,
        entry.observations || entry['Observações'] || '',
        organClean // Saving origin/organ as destination/source context
      );

      showNotification("Animal adicionado à lista!", "success");
      setSearchTerm('');
      setFoundEntry(null);
      setNewStatus(STATUS_OPTIONS[0]); // Reset para o padrão
      setIsModalOpen(false);
      loadAnimals();
    } catch (e: any) {
      console.error(e);
      showNotification(`Erro: ${e.message || 'Erro desconhecido'}`, "error");
    }
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

  const handleEdit = (worklistItem: any) => {
    const modalData = {
      id: worklistItem.id,
      chip: worklistItem.animal?.chip,
      especie: worklistItem.animal?.specie,
      orgao: worklistItem.organ_destination, // or worklistItem.animal?.origin depending on needs
      dataEntrada: formatDate(worklistItem.animal?.date_in),
      status: worklistItem.status,
      observacoes: worklistItem.observations
    };
    setEditingItem(modalData);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (updatedItem: any) => {
    try {
      await outrosOrgaosService.update(updatedItem.id, {
        status: updatedItem.status,
        observations: updatedItem.observacoes,
        organ_destination: updatedItem.orgao
      });
      showNotification("Registro atualizado com sucesso!", "success");
      loadAnimals();
      setIsEditModalOpen(false);
      setEditingItem(null);
    } catch (e: any) {
      showNotification(`Erro ao atualizar: ${e.message}`, "error");
    }
  };

  const handleRemove = async (id: string) => {
    if (window.confirm("Deseja remover este registro?")) {
      try {
        await outrosOrgaosService.remove(id);
        showNotification("Registro removido.", "info");
        loadAnimals();
      } catch (e) {
        showNotification("Erro ao remover registro.", "error");
      }
    }
  };

  // --- KPI CALCULATIONS ---
  const totalAnimals = animals.filter(a => a.status !== 'FAL').length;
  const animalsFAL = animals.filter(a => a.status === 'FAL').length;
  const avgStay = animals.length > 0
    ? Math.round(animals.reduce((sum, a) => sum + calculateDaysIn(a.dataEntrada), 0) / animals.length)
    : 0;

  // --- DYNAMIC CHART DATA ---
  const chartDataOrgaos = useMemo(() => {
    const grouped: Record<string, number> = {};
    animals.forEach(a => {
      const orgao = a.organ_destination || a.animal?.origin || 'Não informado';
      grouped[orgao] = (grouped[orgao] || 0) + 1;
    });
    return Object.entries(grouped).map(([name, val]) => ({ name, val }));
  }, [animals]);

  // --- FILTERING LOGIC ---
  const filteredAnimals = useMemo(() => {
    return animals.filter(item => {
      const animal = item.animal || {};

      const matchChip = !filterChip || (animal.chip && animal.chip.toLowerCase().includes(filterChip.toLowerCase()));
      const matchOrgan = !filterOrgan || (item.organ_destination === filterOrgan);
      const matchSpecies = !filterSpecies || animal.specie === filterSpecies;
      const matchGender = !filterGender || animal.gender === filterGender;
      const matchStatus = !filterStatus || item.status === filterStatus;

      return matchChip && matchOrgan && matchSpecies && matchGender && matchStatus;
    });
  }, [animals, filterChip, filterOrgan, filterSpecies, filterGender, filterStatus]);

  // --- PAGINATION ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAnimals = filteredAnimals.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAnimals.length / itemsPerPage);

  const clearFilters = () => {
    setFilterChip('');
    setFilterOrgan('');
    setFilterSpecies('');
    setFilterGender('');
    setFilterStatus('');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in text-left">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-fade-in-up print:hidden ${notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
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
        <div className="flex items-center gap-2 text-sm print:hidden">
          <a className="text-gray-500 hover:text-gdf-blue transition-colors" href="#">Home</a>
          <span className="text-gray-400">/</span>
          <span className="text-gdf-blue font-bold">Animais de Outros Órgãos</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-6 print:hidden">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Animais de Outros Órgãos</h2>
            <p className="text-gray-500 text-base max-w-2xl">
              Controle e gestão de semoventes de grande porte pertencentes ou sob responsabilidade de órgãos parceiros.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 print:hidden">
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
              <p className="text-gray-500 text-sm font-medium">Albergados em outro local</p>
              <h3 className="text-3xl font-bold text-slate-800">{animalsFAL}</h3>
            </div>
            <div className="size-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
              <span className="material-symbols-outlined">forklift</span>
            </div>
          </div>
          <div className="h-1 w-full bg-gray-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-orange-400" style={{ width: `${Math.min(animalsFAL * 10, 100)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Inclusion Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm print:hidden">
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
                Selecionado: {foundEntry.specie || foundEntry['Espécie']} - {formatDate(foundEntry.dateIn || foundEntry.date_in || foundEntry['Data de Entrada'])}
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

      {/* NEW: Filter Grid Section */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative z-20 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Filtro CHIP</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[18px]">memory</span>
              <input
                value={filterChip}
                onChange={(e) => setFilterChip(e.target.value)}
                className="w-full rounded-lg bg-gray-50 border border-gray-200 pl-9 pr-4 py-2 text-xs focus:border-gdf-blue focus:ring-2 focus:ring-gdf-blue/10 outline-none transition-all"
                placeholder="Digitar chip..."
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Órgão Solicitante</label>
            <select
              value={filterOrgan}
              onChange={(e) => setFilterOrgan(e.target.value)}
              className="w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs focus:border-gdf-blue outline-none"
            >
              <option value="">Todos</option>
              {ORGAOS_LIST.map(org => <option key={org} value={org}>{org}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Espécie</label>
            <select
              value={filterSpecies}
              onChange={(e) => setFilterSpecies(e.target.value)}
              className="w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs focus:border-gdf-blue outline-none"
            >
              <option value="">Todas</option>
              {ESPECIES.map(esp => <option key={esp} value={esp}>{esp}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Sexo</label>
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs focus:border-gdf-blue outline-none"
            >
              <option value="">Ambos</option>
              <option value="Macho">Macho</option>
              <option value="Fêmea">Fêmea</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Status</label>
            <div className="flex gap-1 items-center">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-xs focus:border-gdf-blue outline-none"
              >
                <option value="">Todos</option>
                {STATUS_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
              </select>
              <button
                onClick={clearFilters}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Limpar Filtros"
              >
                <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar (Export/Print) */}
      <div className="flex justify-end gap-3 print:hidden">
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-slate-600 font-bold text-xs hover:bg-gray-50 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Exportar CSV
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-slate-600 font-bold text-xs hover:bg-gray-50 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">print</span>
          Imprimir
        </button>
      </div>

      {/* Table */}
      <div className="flex flex-col gap-4 bg-white border border-gray-200 rounded-xl p-4 lg:p-6 shadow-sm print:w-full print:absolute print:top-0 print:left-0">
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
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Órgão</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Animal / Detalhes</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">CHIP</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Observações</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">O.S.</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Entrada</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estadia</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider print:hidden">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {currentAnimals.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400 italic">Nenhum animal na lista.</td></tr>
              ) : (
                currentAnimals.map((row) => {
                  const animalData = row.animal || {};
                  const dateInFormatted = formatDate(animalData.date_in);

                  return (
                    <tr key={row.id} className="group hover:bg-blue-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-bold text-slate-700">
                        {(animalData.organ || row.organ_destination || 'Não informado').split(' - ')[0]}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-800">{animalData.specie}</span>
                          <span className="text-xs text-gray-500">{animalData.gender} • {animalData.color}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gdf-blue font-mono font-bold">{animalData.chip}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={row.observations}>{row.observations || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 font-mono">{animalData.os_number}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{dateInFormatted}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-orange-600">{calculateDaysIn(dateInFormatted)} dias</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tight border outline-none transition-all ${row.status === 'FAL'
                          ? 'bg-orange-100 text-orange-700 border-orange-200'
                          : 'bg-blue-100 text-blue-700 border-blue-200'
                          }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setViewingAnimal(row)} className="text-gray-400 hover:text-gdf-blue transition-colors p-1.5 rounded-lg hover:bg-blue-50" title="Visualizar">
                            <span className="material-symbols-outlined text-[20px]">visibility</span>
                          </button>
                          <button onClick={() => handleEdit(row)} className="text-gray-400 hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-green-50" title="Editar">
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button onClick={() => handleRemove(row.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50" title="Excluir">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredAnimals.length > 0 && (
          <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-200 flex justify-between items-center text-xs text-slate-500">
            <p>Exibindo <span className="font-bold text-slate-900">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredAnimals.length)}</span> de <span className="font-bold text-slate-900">{filteredAnimals.length}</span></p>
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
                      <p className="text-sm font-bold text-slate-800">Entrada: {formatDate(entry.dateIn || entry.date_in || entry['Data de Entrada'])}</p>
                      <p className="text-xs text-slate-500">Origem: {entry.origin || entry.organ || entry['Região Administrativa'] || 'Não informado'}</p>
                      <p className="text-[10px] text-gdf-blue font-black uppercase mt-1">PROCESSO SEI: {entry.sei_process || entry.seiProcess || '-'}</p>
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
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-10 print:hidden">
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
                <BarChart
                  layout="vertical"
                  data={chartDataOrgaos}
                  margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    width={100}
                    tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar
                    dataKey="val"
                    fill="#0f4c81"
                    radius={[0, 4, 4, 0]}
                    barSize={30}
                    label={{ position: 'right', fill: '#1e3a8a', fontWeight: 'bold', fontSize: 12 }}
                  />
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

      {/* Edit Modal */}
      <EditModal
        isOpen={isEditModalOpen}
        title="Editar Animal (Outros Órgãos)"
        data={editingItem}
        fields={editFields}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
      />

      {/* --- TABELA EXCLUSIVA PARA IMPRESSÃO (MODO RELATÓRIO COMPLETO) --- */}
      <div className="hidden print:block print:absolute print:top-0 print:left-0 print:w-full print:z-[9999] print:bg-white p-8">
        <div className="mb-8 border-b-2 border-slate-800 pb-4">
          <h1 className="text-2xl font-black text-slate-800">Relatório de Animais - Outros Órgãos</h1>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mt-1">
            Data de Geração: {new Date().toLocaleDateString('pt-BR')} | Total: {filteredAnimals.length} registros
          </p>
        </div>

        <table className="w-full text-left border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300 text-[10px] uppercase font-black text-slate-700">
              <th className="p-2 border border-gray-300">Órgão</th>
              <th className="p-2 border border-gray-300">Animal (Espécie/Gênero)</th>
              <th className="p-2 border border-gray-300">Identificação (CHIP)</th>
              <th className="p-2 border border-gray-300">O.S.</th>
              <th className="p-2 border border-gray-300">Entrada</th>
              <th className="p-2 border border-gray-300">Estadia</th>
              <th className="p-2 border border-gray-300">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAnimals.map((row: any) => {
              const animalData = row.animal || {};
              const dateInFormatted = formatDate(animalData.date_in);

              const calculateDaysText = (dateStr: string) => {
                try {
                  const today = new Date();
                  const parts = dateStr.split('/');
                  if (parts.length === 3) {
                    const entryDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                    const diffTime = Math.abs(today.getTime() - entryDate.getTime());
                    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  }
                } catch { return '-'; }
                return '-';
              };

              return (
                <tr key={row.id} className="border-b border-gray-200 text-[10px]">
                  <td className="p-2 border border-gray-300 font-bold">
                    {(animalData.organ || row.organ_destination || 'Não informado').split(' - ')[0]}
                  </td>
                  <td className="p-2 border border-gray-300">
                    <div className="flex flex-col">
                      <span className="font-bold">{animalData.specie}</span>
                      <span className="text-gray-500">{animalData.gender} / {animalData.color}</span>
                    </div>
                  </td>
                  <td className="p-2 border border-gray-300 font-mono font-bold text-gdf-blue">{animalData.chip}</td>
                  <td className="p-2 border border-gray-300 font-mono">{animalData.os_number}</td>
                  <td className="p-2 border border-gray-300">{dateInFormatted}</td>
                  <td className="p-2 border border-gray-300 font-bold">{calculateDaysText(dateInFormatted)} dias</td>
                  <td className="p-2 border border-gray-300 uppercase font-black">{row.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-8 text-right text-[10px] text-gray-400 font-bold">
          SGA - Sistema de Gestão Animal | Gerado em {new Date().toLocaleString('pt-BR')}
        </div>
      </div>

      {/* Detail View Modal */}
      {viewingAnimal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative">
            <button onClick={() => setViewingAnimal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
            <h3 className="text-2xl font-black text-slate-900 mb-6 text-left">Detalhes (Outros Órgãos)</h3>

            <div className="grid grid-cols-2 gap-x-8 gap-y-6 text-left">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Animal</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shadow-sm flex-shrink-0">
                    <img src={viewingAnimal.animal?.image_url || 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?q=80&w=2071&auto=format&fit=crop'} className="w-full h-full object-cover" alt="Foto" />
                  </div>
                  <div className="flex flex-col">
                    <p className="font-black text-slate-800 text-lg leading-tight">{viewingAnimal.animal?.specie}</p>
                    <p className="text-xs text-slate-500">{viewingAnimal.animal?.gender} / {viewingAnimal.animal?.color}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1 justify-center">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Identificação (CHIP)</p>
                <p className="font-mono font-bold text-slate-700 text-lg">{viewingAnimal.animal?.chip}</p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Data de Entrada</p>
                <p className="font-bold text-slate-700">{formatDate(viewingAnimal.animal?.date_in)}</p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Ordem de Serviço (OS)</p>
                <p className="font-bold text-slate-700">{viewingAnimal.animal?.os_number || viewingAnimal.animal?.osNumber || "S/N"}</p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Órgão Origem/Parceiro</p>
                <p className="font-bold text-slate-800">{viewingAnimal.organ_destination || viewingAnimal.animal?.origin}</p>
              </div>

              <div className="flex flex-col gap-1 col-span-2 mt-2">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Status Atual</p>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg inline-block w-max">{viewingAnimal.status}</p>
                </div>
              </div>

              {viewingAnimal.observations && (
                <div className="flex flex-col gap-1 col-span-2">
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Observações</p>
                  <p className="text-sm text-slate-600 bg-gray-50 p-3 rounded-lg flex-1">"{viewingAnimal.observations}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OutrosOrgaos;
