
import React, { useState, useRef } from 'react';
import { apreensoesService } from '../services/apreensoesService';
import { prontuarioService, ProntuarioRecord } from '../services/prontuarioService';
import { Animal } from '../types';
import { formatDate } from '../utils';
import { supabase } from '../supabaseClient';
import cabecalhoGdf from '../src/assets/cabecalho-gdf.png';



interface TimelineEvent {
  id: string;
  type: 'EXAM' | 'OCCURRENCE' | 'DESTINATION';
  date: string;
  title: string;
  subtitle?: string;
  content?: string;
  result?: string;
  exam_results?: { exam: string; result: string; date?: string }[];
  badge?: string;
  icon: string;
  veterinario?: string;
}

const BLANK_ANIMAL: Animal = {
  id: '',
  chip: '',
  specie: '---',
  breed: '---',
  age: '',
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
  const [currentUserProfile, setCurrentUserProfile] = useState<{ nome: string; email: string } | null>(null);

  React.useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nome, email')
            .eq('id', user.id)
            .single();

          if (profile) {
            setCurrentUserProfile({
              nome: profile.nome || 'Usuário Sem Nome',
              email: profile.email || user.email || ''
            });
          } else {
            setCurrentUserProfile({
              nome: user.email || 'Usuário Sem Nome',
              email: user.email || ''
            });
          }
        }
      } catch (err) {
        console.error('Erro ao carregar perfil do usuário:', err);
      }
    };
    fetchUserProfile();
  }, []);

  // Controle do Modal de Impressão
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Estado da Busca
  const [searchQuery, setSearchQuery] = useState('');

  // Estados do formulário de Identificação (dentro da ocorrência)
  const [specieForm, setSpecieForm] = useState(animal.specie);
  const [genderForm, setGenderForm] = useState(animal.gender);
  const [colorForm, setColorForm] = useState(animal.color);

  // Estados para o formulário de "Nova Ocorrência"
  const [motivo, setMotivo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [destinacao, setDestinacao] = useState('');
  const [dataExame, setDataExame] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [examResults, setExamResults] = useState<{ exam: string, result: string, date?: string }[]>([{ exam: '', result: '', date: '' }]);


  // --- ESTADOS DE HISTÓRICO REAL ---
  const [historyList, setHistoryList] = useState<TimelineEvent[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const addExamRow = () => setExamResults([...examResults, { exam: '', result: '', date: '' }]);
  const removeExamRow = (index: number) => {
    if (examResults.length > 1) {
      setExamResults(examResults.filter((_, i) => i !== index));
    }
  };
  const updateExamRow = (index: number, field: 'exam' | 'result' | 'date', value: string) => {
    const newResults = [...examResults];
    newResults[index][field] = value;
    setExamResults(newResults);
  };

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
        // Ensure data coming from Supabase is formatted if needed
        const formattedFound = { ...found, dateIn: formatDate(found.dateIn) };
        setAnimal(formattedFound);
        // Preenche os campos do formulário automaticamente
        setSpecieForm(found.specie);
        setGenderForm(found.gender as any);
        setColorForm(found.color);
        setSearchQuery('');



        // Carregamento de histórico real do banco de dados
        try {
          const history = await prontuarioService.getByChip(found.chip);
          setHistoryList(history.map(h => ({
            id: h.id,
            type: h.type,
            date: h.date,
            title: h.title,
            subtitle: h.subtitle,
            content: h.content,
            result: h.result,
            icon: h.icon,
            exam_results: h.exam_results,
            veterinario: h.veterinario
          })));
        } catch (err) {
          console.error('Erro ao carregar histórico:', err);
          // Se falhar a busca de histórico, mantém a lista vazia ou mostra erro
          setHistoryList([]);
        }
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
        setHistoryList([]);
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao buscar no banco de dados.");
    }
  };

  const handleClearScreen = () => {
    setAnimal(BLANK_ANIMAL);
    setSearchQuery('');
    setSpecieForm(BLANK_ANIMAL.specie);
    setGenderForm(BLANK_ANIMAL.gender);
    setColorForm(BLANK_ANIMAL.color);
    setHistoryList([]);
    setEditingId(null);
    resetForm();
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
    setExamResults([{ exam: '', result: '', date: '' }]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.confirm("Certeza que deseja cancelar? Os dados não salvos serão perdidos.")) {
      resetForm();
      setEditingId(null);
    }
  };

  const handleEditHistoryItem = (item: TimelineEvent) => {
    setEditingId(item.id);
    setDescricao(item.content || '');
    setDataExame(item.date);
    setDestinacao(item.subtitle || ''); // Restaura Destinação

    // Restaura Resultados de Exames se existirem
    if (item.exam_results && item.exam_results.length > 0) {
      setExamResults(item.exam_results);
    } else {
      setExamResults([{ exam: '', result: '' }]);
    }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este registro permanentemente?")) return;
    try {
      await prontuarioService.delete(id);
      setHistoryList(prev => prev.filter(item => item.id !== id));
      alert("Registro excluído com sucesso.");
      if (editingId === id) {
        setEditingId(null);
        resetForm();
      }
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao excluir registro: ${err.message || 'Erro desconhecido'}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataExame) {
      alert("Por favor, informe a Data do Atendimento.");
      return;
    }

    const defaultTitle = "Atendimento Clínico";

    try {
      if (editingId) {
        // UPDATE REAL
        await prontuarioService.update(editingId, {
          title: defaultTitle,
          subtitle: destinacao,
          content: descricao,
          date: dataExame,
          exam_results: examResults
        });

        setHistoryList(prev => prev.map(item =>
          item.id === editingId
            ? { ...item, title: defaultTitle, subtitle: destinacao, content: descricao, date: dataExame, exam_results: examResults }
            : item
        ));
        alert("Atendimento atualizado com sucesso!");
      } else {
        // INSERT REAL
        const newRecord: Omit<ProntuarioRecord, 'id'> = {
          animal_chip: animal.chip,
          type: 'OCCURRENCE',
          date: dataExame,
          title: defaultTitle,
          subtitle: destinacao,
          content: descricao,
          exam_results: examResults,
          icon: 'history_edu',
          veterinario: currentUserProfile?.nome || ''
        };

        const saved = await prontuarioService.create(newRecord);

        setHistoryList(prev => [{
          id: saved.id,
          type: saved.type,
          date: saved.date,
          title: saved.title,
          subtitle: saved.subtitle,
          content: saved.content,
          exam_results: saved.exam_results,
          icon: saved.icon,
          veterinario: saved.veterinario
        }, ...prev]);

        alert("Sucesso! Atendimento registrado no prontuário.");
      }

      const closeAttendance = window.confirm("Operação realizada com sucesso!\n\nDeseja ENCERRAR o atendimento deste animal e limpar a tela?");

      if (closeAttendance) {
        handleClearScreen();
      } else {
        resetForm();
        setEditingId(null);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao salvar ocorrência: ${err.message || 'Erro desconhecido'}`);
    }
  };

  // ------------------------------------------------------------------
  // NOVO: COMPONENTE DO RELATÓRIO OFICIAL (Apenas para Impressão/Modal)
  // ------------------------------------------------------------------
  const RelatorioImpresso = () => (
    <div className="w-full text-black text-left">
      {/* 1. CABEÇALHO GDF */}
      <div className="flex flex-col items-center text-center mb-8">
        <img src={cabecalhoGdf} alt="Governo do Distrito Federal" className="h-28 mb-4 object-contain" />
        <h2 className="text-xl font-bold uppercase tracking-wider mt-4 text-center w-full">
          Prontuário Clínico Veterinário
        </h2>
      </div>

      {/* 2. DADOS DO ANIMAL */}
      <div className="mb-8 border border-gray-800 rounded-lg p-4">
        <h3 className="font-bold text-lg border-b border-gray-400 mb-3 pb-1 uppercase bg-gray-100 px-2">1. Identificação do Animal</h3>
        <div className="grid grid-cols-2 gap-y-3 text-base px-2">
          <p><strong>Espécie:</strong> {animal.specie}</p>
          <p><strong>Chip/Brinco:</strong> {animal.chip}</p>
          <p><strong>Sexo:</strong> {animal.gender}</p>
          <p><strong>Pelagem/Cor:</strong> {animal.color}</p>
          <p><strong>Data de Entrada:</strong> {animal.dateIn && animal.dateIn !== '---' ? animal.dateIn : 'Não informada'}</p>
          <p><strong>Status Atual:</strong> {animal.status}</p>
        </div>
      </div>

      {/* 3. DESCRIÇÃO GERAL */}
      <div className="mb-8 border border-gray-800 rounded-lg p-4">
        <h3 className="font-bold text-lg border-b border-gray-400 mb-3 pb-1 uppercase bg-gray-100 px-2">2. Descrição Geral / Observações</h3>
        <p className="text-base text-justify leading-relaxed px-2 whitespace-pre-wrap">
          {animal.observations || 'Nenhuma observação geral cadastrada para este animal.'}
        </p>
      </div>

      {/* 4. HISTÓRICO CLÍNICO */}
      <div className="mb-12">
        <h3 className="font-bold text-lg border-b-2 border-gray-800 mb-4 pb-1 uppercase">3. Histórico Clínico e Atendimentos</h3>
        
        {historyList && historyList.length > 0 ? (
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            {historyList.map((item, index) => (
              <div key={item.id} className={`${index > 0 ? 'border-t border-gray-300' : ''} print:break-inside-avoid`}>
                <div className="flex justify-between items-center px-4 py-2 border-b border-gray-200 bg-white">
                  <span className="font-bold text-base text-gray-900">{formatDate(item.date)}</span>
                  <span className="text-sm font-bold uppercase text-gray-900">{item.title}</span>
                </div>
                
                <div className="p-4 space-y-3">
                  {item.subtitle && (
                    <p className="text-sm font-bold uppercase">
                      DESTINAÇÃO/TRATAMENTO: <span className="font-normal normal-case">{item.subtitle}</span>
                    </p>
                  )}
                  
                  {item.content && (
                    <p className="text-base text-justify whitespace-pre-wrap">{item.content}</p>
                  )}
                  {item.veterinario && (
                    <p className="text-sm text-gray-500">
                      <strong>Veterinário responsável:</strong> {item.veterinario}
                    </p>
                  )}


                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-base italic text-gray-500 border border-dashed border-gray-300 p-4 text-center">
            Nenhum histórico clínico registrado até o momento.
          </p>
        )}
      </div>

      {/* 5. ASSINATURA (Sempre no final da impressão) */}
      <div className="mt-24 pt-8 text-center w-2/3 mx-auto print:break-inside-avoid">
         <div className="border-t border-black mb-2"></div>
         <p className="font-bold uppercase text-sm">Assinatura e Carimbo do Médico Veterinário</p>
         <p className="text-sm mt-1">SEAGRI/DF - Subsecretaria de Proteção aos Animais</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Tela Principal do Sistema (Recebe print:hidden para não sair na folha) */}
      <div className="max-w-[1024px] mx-auto flex flex-col gap-8 pb-20 animate-fade-in text-left print:hidden">

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

          <button
            onClick={handleClearScreen}
            className="w-full md:w-auto px-6 py-3 bg-white border border-gray-300 text-gray-500 font-black text-xs uppercase tracking-widest rounded-lg hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">replay</span>
            Nova Consulta
          </button>
        </div>
      </section>

      {/* Header com Identificação do Semovente e Foto Ampliada */}
      {animal.id !== '' && (
        <header className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm print-card">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-stretch">
            {/* Foto do Animal em Evidência - Quadrada e de Grande Porte */}
            <div className="w-full md:w-80 lg:w-[360px] aspect-square rounded-2xl overflow-hidden border-4 border-gray-100 shadow-md relative flex-shrink-0 bg-slate-100">
              <img
                src={animal.imageUrl || 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=400'}
                alt={animal.specie}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg border border-white/20 uppercase tracking-wide">
                {animal.id === 'NOVO' ? 'NOVO CADASTRO' : animal.status}
              </div>
            </div>

            {/* Informações de Identificação Detalhadas */}
            <div className="flex-1 flex flex-col justify-between gap-6 w-full">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h1 className="text-gray-900 text-3xl md:text-4xl font-black leading-tight tracking-tight">
                        {animal.id === 'NOVO' ? 'Novo Semovente' : `${animal.specie}`}
                      </h1>
                      <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-black font-mono tracking-wide border border-emerald-200 uppercase">
                        <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                        CHIP #{animal.chip}
                      </div>
                    </div>
                    {animal.breed && animal.breed !== '---' && (
                      <p className="text-gray-500 text-sm font-semibold">Raça / Tipo: <span className="text-slate-700 font-bold">{animal.breed}</span></p>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 no-print">
                    <button
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all border border-gray-200 shadow-sm"
                      onClick={() => setIsPrintModalOpen(true)}
                    >
                      <span className="material-symbols-outlined text-[18px]">print</span>
                      <span>Ficha de Campo</span>
                    </button>
                    <button
                      onClick={handleOpenEdit}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 bg-primary text-green-950 hover:bg-primary/90 text-xs font-black rounded-xl transition-all shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                      <span>Editar Cadastro</span>
                    </button>
                  </div>
                </div>

                {/* Grid de Informações Importantes */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Sexo</span>
                    <span className="text-slate-800 font-extrabold text-sm flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-slate-500 text-[18px]">
                        {animal.gender === 'Macho' ? 'male' : 'female'}
                      </span>
                      {animal.gender}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Pelagem / Cor</span>
                    <span className="text-slate-800 font-extrabold text-sm flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-slate-500 text-[18px]">palette</span>
                      {animal.color}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Data de Entrada</span>
                    <span className="text-slate-800 font-extrabold text-sm flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-slate-500 text-[18px]">calendar_today</span>
                      {animal.dateIn && animal.dateIn !== '---' ? animal.dateIn : 'Não informada'}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Dias no CCT</span>
                    <span className="text-slate-800 font-extrabold text-sm flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-slate-500 text-[18px]">timer</span>
                      {animal.daysIn ? `${animal.daysIn} dias` : '0 dias'}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Origem / Procedência</span>
                    <span className="text-slate-800 font-extrabold text-sm flex items-center gap-1.5 truncate">
                      <span className="material-symbols-outlined text-slate-500 text-[18px]">location_on</span>
                      {animal.origin || '---'}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Órgão / OS</span>
                    <span className="text-slate-800 font-extrabold text-sm flex items-center gap-1.5 truncate">
                      <span className="material-symbols-outlined text-slate-500 text-[18px]">badge</span>
                      {animal.organ || '---'} {animal.osNumber && animal.osNumber !== '---' ? `(${animal.osNumber})` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {animal.observations && animal.observations !== '---' && (
                <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1 mb-1">
                    <span className="material-symbols-outlined text-[16px]">notes</span>
                    Observações Gerais:
                  </span>
                  <p className="text-xs text-amber-900 font-medium leading-relaxed">
                    {animal.observations}
                  </p>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Seção Nova Ocorrência */}
      {animal.id !== '' && (
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
                    <label className="text-xs font-bold text-slate-500 uppercase">Idade</label>
                    <input
                      readOnly
                      disabled
                      value={animal.age || '--'}
                      className="w-full rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm focus:outline-none cursor-not-allowed text-gray-500 font-medium"
                      placeholder="---"
                    />
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

              {/* Data do Atendimento */}
              <div className="flex flex-col gap-2">
                <label className="text-gray-700 text-xs font-black uppercase tracking-wide cursor-help" title="Esta data será usada como referência no histórico clínico">Data do atendimento</label>
                <input
                  type="date"
                  value={dataExame}
                  onChange={(e) => setDataExame(e.target.value)}
                  className="w-full rounded-lg bg-white border border-gray-300 text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent px-4 py-3 outline-none transition-all text-sm font-bold"
                />
              </div>

              {/* Descrição e Destinação */}
              <div className="flex flex-col gap-6 w-full">
                <div className="flex flex-col gap-2 w-full">
                  <label className="text-gray-700 text-xs font-black uppercase tracking-wide">Descrição do Animal</label>
                  <textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    className="w-full h-40 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent px-4 py-3 outline-none resize-none transition-all text-sm"
                    placeholder="Características físicas, sinais clínicos, temperamento e observações do animal..."
                  ></textarea>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <label className="text-gray-700 text-xs font-black uppercase tracking-wide">Histórico Clínico/Tratamento</label>
                  <textarea
                    value={destinacao}
                    onChange={(e) => setDestinacao(e.target.value)}
                    className="w-full h-40 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent px-4 py-3 outline-none resize-none transition-all text-sm"
                    placeholder="Histórico clínico prévio, tratamentos realizados, medicações e evolução..."
                  ></textarea>
                </div>
              </div>
              {/* Resultados dos Exames */}
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2 w-full">
                  <label className="text-gray-700 text-xs font-black uppercase tracking-wide">Resultado Exames:</label>
                  <div className="flex flex-col gap-3">
                    {examResults.map((result, index) => (
                      <div key={index} className="flex items-center gap-2 animate-fade-in">
                        <select
                          value={result.exam}
                          onChange={(e) => updateExamRow(index, 'exam', e.target.value)}
                          className="flex-1 rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                        >
                          <option value="">Tipo de Exame...</option>
                          <option value="AIE + (Anemia Infecciosa)">AIE + (Anemia Infecciosa)</option>
                          <option value="Mormo">Mormo</option>
                          <option value="Tuberculose">Tuberculose</option>
                          <option value="Brucelose">Brucelose</option>
                          <option value="Raiva">Raiva</option>
                        </select>
                        <input
                          type="date"
                          value={result.date || ''}
                          onChange={(e) => updateExamRow(index, 'date', e.target.value)}
                          className="w-40 rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
                        />
                        <select
                          value={result.result}
                          onChange={(e) => updateExamRow(index, 'result', e.target.value)}
                          className={`w-32 rounded-lg border px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-primary outline-none transition-all ${result.result === 'Positivo'
                            ? 'bg-red-400 border-red-500 text-white'
                            : result.result === 'Negativo'
                              ? 'bg-green-100 border-green-200 text-green-800'
                              : 'bg-white border-gray-300 text-gray-700'
                            }`}
                        >
                          <option value="">Resultado...</option>
                          <option value="Positivo">Positivo</option>
                          <option value="Negativo">Negativo</option>
                        </select>
                        {examResults.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeExamRow(index)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addExamRow}
                      className="text-primary text-[11px] font-black uppercase tracking-widest flex items-center gap-1 self-start hover:underline"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      + Inserir novo resultado
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                {/* Upload Relocado para o Rodapé */}
                <div className="flex-1 w-full md:w-auto">
                  <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileChange} />
                  <div
                    onClick={handleFileButtonClick}
                    className="flex items-center gap-3 cursor-pointer group hover:bg-gray-50 p-2 rounded-lg border border-dashed border-gray-200 transition-all w-fit"
                  >
                    <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-primary/20">
                      <span className="material-symbols-outlined text-gray-400 group-hover:text-primary text-[18px]">cloud_upload</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-gray-700 font-bold uppercase tracking-tight">
                        {selectedFiles && selectedFiles.length > 0 ? `${selectedFiles.length} arquivo(s)` : "Anexar Arquivos (PDF/JPG)"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto justify-end">
                  <button type="button" onClick={handleCancel} className="px-6 py-2.5 rounded-lg text-gray-500 font-black text-xs uppercase hover:bg-gray-100 transition-colors tracking-widest">Cancelar</button>
                  <button type="submit" className={`px-6 py-2.5 rounded-lg font-black text-xs uppercase transition-colors shadow-lg flex items-center gap-2 tracking-widest ${editingId ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-orange-500/20' : 'bg-primary text-green-900 hover:bg-primary/90 shadow-primary/20'}`}>
                    <span className="material-symbols-outlined text-[18px]">{editingId ? 'edit' : 'save'}</span>
                    {editingId ? 'Atualizar Ocorrência' : 'Registrar Ocorrência'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </section >
      )}

      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-gray-900 text-xl font-black uppercase tracking-tight">Histórico Clínico</h3>
          {historyList.length > 0 && (
            <span className="text-[10px] font-black text-primary bg-green-50 px-3 py-1 rounded border border-green-100 uppercase tracking-wider">
              {historyList.length} Registros
            </span>
          )}
        </div>

        <div className="relative min-h-[100px]">
          {/* Linha Vertical da Timeline */}
          {historyList.length > 0 && (
            <div className="absolute left-[20px] md:left-[110px] top-0 bottom-0 w-px bg-gray-200 z-0 no-print"></div>
          )}

          <div className="flex flex-col gap-8">
            {historyList.length > 0 ? (
              historyList.map((event) => (
                <div key={event.id} className="relative flex flex-col md:flex-row gap-4 md:gap-12 group">

                  {/* Coluna da Esquerda: Data */}
                  <div className="w-full md:w-20 pt-2 flex md:justify-end shrink-0 pl-10 md:pl-0">
                    <time className="text-[11px] font-black text-slate-400 uppercase leading-none tracking-tighter">
                      {formatDate(event.date)}
                    </time>
                  </div>

                  {/* Marcador na Timeline */}
                  <div className="absolute left-4 md:left-[103px] top-2 z-10 no-print">
                    <div className={`size-4 rounded-full border-4 border-white shadow-sm ${event.type === 'EXAM' ? 'bg-primary' :
                      event.type === 'DESTINATION' ? 'bg-slate-900' :
                        'bg-slate-400'
                      }`}></div>
                  </div>

                  {/* Card de Conteúdo */}
                  <div className={`flex-1 bg-white border rounded-xl p-5 shadow-sm transition-all hover:shadow-md ${event.type === 'DESTINATION'
                    ? 'border-slate-900/20 bg-slate-50/30'
                    : 'border-gray-200'
                    }`}>
                    <div className="flex items-start gap-4">
                      <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${event.type === 'EXAM' ? 'bg-primary/10 text-primary' :
                        event.type === 'DESTINATION' ? 'bg-slate-900 text-white' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                        <span className="material-symbols-outlined text-[24px]">{event.icon}</span>
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1">
                          <h4 className={`text-sm md:text-base font-black tracking-tight uppercase ${event.type === 'DESTINATION' ? 'text-slate-900' : 'text-gray-900'
                            }`}>
                            {event.title}
                            {event.type === 'EXAM' && event.date && (
                              <span className="ml-2 text-[10px] font-bold text-gray-400 normal-case tracking-normal">
                                ({formatDate(event.date)})
                              </span>
                            )}
                          </h4>

                          <div className="flex items-center gap-2">
                            {event.type === 'EXAM' && event.result && (
                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tight border ${event.result === 'Negativo'
                                ? 'bg-green-50 text-green-700 border-green-100'
                                : 'bg-red-50 text-red-700 border-red-100'
                                }`}>
                                {event.result}
                              </span>
                            )}

                            {event.type === 'OCCURRENCE' && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleEditHistoryItem(event)}
                                  className="size-8 rounded-lg bg-gray-50 text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-all flex items-center justify-center group/edit"
                                  title="Editar Ocorrência"
                                >
                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteHistoryItem(event.id)}
                                  className="size-8 rounded-lg bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center group/delete"
                                  title="Excluir Registro"
                                >
                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {event.subtitle && (
                          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">
                            {event.subtitle}
                          </p>
                        )}

                        {event.content && (
                          <p className={`text-sm leading-relaxed ${event.type === 'DESTINATION' ? 'text-slate-700' : 'text-gray-600'
                            }`}>
                            {event.content}
                          </p>
                        )}

                        {event.veterinario && (
                          <p className="text-xs font-semibold text-slate-400 mt-2">
                            Veterinário responsável: <span className="font-normal text-slate-500">{event.veterinario}</span>
                          </p>
                        )}


                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400">
                <span className="material-symbols-outlined text-[48px] mb-2">history</span>
                <p className="font-bold text-sm">{animal.id !== '' ? 'Nenhum histórico registrado para este animal.' : 'Pesquise um prontuário para visualizar o histórico.'}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Modal de Edição de Cadastro (Básico) */}
      {
        isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in no-print">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col relative text-left">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/10 text-green-700 flex items-center justify-center">
                    <span className="material-symbols-outlined">edit_square</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Editar Cadastro do Animal</h3>
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

                  {/* Idade (Texto Livre) */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Idade</label>
                    <input
                      value={editFormData.age || ''}
                      onChange={e => setEditFormData({ ...editFormData, age: e.target.value })}
                      className="w-full rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                      placeholder="Ex: 5 anos"
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
        )
      }
    </div>

    {/* Relatório Impresso Oficial (Apenas para Impressão) */}
    <div className="hidden print:block">
      <RelatorioImpresso />
    </div>

    {/* Modal de Impressão (Apenas para Tela) */}
    {isPrintModalOpen && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 no-print overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Cabeçalho do Modal */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="text-gray-900 font-black uppercase tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">print</span>
              Pré-visualização do Prontuário
            </h3>
            <button onClick={() => setIsPrintModalOpen(false)} className="text-gray-400 hover:text-gray-600 flex items-center">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Conteúdo do Modal (Visualização da Folha A4) */}
          <div className="p-8 overflow-y-auto flex-1 bg-gray-100">
            <div className="bg-white shadow-lg p-12 max-w-[21cm] mx-auto border border-gray-200 text-black">
              <RelatorioImpresso />
            </div>
          </div>

          {/* Rodapé do Modal */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(false)}
              className="px-6 py-2.5 rounded-lg text-gray-500 font-black text-xs uppercase hover:bg-gray-100 transition-colors tracking-widest"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={() => {
                window.print();
              }}
              className="px-8 py-2.5 rounded-lg bg-slate-900 text-white font-black text-xs uppercase shadow-lg flex items-center gap-2 tracking-widest hover:bg-slate-800 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              Confirmar Impressão
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);
};

export default Prontuario;
