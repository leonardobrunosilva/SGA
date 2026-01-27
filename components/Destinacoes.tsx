
import React, { useState, useEffect, useMemo } from 'react';
import { Animal } from '../types';
import { calculateDays, formatDate } from '../utils';
import { saidasService } from '../services/saidasService';

const Destinacoes: React.FC = () => {
  // History View State
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [identifiedAnimal, setIdentifiedAnimal] = useState<Animal | null>(null);

  // Initial Load - from Supabase saidas table
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await saidasService.getAll();

        // Map saidas to Animal objects
        const history: Animal[] = data.map((saida: any) => ({
          id: saida.id,
          specie: saida.specie || 'Semovente',
          chip: saida.chip,
          dateIn: formatDate(saida.dateIn),
          exitDate: formatDate(saida.dateOut),
          origin: saida.origin || '-',
          gender: saida.gender || '-',
          breed: saida.color || '-',
          color: saida.color || '-',
          status: saida.destination || 'Outros',
          seiProcess: saida.seiProcess || '-',
          osNumber: saida.osNumber || '-',
          imageUrl: `https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?q=80&w=1471&auto=format&fit=crop`,
          daysIn: calculateDays(saida.dateIn, saida.dateOut),
          observations: saida.observations || '',
          organ: saida.organ || '-'
        }));

        setAnimals(history);
      } catch (e) {
        console.error('Erro ao carregar histórico:', e);
      }
    };

    fetchHistory();
  }, []);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Lógica de Filtragem e Paginação con Reset
  const filteredAnimals = useMemo(() => {
    // Reset page on filter change
    if (currentPage !== 1) setCurrentPage(1);

    return animals.filter(a =>
      a.chip.includes(searchTerm) ||
      a.specie.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [animals, searchTerm]);

  // Pagination Calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAnimals = filteredAnimals.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAnimals.length / itemsPerPage);

  const handlePageChange = (page: number) => setCurrentPage(page);

  // View Details Modal State
  const [viewingAnimal, setViewingAnimal] = useState<Animal | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-12">

      {/* Header */}
      <div className="flex flex-col text-left">
        <h2 className="text-[#111814] text-3xl font-black leading-tight tracking-[-0.033em]">Histórico de Destinações</h2>
        <p className="text-gray-500 text-sm font-normal">Registro consolidado de todas as saídas e baixas de animais.</p>
      </div>

      {/* Metrics (Optional Visuals) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs font-bold uppercase">Total de Saídas</p>
          <h3 className="text-3xl font-black text-slate-800">{animals.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs font-bold uppercase">Restituições</p>
          <h3 className="text-3xl font-black text-green-600">
            {animals.filter(a => a.status === 'Restituído' || a.status === 'Restituição').length}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs font-bold uppercase">Adocões / Leilão</p>
          <h3 className="text-3xl font-black text-blue-600">
            {animals.filter(a => a.status !== 'Restituído' && a.status !== 'Restituição').length}
          </h3>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pl-12 focus:ring-2 focus:ring-gdf-blue outline-none transition-all"
          placeholder="Filtrar histórico por Chip, Espécie..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <span className="material-symbols-outlined absolute left-4 top-3.5 text-gray-400">search</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">ANIMAL / DETALHES</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">IDENTIFICAÇÃO</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">DATA SAÍDA</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">PERMANÊNCIA</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">PROCESSO (SEI)</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs">STATUS</th>
                <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs text-right">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentAnimals.map((animal, idx) => (
                <tr key={animal.id || idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{animal.specie}</span>
                      <span className="text-[10px] text-gray-400 font-medium uppercase">
                        {animal.gender} / {animal.color}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{animal.chip}</td>
                  <td className="px-6 py-4 text-gray-600">{animal.exitDate}</td>
                  <td className="px-6 py-4">
                    <span className={`font-bold ${animal.daysIn > 30 ? 'text-red-500' : 'text-slate-700'}`}>
                      {animal.daysIn} dias
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-500">{animal.seiProcess}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase border ${animal.status === 'Restituído' ? 'bg-green-50 text-green-700 border-green-200' :
                      animal.status === 'Em Custódia' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                      {animal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setViewingAnimal(animal)} className="text-gray-400 hover:text-gdf-blue transition-colors p-1.5 rounded-full hover:bg-gray-100" title="Visualizar">
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                      <button className="text-gray-400 hover:text-orange-600 transition-colors p-1.5 rounded-full hover:bg-gray-100" title="Editar">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
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

      {/* Detail View Modal */}
      {viewingAnimal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative">
            <button onClick={() => setViewingAnimal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
            <h3 className="text-2xl font-black text-slate-900 mb-6">Detalhes do Histórico</h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Animal</p>
                <p className="font-bold text-slate-800">{viewingAnimal.specie} - {viewingAnimal.breed}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Identificação</p>
                <p className="font-mono">{viewingAnimal.chip}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Entrada</p>
                <p>{viewingAnimal.dateIn}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Saída</p>
                <p>{viewingAnimal.exitDate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Permanência</p>
                <p>{viewingAnimal.daysIn} dias</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Destino</p>
                <p>{viewingAnimal.status} - {viewingAnimal.origin}</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Destinacoes;
