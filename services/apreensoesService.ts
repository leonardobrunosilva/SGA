
import { supabase } from '../supabaseClient';
import { Animal } from '../types';

export const apreensoesService = {
    async getApreensoes() {
        const { data, error } = await supabase
            .from('apreensoes')
            .select(`
        *,
        dateIn:date_in,
        timeIn:time_in,
        osNumber:os_number,
        mapsUrl:maps_url,
        daysIn:days_in,
        imageUrl:image_url,
        classification
      `)
            .order('date_in', { ascending: false })
            .range(0, 4999);

        if (error) {
            console.error('Erro ao buscar apreensões:', error);
            throw error;
        }

        return data as Animal[];
    },

    async getByChip(chip: string) {
        const { data, error } = await supabase
            .from('apreensoes')
            .select(`
                *,
                dateIn:date_in,
                timeIn:time_in,
                osNumber:os_number,
                mapsUrl:maps_url,
                daysIn:days_in,
                imageUrl:image_url,
                classification
            `)
            .eq('chip', chip)
            .order('date_in', { ascending: false })
            .range(0, 4999);

        if (error) {
            console.error('Erro ao buscar por CHIP:', error);
            throw error;
        }

        return data as Animal[];
    },

    async createApreensao(animal: Omit<Animal, 'id'>) {
        const dbPayload = {
            chip: animal.chip,
            // name removed
            specie: animal.specie,
            breed: animal.breed,
            gender: animal.gender,
            color: animal.color,
            status: animal.status,
            origin: animal.origin,
            date_in: animal.dateIn,
            time_in: animal.timeIn,
            observations: animal.observations,
            image_url: animal.imageUrl,
            organ: animal.organ,
            os_number: animal.osNumber,
            maps_url: animal.mapsUrl,
            days_in: animal.daysIn,
            classification: animal.classification
        };

        const { data, error } = await supabase
            .from('apreensoes')
            .insert([dbPayload])
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar apreensão:', error);
            throw error;
        }

        return data;
    },

    async uploadPhoto(file: File) {
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
        const { data, error } = await supabase.storage
            .from('animals')
            .upload(fileName, file);

        if (error) {
            console.error('Erro ao fazer upload da imagem:', error);
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('animals')
            .getPublicUrl(fileName);

        return publicUrl;
    },

    async updateApreensao(id: string, animal: Partial<Animal>) {
        const dbPayload: any = {};
        if (animal.chip !== undefined) dbPayload.chip = animal.chip;
        if (animal.specie !== undefined) dbPayload.specie = animal.specie;
        if (animal.breed !== undefined) dbPayload.breed = animal.breed;
        if (animal.gender !== undefined) dbPayload.gender = animal.gender;
        if (animal.color !== undefined) dbPayload.color = animal.color;
        if (animal.status !== undefined) dbPayload.status = animal.status;
        if (animal.origin !== undefined) dbPayload.origin = animal.origin;
        if (animal.dateIn !== undefined) dbPayload.date_in = animal.dateIn;
        if (animal.timeIn !== undefined) dbPayload.time_in = animal.timeIn;
        if (animal.observations !== undefined) dbPayload.observations = animal.observations;
        if (animal.imageUrl !== undefined) dbPayload.image_url = animal.imageUrl;
        if (animal.organ !== undefined) dbPayload.organ = animal.organ;
        if (animal.osNumber !== undefined) dbPayload.os_number = animal.osNumber;
        if (animal.mapsUrl !== undefined) dbPayload.maps_url = animal.mapsUrl;
        if (animal.daysIn !== undefined) dbPayload.days_in = animal.daysIn;
        if (animal.classification !== undefined) dbPayload.classification = animal.classification;
        if (animal.seiProcess !== undefined) dbPayload.sei_process = animal.seiProcess;

        const { data, error } = await supabase
            .from('apreensoes')
            .update(dbPayload)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Erro ao atualizar apreensão:', error);
            throw error;
        }

        return data;
    },

    async checkRecurrence(chip: string) {
        const { count, error } = await supabase
            .from('apreensoes')
            .select('*', { count: 'exact', head: true })
            .eq('chip', chip);

        if (error) {
            console.error('Erro ao verificar reincidência:', error);
            // Return 0 if error to avoid blocking UI, but log it
            return { count: 0, lastOwner: null, lastDate: null, seiProcess: null };
        }

        let lastOwner = null;
        let lastDate = null;
        let seiProcess = null;

        if (count && count > 0) {
            // Fetch the latest entry to get details
            const { data: latest } = await supabase
                .from('apreensoes')
                .select('created_at, date_in, sei_process')
                .eq('chip', chip)
                .order('date_in', { ascending: false })
                .limit(1)
                .single();

            if (latest) {
                lastDate = latest.date_in;
                seiProcess = latest.sei_process;
            }
        }

        return { count: count || 0, lastOwner, lastDate, seiProcess };
    },

    async delete(id: string) {
        // Log para debug
        console.log('Tentando deletar ID:', id);

        const { error, count } = await supabase
            .from('apreensoes')
            .delete({ count: 'exact' }) // Solicita contagem de afetados
            .eq('id', id);

        if (error) {
            console.error('Erro do Supabase ao excluir:', error);
            throw error;
        }

        // Se nenhum registro for deletado (ex: ID errado ou bloqueio de RLS silencioso)
        if (count === 0) {
            const msg = 'Nenhum registro foi excluído. Verifique permissões (RLS) ou se o ID existe.';
            console.warn(msg);
            throw new Error(msg);
        }
    }
};
