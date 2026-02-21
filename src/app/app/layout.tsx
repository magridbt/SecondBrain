import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppLayoutClient from '@/components/AppLayoutClient'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch user module slugs for sidebar filtering
  let userModuleSlugs: string[] = []
  try {
    const adminClient = createAdminClient()
    const { data: userMods } = await adminClient
      .from('user_modules')
      .select('module_id, role, modules(slug)')
      .eq('user_id', user.id)

    userModuleSlugs = userMods?.map((um: any) => um.modules?.slug).filter(Boolean) || []
  } catch {
    // Fallback if modules table doesn't exist yet
  }

  return (
    <AppLayoutClient user={user} profile={profile} userModuleSlugs={userModuleSlugs}>
      {children}
    </AppLayoutClient>
  )
}
