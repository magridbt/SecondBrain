const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function assignModuleAccess() {
  // Get the module
  const { data: module } = await supabase
    .from('modules')
    .select('id')
    .eq('slug', 'sri-ab-teachings')
    .single()

  if (!module) {
    console.log('Module not found')
    return
  }

  console.log('Module ID:', module.id)

  // Get all profiles
  const { data: profiles } = await supabase.from('profiles').select('id, email, role')
  console.log('Profiles:', profiles)

  if (!profiles || profiles.length === 0) {
    console.log('No profiles found')
    return
  }

  // Assign access based on role
  for (const profile of profiles) {
    const moduleRole = profile.role === 'admin' ? 'admin' : 'viewer'

    const { error } = await supabase
      .from('user_modules')
      .upsert({
        user_id: profile.id,
        module_id: module.id,
        role: moduleRole
      }, { onConflict: 'user_id,module_id' })

    if (error) {
      console.log('Error for', profile.email, ':', error.message)
    } else {
      console.log('Assigned', moduleRole, 'to', profile.email)
    }
  }

  // Verify
  const { data: userMods } = await supabase
    .from('user_modules')
    .select('*, profiles(email), modules(name)')
  console.log('\n=== FINAL USER MODULES ===')
  console.log(JSON.stringify(userMods, null, 2))
}

assignModuleAccess().catch(console.error)
