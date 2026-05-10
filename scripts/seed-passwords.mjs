/**
 * Seed default passwords for existing employees.
 * Default password = employee_code (hashed with bcrypt)
 *
 * Usage:
 *   node scripts/seed-passwords.mjs
 *
 * Requires:
 *   - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
 *   - npm install @supabase/supabase-js bcryptjs
 */
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env manually (no dotenv dependency)
const envPath = resolve(process.cwd(), '.env');
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length && !key.startsWith('#')) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
} catch {
  // .env may not exist, rely on process.env
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env or environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedPasswords() {
  console.log('Fetching employees without password_hash...');

  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, employee_code')
    .is('password_hash', null);

  if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
  }

  if (!employees || employees.length === 0) {
    console.log('All employees already have password_hash set. Nothing to do.');
    return;
  }

  console.log(`Found ${employees.length} employees to update.`);

  for (const emp of employees) {
    const hash = bcrypt.hashSync(emp.employee_code, 10);
    const { error: updateError } = await supabase
      .from('employees')
      .update({ password_hash: hash })
      .eq('id', emp.id);

    if (updateError) {
      console.error(`Failed to update ${emp.employee_code}:`, updateError.message);
    } else {
      console.log(`Updated ${emp.employee_code} -> OK`);
    }
  }

  console.log('Done!');
}

seedPasswords();
