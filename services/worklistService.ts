import { supabase } from '../supabaseClient';
import { WorklistItem, WorklistRestituicao, WorklistOutros, Animal } from '../types';

// Helper to manually join animal data
const enrichWithAnimalData = async (worklistItems: any[]) => {
    if (!worklistItems || worklistItems.length === 0) return [];

    const animalIds = worklistItems.map(item => item.animal_id);

    // Fetch animals manually
    const { data: animals, error } = await supabase
        .from('apreensoes')
        .select(`
            *,
            dateIn:date_in,
            timeIn:time_in,
            osNumber:os_number,
            mapsUrl:maps_url,
            daysIn:days_in,
            imageUrl:image_url
        `)
        .in('id', animalIds);

    if (error) {
        console.error("Erro ao buscar detalhes dos animais:", error);
        // Return items without animal details or throw? 
        // Better to return partial data than crash, but user needs details.
        // Let's attach what we have.
    }

    const animalMap = new Map(animals?.map(a => [a.id, a]));

    return worklistItems.map(item => ({
        ...item,
        animal: animalMap.get(item.animal_id) || undefined
    }));
};

// Generic helper to get items (now with manual join)
const getWorklistItems = async (table: string) => {
    const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: true }); // Ensure stable sorting

    if (error) {
        console.error(`Erro ao buscar itens de ${table}:`, error);
        throw error;
    }

    return await enrichWithAnimalData(data);
};

export const adocaoService = {
    async getAll() {
        return getWorklistItems('worklist_adocao');
    },
    async add(animalId: string, status: string, observations: string) {
        const { data, error } = await supabase
            .from('worklist_adocao')
            .insert([{ animal_id: animalId, status, observations }])
            .select('*')
            .single();

        if (error) throw error;

        // Fetch single animal to return complete object
        const enriched = await enrichWithAnimalData([data]);
        return enriched[0];
    },
    async update(id: string, updates: Partial<WorklistItem>) {
        const { data, error } = await supabase
            .from('worklist_adocao')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;

        const enriched = await enrichWithAnimalData([data]);
        return enriched[0];
    },
    async completeAdocao(worklistId: string, animalData: any, formData: any) {
        // 1. Create entry in saidas (History)
        const saidaPayload = {
            chip: animalData.chip,
            specie: animalData.specie,
            gender: animalData.gender,
            color: animalData.color,
            date_out: formData.dataAdocao || new Date().toISOString().split('T')[0],
            sei_process: formData.seiProcess,
            destination: formData.status || 'Adoção',
            receiver_name: formData.adotanteNome,
            receiver_cpf: formData.adotanteCpf,
            termo_adocao: formData.termoAdocao,
            observations: formData.observations,
            history: 'Processo de Adoção concluído'
        };

        const { error: insertError } = await supabase
            .from('saidas')
            .insert([saidaPayload]);

        if (insertError) throw insertError;

        // 2. Remove from worklist
        const { error: deleteError } = await supabase
            .from('worklist_adocao')
            .delete()
            .eq('id', worklistId);

        if (deleteError) throw deleteError;
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
            .select('*')
            .single();

        if (error) throw error;

        const enriched = await enrichWithAnimalData([data]);
        return enriched[0];
    },
    async update(id: string, data: any) {
        // Strict mapping to database columns
        const payload: any = {
            status: data.status,
            observations: data.observations, // Corrected column name
            contato_realizado: !!data.contato_realizado // Ensure boolean
        };

        const { error } = await supabase
            .from('worklist_restituicao')
            .update(payload)
            .eq('id', id);

        if (error) throw error;
    },
    async completeRestituicao(worklistId: string, animalData: any, lowData: any) {
        // 1. Create entry in saidas (Destinations history)
        const saidaPayload = {
            chip: animalData.chip,
            specie: animalData.specie,
            gender: animalData.gender,
            color: animalData.color,
            date_out: lowData.exitDate,
            sei_process: lowData.seiProcess,
            destination: lowData.status || 'Restituído',
            receiver_name: lowData.receiverName,
            receiver_cpf: lowData.receiverCpf,
            auto_infracao: lowData.autoInfracao,
            auto_apreensao: lowData.autoApreensao,
            observations: lowData.observations,
            history: 'Baixa via Restituição'
        };

        const { error: insertError } = await supabase
            .from('saidas')
            .insert([saidaPayload]);

        if (insertError) throw insertError;

        // 2. Remove from worklist
        const { error: deleteError } = await supabase
            .from('worklist_restituicao')
            .delete()
            .eq('id', worklistId);

        if (deleteError) throw deleteError;
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
            .select('*')
            .single();

        if (error) throw error;

        const enriched = await enrichWithAnimalData([data]);
        return enriched[0];
    },
    async update(id: string, updates: Partial<WorklistOutros>) {
        const { data, error } = await supabase
            .from('worklist_outros')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;

        const enriched = await enrichWithAnimalData([data]);
        return enriched[0];
    },
    async remove(id: string) {
        const { error } = await supabase.from('worklist_outros').delete().eq('id', id);
        if (error) throw error;
    }
};
