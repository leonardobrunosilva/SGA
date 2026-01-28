
import React, { useState, useEffect } from 'react';
import { Animal } from '../types';
import { calculateDays, formatDate } from '../utils';
import { supabase } from '../supabaseClient';
import { apreensoesService } from '../services/apreensoesService';
import { adocaoService } from '../services/worklistService';
import { saidasService } from '../services/saidasService';
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import EditModal, { FieldConfig } from './EditModal';

const DATA_MONTHLY = [
  { label: 'Jan', val: 150 },
  { label: 'Mar', val: 90 },
  { label: 'Mai', val: 80 },
  { label: 'Jul', val: 40 },
  { label: 'Set', val: 45 },
  { label: 'Nov', val: 15 },
];

const DATA_WEEKLY = [
  { label: 'Seg', val: 12 },
  { label: 'Ter', val: 18 },
  { label: 'Qua', val: 15 },
  { label: 'Qui', val: 22 },
  { label: 'Sex', val: 30 },
  { label: 'Sáb', val: 25 },
  { label: 'Dom', val: 10 },
];

const DATA_YEARLY = [
  { label: '2020', val: 450 },
  { label: '2021', val: 580 },
  { label: '2022', val: 720 },
  { label: '2023', val: 890 },
  { label: '2024', val: 324 },
];

const DATA_GENDER = [
  { name: 'Macho', value: 121 },
  { name: 'Fêmea', value: 165 },
];

const ADOPTION_STATUS_OPTIONS = [
  'Disponível',
  'Escolhido',
  'Em tratamento',
  'HVET',
  'HVET EX',
  'Adotado',
  'Sem Exame',
  'Experimento'
];

const Adocao: React.FC = () => {
  // --- STATE WITH PERSISTENCE ---
  const [animals, setAnimals] = useState<any[]>([]);

  // Load from Supabase
  useEffect(() => {
    loadAnimals();
  }, []);

  const loadAnimals = async () => {
    try {
      const data = await adocaoService.getAll();
      setAnimals(data || []);
    } catch (error: any) {
      showNotification(`Erro ao carregar lista: ${error.message || 'Desconhecido'}`, "error");
    }
  };

  // --- LOCAL STATE ---
  const [searchTerm, setSearchTerm] = useState('');
  const [foundEntry, setFoundEntry] = useState<any>(null);
  const [newStatus, setNewStatus] = useState(ADOPTION_STATUS_OPTIONS[0]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [adoptedCount, setAdoptedCount] = useState(0);

  // Multi-entry handling
  const [multipleEntries, setMultipleEntries] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Animal | null>(null);

  const editFields: FieldConfig[] = [
    { name: 'chip', label: 'Chip', readOnly: true },
    { name: 'specie', label: 'Espécie' },
    { name: 'gender', label: 'Sexo', type: 'select', options: ['Macho', 'Fêmea'] },
    { name: 'color', label: 'Pelagem' },
    { name: 'status', label: 'Status', type: 'select', options: ADOPTION_STATUS_OPTIONS },
    { name: 'observations', label: 'Observações', type: 'textarea' },
  ];

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- ADOPTION PROCESS MODAL STATE ---
  const [isAdocaoProcessModalOpen, setIsAdocaoProcessModalOpen] = useState(false);
  const [selectedForProcess, setSelectedForProcess] = useState<any>(null);
  const [adocaoFormData, setAdocaoFormData] = useState({
    status: 'Adotado',
    seiProcess: '',
    termoAdocao: '',
    dataAdocao: new Date().toISOString().split('T')[0],
    adotanteNome: '',
    adotanteCpf: '',
    observations: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const [timeFilter, setTimeFilter] = useState<'Semanal' | 'Mensal' | 'Anual'>('Mensal');

  const getCurrentChartData = () => {
    switch (timeFilter) {
      case 'Semanal': return DATA_WEEKLY;
      case 'Anual': return DATA_YEARLY;
      default: return DATA_MONTHLY;
    }
  };

  // Load Total Adoptions from Saidas
  useEffect(() => {
    const fetchAdoptedCount = async () => {
      try {
        const allSaidas = await saidasService.getAll();
        const adoptionTotal = allSaidas.filter(s => s.destination === 'Adoção').length;
        setAdoptedCount(adoptionTotal);
      } catch (e) {
        console.error('Erro ao buscar total de doações:', e);
      }
    };
    fetchAdoptedCount();
  }, []);

  // --- HELPERS ---
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const ANIMAL_IMAGES = [
    'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?q=80&w=1471&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1494&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=1469&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1598263304523-868478d38e3f?q=80&w=1374&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1692293887579-2420cd501705?q=80&w=1471&auto=format&fit=crop'
  ];
  const getImageUrl = (index: number) => ANIMAL_IMAGES[index % ANIMAL_IMAGES.length];

  // --- ACTIONS ---

  const handleSearchPreview = async () => {
    if (!searchTerm.trim()) return;
    try {
      const entries = await apreensoesService.getByChip(searchTerm.trim());
      setFoundEntry(entries[0] || null);
    } catch (e) {
      console.error(e);
    }
  };

  const addAnimalToList = async (entry: any) => {
    // Check if duplicate logic (optional, but good UX. Supabase might error on duplicate PK if defined, but id is uuid usually)
    // Here we check if animal_id already exists in list
    if (animals.some(a => a.animal_id === entry.id)) {
      showNotification("Este animal já está na lista.", "info");
      return;
    }

    try {
      await adocaoService.add(entry.id, newStatus, entry.observations || entry['Observações'] || '');
      showNotification("Animal adicionado à lista com sucesso!", "success");
      loadAnimals(); // Refresh list
      setFoundEntry(null);
      setSearchTerm('');
      setIsModalOpen(false);
    } catch (error: any) {
      console.error(error);
      showNotification(`Erro: ${error.message || 'Falha desconhecida'}`, "error");
    }
  };

  const handleAdd = async () => {
    if (!searchTerm.trim()) {
      showNotification("Digite o número do CHIP.", "info");
      return;
    }

    try {
      // 1. Busca no Banco
      const entries = await apreensoesService.getByChip(searchTerm.trim());

      // 2. Condicionais
      if (entries.length === 0) {
        showNotification("Animal não encontrado.", "error");
      } else if (entries.length === 1) {
        addAnimalToList(entries[0]);
      } else {
        // > 1: Abrir Modal
        setMultipleEntries(entries);
        setIsModalOpen(true);
      }
    } catch (e) {
      showNotification("Erro ao buscar no banco de dados.", "error");
      console.error(e);
    }
  };

  const handleSelectEntry = (entry: any) => {
    addAnimalToList(entry);
  };

  const handleEdit = (worklistItem: any) => {
    // Transform worklist item to flat structure for EditModal if needed, 
    // or just pass the fields that are editable (status, observations)
    // The EditModal expects 'data' to match 'fields'.
    // We need to pass the joined data for read-only fields (chip, specie)
    // and the worklist data for editable fields.

    // Combining for the modal:
    const modalData = {
      id: worklistItem.id,
      chip: worklistItem.animal?.chip,
      specie: worklistItem.animal?.specie,
      gender: worklistItem.animal?.gender,
      color: worklistItem.animal?.color,
      status: worklistItem.status,
      observations: worklistItem.observations
    };

    setEditingItem(modalData);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (updatedItem: any) => {
    try {
      await adocaoService.update(updatedItem.id, {
        status: updatedItem.status,
        observations: updatedItem.observations
      });
      showNotification("Registro atualizado com sucesso!", "success");
      loadAnimals();
      setIsEditModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      showNotification("Erro ao atualizar registro.", "error");
    }
  };

  const handleRemove = async (id: string) => {
    if (window.confirm("Deseja remover este animal da lista?")) {
      try {
        await adocaoService.remove(id);
        showNotification("Animal removido.", "info");
        loadAnimals();
      } catch (error) {
        showNotification("Erro ao remover animal.", "error");
      }
    }
  };

  const handleOpenProcess = (item: any) => {
    // If it's a worklist item, it has .animal and .id (worklist id)
    // If it's a search result, it has the animal data directly
    const animalData = item.animal || item;
    const worklistId = item.animal ? item.id : null;

    setSelectedForProcess({
      animal: animalData,
      worklistId: worklistId
    });

    setAdocaoFormData({
      status: 'Adotado',
      seiProcess: '',
      termoAdocao: '',
      dataAdocao: new Date().toISOString().split('T')[0],
      adotanteNome: '',
      adotanteCpf: '',
      observations: item.observations || ''
    });

    setIsAdocaoProcessModalOpen(true);
  };

  const handleFinalizeAdocao = async () => {
    if (!selectedForProcess) return;
    if (!adocaoFormData.adotanteNome || !adocaoFormData.adotanteCpf || !adocaoFormData.seiProcess || !adocaoFormData.termoAdocao || !adocaoFormData.dataAdocao) {
      showNotification("Por favor, preencha todos os campos obrigatórios.", "error");
      return;
    }

    try {
      setIsSaving(true);
      showNotification("Processando adoção...", "info");

      // 1. If not in worklist, we might need a dummy ID or handle it specially.
      // But the user flow says "Ao buscar e encontrar... exiba card... ao clicar... abra modal".
      // If the animal is NOT in the worklist, adocaoService.completeAdocao will try to DELETE from worklist_adocao.
      // If worklistId is null, the DELETE will just not find anything, which is fine if supabase doesn't error.
      // However, it's safer to only DELETE if worklistId exists.

      // Let's call the service
      await adocaoService.completeAdocao(
        selectedForProcess.worklistId,
        selectedForProcess.animal,
        adocaoFormData
      );

      showNotification("Adoção realizada com sucesso!", "success");
      setIsAdocaoProcessModalOpen(false);
      setSelectedForProcess(null);
      loadAnimals();
      // Also increment adoptedCount locally for immediate feedback
      setAdoptedCount(prev => prev + 1);
    } catch (e: any) {
      console.error(e);
      showNotification(`Erro ao finalizar adoção: ${e.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // --- KPI CALCULATIONS ---
  const kpiAvailable = animals.length;
  const kpiAdopted = adoptedCount;
  const kpiAptos = animals.filter(a => a.status === 'Disponível').length;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Disponível': return { backgroundColor: '#d4edbd', color: '#111814' };
      case 'Escolhido': return { backgroundColor: '#753802', color: '#ffffff' };
      case 'Em tratamento': return { backgroundColor: '#ffcfc9', color: '#111814' };
      case 'HVET': return { backgroundColor: '#593287', color: '#ffffff' };
      case 'HVET EX': return { backgroundColor: '#e8eaed', color: '#5f6368' };
      case 'Adotado': return { backgroundColor: '#0f734c', color: '#ffffff' };
      case 'Sem Exame': return { backgroundColor: '#ffc8a8', color: '#111814' };
      case 'Experimento': return { backgroundColor: '#f00aae', color: '#ffffff' };
      default: return { backgroundColor: '#f3f4f6', color: '#6b7280' };
    }
  };

  // --- PAGINATION LOGIC ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAnimals = animals.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(animals.length / itemsPerPage);
  const handlePageChange = (page: number) => setCurrentPage(page);

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      {/* Toast */}
      {notification && (
        <div className={`fixed top-24 right-8 z-[100] p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-fade-in-up ${notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
          <span className="material-symbols-outlined">{notification.type === 'success' ? 'check_circle' : notification.type === 'error' ? 'error' : 'info'}</span>
          <p className="text-sm font-bold">{notification.message}</p>
        </div>
      )}

      <div className="flex flex-col text-left mb-2">
        <h2 className="text-[#111814] text-3xl font-black leading-tight tracking-[-0.033em]">Gestão de Adoção</h2>
        <p className="text-gray-500 text-sm font-normal">Painel de controle manual para processo de adoção.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-orange-50 p-3 rounded-full text-orange-600">
            <span className="material-symbols-outlined text-2xl">gavel</span>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400">Aptos para Adoção</p>
            <p className="text-2xl font-black text-gray-800">{kpiAptos}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-green-50 p-3 rounded-full text-green-600">
            <span className="material-symbols-outlined text-2xl">check_circle</span>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400">Total de Doações</p>
            <p className="text-2xl font-black text-gray-800">{kpiAdopted}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-full text-blue-600">
            <span className="material-symbols-outlined text-2xl">pets</span>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400">Disponíveis para Adoção</p>
            <p className="text-2xl font-black text-gray-800">{kpiAvailable}</p>
          </div>
        </div>
      </div>

      {/* Insertion Card */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-visible">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">add_circle</span>
          Nova Inclusão / Iniciar Processo
        </h3>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full relative">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Chip do Animal</label>
            <div className="relative">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className={`w-full border ${foundEntry ? 'border-green-500 bg-green-50' : 'border-gray-300'} rounded-lg pl-3 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-primary transition-all`}
                placeholder="Ex: 982..."
              />
              <button onClick={handleSearchPreview} className="absolute right-2 top-2 text-gray-400 hover:text-primary">
                <span className="material-symbols-outlined">search</span>
              </button>
            </div>
          </div>
          <div className="w-full md:w-64">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Status Inicial (para inclusão)</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            >
              {ADOPTION_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <button
            onClick={handleAdd}
            className="w-full md:w-auto px-8 py-2.5 bg-slate-900 hover:bg-slate-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <span className="material-symbols-outlined">add</span>
            Incluir na Lista
          </button>
        </div>

        {/* Found Entry Summary Card */}
        {foundEntry && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl flex flex-col md:flex-row items-center gap-6 animate-fade-in-up">
            <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0">
              <img src={getImageUrl(0)} className="w-full h-full object-cover" alt="Preview" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-xs font-black text-green-700 uppercase tracking-widest">Animal Encontrado</p>
              <h4 className="text-xl font-black text-slate-800">{foundEntry['Espécie']} • {foundEntry['Sexo']}</h4>
              <p className="text-sm text-slate-500 font-mono">{foundEntry.chip}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFoundEntry(null)}
                className="px-4 py-2 border border-green-200 text-green-700 font-bold rounded-lg hover:bg-green-100 transition-all text-xs"
              >
                Limpar
              </button>
              <button
                onClick={() => handleOpenProcess(foundEntry)}
                className="px-6 py-2 bg-green-500 text-white font-black rounded-lg hover:bg-green-600 transition-all text-xs shadow-md shadow-green-500/20 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                Abrir Processo de Adoção
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Animal / Detalhes</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">CHIP</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Observações</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">O.S.</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Entrada</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Estadia</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Status</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentAnimals.map(row => {
                // Destructure nested animal or fallback
                const animalData = row.animal || {};

                return (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-slate-800">{animalData.specie || 'Desconhecido'}</p>
                        <p className="text-[10px] text-slate-500">{animalData.gender} / {animalData.color}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">{animalData.chip}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs max-w-xs truncate" title={row.observations}>
                      {row.observations || '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{animalData.os_number}</td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(animalData.date_in)}</td>
                    <td className="px-6 py-4">
                      {(() => {
                        const days = calculateDays(animalData.date_in);
                        return <span className="font-bold text-slate-700">{days} dias</span>;
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-2 py-1 rounded-md text-[10px] font-bold uppercase transition-all"
                        style={getStatusStyle(row.status)}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleOpenProcess(row)} className="p-1.5 text-blue-400 hover:text-blue-600 rounded-full hover:bg-blue-50" title="Processo de Adoção">
                          <span className="material-symbols-outlined text-[22px]">rocket_launch</span>
                        </button>
                        <button onClick={() => handleEdit(row)} className="p-1.5 text-gray-400 hover:text-orange-600 rounded-full hover:bg-orange-50">
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button onClick={() => handleRemove(row.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {animals.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400 italic">Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {animals.length > 0 && (
          <div className="bg-gray-50 border-t border-gray-200 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-500 font-medium">
              Mostrando <span className="font-bold text-slate-800">{indexOfFirstItem + 1}</span> a <span className="font-bold text-slate-800">{Math.min(indexOfLastItem, animals.length)}</span> de <span className="font-bold text-slate-800">{animals.length}</span> registros
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-bold text-gray-600 hover:bg-white hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Anterior
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${currentPage === page ? 'bg-primary text-slate-900 shadow-md' : 'text-gray-500 hover:bg-gray-200'}`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-bold text-gray-600 hover:bg-white hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Analytics Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl p-8 border border-slate-200 shadow-sm text-left">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 leading-none">Adoções Realizadas</h3>
              <p className="text-sm text-slate-500 mt-2">Visualização por período</p>
            </div>

            {/* Segmented Control / Time Filter */}
            <div className="bg-slate-100 p-1 rounded-lg flex items-center shadow-inner">
              {(['Semanal', 'Mensal', 'Anual'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setTimeFilter(option)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all duration-200 ${timeFilter === option
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="flex items-baseline gap-2 hidden md:flex">
              <span className="text-4xl font-black text-slate-900 tracking-tight">
                {timeFilter === 'Anual' ? '324' : timeFilter === 'Semanal' ? '12' : '42'}
              </span>
              <span className="text-xs font-black text-primary flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                +5.2%
              </span>
            </div>
          </div>

          <div className="h-64 w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getCurrentChartData()}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#13ec80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#13ec80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 800, color: '#1e293b' }}
                />
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke="#13ec80"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#chartGradient)"
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm flex flex-col text-left">
          <div className="mb-8">
            <h3 className="text-xl font-black text-slate-900 leading-none">Adoções por Gênero</h3>
            <p className="text-sm text-slate-500 mt-2">Distribuição por sexo</p>
          </div>

          <div className="flex-1 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DATA_GENDER} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar
                  dataKey="value"
                  radius={[8, 8, 0, 0]}
                  barSize={60}
                  animationDuration={1200}
                >
                  {DATA_GENDER.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Macho' ? '#13ec80' : '#13ec80'} fillOpacity={entry.name === 'Macho' ? 0.8 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="flex flex-col gap-1 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-tight">Machos</span>
              <span className="text-2xl font-black text-slate-900">121</span>
            </div>
            <div className="flex flex-col gap-1 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-tight">Fêmeas</span>
              <span className="text-2xl font-black text-primary">165</span>
            </div>
          </div>
        </div>
      </section>

      {/* Selection Modal */}
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
              <p className="text-sm text-slate-600 mb-4">Selecione qual registro de entrada você deseja utilizar para este processo de adoção:</p>
              <div className="flex flex-col gap-3">
                {multipleEntries.map((entry, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectEntry(entry)}
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                  >
                    <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-slate-900 transition-colors">
                      <span className="material-symbols-outlined">calendar_month</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Entrada: {formatDate(entry['Data de Entrada'] || entry.date_in || entry.dateIn)}</p>
                      <p className="text-xs text-slate-500">Origem: {entry['Região Administrativa'] || 'Não informado'}</p>
                      <p className="text-[10px] text-primary font-black uppercase mt-1">PROCESSO SEI: {entry.sei_process || entry.seiProcess || '-'}</p>
                    </div>
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-primary">arrow_forward</span>
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

      {/* Edit Modal */}
      <EditModal
        isOpen={isEditModalOpen}
        title="Editar Animal (Adoção)"
        data={editingItem}
        fields={editFields}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
      />
      {/* Adoption Process Modal */}
      {isAdocaoProcessModalOpen && selectedForProcess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8 relative flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl sticky top-0 z-10">
              <div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Processo de Adoção</h3>
                <p className="text-xs text-slate-500 font-bold tracking-widest mt-1">FINALIZAÇÃO E TERMO DE RESPONSABILIDADE</p>
              </div>
              <button
                onClick={() => setIsAdocaoProcessModalOpen(false)}
                className="size-10 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-400 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Col: Profile */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  <div className="relative aspect-[4/3] rounded-2xl overflow-hidden group shadow-lg border border-gray-100">
                    <img
                      src={getImageUrl(0)}
                      className="object-cover w-full h-full"
                      alt="Animal"
                    />
                    <div className="absolute top-4 right-4 bg-green-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-md uppercase">
                      {selectedForProcess.animal.status || 'APTO PARA ADOÇÃO'}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 leading-none">{selectedForProcess.animal.breed || 'Animal'}</h2>
                    <p className="text-gray-500 font-medium mt-2">{selectedForProcess.animal.specie} • {selectedForProcess.animal.gender} • {selectedForProcess.animal.color}</p>
                    <p className="text-lg font-mono font-bold text-primary mt-2">{selectedForProcess.animal.chip}</p>
                  </div>
                </div>

                {/* Right Col: Details & Form */}
                <div className="lg:col-span-8 flex flex-col gap-8">
                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-green-100 text-green-600"><span className="material-symbols-outlined">medical_services</span></div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-black uppercase">Exames Sanitários</p>
                        <p className="text-gray-900 font-bold text-sm">AIE & Mormo Negativos</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-green-100 text-green-600"><span className="material-symbols-outlined">vaccines</span></div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-black uppercase">Vacinação</p>
                        <p className="text-gray-900 font-bold text-sm">Atualizada</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-blue-100 text-blue-600"><span className="material-symbols-outlined">content_cut</span></div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-black uppercase">Manejo</p>
                        <p className="text-gray-900 font-bold text-sm">Castrado / Ferrageado</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-purple-100 text-purple-600"><span className="material-symbols-outlined">psychology</span></div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-black uppercase">Temperamento</p>
                        <p className="text-gray-900 font-bold text-sm">Dócil / Manso</p>
                      </div>
                    </div>
                  </div>

                  {/* Adoption Form Section */}
                  <div className="bg-slate-50 p-6 rounded-2xl border-2 border-primary/20 shadow-inner">
                    <h4 className="text-sm font-black text-slate-800 mb-6 uppercase tracking-widest flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">assignment_ind</span>
                      Formulário de Finalização
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Status Final</label>
                        <select
                          value={adocaoFormData.status}
                          onChange={(e) => setAdocaoFormData({ ...adocaoFormData, status: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                        >
                          <option value="Adotado">Adotado</option>
                          <option value="Leilão">Leilão (Venda)</option>
                          <option value="Outros">Outros</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase">Processo SEI</label>
                        <input
                          type="text"
                          placeholder="00010-000..."
                          value={adocaoFormData.seiProcess}
                          onChange={(e) => setAdocaoFormData({ ...adocaoFormData, seiProcess: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase">Data de Adoção</label>
                        <input
                          type="date"
                          value={adocaoFormData.dataAdocao}
                          onChange={(e) => setAdocaoFormData({ ...adocaoFormData, dataAdocao: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase">Termo de Adoção Nº</label>
                        <input
                          type="text"
                          placeholder="Ex: 2024/001"
                          value={adocaoFormData.termoAdocao}
                          onChange={(e) => setAdocaoFormData({ ...adocaoFormData, termoAdocao: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                        />
                      </div>
                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase">Nome do Adotante</label>
                          <input
                            type="text"
                            placeholder="Nome Completo"
                            value={adocaoFormData.adotanteNome}
                            onChange={(e) => setAdocaoFormData({ ...adocaoFormData, adotanteNome: e.target.value })}
                            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase">CPF do Adotante</label>
                          <input
                            type="text"
                            placeholder="000.000.000-00"
                            value={adocaoFormData.adotanteCpf}
                            onChange={(e) => setAdocaoFormData({ ...adocaoFormData, adotanteCpf: e.target.value })}
                            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary outline-none"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase">Observações Adicionais</label>
                        <textarea
                          rows={2}
                          value={adocaoFormData.observations}
                          onChange={(e) => setAdocaoFormData({ ...adocaoFormData, observations: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-primary outline-none resize-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="bg-gray-100/50 p-6 rounded-xl border border-dashed border-gray-300">
                    <h4 className="text-xs font-black text-gray-500 mb-5 uppercase tracking-widest">Registros de Entrada</h4>
                    <ul className="space-y-4">
                      <li className="flex gap-4 text-xs items-center">
                        <span className="text-gray-400 w-24 shrink-0 font-black uppercase">{formatDate(selectedForProcess.animal.date_in)}</span>
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0"></div>
                        <span className="text-gray-600 font-bold">Entrada registrada via SEI {selectedForProcess.animal.os_number || '-'}.</span>
                      </li>
                      <li className="flex gap-4 text-xs items-center">
                        <span className="text-gray-400 w-24 shrink-0 font-black uppercase">STATUS</span>
                        <div className="w-2 h-2 rounded-full bg-gray-400 shrink-0"></div>
                        <span className="text-gray-600 font-bold">Animal {selectedForProcess.animal.status || 'Disponível'} no pátio.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 bg-gray-50/50 lg:rounded-b-2xl">
              <div className="flex items-center gap-4 bg-orange-100/50 px-4 py-2 rounded-xl border border-orange-200">
                <span className="material-symbols-outlined text-orange-500 text-2xl">timer</span>
                <div>
                  <p className="text-orange-700 font-black text-[10px] uppercase leading-none mb-1">Prazo de Apreensão</p>
                  <p className="text-gray-700 text-xs font-bold">Animal apto para destinação.</p>
                </div>
              </div>
              <div className="flex gap-4 w-full md:w-auto h-12">
                <button
                  onClick={() => setIsAdocaoProcessModalOpen(false)}
                  className="flex-1 md:w-32 px-6 bg-white border border-gray-200 text-gray-500 hover:bg-gray-100 rounded-xl font-black text-xs transition-all uppercase"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleFinalizeAdocao}
                  disabled={isSaving}
                  className="flex-[2] md:w-48 px-8 bg-black hover:bg-slate-800 text-white rounded-xl font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2 uppercase disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">{isSaving ? 'sync' : 'verified'}</span>
                  {isSaving ? 'Finalizando...' : 'Finalizar Adoção'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Adocao;
