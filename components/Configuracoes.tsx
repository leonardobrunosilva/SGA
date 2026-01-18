
import React, { useState, useRef, useEffect } from 'react';
import { PageType } from '../types';

interface ConfiguracoesProps {
  setCurrentPage: (page: PageType) => void;
}

interface PermissionRow {
  module: string;
  admin: string[];
  vet: string[];
  fiscal: string[];
}

interface EquipeMembro {
  id?: string;
  nome: string;
  cargo: string;
  registro: string;
  status: string;
  imageUrl?: string;
}

interface UserProfile {
  nome: string;
  cpf: string;
  email: string;
  cargo: string;
  lotacao: string;
  avatarUrl: string;
  role: 'admin' | 'operador';
}

interface SystemUser {
  id: string;
  nome: string;
  email: string;
  perfil: 'admin' | 'operador';
}

const LOTACAO_OPTIONS = [
  'GEFAP',
  'SUPROA',
  'DIFAV',
  'GEAV',
  'GAB-SUPROA',
  'Curral de Apreensões'
];

const DEFAULT_PROFILE: UserProfile = {
  nome: 'Usuário Fiscal',
  cpf: '000.000.000-00',
  email: 'fiscal@seagri.df.gov.br',
  cargo: 'Fiscal Agropecuário',
  lotacao: 'GEFAP',
  avatarUrl: '',
  role: 'admin'
};

const Configuracoes: React.FC<ConfiguracoesProps> = ({ setCurrentPage }) => {
  const [activeTab, setActiveTab] = useState<'perfil' | 'unidade' | 'acesso' | 'equipe' | 'preferencias' | 'usuarios'>('perfil');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [viewingMembro, setViewingMembro] = useState<EquipeMembro | null>(null);
  const [editingMembro, setEditingMembro] = useState<EquipeMembro | null>(null);

  // System Users State with Persistence
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('system_users_list');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
      }
    }
    return [];
  });
  const [newSystemUser, setNewSystemUser] = useState<Omit<SystemUser, 'id'>>({ nome: '', email: '', perfil: 'operador' });

  // User Profile State with Persistence
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('user_profile_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Migration: add role if missing (for existing users)
          if (!parsed.role) {
            parsed.role = 'admin';
          }
          return parsed;
        } catch (e) { console.error(e); }
      }
    }
    return DEFAULT_PROFILE;
  });

  // States para Preferências with Persistence
  const [prefs, setPrefs] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('user_prefs_settings');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
      }
    }
    return {
      alertasRestituicao: true,
      relatoriosObitos: true,
      vencimentoCustodia: false,
      darkMode: false,
      compactInterface: false
    };
  });

  // States para Dados da Unidade with Persistence
  const [unidadeData, setUnidadeData] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('unidade_data_settings');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
      }
    }
    return {
      nome: 'Curral Comunitário - SEAGRI DF',
      cnpj: '00.111.222/0001-33',
      endereco: 'Parque de Exposições Granja do Torto, Brasília - DF',
      logoUrl: ''
    };
  });

  // State para Matriz de Permissões
  const [permissions, setPermissions] = useState<PermissionRow[]>([
    { module: 'Dashboard & BI', admin: ['V', 'E', 'X'], vet: ['V'], fiscal: ['V'] },
    { module: 'Prontuário Eletrônico', admin: ['V', 'E', 'X'], vet: ['V', 'E', 'X'], fiscal: ['V'] },
    { module: 'Entrada de Animais', admin: ['V', 'E', 'X'], vet: ['V', 'E'], fiscal: ['V', 'E', 'X'] },
    { module: 'Destinações & Termos', admin: ['V', 'E', 'X'], vet: ['V'], fiscal: ['V', 'E', 'X'] },
    { module: 'Configurações do Sistema', admin: ['V', 'E', 'X'], vet: [], fiscal: [] },
  ]);

  // State para Equipe Técnica
  const [equipeList, setEquipeList] = useState<EquipeMembro[]>([
    { id: '1', nome: 'Dr. Ricardo Silva', cargo: 'Médico Veterinário', registro: 'CRMV-DF 1234', status: 'Ativo' },
    { id: '2', nome: 'Dra. Ana Maria Oliveira', cargo: 'Médica Veterinária', registro: 'CRMV-DF 5678', status: 'Ativo' },
    { id: '3', nome: 'Marcos Souza', cargo: 'Fiscal Agropecuário', registro: 'ID-GDF 9900', status: 'Ativo' },
    { id: '4', nome: 'Carla Pereira', cargo: 'Assistente Administrativo', registro: 'ID-GDF 4412', status: 'Férias' },
  ]);

  // State para o formulário do novo membro
  const [newMembro, setNewMembro] = useState<EquipeMembro>({
    nome: '',
    cargo: 'Médico Veterinário',
    registro: '',
    status: 'Ativo',
    imageUrl: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const memberPhotoInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = () => {
    localStorage.setItem('user_profile_settings', JSON.stringify(userProfile));
    localStorage.setItem('user_prefs_settings', JSON.stringify(prefs));
    localStorage.setItem('unidade_data_settings', JSON.stringify(unidadeData));
    localStorage.setItem('system_users_list', JSON.stringify(systemUsers));
    showNotification("Configurações salvas com sucesso!");
  };

  const handleAddSystemUser = () => {
    if (!newSystemUser.nome || !newSystemUser.email) {
      showNotification("Por favor, preencha Nome e Email.", "info");
      return;
    }
    const userToAdd: SystemUser = { ...newSystemUser, id: Date.now().toString() };
    const updatedList = [userToAdd, ...systemUsers];
    setSystemUsers(updatedList);
    localStorage.setItem('system_users_list', JSON.stringify(updatedList));
    setNewSystemUser({ nome: '', email: '', perfil: 'operador' });
    setIsAddUserModalOpen(false);
    showNotification(`Usuário ${newSystemUser.nome} cadastrado com sucesso!`, "success");
  };

  const handleProfileAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserProfile(prev => ({ ...prev, avatarUrl: reader.result as string }));
        showNotification("Foto de perfil carregada. Clique em 'Salvar Alterações' para confirmar.", "info");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUnidadeData(prev => ({ ...prev, logoUrl: reader.result as string }));
        showNotification("Logotipo carregado temporariamente. Clique em salvar para confirmar.", "info");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMemberPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewMembro(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePermission = (moduleName: string, role: 'admin' | 'vet' | 'fiscal', action: string) => {
    setPermissions(prev => prev.map(p => {
      if (p.module === moduleName) {
        const currentActions = [...p[role]];
        const index = currentActions.indexOf(action);
        if (index > -1) {
          currentActions.splice(index, 1);
        } else {
          currentActions.push(action);
        }
        return { ...p, [role]: currentActions };
      }
      return p;
    }));
  };

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMembro.nome || !newMembro.registro) {
      showNotification("Por favor, preencha todos os campos obrigatórios.", "info");
      return;
    }
    const memberToAdd = { ...newMembro, id: Date.now().toString() };
    setEquipeList(prev => [memberToAdd, ...prev]);
    setIsInviteModalOpen(false);
    setNewMembro({ nome: '', cargo: 'Médico Veterinário', registro: '', status: 'Ativo', imageUrl: '' });
    showNotification(`Convite enviado para ${newMembro.nome}!`, "success");
  };

  const handleUpdateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMembro) {
      setEquipeList(prev => prev.map(m => m.id === editingMembro.id ? editingMembro : m));
      setEditingMembro(null);
      showNotification(`Cadastro de ${editingMembro.nome} atualizado!`, "success");
    }
  };

  const handleTogglePref = (key: keyof typeof prefs) => {
    setPrefs(prev => {
      const newVal = !prev[key];
      if (key === 'darkMode' && newVal) {
        showNotification("Modo escuro ativado (Simulação)", "info");
      }
      if (key === 'compactInterface') {
        showNotification(newVal ? "Interface compacta ativada" : "Interface padrão ativada", "info");
      }
      return { ...prev, [key]: newVal };
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'perfil':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">account_circle</span>
                Meu Perfil
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                {/* Avatar Column */}
                <div className="flex flex-col items-center gap-4 p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <div className="size-28 bg-white rounded-full border-4 border-slate-200 flex items-center justify-center text-slate-300 overflow-hidden shadow-lg relative">
                    {userProfile.avatarUrl ? (
                      <img src={userProfile.avatarUrl} alt="Avatar" className="size-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-5xl">person</span>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={profilePhotoInputRef}
                    onChange={handleProfileAvatarChange}
                    className="hidden"
                    accept="image/*"
                  />
                  <button
                    type="button"
                    onClick={() => profilePhotoInputRef.current?.click()}
                    className="text-xs font-black text-primary uppercase bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                    Alterar Foto
                  </button>
                </div>

                {/* Form Columns */}
                <div className="md:col-span-2 space-y-6">
                  {/* Dados Pessoais */}
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wide mb-4">Dados Pessoais</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
                        <input
                          type="text"
                          value={userProfile.nome}
                          onChange={(e) => setUserProfile({ ...userProfile, nome: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">CPF</label>
                        <input
                          type="text"
                          value={userProfile.cpf}
                          onChange={(e) => setUserProfile({ ...userProfile, cpf: e.target.value })}
                          placeholder="000.000.000-00"
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                        <input
                          type="email"
                          value={userProfile.email}
                          onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dados Funcionais */}
                  <div className="pt-6 border-t border-slate-100">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wide mb-4">Dados Funcionais</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Cargo / Função</label>
                        <select
                          value={userProfile.cargo}
                          onChange={(e) => setUserProfile({ ...userProfile, cargo: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        >
                          <option>Fiscal Agropecuário</option>
                          <option>Médico Veterinário</option>
                          <option>Assistente Administrativo</option>
                          <option>Gestor de Unidade</option>
                          <option>Auxiliar de Campo</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Lotação / Unidade</label>
                        <select
                          value={userProfile.lotacao}
                          onChange={(e) => setUserProfile({ ...userProfile, lotacao: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        >
                          {LOTACAO_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'unidade':
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">apartment</span>
                Identificação da Unidade
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="md:col-span-2 flex items-center gap-6 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <div className="size-20 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-300 overflow-hidden shadow-inner relative">
                    {unidadeData.logoUrl ? (
                      <img src={unidadeData.logoUrl} alt="Logo" className="size-full object-contain p-2" />
                    ) : (
                      <span className="material-symbols-outlined text-4xl">image</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Logotipo da Unidade</p>
                    <p className="text-xs text-slate-500 mb-3">Formatos aceitos: PNG, JPG ou SVG. Máx 2MB.</p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoChange}
                      className="hidden"
                      accept="image/*"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-black text-primary uppercase bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-all"
                    >
                      Alterar Imagem
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nome da Unidade / Regional</label>
                  <input
                    type="text"
                    value={unidadeData.nome}
                    onChange={(e) => setUnidadeData({ ...unidadeData, nome: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">CNPJ / Identificador</label>
                  <input
                    type="text"
                    value={unidadeData.cnpj}
                    onChange={(e) => setUnidadeData({ ...unidadeData, cnpj: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Endereço de Operação</label>
                  <input
                    type="text"
                    value={unidadeData.endereco}
                    onChange={(e) => setUnidadeData({ ...unidadeData, endereco: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 'acesso':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-left">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800">Matriz de Controle de Acesso</h3>
                <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-3 py-1 rounded-full border border-amber-100 uppercase tracking-widest">Apenas Admin</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Módulo do Sistema</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase text-center">Administrador</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase text-center">Veterinário</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase text-center">Fiscal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {permissions.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{p.module}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-1">
                            {['V', 'E', 'X'].map(act => (
                              <button
                                key={act}
                                onClick={() => togglePermission(p.module, 'admin', act)}
                                className={`size-6 rounded flex items-center justify-center text-[10px] font-black transition-all hover:scale-110 active:scale-95 ${p.admin.includes(act) ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-slate-100 text-slate-300 border border-slate-200'}`}
                              >
                                {act}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-1">
                            {['V', 'E', 'X'].map(act => (
                              <button
                                key={act}
                                onClick={() => togglePermission(p.module, 'vet', act)}
                                className={`size-6 rounded flex items-center justify-center text-[10px] font-black transition-all hover:scale-110 active:scale-95 ${p.vet.includes(act) ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-slate-100 text-slate-300 border border-slate-200'}`}
                              >
                                {act}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-1">
                            {['V', 'E', 'X'].map(act => (
                              <button
                                key={act}
                                onClick={() => togglePermission(p.module, 'fiscal', act)}
                                className={`size-6 rounded flex items-center justify-center text-[10px] font-black transition-all hover:scale-110 active:scale-95 ${p.fiscal.includes(act) ? 'bg-orange-100 text-orange-600 border border-orange-200' : 'bg-slate-100 text-slate-300 border border-slate-200'}`}
                              >
                                {act}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-slate-50 flex items-center gap-6">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                  <span className="size-3 bg-slate-200 rounded-sm"></span> V = Visualizar
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                  <span className="size-3 bg-slate-200 rounded-sm"></span> E = Editar
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                  <span className="size-3 bg-slate-200 rounded-sm"></span> X = Excluir
                </div>
              </div>
            </div>
          </div>
        );
      case 'equipe':
        return (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800">Corpo Técnico Ativo</h3>
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-primary/20 transition-all flex items-center gap-2 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Convidar Membro
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Nome / Profissional</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Cargo</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Registro</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {equipeList.map((m, idx) => (
                      <tr key={m.id || idx} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-black text-xs overflow-hidden">
                              {m.imageUrl ? (
                                <img src={m.imageUrl} alt={m.nome} className="size-full object-cover" />
                              ) : (
                                m.nome.charAt(0)
                              )}
                            </div>
                            <span className="text-sm font-bold text-slate-800">{m.nome}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">{m.cargo}</td>
                        <td className="px-6 py-4 text-sm font-mono text-slate-400">{m.registro}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight ${m.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setViewingMembro(m)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="Visualizar Detalhes"
                            >
                              <span className="material-symbols-outlined text-[20px]">visibility</span>
                            </button>
                            <button
                              onClick={() => setEditingMembro(m)}
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                              title="Editar Cadastro"
                            >
                              <span className="material-symbols-outlined text-[20px]">edit_square</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'preferencias':
        return (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-8">
              <div>
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">notifications</span>
                  Notificações do Sistema
                </h3>
                <div className="space-y-4">
                  {[
                    { id: 'alertasRestituicao', label: 'Alertas de Restituição', desc: 'Notificar ao completar 30 dias de albergamento.' },
                    { id: 'relatoriosObitos', label: 'Relatórios de Óbitos', desc: 'Sinalizar imediatamente registros de óbitos ou furtos na unidade.' },
                    { id: 'vencimentoCustodia', label: 'Vencimento de Custódia', desc: 'Notificar 48h antes do animal entrar em período de adoção.' },
                  ].map((notif) => (
                    <div key={notif.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 transition-all hover:border-slate-300">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{notif.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{notif.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={prefs[notif.id as keyof typeof prefs]}
                          onChange={() => handleTogglePref(notif.id as keyof typeof prefs)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100">
                <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">palette</span>
                  Aparência e Usabilidade
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-400">dark_mode</span>
                      <p className="text-sm font-bold text-slate-800">Modo Escuro (BETA)</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prefs.darkMode}
                        onChange={() => handleTogglePref('darkMode')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-700"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-400">text_fields</span>
                      <p className="text-sm font-bold text-slate-800">Interface Compacta</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prefs.compactInterface}
                        onChange={() => handleTogglePref('compactInterface')}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'usuarios':
        return (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-slate-800">Gestão de Usuários</h3>
                  <p className="text-xs text-slate-500 font-medium">Gerencie os usuários com acesso ao sistema.</p>
                </div>
                <button
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-primary/20 transition-all flex items-center gap-2 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                  Novo Usuário
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Nome</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Email</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase">Perfil de Acesso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Current User (Admin) */}
                    <tr className="bg-primary/5 hover:bg-primary/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-primary text-slate-900 flex items-center justify-center font-black text-xs">
                            {userProfile.nome.charAt(0)}
                          </div>
                          <span className="text-sm font-bold text-slate-800">{userProfile.nome} <span className="text-xs text-slate-400">(Você)</span></span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">{userProfile.email}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight bg-amber-100 text-amber-700 border border-amber-200">
                          Administrador
                        </span>
                      </td>
                    </tr>
                    {/* Registered System Users */}
                    {systemUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-black text-xs">
                              {u.nome.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-slate-800">{u.nome}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${u.perfil === 'admin' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                            {u.perfil === 'admin' ? 'Administrador' : 'Operador'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {systemUsers.length === 0 && (
                      <tr><td colSpan={3} className="p-8 text-center text-slate-400 italic">Nenhum outro usuário cadastrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-left relative">

      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-8 right-8 z-[110] px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-fade-in-up ${notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
          <span className="material-symbols-outlined">
            {notification.type === 'success' ? 'check_circle' : 'info'}
          </span>
          <p className="text-sm font-black">{notification.message}</p>
        </div>
      )}

      {/* Modal Convidar Membro */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col relative text-left">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm">
                  <span className="material-symbols-outlined">person_add</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Convidar Novo Membro</h3>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Acesso ao SGA</p>
                </div>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="size-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-gray-200 rounded-full transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleInviteMember} className="p-8 space-y-6">
              <div className="space-y-4">
                {/* Upload de Foto no Modal */}
                <div className="flex flex-col items-center gap-4 mb-2 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <div className="size-20 bg-white rounded-full border border-slate-200 flex items-center justify-center text-slate-300 overflow-hidden shadow-inner relative">
                    {newMembro.imageUrl ? (
                      <img src={newMembro.imageUrl} alt="Preview" className="size-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-4xl">person</span>
                    )}
                  </div>
                  <div className="text-center">
                    <input
                      type="file"
                      ref={memberPhotoInputRef}
                      onChange={handleMemberPhotoChange}
                      className="hidden"
                      accept="image/*"
                    />
                    <button
                      type="button"
                      onClick={() => memberPhotoInputRef.current?.click()}
                      className="text-xs font-black text-primary uppercase bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-all"
                    >
                      Carregar Foto
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={newMembro.nome}
                    onChange={(e) => setNewMembro({ ...newMembro, nome: e.target.value })}
                    placeholder="Ex: João da Silva..."
                    className="h-11 w-full px-4 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none font-medium"
                  />
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Cargo / Função</label>
                  <select
                    value={newMembro.cargo}
                    onChange={(e) => setNewMembro({ ...newMembro, cargo: e.target.value })}
                    className="h-11 w-full px-4 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none font-medium"
                  >
                    <option>Médico Veterinário</option>
                    <option>Fiscal Agropecuário</option>
                    <option>Assistente Administrativo</option>
                    <option>Auxiliar de Campo</option>
                    <option>Gestor de Unidade</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Registro Profissional (CRMV / Matrícula)</label>
                  <input
                    type="text"
                    required
                    value={newMembro.registro}
                    onChange={(e) => setNewMembro({ ...newMembro, registro: e.target.value })}
                    placeholder="Ex: CRMV-DF 0000"
                    className="h-11 w-full px-4 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none font-medium font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-primary text-green-900 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  Convidar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Membro */}
      {editingMembro && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col relative text-left">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm">
                  <span className="material-symbols-outlined">edit</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Editar Membro da Equipe</h3>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">ID: {editingMembro.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingMembro(null)}
                className="size-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-gray-200 rounded-full transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={editingMembro.nome}
                    onChange={(e) => setEditingMembro({ ...editingMembro, nome: e.target.value })}
                    className="h-11 w-full px-4 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none font-medium"
                  />
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Cargo / Função</label>
                  <select
                    value={editingMembro.cargo}
                    onChange={(e) => setEditingMembro({ ...editingMembro, cargo: e.target.value })}
                    className="h-11 w-full px-4 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none font-medium"
                  >
                    <option>Médico Veterinário</option>
                    <option>Fiscal Agropecuário</option>
                    <option>Assistente Administrativo</option>
                    <option>Auxiliar de Campo</option>
                    <option>Gestor de Unidade</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Registro Profissional</label>
                  <input
                    type="text"
                    required
                    value={editingMembro.registro}
                    onChange={(e) => setEditingMembro({ ...editingMembro, registro: e.target.value })}
                    className="h-11 w-full px-4 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none font-medium font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Status</label>
                  <select
                    value={editingMembro.status}
                    onChange={(e) => setEditingMembro({ ...editingMembro, status: e.target.value })}
                    className="h-11 w-full px-4 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none font-medium"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Férias">Férias</option>
                    <option value="Licença">Licença</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingMembro(null)}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-primary text-green-900 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Atualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visualizar Membro */}
      {viewingMembro && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-sm w-full overflow-hidden flex flex-col relative text-left">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="size-24 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-primary text-3xl font-black mb-4 overflow-hidden">
                {viewingMembro.imageUrl ? (
                  <img src={viewingMembro.imageUrl} alt={viewingMembro.nome} className="size-full object-cover" />
                ) : (
                  viewingMembro.nome.charAt(0)
                )}
              </div>
              <h3 className="text-xl font-black text-slate-800">{viewingMembro.nome}</h3>
              <p className="text-sm font-bold text-primary uppercase tracking-wider mb-6">{viewingMembro.cargo}</p>

              <div className="w-full space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Registro Profissional</p>
                  <p className="text-sm font-mono font-bold text-slate-700">{viewingMembro.registro}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Status na Unidade</p>
                    <p className="text-sm font-bold text-slate-700">{viewingMembro.status}</p>
                  </div>
                  <span className={`size-3 rounded-full ${viewingMembro.status === 'Ativo' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                </div>
              </div>

              <button
                onClick={() => setViewingMembro(null)}
                className="w-full mt-8 py-3 bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all"
              >
                Fechar Perfil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Usuário */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col relative text-left">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-amber-50">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-white border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
                  <span className="material-symbols-outlined">person_add</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Cadastrar Novo Usuário</h3>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Acesso ao SGA</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="size-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-gray-200 rounded-full transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome Completo</label>
                <input
                  type="text"
                  value={newSystemUser.nome}
                  onChange={(e) => setNewSystemUser({ ...newSystemUser, nome: e.target.value })}
                  placeholder="Ex: Maria Silva..."
                  className="h-11 w-full px-4 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm outline-none font-medium"
                />
              </div>
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={newSystemUser.email}
                  onChange={(e) => setNewSystemUser({ ...newSystemUser, email: e.target.value })}
                  placeholder="usuario@seagri.df.gov.br"
                  className="h-11 w-full px-4 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm outline-none font-medium"
                />
              </div>
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Perfil de Acesso</label>
                <select
                  value={newSystemUser.perfil}
                  onChange={(e) => setNewSystemUser({ ...newSystemUser, perfil: e.target.value as 'admin' | 'operador' })}
                  className="h-11 w-full px-4 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm outline-none font-medium"
                >
                  <option value="operador">Operador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddSystemUser}
                className="px-8 py-2.5 bg-amber-500 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">check</span>
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho Fixo de Configuração */}
      <div className="bg-white px-8 py-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentPage('Prontuario')}
            className="size-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Configurações do Sistema</h2>
            <p className="text-slate-500 text-sm font-medium">Personalize a identidade da unidade, permissões e equipe.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className="px-8 py-3 bg-primary text-green-900 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">save</span>
          Salvar Alterações
        </button>
      </div>

      {/* Navegação por Abas (Sticky) */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md px-8 border-b border-slate-200">
        <nav className="flex items-center gap-8">
          {[
            { id: 'perfil', label: 'Meu Perfil', icon: 'account_circle' },
            { id: 'unidade', label: 'Dados da Unidade', icon: 'apartment' },
            { id: 'acesso', label: 'Controle de Acesso', icon: 'lock_person' },
            { id: 'equipe', label: 'Equipe Técnica', icon: 'groups' },
            { id: 'preferencias', label: 'Preferências', icon: 'tune' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 border-b-2 font-black text-xs uppercase tracking-widest transition-all ${activeTab === tab.id ? 'border-primary text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <span className={`material-symbols-outlined text-[18px] ${activeTab === tab.id ? 'text-primary' : 'text-slate-400'}`}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
          {/* Admin-Only Tab */}
          {userProfile.role === 'admin' && (
            <button
              onClick={() => setActiveTab('usuarios')}
              className={`flex items-center gap-2 py-4 border-b-2 font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'usuarios' ? 'border-amber-500 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <span className={`material-symbols-outlined text-[18px] ${activeTab === 'usuarios' ? 'text-amber-500' : 'text-slate-400'}`}>
                admin_panel_settings
              </span>
              Usuários
            </button>
          )}
        </nav>
      </div>

      {/* Conteúdo Variável */}
      <div className="p-8 pb-24 overflow-y-auto flex-1">
        <div className="max-w-5xl mx-auto">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;
