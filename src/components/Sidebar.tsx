'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Settings, Users, FileText, LogOut, Menu, X, Sun, Moon, Activity, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface SidebarProps {
  user: any
  profile: any
}

export default function Sidebar({ user, profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const isAdmin = profile?.role === 'admin'

  // Branding settings from localStorage
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [systemName, setSystemName] = useState('Sri AB Teachings')
  const [systemSubtitle, setSystemSubtitle] = useState('Sri Amma Bhagavan')

  useEffect(() => {
    // Load branding from localStorage
    const savedAvatar = localStorage.getItem('system_avatar_url')
    const savedName = localStorage.getItem('system_name')
    const savedSubtitle = localStorage.getItem('system_subtitle')

    if (savedAvatar) setAvatarUrl(savedAvatar)
    if (savedName) setSystemName(savedName)
    if (savedSubtitle) setSystemSubtitle(savedSubtitle)

    // Listen for branding changes (when settings are updated)
    const handleBrandingUpdate = () => {
      const newAvatar = localStorage.getItem('system_avatar_url')
      const newName = localStorage.getItem('system_name')
      const newSubtitle = localStorage.getItem('system_subtitle')

      setAvatarUrl(newAvatar)
      if (newName) setSystemName(newName)
      if (newSubtitle) setSystemSubtitle(newSubtitle)
    }

    window.addEventListener('storage', handleBrandingUpdate)
    window.addEventListener('brandingUpdated', handleBrandingUpdate)
    return () => {
      window.removeEventListener('storage', handleBrandingUpdate)
      window.removeEventListener('brandingUpdated', handleBrandingUpdate)
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    {
      name: 'Sri AB Teachings',
      href: '/app/chat',
      icon: MessageSquare,
      active: pathname.startsWith('/app/chat'),
    },
    {
      name: 'Daily Teaching',
      href: '/app/daily-teaching',
      icon: Sparkles,
      active: pathname.startsWith('/app/daily-teaching'),
    },
  ]

  const adminItems = [
    {
      name: 'Documents',
      href: '/app/admin/documents',
      icon: FileText,
      active: pathname === '/app/admin/documents',
    },
    {
      name: 'Members',
      href: '/app/admin/members',
      icon: Users,
      active: pathname === '/app/admin/members',
    },
    {
      name: 'Audit & Logs',
      href: '/app/admin/audit',
      icon: Activity,
      active: pathname === '/app/admin/audit',
    },
    {
      name: 'Settings',
      href: '/app/admin/settings',
      icon: Settings,
      active: pathname === '/app/admin/settings',
    },
  ]

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-700 flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Avatar" width={40} height={40} className="w-full h-full object-cover" />
              ) : (
                <Sparkles className="text-white" size={20} />
              )}
            </div>
            <div>
              <h1 className="font-bold text-gray-800 dark:text-gray-100">{systemName}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{systemSubtitle}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 px-3">
            Modules
          </p>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition
                ${item.active
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-500'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }
              `}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}

          {isAdmin && (
            <>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mt-6 mb-3 px-3">
                Admin
              </p>
              {adminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition
                    ${item.active
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-500'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* Theme Toggle */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span className="font-medium">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </div>

        {/* User */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {profile?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                {profile?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
