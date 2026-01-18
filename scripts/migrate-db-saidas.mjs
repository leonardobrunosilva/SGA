/**
 * Migration Script: Import DB_SAIDAS into Supabase saidas table
 * 
 * Run with: node scripts/migrate-db-saidas.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { DB_SAIDAS } from '../src/data/db_saidas.js';

// Supabase connection
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
 * Map DB_SAIDAS fields to saidas table columns
 */
function mapExitToSaida(entry) {
    return {
        chip: String(entry['CHIP'] || ''),
        specie: entry['Especie'] || null,
        gender: entry['Sexo'] || null,
        color: entry['Pelagem'] || null,
        history: entry['Histórico'] || null,
        observations: entry['Observações Complementares'] || null,
        os_number: entry['Ordem de Serviço (OS)'] || null,
        date_out: parseDateBR(entry['Data de Saída']),
        destination: entry['Destinação'] || null,
        sei_process: entry['Número do Processo SEI'] || null
    };
}

async function migrate() {
    console.log(`\n🚀 Starting migration of ${DB_SAIDAS.length} exit records...\n`);

    // Process in batches of 100 to avoid timeouts
    const BATCH_SIZE = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < DB_SAIDAS.length; i += BATCH_SIZE) {
        const batch = DB_SAIDAS.slice(i, i + BATCH_SIZE);
        const mappedBatch = batch.map(mapExitToSaida);

        const { data, error } = await supabase
            .from('saidas')
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
