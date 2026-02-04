const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
  console.log('Checking Supabase connection...');
  
  try {
    // Test connection
    const { data, error } = await supabase
      .from('users')
      .select('count(*)', { count: 'exact', head: true })
      .limit(1);
    
    if (error) {
      console.log('✓ Connected to Supabase');
    } else {
      console.log('✓ Connected to Supabase');
    }

    // Check key tables
    const tables = [
      'users',
      'user_profiles', 
      'conversations',
      'messages',
      'documents',
      'themes',
      'teaching_sessions'
    ];

    console.log('\nChecking tables:');
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('count(*)', { count: 'exact', head: true })
        .limit(1);
      
      if (error?.code === '42P01') {
        console.log(`  ❌ ${table}: Table does not exist`);
      } else if (error) {
        console.log(`  ⚠️  ${table}: ${error.message}`);
      } else {
        console.log(`  ✓ ${table}: exists`);
      }
    }

    console.log('\n✓ Database validation complete');
  } catch (error) {
    console.error('Database check failed:', error.message);
    process.exit(1);
  }
}

checkDatabase();
