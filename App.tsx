
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Apreensoes from './components/Apreensoes';
import Adocao from './components/Adocao';
import Destinacoes from './components/Destinacoes';
import Restituicao from './components/Restituicao';
import Prontuario from './components/Prontuario';
import OutrosOrgaos from './components/OutrosOrgaos';
import RegiaoAdm from './components/RegiaoAdm';
import Configuracoes from './components/Configuracoes';
import Login from './components/Login';
import { PageType } from './types';

import { supabase } from './supabaseClient';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageType>('Dashboard');

  React.useEffect(() => {
    // Verificar sessão atual ao carregar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Escutar mudanças na autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const confirm = window.confirm("Deseja realmente sair do sistema?");
    if (confirm) {
      await supabase.auth.signOut();
      setCurrentPage('Dashboard');
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderContent = () => {
    switch (currentPage) {
      case 'Dashboard': return <Dashboard />;
      case 'Apreensoes': return <Apreensoes />;
      case 'Adocao': return <Adocao />;
      case 'Destinacoes': return <Destinacoes />;
      case 'Restituicao': return <Restituicao />;
      case 'Prontuario': return <Prontuario />;
      case 'OutrosOrgaos': return <OutrosOrgaos />;
      case 'RegiaoAdm': return <RegiaoAdm />;
      case 'Configuracoes': return <Configuracoes setCurrentPage={setCurrentPage} />;
      default: return null;
    }
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background-light text-left">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col h-full ml-64 overflow-hidden bg-white relative">
        {/* Header Superior - Escondido quando em Configurações para dar espaço ao header específico da página */}
        {currentPage !== 'Configuracoes' && (
          <Header onLogout={handleLogout} />
        )}

        {/* Área de Conteúdo principal */}
        <div className={`flex-1 overflow-hidden flex flex-col ${currentPage === 'Configuracoes' ? 'bg-slate-50' : 'bg-white'}`}>
          <div className={`flex-1 overflow-y-auto ${currentPage === 'Configuracoes' ? '' : 'p-4 md:p-8'} scrollbar-hide print-layout`}>
            <div className={`${currentPage === 'Configuracoes' ? 'h-full' : 'max-w-[1200px] mx-auto w-full'}`}>
              {renderContent()}
            </div>

            {currentPage !== 'Configuracoes' && (
              <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-center text-slate-400 pb-8 no-print max-w-[1200px] mx-auto w-full">
                <p className="text-[9px] font-bold tracking-widest uppercase text-left">GDF - Governo do Distrito Federal | SEAGRI - Secretaria de Agricultura</p>
                <div className="flex items-center gap-4">
                  <button className="hover:text-gdf-blue transition-colors">
                    <span className="material-symbols-outlined text-[18px]">help_outline</span>
                  </button>
                  <button onClick={() => setCurrentPage('Configuracoes')} className="hover:text-gdf-blue transition-colors">
                    <span className="material-symbols-outlined text-[18px]">settings</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botão flutuante mobile */}
        <button className="no-print md:hidden fixed bottom-6 right-6 size-14 bg-primary text-white rounded-full shadow-xl shadow-primary/30 flex items-center justify-center z-50">
          <span className="material-symbols-outlined text-[28px]">add</span>
        </button>
      </main>
    </div>
  );
};

export default App;
