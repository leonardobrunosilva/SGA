import React, { useState, useRef, useMemo } from 'react';
import { MOCK_ANIMALS, ORGAOS_LIST, RA_LIST, ESPECIES } from '../constants';
import { Animal } from '../types';
import { formatDate } from '../utils';

import { apreensoesService } from '../services/apreensoesService';
import { adocaoService, restituicaoService, outrosOrgaosService } from '../services/worklistService';

const Apreensoes: React.FC = () => {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [chipSearch, setChipSearch] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [raFilter, setRaFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [totalExternalCount, setTotalExternalCount] = useState(0);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);

  // Form States
  const [formData, setFormData] = useState<Partial<Animal>>({});
  const [selectedGender, setSelectedGender] = useState<'Macho' | 'Fêmea'>('Macho');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recurrenceData, setRecurrenceData] = useState<{ count: number; lastDate: string | null; seiProcess: string | null } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);



  // Fetch data on mount
  React.useEffect(() => {
    loadAnimals();
    loadExternalStats();
  }, []);

  const loadExternalStats = async () => {
    try {
      const [adocoes, restituicoes, outros] = await Promise.all([
        adocaoService.getAll(),
        restituicaoService.getAll(),
        outrosOrgaosService.getAll()
      ]);
      setTotalExternalCount(adocoes.length + restituicoes.length + outros.length);
    } catch (error) {
      console.error('Error loading external stats:', error);
    }
  };

  // Carregar dados REAIS do Supabase
  const loadAnimals = async () => {
    try {
      setIsLoading(true);
      const data = await apreensoesService.getApreensoes();

      // Mapeamento dos dados do Supabase para o Modelo interno (se necessário)
      const mappedData: Animal[] = data.map((item: any) => ({
        id: item.id,
        organ: item.organ || 'Desconhecido',
        chip: item.chip ? String(item.chip) : 'S/N',
        osNumber: item.os_number || item.osNumber || 'S/N',
        specie: item.specie || 'Não Informado',
        gender: item.gender || 'Não Informado',
        breed: item.breed || 'SRD',
        color: item.color || 'Não Informado',
        status: item.status || 'Em Custódia',
        origin: item.origin || '',
        dateIn: item.date_in || item.dateIn || '',
        timeIn: item.time_in || item.timeIn || '',
        observations: item.observations || '',
        imageUrl: item.image_url || item.imageUrl || 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?q=80&w=2071&auto=format&fit=crop',
        classification: item.classification || '',
        mapsUrl: item.maps_url || item.mapsUrl || '',
        daysIn: item.days_in || item.daysIn || 0,
      }));

      // Ordenar por data (mais recente primeiro)
      mappedData.sort((a, b) => new Date(b.dateIn).getTime() - new Date(a.dateIn).getTime());

      setAnimals(mappedData);
    } catch (error: any) {
      console.error('Error loading animals from Supabase:', error);
      alert(`Erro ao carregar apreensões do Supabase: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Lógica de Filtragem e Paginação
  const filteredAnimals = useMemo(() => {
    // Reset page on filter change
    if (currentPage !== 1) setCurrentPage(1);

    return animals.filter(animal => {
      // Comparação exata de Espécie
      const matchSpecies = speciesFilter === '' || animal.specie === speciesFilter;

      // Busca parcial por CHIP
      const matchChip = chipSearch === '' || animal.chip.toLowerCase().includes(chipSearch.toLowerCase());

      // Filtro por Ano (Extraído de dateIn YYYY-MM-DD)
      let matchYear = true;
      if (yearFilter && animal.dateIn) {
        matchYear = animal.dateIn.startsWith(yearFilter);
      }

      const matchRa = raFilter === '' || animal.origin.includes(raFilter);

      const matchDate = dateFilter === '' || animal.dateIn === dateFilter;

      const matchClassification = classificationFilter === '' || animal.classification === classificationFilter;

      return matchSpecies && matchChip && matchYear && matchRa && matchDate && matchClassification;
    });
  }, [animals, speciesFilter, chipSearch, yearFilter, raFilter, dateFilter, classificationFilter]);

  // Stats calculados dinamicamente
  const stats = [
    {
      label: 'Total de Apreensões',
      value: filteredAnimals.length.toString(),
      change: 'Filtradas na tabela',
      icon: 'verified_user',
      bgColor: 'bg-blue-50',
      textColor: 'text-gdf-blue',
      accentColor: 'bg-blue-50/50'
    },
    {
      label: 'Disponíveis',
      value: totalExternalCount.toString(),
      change: 'Adoc/Restit/Outros',
      icon: 'check_circle',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      accentColor: 'bg-green-50/50'
    },
  ];

  // Calculate slice for current page
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAnimals = filteredAnimals.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAnimals.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleEdit = (animal: Animal) => {
    setEditingAnimal(animal);
    setFormData(animal);
    setSelectedGender(animal.gender);
    setPhotoPreview(animal.imageUrl);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingAnimal(null);
    setRecurrenceData(null); // Reset recurrence
    setFormData({
      dateIn: new Date().toISOString().split('T')[0],
      timeIn: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      organ: '',
      origin: '',
      specie: ESPECIES[0],
      classification: '',
      mapsUrl: ''
    });
    setSelectedGender('Macho');
    setPhotoPreview(null);
    setIsFormOpen(true);
  };

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

  const handleChipBlur = async () => {
    if (formData.chip && formData.chip.length > 3) {
      // Only check if it looks like a valid partial chip
      const result = await apreensoesService.checkRecurrence(formData.chip);
      if (result.count > 0) {
        setRecurrenceData({ count: result.count, lastDate: result.lastDate, seiProcess: result.seiProcess });
      } else {
        setRecurrenceData(null);
      }
    }
  };

  const clearFilters = () => {
    setYearFilter('');
    setSpeciesFilter('');
    setChipSearch('');
    setClassificationFilter('');
    setRaFilter('');
    setDateFilter('');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta apreensão? A ação não pode ser desfeita.")) {
      try {
        await apreensoesService.delete(id);
        alert("Apreensão excluída com sucesso!");
        loadAnimals();
      } catch (error: any) {
        console.error(error);
        alert(`Erro ao excluir: ${error.message || "Tente novamente."}`);
      }
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
              {editingAnimal ? `Editando Animal #${editingAnimal.id}` : 'Nova Entrada de Animal'}
            </h2>
            <p className="text-slate-500 text-sm">
              {editingAnimal ? 'Atualize as informações do semovente abaixo.' : 'Preencha os campos abaixo para registrar um novo semovente no sistema.'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-8 space-y-8">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">assignment</span>
                Informações de Registro
              </h3>

              {/* Alert de Reincidência */}
              {recurrenceData && recurrenceData.count > 0 && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in text-left">
                  <span className="material-symbols-outlined text-red-600 mt-0.5">warning</span>
                  <div className="flex-1">
                    <h4 className="text-sm font-black text-red-800 uppercase tracking-tight">⚠ Animal Reincidente: {recurrenceData.count + 1}ª Apreensão</h4>
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      Este animal já consta no sistema.
                      {recurrenceData.lastDate && <> Última entrada em: <strong>{new Date(recurrenceData.lastDate).toLocaleDateString('pt-BR')}</strong>.</>}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <p className="text-[10px] text-red-700 bg-white px-2 py-1 rounded border border-red-100 font-bold uppercase shadow-sm">
                        PROCESSO SEI: {recurrenceData.seiProcess || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase">Órgão Solicitante</label>
                  <select
                    value={formData.organ}
                    onChange={(e) => setFormData({ ...formData, organ: e.target.value })}
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm focus:border-gdf-blue outline-none transition-all"
                  >
                    <option value="" disabled>Selecione Órgão</option>
                    {ORGAOS_LIST.map((org) => (
                      <option key={org} value={org}>{org}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase">Ordem de Serviço (OS)</label>
                  <input
                    value={formData.osNumber || ''}
                    onChange={(e) => setFormData({ ...formData, osNumber: e.target.value })}
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm focus:border-gdf-blue outline-none"
                    placeholder="Ex: 2023-9042"
                    type="text"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase">Região Administrativa</label>
                  <select
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm focus:border-gdf-blue outline-none transition-all"
                  >
                    <option value="" disabled>Selecione a Região</option>
                    {RA_LIST.map((ra) => (
                      <option key={ra} value={ra}>{ra}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase">Coordenadas (Google Maps)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[18px]">map</span>
                    <input
                      value={formData.mapsUrl || ''}
                      onChange={(e) => setFormData({ ...formData, mapsUrl: e.target.value })}
                      className="w-full rounded-lg bg-gray-50 border border-gray-200 pl-10 pr-4 py-2.5 text-sm focus:border-gdf-blue outline-none"
                      placeholder="https://maps.google.com/..."
                      type="text"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-100">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">pets</span>
                Características do Animal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase">Espécie</label>
                  <select
                    value={formData.specie}
                    onChange={(e) => setFormData({ ...formData, specie: e.target.value })}
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm focus:border-gdf-blue outline-none transition-all"
                  >
                    {ESPECIES.map((esp) => (
                      <option key={esp} value={esp}>{esp}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase">Classificação / Observação</label>
                  <select
                    value={formData.classification || ''}
                    onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm focus:border-gdf-blue outline-none transition-all"
                  >
                    <option value="">Selecione...</option>
                    <option value="Garanhão">Garanhão</option>
                    <option value="Castrado">Castrado</option>
                    <option value="Potro(a)">Potro(a)</option>
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
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase">Nº do CHIP</label>
                  <input
                    value={formData.chip || ''}
                    onChange={(e) => setFormData({ ...formData, chip: e.target.value })}
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm font-mono focus:border-gdf-blue outline-none"
                    placeholder="982..."
                    type="text"
                    onBlur={handleChipBlur}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600 ml-1 uppercase">Data de Entrada</label>
                    <input
                      value={formData.dateIn || ''}
                      onChange={(e) => setFormData({ ...formData, dateIn: e.target.value })}
                      className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm focus:border-gdf-blue outline-none transition-all"
                      type="date"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600 ml-1 uppercase">Hora da Entrada</label>
                    <input
                      value={formData.timeIn || ''}
                      onChange={(e) => setFormData({ ...formData, timeIn: e.target.value })}
                      className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5 text-sm focus:border-gdf-blue outline-none transition-all"
                      type="time"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 ml-1 uppercase">Upload de Foto</label>
                  <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" accept="image/*" />
                  {photoPreview ? (
                    <div className="relative w-full h-10 group">
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover rounded-lg border border-primary" />
                      <button onClick={() => setPhotoPreview(null)} className="absolute -top-2 -right-2 bg-red-500 text-white size-5 rounded-full flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-[14px]">close</span></button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full rounded-lg border-2 border-dashed border-gray-200 py-2 text-xs text-slate-400 hover:bg-gray-50 hover:border-primary transition-all flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                      Anexar Imagem
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mt-6 text-left">
                <label className="text-xs font-bold text-slate-600 ml-1 uppercase">Observações Complementares</label>
                <textarea
                  rows={4}
                  value={formData.observations || ''}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  className="w-full rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm focus:border-gdf-blue outline-none transition-all"
                  placeholder="Descreva o estado de saúde..."
                ></textarea>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-8 py-5 border-t border-gray-100 flex justify-between items-center">
            <button onClick={() => setIsFormOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">Cancelar</button>
            <div className="flex gap-3">
              <button className="px-6 py-2.5 bg-white border border-gray-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-gray-100 transition-all flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">print</span>Gerar Termo</button>
              <button
                onClick={async () => {
                  try {
                    // Upload photo if new file selected
                    let uploadedImageUrl = '';
                    if (selectedFile) {
                      uploadedImageUrl = await apreensoesService.uploadPhoto(selectedFile);
                    }

                    if (editingAnimal) {
                      await apreensoesService.updateApreensao(editingAnimal.id, {
                        ...formData,
                        gender: selectedGender,
                        imageUrl: uploadedImageUrl || editingAnimal.imageUrl, // Use new URL or keep existing
                        specie: formData.specie || editingAnimal.specie, // Ensure required fields
                        breed: formData.breed || editingAnimal.breed,
                        status: formData.status || editingAnimal.status,
                        classification: formData.classification !== undefined ? formData.classification : editingAnimal.classification,
                      });

                      setIsFormOpen(false);
                      setEditingAnimal(null);
                      await loadAnimals();
                    } else {
                      // Basic validation
                      if (!formData.chip && !formData.osNumber) {
                        alert('Preencha ao menos o Chip ou a OS.');
                        return;
                      }

                      // Create new
                      let uploadedImageUrl = '';
                      if (selectedFile) {
                        uploadedImageUrl = await apreensoesService.uploadPhoto(selectedFile);
                      }

                      await apreensoesService.createApreensao({
                        breed: 'SRD',
                        chip: formData.chip || 'S/N',
                        // name removed per refactor
                        specie: formData.specie || 'Equino',
                        gender: selectedGender,
                        color: formData.color || 'Não informada',
                        status: 'Em Custódia',
                        origin: formData.origin || 'RA Desconhecida',
                        dateIn: formData.dateIn || new Date().toISOString().split('T')[0],
                        timeIn: formData.timeIn,
                        observations: formData.observations || '',
                        imageUrl: uploadedImageUrl,
                        organ: formData.organ || 'Outros',
                        osNumber: formData.osNumber || 'S/N',
                        mapsUrl: formData.mapsUrl,
                        classification: formData.classification,
                        daysIn: 0
                      });

                      await loadAnimals(); // Refresh list
                      setIsFormOpen(false);
                    }
                  } catch (e: any) {
                    console.error('Erro detalhado:', e);
                    alert(`Erro ao salvar: ${e.message || 'Erro desconhecido'}. Verifique o console para mais detalhes.`);
                  }
                }}
                className="px-8 py-2.5 bg-gdf-blue text-white text-sm font-black rounded-lg hover:bg-gdf-blue-dark transition-all shadow-lg shadow-blue-900/20"
              >
                {editingAnimal ? 'Atualizar Dados' : 'Salvar e Finalizar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between relative overflow-hidden group hover:border-gdf-blue/30 transition-colors">
            <div className={`absolute right-0 top-0 h-16 w-16 ${stat.accentColor} rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{stat.value}</h3>
              <p className={`text-[10px] font-bold mt-1 flex items-center gap-0.5 ${i === 0 ? 'text-green-600' : 'text-slate-400 font-medium'}`}>
                {i === 0 && <span className="material-symbols-outlined text-[12px]">trending_up</span>}
                {stat.change}
              </p>
            </div>
            <div className={`h-10 w-10 rounded-lg ${stat.bgColor} flex items-center justify-center ${stat.textColor} z-10`}>
              <span className="material-symbols-outlined">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Page Title & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
        <div className="flex flex-col gap-1 text-left">
          <h2 className="text-3xl font-black tracking-tight text-slate-800">Entrada de Animais</h2>
          <p className="text-slate-500 text-sm">Gerencie o fluxo de entrada e apreensão de grandes animais (Semoventes).</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center justify-center gap-2 rounded-lg bg-gdf-blue px-5 py-2.5 text-white font-bold text-sm hover:bg-gdf-blue-dark transition-colors shadow-lg shadow-blue-900/20"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Nova Entrada
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {/* Row 1: Ano, Espécie, Classificação */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Ano</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">calendar_month</span>
              <select
                className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-8 py-3 text-sm text-slate-900 focus:border-gdf-blue focus:ring-2 focus:ring-gdf-blue/10 outline-none appearance-none cursor-pointer"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px] pointer-events-none">expand_more</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Espécie</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">pets</span>
              <select
                className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-8 py-3 text-sm text-slate-900 focus:border-gdf-blue focus:ring-2 focus:ring-gdf-blue/10 outline-none appearance-none cursor-pointer"
                value={speciesFilter}
                onChange={(e) => setSpeciesFilter(e.target.value)}
              >
                <option value="">Todas</option>
                {ESPECIES.map(esp => (
                  <option key={esp} value={esp}>{esp}</option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px] pointer-events-none">expand_more</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Classificação</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">label</span>
              <select
                className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-8 py-3 text-sm text-slate-900 focus:border-gdf-blue focus:ring-2 focus:ring-gdf-blue/10 outline-none appearance-none cursor-pointer"
                value={classificationFilter}
                onChange={(e) => setClassificationFilter(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="Garanhão">Garanhão</option>
                <option value="Castrado">Castrado</option>
                <option value="Potro(a)">Potro(a)</option>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px] pointer-events-none">expand_more</span>
            </div>
          </div>

          {/* Row 2: Chip, RA, Data */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Identificação/CHIP</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">memory</span>
              <input
                className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-gray-400 focus:border-gdf-blue focus:ring-2 focus:ring-gdf-blue/10 outline-none transition-all"
                placeholder="Busca por Chip"
                value={chipSearch}
                onChange={(e) => setChipSearch(e.target.value)}
                type="text"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Região Administrativa</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">location_on</span>
              <select
                className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-8 py-3 text-sm text-slate-900 focus:border-gdf-blue focus:ring-2 focus:ring-gdf-blue/10 outline-none appearance-none cursor-pointer"
                value={raFilter}
                onChange={(e) => setRaFilter(e.target.value)}
              >
                <option value="">Todas RA's</option>
                {RA_LIST.map(ra => (
                  <option key={ra} value={ra}>{ra}</option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px] pointer-events-none">expand_more</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Data de Apreensão</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">calendar_today</span>
              <input
                type="date"
                className="w-full rounded-xl bg-gray-50 border border-gray-200 pl-10 pr-4 py-3 text-sm text-slate-900 focus:border-gdf-blue focus:ring-2 focus:ring-gdf-blue/10 outline-none transition-all"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-wider"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm mb-12">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="p-4 font-semibold text-left">Órgão Solicitante</th>
                <th className="p-4 font-semibold text-left">Identificação</th>
                <th className="p-4 font-semibold text-left">Espécie</th>
                <th className="p-4 font-semibold text-left">Origem (RA)</th>
                <th className="p-4 font-semibold text-left">Data de Entrada</th>
                <th className="p-4 font-semibold text-left">Localização</th>
                <th className="p-4 font-semibold text-left">Histórico</th>
                <th className="p-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentAnimals.map((animal) => (
                <tr key={animal.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-4">
                    <p className="text-xs font-bold text-slate-700 text-left">{animal.organ.split(' - ')[0]}</p>
                    <p className="text-[10px] text-slate-400 uppercase mt-0.5 text-left">Solicitante</p>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-bold text-gray-500 border border-gray-200 uppercase">CHIP</span>
                        <span className="text-gray-700 font-mono text-xs">{animal.chip.slice(-12)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-bold text-gray-500 border border-gray-200 uppercase">OS</span>
                        <span className="text-gray-500 text-xs">{animal.osNumber}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shadow-sm">
                        <img src={animal.imageUrl} className="w-full h-full object-cover" alt={animal.name} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900 leading-none">{animal.specie}</p>
                        <p className="text-[11px] text-gray-500 mt-1">
                          {[animal.gender, animal.color].filter(Boolean).join(' / ')}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-left">
                    <p className="text-xs font-bold text-slate-700">{animal.origin}</p>
                    <p className="text-[10px] text-slate-400 uppercase mt-0.5">Apreensão</p>
                  </td>
                  <td className="p-4 text-left">
                    <p className="text-xs font-bold text-slate-700">{formatDate(animal.dateIn)}</p>
                    <p className="text-[10px] text-slate-400 uppercase mt-0.5">Entrada</p>
                  </td>
                  <td className="p-4 text-left">
                    {animal.mapsUrl ? (
                      <a
                        href={animal.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200 group/map"
                      >
                        <span className="material-symbols-outlined text-[18px] group-hover/map:scale-110 transition-transform">location_on</span>
                        <span className="text-[11px] font-black uppercase tracking-tight">Ver no Mapa</span>
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-300 italic">Não informado</span>
                    )}
                  </td>
                  <td className="p-4 text-left">
                    {(() => {
                      const count = animals.filter(a => a.chip === animal.chip).length;
                      if (count > 1) {
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 text-[10px] font-black uppercase tracking-tight">
                            <span className="material-symbols-outlined text-[14px]">history</span>
                            Reincidente
                          </span>
                        );
                      }
                      return <span className="text-[10px] uppercase font-bold text-slate-400">Primário</span>;
                    })()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => console.log('Visualizar', animal.id)}
                        className="p-2 text-slate-400 hover:text-gdf-blue hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                      <button
                        onClick={() => handleEdit(animal)}
                        className="p-2 text-slate-400 hover:text-gdf-blue hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit_square</span>
                      </button>
                      <button
                        onClick={() => handleDelete(animal.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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
    </div>
  );
};

export default Apreensoes;
