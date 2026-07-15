
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

    async update(id: string, saida: Partial<Saida>) {
        const dbPayload: any = {};
        if (saida.chip !== undefined) dbPayload.chip = saida.chip;
        if (saida.specie !== undefined) dbPayload.specie = saida.specie;
        if (saida.gender !== undefined) dbPayload.gender = saida.gender;
        if (saida.color !== undefined) dbPayload.color = saida.color;
        if (saida.history !== undefined) dbPayload.history = saida.history;
        if (saida.observations !== undefined) dbPayload.observations = saida.observations;
        if (saida.osNumber !== undefined) dbPayload.os_number = saida.osNumber;
        if (saida.dateOut !== undefined) dbPayload.date_out = saida.dateOut;
        if (saida.destination !== undefined) dbPayload.destination = saida.destination;
        if (saida.seiProcess !== undefined) dbPayload.sei_process = saida.seiProcess;
        if (saida.receiverName !== undefined) dbPayload.receiver_name = saida.receiverName;
        if (saida.receiverCpf !== undefined) dbPayload.receiver_cpf = saida.receiverCpf;
        if (saida.autoInfracao !== undefined) dbPayload.auto_infracao = saida.autoInfracao;
        if (saida.autoApreensao !== undefined) dbPayload.auto_apreensao = saida.autoApreensao;

        const { data, error } = await supabase
            .from('saidas')
            .update(dbPayload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Erro ao atualizar saída:', error);
            throw error;
        }

        return data;
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
