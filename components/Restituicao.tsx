import React, { useState, useEffect } from 'react';
import { Animal } from '../types';
import { calculateDays, formatDate } from '../utils';
import { apreensoesService } from '../services/apreensoesService';
import { saidasService } from '../services/saidasService';
import { restituicaoService } from '../services/worklistService';
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

import { ORGAOS_LIST, RA_LIST, ESPECIES } from '../constants';

const Restituicao: React.FC = () => {
  // --- STATE MANAGEMENT (BATCH FLOW) ---
  const [animals, setAnimals] = useState<any[]>([]);

  // Load from Supabase
  useEffect(() => {
    loadAnimals();
  }, []);

  const loadAnimals = async () => {
    try {
      const data = await restituicaoService.getAll();
      setAnimals(data || []);
    } catch (error: any) {
      showNotification(`Erro ao carregar lista: ${error.message || 'Desconhecido'}`, "error");
    }
  };

  const [newChip, setNewChip] = useState('');
  const [newStatus, setNewStatus] = useState(ENTRY_STATUS_OPTIONS[0]); // Default status
  const [foundEntry, setFoundEntry] = useState<any>(null);
  const [multipleEntries, setMultipleEntries] = useState<any[]>([]);
  const [showEntrySelectionModal, setShowEntrySelectionModal] = useState(false);

  // Edit Form State (Robust)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWorklistItem, setEditingWorklistItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<Partial<Animal>>({});
  const [selectedGender, setSelectedGender] = useState<'Macho' | 'Fêmea'>('Macho');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const handleEdit = (worklistItem: any) => {
    const animal = worklistItem.animal || {};
    setEditingWorklistItem(worklistItem);
    setFormData({
      ...animal,
      id: animal.id,
      chip: animal.chip,
      specie: animal.specie,
      gender: animal.gender,
      color: animal.color,
      seiProcess: animal.seiProcess || animal.sei_process,
      observations: animal.observations,
      imageUrl: animal.imageUrl || animal.image_url,
    });
    // Specific worklist fields stored in a separate temporary object or within formData
    setFormData((prev: any) => ({
      ...prev,
      worklistStatus: worklistItem.status,
      worklistObservations: worklistItem.observations,
      contato_realizado: worklistItem.contato_realizado
    }));

    setSelectedGender(animal.gender || 'Macho');
    setPhotoPreview(animal.imageUrl || animal.image_url);
    setIsFormOpen(true);
  };

  const handleSaveEdit = async () => {
    console.log('Tentando salvar alterações...', { editingWorklistItem, formData });

    if (!editingWorklistItem || !editingWorklistItem.id) {
      console.error('Erro: ID do item da worklist não encontrado no estado.');
      showNotification("Erro interno: ID do item não localizado.", "error");
      return;
    }

    try {
      showNotification("Salvando alterações...", "info");

      // 1. Update Photo if needed
      let uploadedImageUrl = '';
      if (selectedFile) {
        console.log('Subindo nova foto...');
        uploadedImageUrl = await apreensoesService.uploadPhoto(selectedFile);
      }

      // 2. Update Animal (Apreensões Table)
      const animalUpdates: Partial<Animal> = {
        specie: formData.specie,
        gender: selectedGender,
        color: formData.color,
        seiProcess: formData.seiProcess,
        imageUrl: uploadedImageUrl || formData.imageUrl,
        chip: formData.chip,
        observations: formData.observations, // General observations from animal
      };

      console.log('Atualizando dados do animal (apreensoes)...', animalUpdates);
      await apreensoesService.updateApreensao(editingWorklistItem.animal_id, animalUpdates);

      // 3. Update Worklist (Worklist Restituicao Table)
      const worklistUpdates = {
        status: (formData as any).worklistStatus,
        observations: (formData as any).worklistObservations,
        contato_realizado: (formData as any).contato_realizado
      };

      console.log('Atualizando dados da worklist (restituicao)...', worklistUpdates);
      await restituicaoService.update(editingWorklistItem.id, worklistUpdates);

      showNotification("Registro atualizado com sucesso!", "success");
      loadAnimals();
      setIsFormOpen(false);
      setEditingWorklistItem(null);
      setSelectedFile(null);
    } catch (e: any) {
      console.error('Erro ao salvar alterações:', e);
      showNotification(`Erro ao salvar: ${e.message || 'Erro desconhecido'}`, "error");
    }
  };

  const handleAddToStaging = async () => {
    if (!foundEntry) {
      showNotification("Busque e selecione um animal primeiro.", "info");
      return;
    }

    // Check duplicate
    if (animals.some(a => a.animal_id === foundEntry.id)) {
      showNotification("Este animal já está na lista.", "info");
      return;
    }

    try {
      await restituicaoService.add(foundEntry.id, newStatus, foundEntry.observations || foundEntry['Observações Complementares'] || '');

      showNotification("Animal inserido na lista de restituição.", "success");
      setNewChip('');
      setFoundEntry(null);
      loadAnimals();
    } catch (e: any) {
      showNotification(`Erro: ${e.message || 'Erro desconhecido'}`, "error");
      console.error(e);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await restituicaoService.remove(id);
      showNotification("Item removido da lista.", "info");
      loadAnimals();
    } catch (error) {
      showNotification("Erro ao remover item.", "error");
    }
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
        const animalData = a.animal || {};
        return saidasService.create({
          chip: animalData.chip,
          specie: animalData.specie,
          gender: animalData.gender as any,
          color: animalData.color,
          history: '',
          observations: animalData.observations,
          osNumber: animalData.osNumber,
          dateOut: batchExitDate,
          destination: batchDestinationType,
          seiProcess: animalData.seiProcess || ''
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (isFormOpen) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in max-w-4xl mx-auto pb-20">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => setIsFormOpen(false)}
            className="p-2 rounded-full hover:bg-gray-100 text-slate-500 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="text-left">
            <h2 className="text-2xl font-black tracking-tight text-slate-800">
              Editando Animal (Restituição)
            </h2>
            <p className="text-slate-500 text-sm">
              Atualize as informações do semovente e o status da restituição abaixo.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-8 space-y-8">
            {/* Secção 1: Características do Animal */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">pets</span>
                Características do Animal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase">Chip (Identificação)</label>
                  <input
                    value={formData.chip || ''}
                    readOnly
                    className="w-full rounded-lg bg-gray-100 border border-gray-200 px-4 py-2.5 text-sm font-mono text-slate-500 outline-none"
                    type="text"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase">Espécie</label>
                  <select
                    value={formData.specie || ''}
                    onChange={(e) => setFormData({ ...formData, specie: e.target.value })}
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm focus:border-gdf-blue outline-none transition-all"
                  >
                    {ESPECIES.map((esp) => (
                      <option key={esp} value={esp}>{esp}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase">Sexo</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedGender('Macho')}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all border ${selectedGender === 'Macho'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-blue-50 border-blue-100 text-blue-700'
                        }`}
                    >
                      Macho
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGender('Fêmea')}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all border ${selectedGender === 'Fêmea'
                        ? 'bg-pink-600 text-white border-pink-600'
                        : 'bg-gray-50 border-gray-200 text-slate-500'
                        }`}
                    >
                      Fêmea
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase">Pelagem / Cor</label>
                  <input
                    value={formData.color || ''}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm focus:border-gdf-blue outline-none"
                    placeholder="Ex: Alazã, Tordilho..."
                    type="text"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase">Processo SEI</label>
                  <input
                    value={formData.seiProcess || ''}
                    onChange={(e) => setFormData({ ...formData, seiProcess: e.target.value })}
                    className="w-full rounded-lg bg-gray-100 border border-gray-200 px-4 py-2.5 text-sm focus:border-gdf-blue outline-none font-bold text-blue-800"
                    placeholder="00000-00000000/0000-00"
                    type="text"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase">Foto do Semovente</label>
                  <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
                  {photoPreview ? (
                    <div className="relative w-full h-10 group">
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover rounded-lg border border-primary" />
                      <button onClick={() => setPhotoPreview(null)} className="absolute -top-2 -right-2 bg-red-500 text-white size-5 rounded-full flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-[14px]">close</span></button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full rounded-lg border-2 border-dashed border-gray-200 py-2 text-xs text-slate-400 hover:bg-gray-50 hover:border-primary transition-all flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                      Alterar Imagem
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Secção 2: Status da Restituição */}
            <div className="pt-8 border-t border-gray-100">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#059669] mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">rebase_edit</span>
                Status e Fluxo de Restituição
              </h3>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${(formData as any).contato_realizado ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-400'}`}>
                    <span className="material-symbols-outlined">{(formData as any).contato_realizado ? 'notifications_active' : 'notifications_off'}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-emerald-900 uppercase tracking-tight">Contato Realizado pelo Proprietário?</p>
                    <p className="text-xs text-emerald-600 font-medium italic">Marque se o dono já entrou em contato para reaver o animal.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, contato_realizado: !(formData as any).contato_realizado } as any)}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${(formData as any).contato_realizado ? 'bg-emerald-600' : 'bg-gray-300'}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${(formData as any).contato_realizado ? 'translate-x-8' : 'translate-x-1'}`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase">Status Atual (Worklist)</label>
                  <select
                    value={(formData as any).worklistStatus || ''}
                    onChange={(e) => setFormData({ ...formData, worklistStatus: e.target.value } as any)}
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm focus:border-gdf-blue outline-none transition-all"
                  >
                    {ENTRY_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase">Observações da Restituição</label>
                  <textarea
                    rows={3}
                    value={(formData as any).worklistObservations || ''}
                    onChange={(e) => setFormData({ ...formData, worklistObservations: e.target.value } as any)}
                    className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm focus:border-gdf-blue outline-none transition-all"
                    placeholder="Informações sobre o proprietário, prazos, etc..."
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-8 py-5 border-t border-gray-100 flex justify-between items-center">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="px-10 py-2.5 bg-gdf-blue text-white text-sm font-black rounded-lg hover:bg-gdf-blue-dark transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Histórico</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Data Entrada</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Permanência</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">Origem</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentAnimals.map(row => {
                const animalData = row.animal || {};

                return (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-700">{animalData.chip}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cover" style={{ backgroundImage: `url(${animalData.image_url || getImageUrl(0)})` }}></div>
                        <div>
                          <p className="font-bold text-slate-800">{animalData.specie}</p>
                          <p className="text-[10px] text-slate-500">{animalData.gender} / {animalData.color}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-bold border border-gray-200">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.contato_realizado ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 text-[10px] font-black uppercase tracking-tight">
                          <span className="material-symbols-outlined text-[14px]">phone_in_talk</span>
                          Contato Realizado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-400 border border-gray-200 text-[10px] font-bold uppercase tracking-tight">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(animalData.date_in)}</td>
                    <td className="px-6 py-4">
                      {(() => {
                        /* Logic for Today - DateIn */
                        try {
                          const today = new Date();
                          const parts = animalData.date_in ? formatDate(animalData.date_in).split('/') : [];
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
                    <td className="px-6 py-4 text-slate-600">{animalData.origin || animalData.organ || 'Não informado'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => showNotification(`Visualizar Detalhes: ${animalData.specie} (${animalData.chip}) - Em breve`, "info")} className="text-gray-400 hover:text-blue-600 p-1.5 rounded-full hover:bg-blue-50 transition-colors" title="Visualizar">
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                        <button onClick={() => handleEdit(row)} className="text-gray-400 hover:text-orange-600 p-1.5 rounded-full hover:bg-orange-50 transition-colors" title="Editar">
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button onClick={() => handleRemove(row.id)} className="text-gray-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50 transition-colors" title="Remover">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
                    <p className="text-[10px] text-gdf-blue font-black uppercase mt-1">PROCESSO SEI: {entry.seiProcess || entry.sei_process || '-'}</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">{entry.specie || entry['Espécie']} - {entry.color || entry['Pelagem']}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Restituicao;
