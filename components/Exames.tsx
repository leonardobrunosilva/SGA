import React, { useState, useRef } from 'react';
import { adocaoService, restituicaoService } from '../services/worklistService';
import { apreensoesService } from '../services/apreensoesService';
import { supabase } from '../supabaseClient';

interface ExameAnimal {
    id: string;
    chip: string;
    specie: string;
    gender?: string;
    color?: string;
    origem: 'Restituição' | 'Adoção';
    data_exame?: string | null;
}

const Exames: React.FC = () => {
    const [animais, setAnimais] = useState<ExameAnimal[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [chipFilter, setChipFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [filaFilter, setFilaFilter] = useState('');
    const itemsPerPage = 10;
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Carrega do banco no mount
    React.useEffect(() => {
        const fetchSavedExames = async () => {
            try {
                const { data } = await supabase.from('system_settings').select('exames_data').eq('id', 1).single();
                if (data && data.exames_data) {
                    setAnimais(data.exames_data);
                }
            } catch (err) {
                console.error('Erro ao buscar exames salvos:', err);
            }
        };
        fetchSavedExames();
    }, []);

    const saveToDatabase = async (novaLista: ExameAnimal[]) => {
        try {
            await supabase.from('system_settings').update({ exames_data: novaLista }).eq('id', 1);
        } catch (err) {
            console.error('Erro ao salvar no banco global:', err);
        }
    };

    const handleClearPanel = async () => {
        setAnimais([]);
        setCurrentPage(1);
        await saveToDatabase([]);
    };

    const carregarAnimais = async () => {
        setIsLoading(true);
        try {
            const [adocao, restituicao] = await Promise.all([
                adocaoService.getAll(),
                restituicaoService.getAll()
            ]);

            const adocaoMapped: ExameAnimal[] = adocao.map((item: any) => ({
                id: item.animal?.id || item.animal_id,
                chip: item.animal?.chip || 'N/A',
                specie: item.animal?.specie || 'N/A',
                gender: item.animal?.gender,
                color: item.animal?.color,
                origem: 'Adoção',
                data_exame: item.animal?.data_exame
            }));

            const restituicaoMapped: ExameAnimal[] = restituicao.map((item: any) => ({
                id: item.animal?.id || item.animal_id,
                chip: item.animal?.chip || 'N/A',
                specie: item.animal?.specie || 'N/A',
                gender: item.animal?.gender,
                color: item.animal?.color,
                origem: 'Restituição',
                data_exame: item.animal?.data_exame
            }));

            const novaLista = [...adocaoMapped, ...restituicaoMapped];
            setAnimais(novaLista);
            await saveToDatabase(novaLista);
        } catch (error) {
            console.error("Erro ao carregar animais:", error);
            alert("Erro ao carregar lista de animais.");
        } finally {
            setIsLoading(false);
        }
    };

    const calcularValidadeExame = (dataExameString?: string | null) => {
        if (!dataExameString) {
            return { validade: '-', diasRestantes: null, status: 'Sem Exame' };
        }

        const [day, month, year] = dataExameString.split('/');
        if (!day || !month || !year) return { validade: '-', diasRestantes: null, status: 'Data Inválida' };

        const dataExame = new Date(Number(year), Number(month) - 1, Number(day));
        if (isNaN(dataExame.getTime())) return { validade: '-', diasRestantes: null, status: 'Data Inválida' };

        const validade = new Date(dataExame);
        validade.setDate(validade.getDate() + 60);

        const hoje = new Date();
        // zerar as horas para contar apenas os dias
        hoje.setHours(0, 0, 0, 0);
        validade.setHours(0, 0, 0, 0);

        const diffTime = validade.getTime() - hoje.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status = 'Em dia';
        if (diffDays <= 0) status = 'Vencido';

        return {
            validade: validade.toLocaleDateString('pt-BR'),
            diasRestantes: diffDays,
            status
        };
    };

    const getStatusStyle = (status: string, diasRestantes: number | null) => {
        if (status === 'Sem Exame' || status === 'Data Inválida') return 'text-slate-400 font-medium';
        if (diasRestantes !== null) {
            if (diasRestantes <= 0) return 'bg-red-100 text-red-700 px-2 py-1 rounded font-bold';
            if (diasRestantes <= 20) return 'text-red-500 font-bold';
            if (diasRestantes <= 40) return 'text-orange-500 font-bold';
            return 'text-emerald-600 font-bold';
        }
        return 'text-slate-600';
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const text = evt.target?.result as string;
            if (!text) return;

            const lines = text.split('\n');
            const dataMap = new Map<string, string>(); // chip -> data

            for (const line of lines) {
                if (!line.trim()) continue;
                const [chip, rawDate] = line.split(/[,;]/);
                if (chip && rawDate) {
                    dataMap.set(chip.trim(), rawDate.trim());
                }
            }

            // Atualiza estado e banco se houver correspondência
            setAnimais(prev => {
                const next = [...prev];
                next.forEach(animal => {
                    if (dataMap.has(animal.chip)) {
                        const novaData = dataMap.get(animal.chip);
                        animal.data_exame = novaData;
                        // Atualizar banco (tentativa leve para salvar permanentemente)
                        apreensoesService.updateApreensao(animal.id, { data_exame: novaData } as any).catch(err => {
                            console.error(`Erro ao salvar data de exame para chip ${animal.chip}:`, err);
                        });
                    }
                });
                saveToDatabase(next);
                return next;
            });

            alert(`Exames processados. Foram lidos ${dataMap.size} registros válidos no arquivo CSV.`);
        };

        reader.readAsText(file);
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const filteredAnimais = animais.filter(animal => {
        if (chipFilter && !animal.chip.toLowerCase().includes(chipFilter.toLowerCase())) return false;
        if (filaFilter && animal.origem !== filaFilter) return false;
        if (statusFilter) {
            const info = calcularValidadeExame(animal.data_exame);
            if (info.status !== statusFilter) return false;
        }
        return true;
    });

    const sortedAnimais = [...filteredAnimais].sort((a, b) => {
        const parseDateExame = (dateStr?: string | null) => {
            if (!dateStr) return 0;
            const [day, month, year] = dateStr.split('/');
            if (day && month && year) {
                return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
            }
            return 0;
        };
        const timeA = parseDateExame(a.data_exame) || Date.now();
        const timeB = parseDateExame(b.data_exame) || Date.now();
        return timeB - timeA;
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = sortedAnimais.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(sortedAnimais.length / itemsPerPage);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // Reseta paginação sempre que os filtros mudarem
    React.useEffect(() => {
        setCurrentPage(1);
    }, [chipFilter, statusFilter, filaFilter]);

    return (
        <div className="flex flex-col gap-8 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col text-left">
                    <h2 className="text-[#111814] text-3xl font-black leading-tight tracking-[-0.033em]">Controle de Exames</h2>
                    <p className="text-gray-500 text-sm font-normal">Monitoramento e validação de exames laboratoriais cruzados com filas de Adoção e Restituição.</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={carregarAnimais}
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-white hover:bg-gray-50 text-slate-700 font-bold py-2.5 px-5 rounded-xl border border-gray-200 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-[20px]">{isLoading ? 'sync' : 'refresh'}</span>
                        {isLoading ? 'Carregando...' : 'Carregar Animais Ativos'}
                    </button>

                    <button
                        onClick={handleClearPanel}
                        disabled={isLoading || animais.length === 0}
                        className="flex items-center gap-2 bg-white hover:bg-red-50 text-red-600 font-bold py-2.5 px-5 rounded-xl border border-red-200 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                        Limpar Painel
                    </button>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 bg-gdf-blue hover:bg-gdf-blue-dark text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-50"
                        disabled={isLoading || animais.length === 0}
                    >
                        <span className="material-symbols-outlined text-[20px]">upload_file</span>
                        Importar Resultados (CSV)
                    </button>
                    <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col justify-center border-l-4 border-l-gdf-blue">
                    <p className="text-sm font-medium text-gray-500 transition-colors uppercase tracking-wider">Total de Registros</p>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-3xl font-black text-[#111814]">{filteredAnimais.length}</span>
                        <div className="bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-gdf-blue text-xl">biotech</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filtros */}
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
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-gdf-blue outline-none transition-all"
                >
                    <option value="">Todos os Status</option>
                    <option value="Em dia">Em dia</option>
                    <option value="Vencido">Vencido</option>
                    <option value="Sem Exame">Sem Exame</option>
                    <option value="Data Inválida">Data Inválida</option>
                </select>

                <select
                    value={filaFilter}
                    onChange={(e) => setFilaFilter(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-gdf-blue outline-none transition-all"
                >
                    <option value="">Todas as Filas</option>
                    <option value="Adoção">Adoção</option>
                    <option value="Restituição">Restituição</option>
                </select>
            </div>

            {/* Tabela de Exames */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Identificação</th>
                                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Animal</th>
                                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Fila Atual</th>
                                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Data do Exame</th>
                                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Validade (+60d)</th>
                                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Dias Restantes</th>
                                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                        <span className="material-symbols-outlined text-4xl block mb-2 opacity-50">science</span>
                                        <p>Nenhum animal listado. Adicione clicando em "Carregar Animais Ativos" ou aguarde a primeira sincronização.</p>
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((animal) => {
                                    const info = calcularValidadeExame(animal.data_exame);
                                    return (
                                        <tr key={animal.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">{animal.chip}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800">{animal.specie}</span>
                                                    <span className="text-[10px] text-gray-400 font-medium uppercase">
                                                        {animal.gender || 'N/I'} / {animal.color || 'N/I'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${animal.origem === 'Adoção' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                                                    }`}>
                                                    {animal.origem}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-800 font-bold">{animal.data_exame || '-'}</td>
                                            <td className="px-6 py-4 text-slate-600 font-medium">{info.validade}</td>
                                            <td className="px-6 py-4">
                                                <span className={getStatusStyle(info.status, info.diasRestantes)}>
                                                    {info.diasRestantes !== null ? `${info.diasRestantes} dias` : '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={getStatusStyle(info.status, info.diasRestantes)}>
                                                    {info.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-200 flex justify-between items-center text-xs text-slate-500">
                    <p>Exibindo <span className="font-bold text-slate-900">{filteredAnimais.length > 0 ? indexOfFirstItem + 1 : 0}-{Math.min(indexOfLastItem, filteredAnimais.length)}</span> de <span className="font-bold text-slate-900">{filteredAnimais.length}</span> registros combinados</p>
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
                            disabled={currentPage === totalPages || totalPages === 0}
                            className={`px-2 py-1 rounded border border-gray-200 bg-white transition-colors ${currentPage === totalPages || totalPages === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                        >
                            Próximo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Exames;
