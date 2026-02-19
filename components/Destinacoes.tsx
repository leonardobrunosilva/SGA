
import React, { useState, useEffect, useMemo } from 'react';
import { Animal } from '../types';
import { calculateDays, formatDate } from '../utils';
import { saidasService } from '../services/saidasService';
import { apreensoesService } from '../services/apreensoesService';

const Destinacoes: React.FC = () => {
  // History View State
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [chipFilter, setChipFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [identifiedAnimal, setIdentifiedAnimal] = useState<Animal | null>(null);

  // Manual Entry State
  const [newEntryChip, setNewEntryChip] = useState('');
  const [newEntryStatus, setNewEntryStatus] = useState('Eutanásia');
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [selectedAnimalForEntry, setSelectedAnimalForEntry] = useState<Animal | null>(null);

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const [editData, setEditData] = useState({
    dateOut: '',
    status: '',
    responsible: '',
    cpf: '',
    observations: '',
    seiProcess: ''
  });

  // Initial Load - from Supabase saidas table
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await saidasService.getAll();

      // Map saidas to Animal objects
      const history: Animal[] = data.map((saida: any) => ({
        id: saida.id,
        specie: saida.specie || 'Semovente',
        chip: saida.chip,
        dateIn: saida.dateIn, // Keep original date for sorting if needed, or rely on service sort
        exitDate: formatDate(saida.dateOut),
        origin: saida.origin || '-',
        gender: saida.gender || '-',
        breed: saida.color || '-',
        color: saida.color || '-',
        status: saida.destination || 'Outros',
        seiProcess: saida.seiProcess || '-',
        osNumber: saida.osNumber || '-',
        imageUrl: `https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?q=80&w=1471&auto=format&fit=crop`,
        daysIn: calculateDays(saida.dateIn, saida.dateOut),
        observations: saida.observations || '',
        organ: saida.organ || '-',
        receiverName: saida.receiverName || '-',
        receiverCpf: saida.receiverCpf || '-'
      }));

      setAnimals(history);
    } catch (e) {
      console.error('Erro ao carregar histórico:', e);
    }
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Lógica de Filtragem e Paginação con Reset
  const filteredAnimals = useMemo(() => {
    // Reset page on filter change
    if (currentPage !== 1) setCurrentPage(1);

    return animals.filter(a => {
      const matchChip = a.chip.includes(chipFilter);
      const matchStatus = !statusFilter || a.status === statusFilter;
      const matchYear = !yearFilter || (a.exitDate && a.exitDate.includes(yearFilter));

      return matchChip && matchStatus && matchYear;
    });
  }, [animals, chipFilter, statusFilter, yearFilter]);

  // Status Badge Logic
  const getStatusStyles = (status: string) => {
    const s = status.toLowerCase();

    if (s.includes('disponível')) return { bg: '#d4edbd', text: '#111814' };
    if (s.includes('tratamento')) return { bg: '#ffcfc9', text: '#111814' };
    if (s === 'hvet') return { bg: '#593287', text: '#ffffff' };
    if (s.includes('restitu')) return { bg: '#0f734c', text: '#ffffff' };
    if (s.includes('prazo vencido')) return { bg: '#b10709', text: '#ffffff' };
    if (s.includes('sem exame')) return { bg: '#ffc8a8', text: '#111814' };
    if (s === 'experimento') return { bg: '#f00aae', text: '#ffffff' };
    if (s === 'escolhido') return { bg: '#753802', text: '#ffffff' };
    if (s === 'hvet ex') return { bg: '#e8eaed', text: '#111814' };
    if (s.includes('adotado') || s.includes('adoção')) return { bg: '#0f734c', text: '#ffffff' };

    return { bg: '#f3f4f6', text: '#374151' };
  };

  const statusOptions = Array.from(new Set(animals.map(a => a.status))).sort();

  // Pagination Calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAnimals = filteredAnimals.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAnimals.length / itemsPerPage);

  const handlePageChange = (page: number) => setCurrentPage(page);

  // View Details Modal State
  const [viewingAnimal, setViewingAnimal] = useState<Animal | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este registro de destinação? A ação não pode ser desfeita.")) {
      try {
        await saidasService.delete(id);
        alert("Registro excluído com sucesso!");
        loadHistory();
      } catch (error: any) {
        console.error(error);
        alert(`Erro ao excluir: ${error.message || "Tente novamente."}`);
      }
    }
  };

  const handleDirectInsert = async () => {
    if (!newEntryChip.trim()) {
      alert("Por favor, informe o número do chip.");
      return;
    }

    try {
      const animalsFound = await apreensoesService.getByChip(newEntryChip);
      if (!animalsFound || animalsFound.length === 0) {
        alert("Animal não encontrado na base de apreensões. Cadastre a entrada primeiro.");
        return;
      }

      const animal = animalsFound[0];
      setSelectedAnimalForEntry(animal);
      setIsEntryModalOpen(true);
    } catch (error) {
      console.error('Erro ao buscar animal por chip:', error);
      alert('Erro ao buscar animal. Tente novamente.');
    }
  };

  const [entryData, setEntryData] = useState({
    dateOut: new Date().toISOString().split('T')[0],
    responsible: '',
    cpf: '',
    observations: ''
  });

  const handleConfirmExit = async () => {
    if (!selectedAnimalForEntry) return;
    if (!entryData.responsible || !entryData.cpf) {
      alert("Por favor, preencha o responsável e o CPF.");
      return;
    }

    try {
      await saidasService.create({
        chip: selectedAnimalForEntry.chip,
        specie: selectedAnimalForEntry.specie,
        gender: selectedAnimalForEntry.gender,
        color: selectedAnimalForEntry.color,
        history: selectedAnimalForEntry.observations || '',
        observations: entryData.observations,
        osNumber: selectedAnimalForEntry.osNumber,
        dateOut: entryData.dateOut,
        destination: newEntryStatus,
        seiProcess: selectedAnimalForEntry.seiProcess || '',
        receiverName: entryData.responsible,
        receiverCpf: entryData.cpf
      });

      alert("Saída registrada com sucesso!");
      setIsEntryModalOpen(false);
      setNewEntryChip('');
      setSelectedAnimalForEntry(null);
      setEntryData({
        dateOut: new Date().toISOString().split('T')[0],
        responsible: '',
        cpf: '',
        observations: ''
      });
      loadHistory();
    } catch (error) {
      console.error('Erro ao registrar saída:', error);
      alert('Erro ao registrar saída. Tente novamente.');
    }
  };

  const handleEdit = (animal: Animal) => {
    setEditingAnimal(animal);
    setEditData({
      dateOut: animal.exitDate ? animal.exitDate.split('/').reverse().join('-') : new Date().toISOString().split('T')[0],
      status: animal.status,
      responsible: animal.receiverName || '',
      cpf: animal.receiverCpf || '',
      observations: animal.observations || '',
      seiProcess: animal.seiProcess || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateExit = async () => {
    if (!editingAnimal) return;
    if (!editData.responsible || !editData.cpf) {
      alert("Por favor, preencha o responsável e o CPF.");
      return;
    }

    try {
      await saidasService.update(editingAnimal.id, {
        dateOut: editData.dateOut,
        destination: editData.status,
        receiverName: editData.responsible,
        receiverCpf: editData.cpf,
        observations: editData.observations,
        seiProcess: editData.seiProcess
      });

      alert("Registro atualizado com sucesso!");
      setIsEditModalOpen(false);
      setEditingAnimal(null);
      loadHistory();
    } catch (error: any) {
      console.error('Erro ao atualizar registro:', error);
      alert(`Erro ao atualizar: ${error.message || "Tente novamente."}`);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-12">

      {/* Header */}
      <div className="flex flex-col text-left">
        <h2 className="text-[#111814] text-3xl font-black leading-tight tracking-[-0.033em]">Histórico de Destinações</h2>
        <p className="text-gray-500 text-sm font-normal">Registro consolidado de todas as saídas e baixas de animais.</p>
      </div>

      {/* Metrics (Optional Visuals) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs font-bold uppercase">Total de Saídas</p>
          <h3 className="text-3xl font-black text-slate-800">{animals.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs font-bold uppercase">Restituições</p>
          <h3 className="text-3xl font-black text-green-600">
            {animals.filter(a => a.status === 'Restituído' || a.status === 'Restituição').length}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs font-bold uppercase">Adocões / Leilão</p>
          <h3 className="text-3xl font-black text-blue-600">
            {animals.filter(a => a.status !== 'Restituído' && a.status !== 'Restituição').length}
          </h3>
        </div>
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <input
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pl-12 focus:ring-2 focus:ring-gdf-blue outline-none transition-all"
            placeholder="Buscar por Chip..."
            value={chipFilter}
            onChange={(e) => setChipFilter(e.target.value)}
          />
          <span className="material-symbols-outlined absolute left-4 top-3.5 text-gray-400">search</span>
        </div>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-gdf-blue outline-none transition-all"
        >
          <option value="">Todos os Anos</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-gdf-blue outline-none transition-all"
        >
          <option value="">Todos os Status</option>
          {statusOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Manual Insertion Container */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 shadow-sm animate-fade-in">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600">add_circle</span>
            <h3 className="text-blue-900 font-bold text-lg">Inserção Manual de Saída / Baixa Direta</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <input
                className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 pl-12 focus:ring-2 focus:ring-blue-400 outline-none transition-all text-sm"
                placeholder="Busca por Chip..."
                value={newEntryChip}
                onChange={(e) => setNewEntryChip(e.target.value)}
              />
              <span className="material-symbols-outlined absolute left-4 top-3.5 text-blue-400">search</span>
            </div>

            <select
              value={newEntryStatus}
              onChange={(e) => setNewEntryStatus(e.target.value)}
              className="bg-white border border-blue-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-400 outline-none transition-all text-sm"
            >
              <option value="Adoção">Adoção</option>
              <option value="Eutanásia">Eutanásia</option>
              <option value="Restituição">Restituição</option>
              <option value="Óbito">Óbito</option>
              <option value="Transferência">Transferência</option>
              <option value="Hvet">Hvet</option>
              <option value="Projeto de Ensino">Projeto de Ensino</option>
            </select>

            <button
              onClick={handleDirectInsert}
              className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl px-6 py-3 flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Inserir na Lista
            </button>
          </div>
          <p className="text-[10px] text-blue-400 font-medium">
            Utilize para registrar saídas imediatas (ex: Eutanásia no resgate) sem passar pelas worklists.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">ANIMAL / DETALHES</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">IDENTIFICAÇÃO</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">DATA SAÍDA</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">PERMANÊNCIA</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">PROCESSO (SEI)</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">STATUS</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs text-right">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentAnimals.map((animal, idx) => (
                <tr key={animal.id || idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{animal.specie}</span>
                      <span className="text-[10px] text-gray-400 font-medium uppercase">
                        {animal.gender} / {animal.color}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{animal.chip}</td>
                  <td className="px-6 py-4 text-gray-600">{animal.exitDate}</td>
                  <td className="px-6 py-4">
                    <span className={`font-bold ${animal.daysIn > 30 ? 'text-red-500' : 'text-slate-700'}`}>
                      {animal.daysIn} dias
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">{animal.seiProcess}</td>
                  <td className="px-6 py-4">
                    <span
                      className="px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm"
                      style={{
                        backgroundColor: getStatusStyles(animal.status).bg,
                        color: getStatusStyles(animal.status).text
                      }}
                    >
                      {animal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setViewingAnimal(animal)} className="text-gray-400 hover:text-gdf-blue transition-colors p-1.5 rounded-full hover:bg-gray-100" title="Visualizar">
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                      <button
                        onClick={() => handleEdit(animal)}
                        className="text-gray-400 hover:text-orange-600 transition-colors p-1.5 rounded-full hover:bg-gray-100"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(animal.id)}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors p-1.5 rounded-full"
                        title="Excluir"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination Controls */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200 flex justify-between items-center text-xs text-slate-500">
          <p>Exibindo <span className="font-bold text-slate-900">{filteredAnimals.length > 0 ? indexOfFirstItem + 1 : 0}-{Math.min(indexOfLastItem, filteredAnimals.length)}</span> de <span className="font-bold text-slate-900">{filteredAnimals.length}</span> registros</p>
          <div className="flex gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-2 py-1 rounded border border-gray-200 bg-white transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            >
              Anterior
            </button>

            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              // Show first, last, current, and adjacent
              if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-2 py-1 rounded border ${currentPage === page ? 'border-gdf-blue bg-gdf-blue text-white font-bold' : 'border-gray-200 bg-white hover:bg-gray-50 transition-colors'}`}
                  >
                    {page}
                  </button>
                );
              } else if (page === currentPage - 2 || page === currentPage + 2) {
                return <span key={page} className="px-1 text-slate-400">...</span>;
              }
              return null;
            })}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-2 py-1 rounded border border-gray-200 bg-white transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            >
              Próximo
            </button>
          </div>
        </div>
      </div>

      {/* Detail View Modal */}
      {viewingAnimal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative">
            <button onClick={() => setViewingAnimal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
            <h3 className="text-2xl font-black text-slate-900 mb-6">Detalhes do Histórico</h3>

            <div className="grid grid-cols-2 gap-x-8 gap-y-6 text-left">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Animal</p>
                <p className="font-black text-slate-800 text-lg leading-tight">{viewingAnimal.specie} - {viewingAnimal.breed}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Identificação</p>
                <p className="font-mono font-bold text-slate-700">{viewingAnimal.chip}</p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Responsável</p>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">Nome: <span className="font-normal text-slate-500">{viewingAnimal.receiverName}</span></span>
                  <span className="text-xs font-bold text-slate-800">CPF: <span className="font-normal text-slate-500">{viewingAnimal.receiverCpf}</span></span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Saída</p>
                <p className="font-bold text-slate-700">{viewingAnimal.exitDate}</p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Processo SEI</p>
                <p className="font-bold text-slate-700">{viewingAnimal.seiProcess}</p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Destino</p>
                <p className="font-bold text-slate-800">{viewingAnimal.status}</p>
                {viewingAnimal.observations && (
                  <p className="text-xs text-slate-500 mt-1 italic">"{viewingAnimal.observations}"</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal (Baixa Direta) */}
      {isEntryModalOpen && selectedAnimalForEntry && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEntryModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shadow-inner">
                <img
                  src={selectedAnimalForEntry.imageUrl}
                  alt={selectedAnimalForEntry.specie}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <h3 className="text-2xl font-black text-slate-900 leading-tight">Cadastrar Destinação</h3>
                <p className="text-sm font-medium text-blue-600">Inserção Manual: {selectedAnimalForEntry.chip}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest pl-1">Data de Saída</label>
                <input
                  type="date"
                  value={entryData.dateOut}
                  onChange={(e) => setEntryData({ ...entryData, dateOut: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-gdf-blue outline-none transition-all font-medium text-slate-700"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest pl-1">Status de Destino</label>
                <select
                  disabled
                  value={newEntryStatus}
                  className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 outline-none text-slate-500 font-bold"
                >
                  <option value={newEntryStatus}>{newEntryStatus}</option>
                </select>
                <p className="text-[10px] text-orange-400 font-medium pl-1 italic">* Alterável apenas na tela anterior</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest pl-1">Responsável / Requerente</label>
                <input
                  type="text"
                  placeholder="Nome completo..."
                  value={entryData.responsible}
                  onChange={(e) => setEntryData({ ...entryData, responsible: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-gdf-blue outline-none transition-all font-medium text-slate-700 placeholder:text-gray-300"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest pl-1">CPF</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={entryData.cpf}
                  onChange={(e) => setEntryData({ ...entryData, cpf: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-gdf-blue outline-none transition-all font-medium text-slate-700 placeholder:text-gray-300"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest pl-1">Observações / Motivo</label>
                <textarea
                  rows={3}
                  placeholder="Detalhes sobre a baixa direta..."
                  value={entryData.observations}
                  onChange={(e) => setEntryData({ ...entryData, observations: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-gdf-blue outline-none transition-all font-medium text-slate-700 placeholder:text-gray-300 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setIsEntryModalOpen(false)}
                className="flex-1 px-6 py-4 rounded-xl border border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmExit}
                className="flex-[2] bg-green-600 hover:bg-green-700 text-white font-black rounded-xl px-6 py-4 flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-200 active:scale-95"
              >
                <span className="material-symbols-outlined">verified</span>
                Confirmar Saída
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {isEditModalOpen && editingAnimal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-orange-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-500 text-3xl">edit_note</span>
              </div>
              <div className="flex flex-col text-left">
                <h3 className="text-2xl font-black text-slate-900 leading-tight">Editar Destinação</h3>
                <p className="text-sm font-medium text-orange-600">Alterando registro: {editingAnimal.chip}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest pl-1">Data de Saída</label>
                <input
                  type="date"
                  value={editData.dateOut}
                  onChange={(e) => setEditData({ ...editData, dateOut: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-slate-700"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest pl-1">Status de Destino</label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-400 outline-none transition-all font-bold text-slate-700"
                >
                  <option value="Adoção">Adoção</option>
                  <option value="Eutanásia">Eutanásia</option>
                  <option value="Restituição">Restituição</option>
                  <option value="Óbito">Óbito</option>
                  <option value="Transferência">Transferência</option>
                  <option value="Hvet">Hvet</option>
                  <option value="Projeto de Ensino">Projeto de Ensino</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest pl-1">Responsável / Requerente</label>
                <input
                  type="text"
                  placeholder="Nome completo..."
                  value={editData.responsible}
                  onChange={(e) => setEditData({ ...editData, responsible: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-slate-700 placeholder:text-gray-300"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest pl-1">CPF</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={editData.cpf}
                  onChange={(e) => setEditData({ ...editData, cpf: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-slate-700 placeholder:text-gray-300"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest pl-1">Processo SEI</label>
                <input
                  type="text"
                  placeholder="00000-00000000/0000-00"
                  value={editData.seiProcess}
                  onChange={(e) => setEditData({ ...editData, seiProcess: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-slate-700 placeholder:text-gray-300"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] text-gray-400 uppercase font-black tracking-widest pl-1">Observações / Motivo</label>
                <textarea
                  rows={3}
                  placeholder="Detalhes sobre a alteração..."
                  value={editData.observations}
                  onChange={(e) => setEditData({ ...editData, observations: e.target.value })}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium text-slate-700 placeholder:text-gray-300 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 px-6 py-4 rounded-xl border border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateExit}
                className="flex-[2] bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl px-6 py-4 flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-100 active:scale-95"
              >
                <span className="material-symbols-outlined">save</span>
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Destinacoes;
