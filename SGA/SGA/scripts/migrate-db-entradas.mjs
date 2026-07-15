/**
 * Migration Script: Import DB_ENTRADAS into Supabase apreensoes table
 * 
 * Run with: node scripts/migrate-db-entradas.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { DB_ENTRADAS } from '../src/data/db_entradas.js';

// Supabase connection (use environment variables in production)
const SUPABASE_URL = 'https://nimgytelelwygeiqxajh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbWd5dGVsZWx3eWdlaXF4YWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NjczMDcsImV4cCI6MjA4NDI0MzMwN30.9dGCRmaTn4YEK2rnu13akKPq6WspY_3fOw255bWTfxU';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Parse Brazilian date format (DD/MM/YYYY) to ISO format (YYYY-MM-DD)
 */
function parseDateBR(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

/**
 * Map DB_ENTRADAS fields to apreensoes table columns
 */
function mapEntryToApreensao(entry) {
    return {
        chip: String(entry['CHIP'] || ''),
        specie: entry['Espécie'] || null,
        gender: entry['Sexo'] || null,
        color: entry['Pelagem'] || null,
        origin: entry['Região Administrativa'] || null,
        organ: entry['Órgão'] || null,
        date_in: parseDateBR(entry['Data de Entrada']),
        time_in: entry['Hora da Entrada'] || null,
        observations: entry['Observações Complementares'] || null,
        os_number: entry['Ordem de Serviço (OS)'] || null,
        status: 'Em Custódia',
        breed: 'SRD'
    };
}

async function migrate() {
    console.log(`\n🚀 Starting migration of ${DB_ENTRADAS.length} records...\n`);

    // Process in batches of 100 to avoid timeouts
    const BATCH_SIZE = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < DB_ENTRADAS.length; i += BATCH_SIZE) {
        const batch = DB_ENTRADAS.slice(i, i + BATCH_SIZE);
        const mappedBatch = batch.map(mapEntryToApreensao);

        const { data, error } = await supabase
            .from('apreensoes')
            .insert(mappedBatch);

        if (error) {
            console.error(`❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error.message);
            errorCount += batch.length;
        } else {
            successCount += batch.length;
            console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} records inserted`);
        }
    }

    console.log(`\n📊 Migration complete!`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
}

migrate().catch(console.error);
