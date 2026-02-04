'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if we have a valid session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Invalid or expired link. Please request a new recovery link.')
      }
    }
    checkSession()
  }, [supabase.auth])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push('/app')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Error resetting password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gold-50 to-slate-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gold-200/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gold-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-fadeIn">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-[2rem] shadow-2xl p-8 border border-gold-100/50 dark:border-gold-800/30"
             style={{ boxShadow: '0 25px 60px -12px rgba(214, 183, 95, 0.2)' }}>
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full mx-auto mb-5 flex items-center justify-center shadow-gold-lg">
              <span className="text-4xl">🔐</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-gray-800 dark:text-gray-100">Reset Password</h1>
            <p className="text-gold-600 dark:text-gold-400 mt-2 font-medium">Enter your new password</p>
          </div>

          {success ? (
            <div className="text-center animate-fadeIn">
              <div className="p-4 bg-gold-50 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 rounded-xl border border-gold-200 dark:border-gold-800 mb-4">
                Password reset successfully! Redirecting...
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="animate-slideUp" style={{ animationDelay: '0.1s' }}>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-gold-400 dark:focus:ring-gold-600 focus:border-transparent outline-none transition-all duration-300 text-gray-900 dark:text-gray-100"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <div className="animate-slideUp" style={{ animationDelay: '0.15s' }}>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-gold-400 dark:focus:ring-gold-600 focus:border-transparent outline-none transition-all duration-300 text-gray-900 dark:text-gray-100"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="p-4 rounded-xl text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 animate-fadeIn">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-600 hover:to-gold-500 text-white font-semibold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-gold-lg hover:shadow-gold-xl transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {loading ? 'Saving...' : 'Save New Password'}
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-sm text-gold-600 hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300 font-medium transition-colors"
            >
              Back to login
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-8 font-medium">
          Oneness Community
        </p>
      </div>
    </div>
  )
}
