
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '../supabaseClient';
import { formatDate } from '../utils';

// Interface para os dados da tabela
interface RegiaoRecord {
  id: string;
  ra: string;
  dateIn: string;
  dateOut: string;
  chip: string;
  specie: string;
  status: 'Apreendido' | 'Restituído' | 'Adotado' | 'Manutenção';
  owner?: string; // Dado extra para o modal
  address?: string; // Dado extra para o modal
  notes?: string; // Dado extra para o modal
}


const REGIOES_ADMINISTRATIVAS = [
  'Água Quente', 'Águas Claras', 'Arapoanga', 'Arniqueira', 'Brasília', 'Brazlândia', 'Candangolândia',
  'Ceilândia', 'Cruzeiro', 'Fercal', 'Gama', 'Guará', 'Itapoã', 'Jardim Botânico', 'Lago Norte',
  'Lago Sul', 'Núcleo Bandeirante', 'Paranoá', 'Park Way', 'Planaltina', 'Recanto das Emas',
  'Riacho Fundo', 'Riacho Fundo II', 'SCIA', 'Samambaia', 'Santa Maria', 'São Sebastião', 'SIA',
  'Sobradinho', 'Sobradinho II', 'Sol Nascente/Pôr do Sol', 'Sudoeste/Octogonal', 'Taguatinga',
  'Varjão', 'Vicente Pires'
].sort();

const RegiaoAdm: React.FC = () => {
  const [viewingRecord, setViewingRecord] = useState<RegiaoRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RegiaoRecord[]>([]);
  const [chartData, setChartData] = useState<{ name: string, value: number }[]>([]);
  const [totalApreensoes, setTotalApreensoes] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch entries to calculate RA stats
        const { data: entries, error } = await supabase.from('apreensoes').select('*').order('date_in', { ascending: false });
        if (error) throw error;

        // 2. Fetch exits to check current status
        const { data: exits } = await supabase.from('saidas').select('chip, destination');
        const exitMap = new Map();
        exits?.forEach(e => exitMap.set(String(e.chip), e.destination));

        // 3. Map entries to RegiaoRecord
        const raCounts: Record<string, number> = {};
        const records: RegiaoRecord[] = entries.map((e: any) => {
          const ra = e.region || 'Desconhecida';
          raCounts[ra] = (raCounts[ra] || 0) + 1;

          const statusSaida = exitMap.get(String(e.chip));

          return {
            id: e.id,
            ra: ra,
            dateIn: formatDate(e.date_in),
            dateOut: '-', // Simplified
            chip: e.chip,
            specie: e.specie || 'Desconhecida',
            status: statusSaida ? (statusSaida.includes('ado') ? 'Adotado' : 'Restituído') : 'Apreendido',
            owner: e.owner || 'Não identificado',
            address: e.address || '-',
            notes: e.observations || ''
          };
        });

        setData(records.slice(0, 10)); // Show top 10 recent
        setTotalApreensoes(entries.length);

        const chart = Object.entries(raCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 7)
          .map(([name, value]) => ({ name, value }));

        setChartData(chart);

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);


  // Função auxiliar para renderizar o badge de status
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Apreendido':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Apreendido</span>;
      case 'Restituído':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Restituído</span>;
      case 'Adotado':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Adotado</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in relative">

      {/* Modal de Visualização */}
      {viewingRecord && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col relative text-left">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm">
                  <span className="material-symbols-outlined">folder_open</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Detalhes do Registro</h3>
                  <p className="text-xs text-slate-500 font-medium">RA: {viewingRecord.ra}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingRecord(null)}
                className="size-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-gray-200 rounded-full transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status Atual</p>
                  {renderStatusBadge(viewingRecord.status)}
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Identificação (CHIP)</p>
                  <p className="text-lg font-mono font-bold text-slate-800 tracking-tight">{viewingRecord.chip}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Espécie</p>
                  <p className="text-sm font-bold text-slate-700">{viewingRecord.specie}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Data Entrada</p>
                  <p className="text-sm font-bold text-slate-700">{viewingRecord.dateIn}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Responsável/Proprietário</p>
                  <p className="text-sm font-bold text-slate-700">{viewingRecord.owner || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Data Saída</p>
                  <p className="text-sm font-bold text-slate-700">{viewingRecord.dateOut}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Localização / Endereço</p>
                <div className="flex items-start gap-2 text-slate-600 bg-white border border-slate-200 p-3 rounded-lg">
                  <span className="material-symbols-outlined text-primary text-lg mt-0.5">location_on</span>
                  <span className="text-sm">{viewingRecord.address}</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Observações</p>
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                  "{viewingRecord.notes}"
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setViewingRecord(null)}
                className="px-6 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-900 transition-colors shadow-lg shadow-slate-900/20"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho e Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão de Regiões Administrativas</h2>
          <nav className="flex text-sm text-slate-500 mt-1" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li><a href="#" className="hover:text-primary transition-colors">S.G.A.</a></li>
              <li><span className="text-slate-300">/</span></li>
              <li><span className="text-primary font-medium">Gestão de RAs</span></li>
            </ol>
          </nav>
        </div>
        <div className="flex gap-3">
          <button className="bg-primary hover:bg-emerald-400 text-green-900 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined">add</span>
            Nova Região
          </button>
        </div>
      </div>

      {/* Grid de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wide">Total de Apreensões</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{totalApreensoes.toLocaleString()}</h3>
          </div>
          <div className="size-14 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100">
            <span className="material-symbols-outlined text-[32px]">pets</span>
          </div>
        </div>
        {/* Card 2 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wide">Tempo Médio de Permanência</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">12 dias</h3>
          </div>
          <div className="size-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <span className="material-symbols-outlined text-[32px]">schedule</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Superior (Estilo BI) */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col xl:flex-row gap-6 items-end">

        {/* Filtro 1: Ano */}
        <div className="flex flex-col gap-1.5 w-full md:w-auto min-w-[140px]">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Selecione o Ano</label>
          <div className="relative">
            <select className="h-10 w-full rounded-xl bg-slate-50 border-slate-200 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none pl-4 pr-10">
              <option>2025</option>
              <option>2024</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none text-lg">expand_more</span>
          </div>
        </div>

        {/* Filtro 2: Mês */}
        <div className="flex flex-col gap-1.5 w-full md:w-auto min-w-[160px]">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Selecione o Mês</label>
          <div className="relative">
            <select className="h-10 w-full rounded-xl bg-slate-50 border-slate-200 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none pl-4 pr-10">
              <option value="">Todos os Meses</option>
              <option>Janeiro</option>
              <option>Fevereiro</option>
              <option>Março</option>
              <option>Abril</option>
              <option>Maio</option>
              <option>Junho</option>
              <option>Julho</option>
              <option>Agosto</option>
              <option>Setembro</option>
              <option>Outubro</option>
              <option>Novembro</option>
              <option>Dezembro</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none text-lg">expand_more</span>
          </div>
        </div>

        {/* Filtro 3: Período Customizado */}
        <div className="flex flex-col gap-1.5 w-full md:w-auto">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Selecione o Período</label>
          <div className="flex items-center gap-2">
            <input type="date" className="h-10 w-full md:w-36 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
            <span className="text-slate-400 font-bold">-</span>
            <input type="date" className="h-10 w-full md:w-36 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
          </div>
        </div>

        {/* Divisor Visual (apenas desktop) */}
        <div className="hidden xl:block w-px h-10 bg-slate-100 mx-2 self-center"></div>

        {/* Filtro 4: Região Administrativa (Substituindo a Busca) */}
        <div className="flex flex-col gap-1.5 w-full md:w-auto flex-1">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Selecione a Região</label>
          <div className="relative">
            <select className="h-10 w-full rounded-xl bg-slate-50 border-slate-200 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none pl-4 pr-10">
              <option value="">Todas as Regiões</option>
              {REGIOES_ADMINISTRATIVAS.map((ra) => (
                <option key={ra} value={ra}>{ra}</option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 pointer-events-none text-lg">expand_more</span>
          </div>
        </div>
      </div>

      {/* Nova Barra de Busca (Separada) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            type="text"
            placeholder="Pesquisar por nome do Administrador, Sigla ou Código..."
            className="h-11 w-full pl-11 pr-4 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm outline-none font-medium placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Tabela Refeita */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">RA</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Data de Entrada</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Data de Saída</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">memory</span>
                    CHIP
                  </div>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Espécie</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {data.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap"><span className="text-sm font-bold text-slate-700">{record.ra}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{record.dateIn}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">{record.dateOut}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-slate-600">{record.chip}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{record.specie}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderStatusBadge(record.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setViewingRecord(record)}
                      className="text-slate-400 hover:text-primary transition-colors p-2 rounded-full hover:bg-slate-100"
                      title="Visualizar Detalhes"
                    >
                      <span className="material-symbols-outlined">visibility</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div><p className="text-sm text-slate-500">Mostrando registros recentes do banco de dados</p></div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <a href="#" className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50"><span className="material-symbols-outlined text-lg">chevron_left</span></a>
                <a href="#" className="z-10 bg-primary/20 border-primary text-primary relative inline-flex items-center px-4 py-2 border text-sm font-bold">1</a>
                <a href="#" className="bg-white border-slate-300 text-slate-500 hover:bg-slate-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium">2</a>
                <a href="#" className="bg-white border-slate-300 text-slate-500 hover:bg-slate-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium">3</a>
                <a href="#" className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50"><span className="material-symbols-outlined text-lg">chevron_right</span></a>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Barras Horizontais (Novo Container) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">bar_chart</span>
          Distribuição Geográfica de Apreensões (Top RAs)
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ left: 20, right: 30, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }}
                width={120}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '12px' }}
                itemStyle={{ color: '#0e4097', fontWeight: 'bold' }}
              />
              <Bar
                dataKey="value"
                fill="#0e4097"
                radius={[0, 4, 4, 0]}
                barSize={24}
              >
                {/* Opcional: Adicionar label na ponta da barra */}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

export default RegiaoAdm;
