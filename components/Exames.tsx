import React, { useState, useRef } from 'react';
import { adocaoService, restituicaoService } from '../services/worklistService';
import { apreensoesService } from '../services/apreensoesService';

interface ExameAnimal {
    id: string;
    chip: string;
    specie: string;
    origem: 'Restituição' | 'Adoção';
    data_exame?: string | null;
}

const Exames: React.FC = () => {
    const [animais, setAnimais] = useState<ExameAnimal[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                origem: 'Adoção',
                data_exame: item.animal?.data_exame
            }));

            const restituicaoMapped: ExameAnimal[] = restituicao.map((item: any) => ({
                id: item.animal?.id || item.animal_id,
                chip: item.animal?.chip || 'N/A',
                specie: item.animal?.specie || 'N/A',
                origem: 'Restituição',
                data_exame: item.animal?.data_exame
            }));

            setAnimais([...adocaoMapped, ...restituicaoMapped]);
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
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 bg-gdf-blue hover:bg-gdf-blue-dark text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95"
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
                            {animais.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                        <span className="material-symbols-outlined text-4xl block mb-2 opacity-50">science</span>
                                        <p>Nenhum animal carregado. Clique em "Carregar Animais Ativos".</p>
                                    </td>
                                </tr>
                            ) : (
                                animais.map((animal) => {
                                    const info = calcularValidadeExame(animal.data_exame);
                                    return (
                                        <tr key={animal.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">{animal.chip}</td>
                                            <td className="px-6 py-4 font-bold text-slate-600">{animal.specie}</td>
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
                    <p>Exibindo <span className="font-bold text-slate-900">{animais.length}</span> registros combinados</p>
                </div>
            </div>
        </div>
    );
};

export default Exames;
