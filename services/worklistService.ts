import { supabase } from '../supabaseClient';
import { WorklistItem, WorklistRestituicao, WorklistOutros } from '../types';

// Generic helper to get items with joined animal data
const getWorklistItems = async (table: string) => {
    // Note: Assuming the foreign key in Supabase is set up such that we can query 'animal:apreensoes(*)'
    // If the relation name is different (e.g., 'apreensoes' without alias, or 'entradas'), this might need adjustment.
    // Based on user prompt: "supabase.from('worklist_restituicao').select('*, animal:entradas(*)')"
    // I will use 'animal:apreensoes(*)' since the main table seems to be 'apreensoes' in the code.
    // IF THIS FAILS, I will try 'animal:entradas(*)' or just 'apreensoes(*)'.

    // User specifically asked for: animal:entradas(*)
    // But our table is 'apreensoes'. I will try 'animal:apreensoes(*)' first as it matches the table name known in the code.
    const { data, error } = await supabase
        .from(table)
        .select('*, animal:apreensoes(*)');

    if (error) {
        console.error(`Erro ao buscar itens de ${table}:`, error);
        throw error;
    }
    return data;
};

export const adocaoService = {
    async getAll() {
        return getWorklistItems('worklist_adocao');
    },
    async add(animalId: string, status: string, observations: string) {
        const { data, error } = await supabase
            .from('worklist_adocao')
            .insert([{ animal_id: animalId, status, observations }])
            .select('*, animal:apreensoes(*)')
            .single();

        if (error) throw error;
        return data;
    },
    async update(id: string, updates: Partial<WorklistItem>) {
        const { data, error } = await supabase
            .from('worklist_adocao')
            .update(updates)
            .eq('id', id)
            .select('*, animal:apreensoes(*)')
            .single();

        if (error) throw error;
        return data;
    },
    async remove(id: string) {
        const { error } = await supabase.from('worklist_adocao').delete().eq('id', id);
        if (error) throw error;
    }
};

export const restituicaoService = {
    async getAll() {
        return getWorklistItems('worklist_restituicao');
    },
    async add(animalId: string, status: string, observations: string) {
        const { data, error } = await supabase
            .from('worklist_restituicao')
            .insert([{ animal_id: animalId, status, observations }])
            .select('*, animal:apreensoes(*)')
            .single();

        if (error) throw error;
        return data;
    },
    async update(id: string, updates: Partial<WorklistRestituicao>) {
        const { data, error } = await supabase
            .from('worklist_restituicao')
            .update(updates)
            .eq('id', id)
            .select('*, animal:apreensoes(*)')
            .single();

        if (error) throw error;
        return data;
    },
    async remove(id: string) {
        const { error } = await supabase.from('worklist_restituicao').delete().eq('id', id);
        if (error) throw error;
    }
};

export const outrosOrgaosService = {
    async getAll() {
        return getWorklistItems('worklist_outros');
    },
    async add(animalId: string, status: string, observations: string, organDestination?: string) {
        const { data, error } = await supabase
            .from('worklist_outros')
            .insert([{
                animal_id: animalId,
                status,
                observations,
                organ_destination: organDestination
            }])
            .select('*, animal:apreensoes(*)')
            .single();

        if (error) throw error;
        return data;
    },
    async update(id: string, updates: Partial<WorklistOutros>) {
        const { data, error } = await supabase
            .from('worklist_outros')
            .update(updates)
            .eq('id', id)
            .select('*, animal:apreensoes(*)')
            .single();

        if (error) throw error;
        return data;
    },
    async remove(id: string) {
        const { error } = await supabase.from('worklist_outros').delete().eq('id', id);
        if (error) throw error;
    }
};
