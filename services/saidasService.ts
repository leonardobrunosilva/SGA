
import { supabase } from '../supabaseClient';

export interface Saida {
    id: string;
    chip: string;
    specie: string;
    gender: string;
    color: string;
    history: string;
    observations: string;
    osNumber: string;
    dateOut: string;
    destination: string;
    seiProcess: string;
    receiverName?: string;
    receiverCpf?: string;
    autoInfracao?: string;
    autoApreensao?: string;
    createdAt?: string;
}

export const saidasService = {
    async getAll() {
        const { data, error } = await supabase
            .from('saidas')
            .select(`
        *,
        osNumber:os_number,
        dateOut:date_out,
        seiProcess:sei_process,
        receiverName:receiver_name,
        receiverCpf:receiver_cpf,
        autoInfracao:auto_infracao,
        autoApreensao:auto_apreensao
      `)
            .order('date_out', { ascending: false });

        if (error) {
            console.error('Erro ao buscar saídas:', error);
            throw error;
        }

        return data as Saida[];
    },

    async getByChip(chip: string) {
        const { data, error } = await supabase
            .from('saidas')
            .select(`
        *,
        osNumber:os_number,
        dateOut:date_out,
        seiProcess:sei_process,
        receiverName:receiver_name,
        receiverCpf:receiver_cpf,
        autoInfracao:auto_infracao,
        autoApreensao:auto_apreensao
      `)
            .eq('chip', chip)
            .order('date_out', { ascending: false });

        if (error) {
            console.error('Erro ao buscar saída por CHIP:', error);
            throw error;
        }

        return data as Saida[];
    },

    async getByDestination(destination: string) {
        const { data, error } = await supabase
            .from('saidas')
            .select(`
        *,
        osNumber:os_number,
        dateOut:date_out,
        seiProcess:sei_process,
        receiverName:receiver_name,
        receiverCpf:receiver_cpf,
        autoInfracao:auto_infracao,
        autoApreensao:auto_apreensao
      `)
            .eq('destination', destination)
            .order('date_out', { ascending: false });

        if (error) {
            console.error('Erro ao buscar saídas por destinação:', error);
            throw error;
        }

        return data as Saida[];
    },

    async create(saida: Omit<Saida, 'id'>) {
        const dbPayload = {
            chip: saida.chip,
            specie: saida.specie,
            gender: saida.gender,
            color: saida.color,
            history: saida.history,
            observations: saida.observations,
            os_number: saida.osNumber,
            date_out: saida.dateOut,
            destination: saida.destination,
            sei_process: saida.seiProcess,
            receiver_name: saida.receiverName,
            receiver_cpf: saida.receiverCpf,
            auto_infracao: saida.autoInfracao,
            auto_apreensao: saida.autoApreensao
        };

        const { data, error } = await supabase
            .from('saidas')
            .insert([dbPayload])
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar saída:', error);
            throw error;
        }

        return data;
    },

    async checkIfExited(chip: string) {
        const { count, error } = await supabase
            .from('saidas')
            .select('*', { count: 'exact', head: true })
            .eq('chip', chip);

        if (error) {
            console.error('Erro ao verificar saída:', error);
            return false;
        }

        return count !== null && count > 0;
    },

    async getActiveAnimals() {
        // Get all entries that don't have a corresponding exit
        const { data: entradas, error: entrError } = await supabase
            .from('apreensoes')
            .select('chip')
            .order('date_in', { ascending: false });

        if (entrError) {
            console.error('Erro ao buscar entradas:', entrError);
            throw entrError;
        }

        const { data: saidas, error: saidError } = await supabase
            .from('saidas')
            .select('chip');

        if (saidError) {
            console.error('Erro ao buscar saídas:', saidError);
            throw saidError;
        }

        // Count exits per chip
        const exitCount: Record<string, number> = {};
        saidas?.forEach(s => {
            exitCount[s.chip] = (exitCount[s.chip] || 0) + 1;
        });

        // Count entries per chip
        const entryCount: Record<string, number> = {};
        entradas?.forEach(e => {
            entryCount[e.chip] = (entryCount[e.chip] || 0) + 1;
        });

        // Get chips that have more entries than exits (active)
        const activeChips = Object.keys(entryCount).filter(chip => {
            const entries = entryCount[chip] || 0;
            const exits = exitCount[chip] || 0;
            return entries > exits;
        });

        return activeChips;
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('saidas')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao excluir saída:', error);
            throw error;
        }
    }
};
