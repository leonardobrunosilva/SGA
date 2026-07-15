import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: user,
          password: password,
        });
        if (error) throw error;
        alert('Cadastro realizado com sucesso! Verifique seu email para confirmação ou faça login se a confirmação não for exigida.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: user,
          password: password,
        });
        if (error) throw error;
        onLogin();
      }
    } catch (error: any) {
      alert(`Erro ao ${isSignUp ? 'cadastrar' : 'fazer login'}: ` + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Elementos decorativos de fundo */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[60%] bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[60%] bg-gdf-blue/5 rounded-full blur-3xl"></div>

      <div className="w-full max-w-[440px] px-6 py-12 z-10">
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
          <div className="p-8 md:p-12">
            <div className="flex flex-col items-center mb-10">
              <img
                alt="Logo GDF SEAGRI"
                className="h-16 w-auto mb-6 drop-shadow-sm"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBza1XHBcVSgnlSuUUwYs0XGuuQZ9DlAXtZytXdiAY9l-W9tUFhWb7xoPVToxm5qVkFluoeA95w3kEwl0Ebv9sJe04HB_1_PYnAQ8nNxokOYew"
              />
              <h1 className="text-2xl font-black text-slate-800 tracking-tight text-center">S.G.A.</h1>
              <p className="text-slate-500 text-sm font-medium text-center mt-1">Sistema de Gestão Animal - SEAGRI DF</p>
            </div>

            <div className="flex justify-center mb-8 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${!isSignUp ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${isSignUp ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Primeiro Acesso
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider ml-1" htmlFor="cpf">
                  Email
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-xl">person</span>
                  <input
                    id="cpf"
                    type="email"
                    required
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold text-slate-700"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider" htmlFor="password">
                    Senha de Acesso
                  </label>
                  {!isSignUp && (
                    <a href="#" className="text-[11px] font-black text-primary uppercase tracking-wider hover:underline">
                      Esqueci a senha
                    </a>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-xl">lock</span>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold text-slate-700"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {!isSignUp && (
                <div className="flex items-center gap-2 px-1">
                  <input type="checkbox" id="remember" className="size-4 rounded border-slate-300 text-primary focus:ring-primary" />
                  <label htmlFor="remember" className="text-xs font-bold text-slate-500">Lembrar meus dados</label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 mt-4 ${loading
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-primary text-green-900 hover:bg-primary/90'
                  }`}
              >
                {loading ? (
                  <span className="size-5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">{isSignUp ? 'person_add' : 'login'}</span>
                    {isSignUp ? 'Criar Conta' : 'Entrar no Sistema'}
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-slate-50 p-6 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter leading-relaxed">
              Acesso restrito a servidores autorizados da <br /> Secretaria de Agricultura do Distrito Federal
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-slate-400 text-xs font-medium">
          Versão 2.4.0 • Suporte Técnico GDF
        </p>
      </div>
    </div>
  );
};

export default Login;
