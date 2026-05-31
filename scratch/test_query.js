import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('SUPABASE_URL:', SUPABASE_URL);

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  const tokenParam = 'ac470d82-42b9-4fd0-a243-66171ecd3e28'; // The recent token we found

  console.log('\n--- Querying as Anon ---');
  const { data: dataAnon, error: errorAnon } = await supabaseAnon
    .from('self_registration_tokens')
    .select('*')
    .eq('token', tokenParam)
    .single();

  if (errorAnon) {
    console.error('Anon Error:', errorAnon);
  } else {
    console.log('Anon Data:', dataAnon);
  }

  // Let's also check if we can query the company from anon
  if (dataAnon) {
    console.log('\n--- Querying Company as Anon ---');
    const { data: dataCompany, error: errorCompany } = await supabaseAnon
      .from('companies')
      .select('name, logo_url')
      .eq('id', dataAnon.company_id)
      .single();

    if (errorCompany) {
      console.error('Company Error:', errorCompany);
    } else {
      console.log('Company Data:', dataCompany);
    }
  }
}

run().catch(console.error);
