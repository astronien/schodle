#!/usr/bin/env node
/**
 * Script to display migration SQL for manual execution in Supabase Dashboard
 *
 * Usage: node scripts/apply-rls-migration.js
 *
 * Then copy the SQL output and run it in Supabase Dashboard > SQL Editor
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('='.repeat(80));
console.log('RLS Migration 016 - Tighten Security Policies');
console.log('='.repeat(80));
console.log();
console.log('⚠️  WARNING: This migration will:');
console.log('   1. Drop permissive "Allow write" policies');
console.log('   2. Create restrictive read/write policies based on user role');
console.log('   3. Create RPC wrapper functions for common operations');
console.log();
console.log('📋 INSTRUCTIONS:');
console.log('   1. Go to Supabase Dashboard > SQL Editor');
console.log('   2. Click "New Query"');
console.log('   3. Copy the SQL below and paste it');
console.log('   4. Click "Run" to execute');
console.log();
console.log('='.repeat(80));
console.log('SQL TO EXECUTE:');
console.log('='.repeat(80));
console.log();

const migrationPath = join(__dirname, '../supabase/migrations/016_tighten_rls_policies.sql');
const sql = readFileSync(migrationPath, 'utf-8');

console.log(sql);

console.log();
console.log('='.repeat(80));
console.log('✅ After running this migration:');
console.log('   - Employees can only read their own schedules + approved schedules');
console.log('   - Managers can read/write everything');
console.log('   - All write operations require session context (set by Edge Functions)');
console.log('   - Direct table writes from client will be blocked');
console.log();
console.log('⚠️  IMPORTANT: You must also update client-side code to use RPC functions');
console.log('   or Edge Functions for write operations.');
console.log('='.repeat(80));
