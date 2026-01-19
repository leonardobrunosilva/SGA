
import React, { useState } from 'react';
import { Animal } from '../types';
import { calculateDays, formatDate } from '../utils';
import { apreensoesService } from '../services/apreensoesService';
import { saidasService } from '../services/saidasService';
import EditModal, { FieldConfig } from './EditModal';

const ENTRY_STATUS_OPTIONS = [
  'Disponível',
  'Em tratamento',
  'HVET',
  'Restituído',
  'Prazo Vencido',
  'Sem Exame',
  'Experimento'
];

const DESTINATION_OPTIONS = [
  'Restituição',
  'Adoção',
  'Eutanásia',
  'Óbito',
  'Furto',
  'AIE+',
  'Restituição para outros órgãos',
  'Outros'
];

const Restituicao: React.FC = () => {
  // --- STATE MANAGEMENT (BATCH FLOW) ---
  const [animals, setAnimals] = useState<Animal[]>(() => {
    // Lazy init from localStorage to prevent overwriting with empty array
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('restituicoes_working_list');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
      }
    }
    return [];
  });

  const [newChip, setNewChip] = useState('');
  const [newStatus, setNewStatus] = useState(ENTRY_STATUS_OPTIONS[0]); // Default status
  const [foundEntry, setFoundEntry] = useState<any>(null);
  const [multipleEntries, setMultipleEntries] = useState<any[]>([]);
  const [showEntrySelectionModal, setShowEntrySelectionModal] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Animal | null>(null);

  const editFields: FieldConfig[] = [
    { name: 'chip', label: 'Chip', readOnly: true },
    { name: 'specie', label: 'Espécie' },
    { name: 'contactInitiated', label: 'Contato Realizado pelo Proprietário?', type: 'toggle' },
    { name: 'status', label: 'Status', type: 'select', options: ENTRY_STATUS_OPTIONS },
    { name: 'observations', label: 'Observações', type: 'textarea' },
  ];

  // Footer state
  const [batchExitDate, setBatchExitDate] = useState('');
  const [batchDestinationType, setBatchDestinationType] = useState(DESTINATION_OPTIONS[0]);

  // --- PERSISTENCE LOGIC ---
  React.useEffect(() => {
    localStorage.setItem('restituicoes_working_list', JSON.stringify(animals));
  }, [animals]);


  // Notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

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


  // --- HANDLERS ---

  const handleSearchEntry = async () => {
    if (!newChip.trim()) {
      showNotification("Digite um número de CHIP para buscar.", "info");
      return;
    }

    try {
      const entries = await apreensoesService.getByChip(newChip.trim());

      if (entries.length === 0) {
        setFoundEntry(null);
        setMultipleEntries([]);
        showNotification("Nenhum animal encontrado com este CHIP na base de Entradas.", "error");
      } else if (entries.length === 1) {
        setFoundEntry(entries[0]);
        setMultipleEntries([]);
        showNotification(`Animal localizado: ${entries[0].specie || entries[0]['Espécie']} - Entrada: ${formatDate(entries[0].dateIn || entries[0]['Data de Entrada'])}`, "success");
      } else {
        setMultipleEntries(entries);
        setFoundEntry(null);
        setShowEntrySelectionModal(true);
        showNotification(`${entries.length} registros encontrados. Selecione a entrada correta.`, "info");
      }
    } catch (e) {
      showNotification("Erro ao buscar no banco de dados.", "error");
      console.error(e);
    }
  };

  const handleSelectEntry = (entry: any) => {
    setFoundEntry(entry);
    setShowEntrySelectionModal(false);
    setMultipleEntries([]);
    const dateIn = entry.dateIn || entry.date_in || entry['Data de Entrada'];
    showNotification(`Registro de ${formatDate(dateIn)} selecionado.`, "success");
  };

  const handleEdit = (animal: Animal) => {
    setEditingItem(animal);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (updatedItem: any) => {
    const updatedList = animals.map(a => a.id === updatedItem.id ? updatedItem : a);
    setAnimals(updatedList);
    setIsEditModalOpen(false);
    setEditingItem(null);
    showNotification("Registro atualizado com sucesso!", "success");
  };

  const handleAddToStaging = () => {
    if (!foundEntry) {
      showNotification("Busque e selecione um animal primeiro.", "info");
      return;
    }

    const chip = String(foundEntry.chip || foundEntry['CHIP'] || '');
    const dateInRaw = foundEntry.dateIn || foundEntry.date_in || foundEntry['Data de Entrada'] || '-';
    const formattedDate = formatDate(dateInRaw);

    const newAnimal: Animal = {
      id: String(Date.now()),
      specie: foundEntry.specie || foundEntry['Espécie'] || 'Desconhecido',
      chip: chip,
      dateIn: formattedDate,
      exitDate: '-',
      origin: foundEntry.origin || foundEntry.organ || foundEntry['Região Administrativa'] || 'Não informado',
      gender: foundEntry.gender || foundEntry['Sexo'] || '-',
      breed: foundEntry.breed || foundEntry['Pelagem'] || '-',
      color: foundEntry.color || foundEntry['Pelagem'] || '-',
      status: newStatus, // Use selected status
      seiProcess: '-',
      osNumber: foundEntry.osNumber || foundEntry.os_number || foundEntry['Ordem de Serviço (OS)'] || '-',
      imageUrl: foundEntry.imageUrl || foundEntry.image_url || getImageUrl(animals.length),
      daysIn: foundEntry.daysIn || foundEntry.days_in || 0,
      observations: foundEntry.observations || foundEntry['Observações Complementares'] || '',
      organ: foundEntry.organ || foundEntry['Órgão'] || 'Não informado'
    };

    setAnimals([newAnimal, ...animals]);
    setNewChip('');
    setFoundEntry(null);
    showNotification("Animal inserido na lista de restituição.", "success");
  };

  const handleRemove = (id: string) => {
    setAnimals(prev => prev.filter(a => a.id !== id));
    showNotification("Item removido da lista.", "info");
  };

  const handleBatchSave = async () => {
    if (animals.length === 0) {
      showNotification("A lista está vazia.", "info");
      return;
    }
    if (!batchExitDate) {
      showNotification("Informe a Data da Saída/Restituição.", "info");
      return;
    }

    try {
      showNotification("Salvando no banco de dados...", "info");

      // Save all to Supabase
      const savePromises = animals.map(a => {
        return saidasService.create({
          chip: a.chip,
          specie: a.specie,
          gender: a.gender as any,
          color: a.color,
          history: '',
          observations: a.observations,
          osNumber: a.osNumber,
          dateOut: batchExitDate,
          destination: batchDestinationType,
          seiProcess: a.seiProcess || ''
        });
      });

      await Promise.all(savePromises);

      setAnimals([]); // This clears the state
      setBatchExitDate('');
      showNotification(`${animals.length} registros salvos no banco de dados!`, "success");
    } catch (e) {
      showNotification("Erro ao salvar no banco de dados.", "error");
      console.error(e);
    }
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAnimals = animals.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(animals.length / itemsPerPage);
  const handlePageChange = (page: number) => setCurrentPage(page);

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">

      {/* Toasts */}
      {notification && (
        <div className={`fixed top-24 right-8 z-[100] p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-fade-in-up ${notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
          <span className="material-symbols-outlined">{notification.type === 'success' ? 'check_circle' : notification.type === 'error' ? 'error' : 'info'}</span>
          <p className="text-sm font-bold">{notification.message}</p>
        </div>
      )}

      {/* Header + KPI */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div className="flex flex-col text-left">
          <h2 className="text-[#111814] text-3xl font-black leading-tight tracking-[-0.033em]">Animais para Restituir</h2>
          <p className="text-gray-500 text-sm font-normal">Busque o animal, adicione à lista e registre a saída.</p>
        </div>

        {/* KPI Card */}
        <div className="bg-white px-6 py-3 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-full text-blue-600">
            <span className="material-symbols-outlined text-xl">list_alt</span>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Disponíveis para Restituir</p>
            <p className="text-2xl font-black text-gray-800 leading-none">{animals.length}</p>
          </div>
        </div>
      </div>

      {/* Step 1: Search & Add */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-gdf-blue">add_circle</span>
          1. Identificar Animal
        </h3>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full relative">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Buscar por CHIP</label>
            <input
              value={newChip}
              onChange={(e) => setNewChip(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchEntry()}
              className={`w-full border ${foundEntry ? 'border-green-500 bg-green-50' : 'border-gray-300'} rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-gdf-blue transition-all`}
              placeholder="Ex: 982..."
            />
            <button onClick={handleSearchEntry} className="absolute right-2 top-7 p-1.5 text-gray-400 hover:text-gdf-blue">
              <span className="material-symbols-outlined">search</span>
            </button>
            {foundEntry && <span className="absolute top-full left-0 mt-1 text-[10px] text-green-600 font-bold whitespace-nowrap">Selecionado: {foundEntry['Espécie']} - {foundEntry['Data de Entrada']}</span>}
          </div>

          <div className="w-full md:w-48">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gdf-blue"
            >
              {ENTRY_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <button
            onClick={handleAddToStaging}
            className="w-full md:w-auto px-6 py-2.5 bg-gdf-blue hover:bg-gdf-blue-dark text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
          >
            <span className="material-symbols-outlined">playlist_add</span>
            Inserir na Lista
          </button>
        </div>
      </div>

      {/* Step 2: List (Table) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-[#111814] text-lg font-bold">2. Lista de Saída (Preparação)</h3>
          {/* Internal table counter if needed, but redundant with top KPI now, maybe keep as simple badge */}
          {/* <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">{animals.length} itens</span> */}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Identificação</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Animal (Espécie)</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Status</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Data Entrada</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Permanência</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Origem</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Histórico</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentAnimals.map(animal => (
                <tr key={animal.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-slate-700">{animal.chip}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cover" style={{ backgroundImage: `url(${animal.imageUrl})` }}></div>
                      <div>
                        <p className="font-bold text-slate-800">{animal.specie}</p>
                        <p className="text-[10px] text-slate-500">{animal.gender} / {animal.color}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-bold border border-gray-200">
                      {animal.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {animal.contactInitiated ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full border border-emerald-200">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Contato Realizado
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">{animal.dateIn}</td>
                  <td className="px-6 py-4">
                    {(() => {
                      /* Logic for Today - DateIn */
                      try {
                        const today = new Date();
                        const parts = animal.dateIn ? animal.dateIn.split('/') : [];
                        if (parts.length === 3) {
                          const entryDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                          if (isNaN(entryDate.getTime())) return <span>-</span>;
                          const diffTime = Math.abs(today.getTime() - entryDate.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          const isAlert = diffDays > 30;
                          return <span className={`font-bold ${isAlert ? 'text-red-500' : 'text-slate-600'}`}>{diffDays} dias</span>;
                        }
                        return <span>-</span>;
                      } catch { return <span>-</span>; }
                    })()}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{animal.origin}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => showNotification(`Visualizar Detalhes: ${animal.specie} (${animal.chip}) - Em breve`, "info")} className="text-gray-400 hover:text-blue-600 p-1.5 rounded-full hover:bg-blue-50 transition-colors" title="Visualizar">
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                      <button onClick={() => handleEdit(animal)} className="text-gray-400 hover:text-orange-600 p-1.5 rounded-full hover:bg-orange-50 transition-colors" title="Editar">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button onClick={() => handleRemove(animal.id)} className="text-gray-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors" title="Remover">
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {animals.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400 italic">Nenhum animal adicionado à lista ainda.</td></tr>
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
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-bold text-gray-600 hover:bg-white hover:text-gdf-blue disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Anterior
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${currentPage === page ? 'bg-gdf-blue text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'}`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-bold text-gray-600 hover:bg-white hover:text-gdf-blue disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Footer (Register Exit) */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t border-gray-200 p-6 shadow-2xl z-50 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-full text-blue-600"><span className="material-symbols-outlined">event_available</span></div>
          <div>
            <h4 className="font-bold text-slate-800">3. Registrar Saída</h4>
            <p className="text-xs text-slate-500">Defina a data para baixar todo o lote acima.</p>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Data da Restituicao</label>
            <input
              type="date"
              value={batchExitDate}
              onChange={(e) => setBatchExitDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-gdf-blue"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1">Tipo de Destinação</label>
            <select
              value={batchDestinationType}
              onChange={(e) => setBatchDestinationType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-gdf-blue min-w-[200px]"
            >
              {DESTINATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <button
            onClick={handleBatchSave}
            disabled={animals.length === 0}
            className="flex-1 md:flex-none px-8 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-lg shadow-lg shadow-green-900/20 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">check_circle</span>
            Concluir Baixa
          </button>
        </div>
      </div>

      {/* Modal Multi Entries */}
      {showEntrySelectionModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col relative text-left">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-black text-slate-800">Selecione a Entrada</h3>
                <p className="text-xs text-slate-500 uppercase font-bold mt-1">Múltiplos registros com este CHIP</p>
              </div>
              <button onClick={() => setShowEntrySelectionModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-2 max-h-[400px] overflow-y-auto">
              {multipleEntries.map((entry, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectEntry(entry)}
                  className="w-full text-left p-4 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors group flex items-start gap-3"
                >
                  <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-200 transition-colors">
                    <span className="material-symbols-outlined">calendar_month</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Entrada em: {formatDate(entry.dateIn || entry.date_in || entry['Data de Entrada'])}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Origem: {entry.origin || entry.organ || entry['Região Administrativa']} | OS: {entry.osNumber || entry.os_number || entry['Ordem de Serviço (OS)'] || 'N/A'}</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">{entry.specie || entry['Espécie']} - {entry.color || entry['Pelagem']}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditModal
        isOpen={isEditModalOpen}
        title="Editar Animal (Restituição)"
        data={editingItem}
        fields={editFields}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
      />
    </div>
  );
};

export default Restituicao;
