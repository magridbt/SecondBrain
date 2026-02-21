'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setError('Verifique seu email para confirmar o cadastro.')
        return
      }
      // Usar navegação completa (full page reload) para garantir que os cookies
      // de sessão SSR sejam propagados antes do middleware server-side validar a auth.
      // router.push() causa race condition: navega antes dos cookies serem setados.
      window.location.href = '/app/chat'
    } catch (err: any) {
      console.error('LOGIN ERROR:', err)
      setError(`Erro: ${err.message} (código: ${err.status || err.code || 'desconhecido'})`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F6F2]">
      <div className="w-full max-w-md p-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-amber-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl">🙏</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Sri AB Teachings</h1>
            <p className="text-gray-500 mt-1">Sri Amma Bhagavan</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className={`p-3 rounded-lg text-sm ${error.includes('Verifique') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-amber-500 text-white font-medium rounded-lg hover:from-green-600 hover:to-amber-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Carregando...' : mode === 'login' ? 'Entrar' : 'Cadastrar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm text-green-700 hover:text-orange-700"
            >
              {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Comunidade Oneness
        </p>
      </div>
    </div>
  )
}
