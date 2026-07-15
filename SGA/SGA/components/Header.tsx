import React from 'react';

interface HeaderProps {
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout }) => {
    return (
        <header className="no-print w-full bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-4 shadow-sm z-10 shrink-0">
            <img
                alt="GDF Logo"
                className="h-10 w-auto object-contain"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBza1XHBcVSgnlSuUUwYs0XGuuQZ9DlAXtZytXdiAY9l-W9tUFwLk5HSXVuGJ0HLBC-AfbdfZ9vCx-UCyy0w_SHNWGsMAF-mDRE4gQ0XVT2cjib11u9TrQC1nuh8VLfqFEhJ4pHmVZVPcUrK1fE6sQbEFhb5oTEX6I3lucGclcsngfjVYxayDW7UcogXsFT5L5DoYlvpK4UxRkhpFWb7xoPVToxm5qVkFluoeA95w3kEwl0Ebv9sJe04HB_1_PYnAQ8nNxokOYew"
            />
            <div className="flex flex-col">
                <h2 className="text-sm font-bold text-sidebar-blue uppercase leading-tight tracking-tight">GDF SEAGRI - Secretaria de Agricultura, Abastecimento e Desenvolvimento Rural</h2>
                <h3 className="text-[11px] font-semibold text-gray-500 uppercase leading-tight tracking-wide">Subsecretaria de Proteção aos Animais de Produção - SUPROA</h3>
            </div>

            <div className="ml-auto no-print">
                <button
                    onClick={onLogout}
                    className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors text-xs font-black uppercase tracking-widest"
                >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    Sair
                </button>
            </div>
        </header>
    );
};

export default Header;
