'use client'

import { usePathname, useRouter } from 'next/navigation'
import { MessageSquare, Sparkles, Share2, FileText, Users, Activity, Settings, Sun, Moon, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/contexts/ThemeContext'

interface AppLayoutClientProps {
  user: any
  profile: any
  children: React.ReactNode
}

export default function AppLayoutClient({ user, profile, children }: AppLayoutClientProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { theme, toggleTheme } = useTheme()
  const isAdmin = profile?.role === 'admin'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const modules = [
    {
      name: 'Ensinamentos Sri AB',
      shortName: 'Sri AB',
      href: '/app/chat',
      icon: MessageSquare,
      active: pathname.startsWith('/app/chat'),
    },
    {
      name: 'Ensinamento Diário',
      shortName: 'Diário',
      href: '/app/daily-teaching',
      icon: Sparkles,
      active: pathname.startsWith('/app/daily-teaching'),
    },
    {
      name: 'Redes Sociais',
      shortName: 'Redes',
      href: '/app/social-media',
      icon: Share2,
      active: pathname.startsWith('/app/social-media'),
    },
  ]

  const adminItems = [
    { name: 'Documentos', href: '/app/admin/documents', icon: FileText },
    { name: 'Membros', href: '/app/admin/members', icon: Users },
    { name: 'Auditoria', href: '/app/admin/audit', icon: Activity },
    { name: 'Config', href: '/app/admin/settings', icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-800">
      {/* Module Navigation Bar - Left */}
      <aside className="w-16 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 flex-shrink-0">
        {/* Modules */}
        <div className="flex flex-col items-center gap-2 flex-1">
          {modules.map((mod) => (
            <button
              key={mod.href}
              onClick={() => router.push(mod.href)}
              className={`
                w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group relative
                ${mod.active
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 shadow-sm'
                  : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
              title={mod.name}
            >
              <mod.icon size={20} />
              {/* Active indicator */}
              {mod.active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1.5 h-6 bg-green-500 rounded-r-full" />
              )}
              {/* Tooltip */}
              <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {mod.name}
              </div>
            </button>
          ))}

          {/* Divider */}
          {isAdmin && (
            <>
              <div className="w-8 h-px bg-gray-200 dark:bg-gray-700 my-2" />
              {adminItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`
                    w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 group relative
                    ${pathname === item.href
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 shadow-sm'
                      : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300'
                    }
                  `}
                  title={item.name}
                >
                  <item.icon size={18} />
                  {/* Tooltip */}
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.name}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Bottom: Theme + User */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={toggleTheme}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-all group relative"
            title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all group relative"
            title="Sair"
          >
            <LogOut size={18} />
            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              Sair
            </div>
          </button>
        </div>
      </aside>

      {/* Module Content - Full Width */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
