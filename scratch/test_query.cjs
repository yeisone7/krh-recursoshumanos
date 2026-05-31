const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value;
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('SUPABASE_URL:', SUPABASE_URL);

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  const tokenParam = 'ac470d82-42b9-4fd0-a243-66171ecd3e28'; // The recent token we found

  console.log('\n--- Querying self_registration_tokens as Anon ---');
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
