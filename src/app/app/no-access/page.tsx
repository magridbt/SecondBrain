'use client'

import { Lock, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function NoAccessPage() {
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {})
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-gold-100 dark:bg-gold-900/30 rounded-full mx-auto mb-6 flex items-center justify-center">
          <Lock className="w-10 h-10 text-gold-600 dark:text-gold-400" />
        </div>

        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
          No Module Access
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          You don&apos;t have access to any modules yet. Please contact an administrator to request access.
        </p>

        <div className="p-4 bg-gold-50 dark:bg-gold-900/20 rounded-xl border border-gold-200 dark:border-gold-700 mb-6">
          <p className="text-sm text-gold-700 dark:text-gold-400">
            An administrator can grant you access to specific modules through the Members management page.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-3 mx-auto bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
