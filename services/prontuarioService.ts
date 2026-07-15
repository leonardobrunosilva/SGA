
import { supabase } from '../supabaseClient';

export interface ProntuarioRecord {
    id: string;
    animal_chip: string;
    type: 'EXAM' | 'OCCURRENCE' | 'DESTINATION';
    date: string;
    title: string;
    subtitle?: string;
    content?: string;
    result?: 'Positivo' | 'Negativo';
    exam_results?: { exam: string; result: string; date?: string }[];
    icon: string;
    created_at?: string;
    veterinario?: string;
}

export const prontuarioService = {
    async getByChip(chip: string) {
        const { data, error } = await supabase
            .from('prontuarios')
            .select('*')
            .eq('animal_chip', chip)
            .order('date', { ascending: false });

        if (error) {
            console.error('Erro ao buscar prontuário:', error);
            throw error;
        }

        return data as ProntuarioRecord[];
    },

    async create(record: Omit<ProntuarioRecord, 'id'>) {
        const { data, error } = await supabase
            .from('prontuarios')
            .insert([record])
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar registro no prontuário:', error);
            throw error;
        }

        return data as ProntuarioRecord;
    },

    async update(id: string, record: Partial<ProntuarioRecord>) {
        const { data, error } = await supabase
            .from('prontuarios')
            .update(record)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Erro ao atualizar registro no prontuário:', error);
            throw error;
        }

        return data as ProntuarioRecord;
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('prontuarios')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erro ao excluir registro no prontuário:', error);
            throw error;
        }
    }
};
