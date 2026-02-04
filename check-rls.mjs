import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Check RLS policies
const { data: policies, error } = await supabase.rpc('get_policies_for_table', { 
  table_name: 'conversations' 
}).catch(() => ({ data: null, error: 'RPC not available' }));

if (error) {
  console.log('Checking policies via pg_policies...');
  
  // Alternative: query pg_policies directly
  const { data, error: pgErr } = await supabase
    .from('pg_policies')
    .select('*')
    .or('tablename.eq.conversations,tablename.eq.messages');
  
  if (pgErr) {
    console.log('Cannot query policies directly');
    console.log('Let me check if UPDATE is allowed...');
  } else {
    console.log('Policies:', data);
  }
}

// Let's check if there's an issue with the messages table schema
const { data: schema, error: schemaErr } = await supabase
  .rpc('get_table_columns', { tbl: 'messages' })
  .catch(() => ({ data: null, error: 'RPC not available' }));

console.log('\nLet me try a simulated delete as a regular user would...');

// Simulate what the API does
const testUserId = 'c1b13a03-411a-4c3c-a9ce-474d7c55f7db';
const { data: userConv } = await supabase
  .from('conversations')
  .select('id')
  .eq('user_id', testUserId)
  .is('deleted_at', null)
  .limit(1)
  .single();

console.log('User conversation:', userConv);
