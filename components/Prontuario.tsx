
import React, { useState, useRef } from 'react';
import { apreensoesService } from '../services/apreensoesService';
import { Animal } from '../types';
import { formatDate } from '../utils';

const BLANK_ANIMAL: Animal = {
  id: '',
  chip: '',
  specie: '---',
  breed: '---',
  gender: 'Macho',
  color: '---',
  status: '---',
  origin: '---',
  dateIn: '---',
  daysIn: 0,
  observations: '',
  imageUrl: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=400',
  organ: '---',
  osNumber: '---'
};

const Prontuario: React.FC = () => {
  // Estados para o Semovente principal (Sujeito do Atendimento)
  const [animal, setAnimal] = useState<Animal>(BLANK_ANIMAL);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Animal>>({});

  // Estado da Busca
  const [searchQuery, setSearchQuery] = useState('');

  // Estados do formulário de Identificação (dentro da ocorrência)
  const [specieForm, setSpecieForm] = useState(animal.specie);
  const [genderForm, setGenderForm] = useState(animal.gender);
  const [colorForm, setColorForm] = useState(animal.color);
  const [breedForm, setBreedForm] = useState(animal.breed);

  // Estados para o formulário de "Nova Ocorrência"
  const [motivo, setMotivo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [destinacao, setDestinacao] = useState('');
  const [dataExame, setDataExame] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // --- Lógica de Busca ---
  const handleSearchProntuario = async () => {
    if (!searchQuery.trim()) {
      alert("Por favor, digite o número do CHIP.");
      return;
    }

    try {
      const entries = await apreensoesService.getByChip(searchQuery.trim());
      const found = entries[0];

      if (found) {
        alert(`Prontuário Localizado! Carregando histórico de: ${found.specie} - ${found.chip}`);
        // Ensure data coming from Supabase is formatted if needed
        const formattedFound = { ...found, dateIn: formatDate(found.dateIn) };
        setAnimal(formattedFound);
        // Preenche os campos do formulário automaticamente
        setSpecieForm(found.specie);
        setGenderForm(found.gender as any);
        setColorForm(found.color);
        setBreedForm(found.breed);
        setSearchQuery('');
      } else {
        alert("Animal não encontrado. Iniciando primeiro atendimento.");
        // Reseta para um estado de novo animal
        const newAnimalState: Animal = {
          ...BLANK_ANIMAL,
          id: 'NOVO',
          chip: searchQuery,
        };
        setAnimal(newAnimalState);
        setSpecieForm('---');
        setGenderForm('Macho');
        setColorForm('---');
        setBreedForm('---');
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao buscar no banco de dados.");
    }
  };

  // --- Funções de Edição do Cadastro ---
  const handleOpenEdit = () => {
    setEditFormData({ ...animal });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = { ...animal, ...editFormData } as Animal;
    setAnimal(updated);
    setSpecieForm(updated.specie);
    setGenderForm(updated.gender);
    setColorForm(updated.color);
    setBreedForm(updated.breed);
    setIsEditModalOpen(false);
    alert('Cadastro atualizado com sucesso!');
  };

  // --- Funções da Nova Ocorrência ---
  const handleFileButtonClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(e.target.files);
    }
  };

  const resetForm = () => {
    setMotivo('');
    setDescricao('');
    setDestinacao('');
    setDataExame('');
    setSelectedFiles(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.confirm("Certeza que deseja cancelar? Os dados não salvos serão perdidos.")) {
      resetForm();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      alert("Por favor, preencha o campo obrigatório: Motivo da Apreensão.");
      return;
    }
    alert("Sucesso! Ocorrência #PR-2025/001 registrada no prontuário.");
    resetForm();
  };

  return (
    <div className="max-w-[1024px] mx-auto flex flex-col gap-8 pb-20 animate-fade-in text-left">

      {/* 1. BARRA DE BUSCA DESTACADA */}
      <section className="no-print bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1 w-full relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 group-focus-within:text-primary transition-colors">qr_code_scanner</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchProntuario()}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-12 pr-4 py-3 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-400"
              placeholder="Digite o número do CHIP (Ex: 12345, 99999)..."
              type="text"
            />
          </div>
          <button
            onClick={handleSearchProntuario}
            className="w-full md:w-auto px-8 py-3 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
            Buscar Prontuário
          </button>
        </div>
      </section>

      {/* Header do Semovente (Sujeito do Atendimento) */}
      <header className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm print-card">
        <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
          <div className="flex gap-5 items-center">
            <div className="relative">
              <div
                className="size-20 md:size-24 rounded-full bg-cover bg-center border-4 border-gray-100 shadow-md"
                style={{ backgroundImage: `url('${animal.imageUrl}')` }}
              ></div>
              <div className="absolute -bottom-1 -right-1 bg-primary text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm border-2 border-white uppercase whitespace-nowrap">
                {animal.id === 'NOVO' ? 'NOVO CADASTRO' : animal.status}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-gray-900 text-2xl md:text-3xl font-black leading-tight tracking-tight">
                  {animal.id === 'NOVO' ? 'Novo Semovente' : `${animal.specie} • ${animal.breed}`}
                </h1>
                <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded text-[11px] text-primary font-black font-mono tracking-wide border border-gray-200 uppercase">
                  <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                  CHIP #{animal.chip}
                </div>
              </div>
              <p className="text-gray-500 text-sm md:text-base font-medium flex items-center gap-2">
                Sexo: {animal.gender}
                <span className="size-1 rounded-full bg-gray-300"></span>
                Pelagem: {animal.color}
              </p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto no-print">
            <button
              className="flex-1 md:flex-none flex items-center justify-center gap-2 h-10 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-lg transition-colors border border-gray-200"
              onClick={() => window.print()}
            >
              <span className="material-symbols-outlined text-[20px]">print</span>
              <span className="truncate">Ficha de Campo</span>
            </button>
            <button
              onClick={handleOpenEdit}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 h-10 px-4 bg-primary text-green-900 hover:bg-primary/90 text-sm font-black rounded-lg transition-colors shadow-lg shadow-primary/10"
            >
              <span className="material-symbols-outlined text-[20px]">edit</span>
              <span className="truncate">Editar Cadastro</span>
            </button>
          </div>
        </div>
      </header>

      {/* Seção Nova Ocorrência */}
      <section className="no-print bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <form onSubmit={handleSubmit}>
          <div className="border-b border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary icon-filled">add_circle</span>
              <h3 className="text-gray-900 text-lg font-black tracking-tight uppercase">Registrar Atendimento</h3>
            </div>
            <span className="text-[10px] font-black text-gray-500 bg-white px-3 py-1.5 rounded border border-gray-200 uppercase tracking-wider">
              {currentDate}
            </span>
          </div>

          <div className="p-6 flex flex-col gap-6">

            {/* Dados de Identificação (Auto-preenchidos pela Busca) */}
            <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">info</span> Identificação do Semovente
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Espécie</label>
                  <input value={specieForm} onChange={e => setSpecieForm(e.target.value)} className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" placeholder="Ex: Equino" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Raça</label>
                  <input value={breedForm} onChange={e => setBreedForm(e.target.value)} className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" placeholder="Ex: Mangalarga" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Sexo</label>
                  <select value={genderForm} onChange={e => setGenderForm(e.target.value as any)} className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none">
                    <option value="Macho">Macho</option>
                    <option value="Fêmea">Fêmea</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Pelagem / Cor</label>
                  <input value={colorForm} onChange={e => setColorForm(e.target.value)} className="w-full rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none" placeholder="Ex: Tordilho" />
                </div>
              </div>
            </div>

            {/* Motivo da Apreensão */}
            <div className="flex flex-col gap-2">
              <label className="text-gray-700 text-xs font-black uppercase tracking-wide">Motivo da Apreensão / Natureza</label>
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent px-4 py-3 outline-none transition-all text-sm"
                placeholder="Descreva o motivo (ex: Animal solto na via, Denúncia de maus tratos)..."
              />
            </div>

            {/* Descrição e Destinação */}
            <div className="flex flex-col gap-6 w-full">
              <div className="flex flex-col gap-2 w-full">
                <label className="text-gray-700 text-xs font-black uppercase tracking-wide">Descrição dos Fatos / Exame Físico</label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full h-40 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent px-4 py-3 outline-none resize-none transition-all text-sm"
                  placeholder="Detalhes do local da apreensão, condições físicas do animal..."
                ></textarea>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <label className="text-gray-700 text-xs font-black uppercase tracking-wide">Destinação / Medidas Adotadas</label>
                <textarea
                  value={destinacao}
                  onChange={(e) => setDestinacao(e.target.value)}
                  className="w-full h-40 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent px-4 py-3 outline-none resize-none transition-all text-sm"
                  placeholder="Encaminhamento ao curral, auto de infração lavrado, exames solicitados..."
                ></textarea>
              </div>
            </div>

            {/* Data e Anexos */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex flex-col gap-2 w-full md:w-1/3">
                <label className="text-gray-700 text-xs font-black uppercase tracking-wide">Data do Exame (AIE/Mormo)</label>
                <input
                  value={dataExame}
                  onChange={(e) => setDataExame(e.target.value)}
                  className="w-full rounded-lg bg-white border border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent px-4 py-3 outline-none transition-all text-sm"
                  type="date"
                />
              </div>
              <div className="flex flex-col gap-2 w-full md:w-2/3">
                <label className="text-gray-700 text-xs font-black uppercase tracking-wide">Anexos (Resenha/Fotos/GTA)</label>
                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileChange} />
                <div onClick={handleFileButtonClick} className="border-2 border-dashed border-gray-300 hover:border-primary bg-gray-50 rounded-lg p-4 flex items-center justify-center gap-4 cursor-pointer transition-colors group">
                  <div className="size-10 rounded-full bg-white border border-gray-200 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <span className="material-symbols-outlined text-gray-400 group-hover:text-primary">cloud_upload</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-700 font-bold">
                      {selectedFiles && selectedFiles.length > 0 ? `${selectedFiles.length} arquivo(s) selecionado(s)` : "Clique para upload ou arraste arquivos"}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium uppercase tracking-tighter">PDF, PNG, JPG (Max 10MB)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
              <button type="button" onClick={handleCancel} className="px-6 py-2.5 rounded-lg text-gray-500 font-black text-xs uppercase hover:bg-gray-100 transition-colors tracking-widest">Cancelar</button>
              <button type="submit" className="px-6 py-2.5 rounded-lg bg-primary text-green-900 font-black text-xs uppercase hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2 tracking-widest">
                <span className="material-symbols-outlined text-[18px]">save</span> Registrar Ocorrência
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Histórico do Semovente */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-gray-900 text-xl font-black uppercase tracking-tight">Histórico do Semovente</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-primary bg-green-50 px-3 py-1 rounded border border-green-100 uppercase tracking-wider">12 Registros</span>
          </div>
        </div>
        <div className="relative pl-4 md:pl-0">
          <div className="absolute left-[27px] md:left-[27px] top-0 bottom-0 w-px bg-gray-200 z-0 no-print"></div>
          <article className="relative flex gap-6 mb-8 group print-card">
            <div className="no-print flex flex-col items-center pt-1 z-10"><div className="size-3 bg-primary rounded-full ring-4 ring-white shadow-sm"></div></div>
            <div className="flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:border-primary/30 transition-colors print-card">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4 border-b border-gray-100 pb-4">
                <div>
                  <h4 className="text-gray-900 text-lg font-black tracking-tight uppercase">Exame AIE (Anemia Infecciosa)</h4>
                  <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider">Dr. Silva • 12 Out 2023</p>
                </div>
                <span className="bg-green-50 text-green-700 text-[10px] font-black px-3 py-1.5 rounded-full border border-green-100 uppercase tracking-tight">Negativo</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-sm">Animal testado com resultado negativo. Sem sinais clínicos da doença.</p>
            </div>
          </article>
        </div>
      </section>

      {/* Modal de Edição de Cadastro (Básico) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col relative text-left">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 text-green-700 flex items-center justify-center">
                  <span className="material-symbols-outlined">edit_square</span>
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Editar Cadastro do Semovente</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="size-8 text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nome do Semovente Removed */}
                {/* Espécie (Dropdown) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Espécie</label>
                  <select
                    required
                    value={editFormData.specie || ''}
                    onChange={e => setEditFormData({ ...editFormData, specie: e.target.value })}
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                  >
                    <option value="">Selecione...</option>
                    <option value="Equino">Equino</option>
                    <option value="Bovino">Bovino</option>
                    <option value="Asinino">Asinino</option>
                    <option value="Muar">Muar</option>
                    <option value="Bubalino">Bubalino</option>
                    <option value="Caprino/Ovino">Caprino/Ovino</option>
                  </select>
                </div>

                {/* Raça (Texto Livre) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Raça</label>
                  <input
                    value={editFormData.breed || ''}
                    onChange={e => setEditFormData({ ...editFormData, breed: e.target.value })}
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="Ex: Mangalarga Marchador"
                  />
                </div>

                {/* Sexo (Dropdown) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sexo</label>
                  <select
                    required
                    value={editFormData.gender || 'Macho'}
                    onChange={e => setEditFormData({ ...editFormData, gender: e.target.value as any })}
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                  >
                    <option value="Macho">Macho</option>
                    <option value="Fêmea">Fêmea</option>
                  </select>
                </div>

                {/* Pelagem / Cor (Texto Livre) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pelagem / Cor</label>
                  <input
                    value={editFormData.color || ''}
                    onChange={e => setEditFormData({ ...editFormData, color: e.target.value })}
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="Ex: Tordilho"
                  />
                </div>

                {/* Nº do CHIP (Visualização/Edição) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nº do CHIP / Brinco</label>
                  <input
                    required
                    value={editFormData.chip || ''}
                    onChange={e => setEditFormData({ ...editFormData, chip: e.target.value })}
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="Número do Chip"
                  />
                </div>

                {/* Status do Semovente (Mantendo a lista anterior) */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Status do Semovente</label>
                  <select
                    value={editFormData.status || ''}
                    onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                  >
                    <option value="Em Tratamento">Em Tratamento</option>
                    <option value="HVET">HVET</option>
                    <option value="Albergado">Albergado</option>
                    <option value="Adoção">Adoção</option>
                    <option value="Eutanásia">Eutanásia</option>
                    <option value="Restituição">Restituição</option>
                    <option value="Restituição para outros Órgãos">Restituição para outros Órgãos</option>
                    <option value="Furto">Furto</option>
                    <option value="Óbito">Óbito</option>
                    <option value="AIE+">AIE+</option>
                    <option value="Mormo">Mormo</option>
                    <option value="Raiva">Raiva</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              {/* Footer do Modal */}
              <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2.5 rounded-lg text-gray-500 font-black text-xs uppercase hover:bg-gray-100 transition-colors tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 rounded-lg bg-primary text-green-900 font-black text-xs uppercase shadow-lg shadow-primary/20 flex items-center gap-2 tracking-widest hover:bg-primary/90 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prontuario;
