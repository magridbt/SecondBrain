'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, UserPlus, Mail, Loader2, Search, Shield, User } from 'lucide-react'

interface Member {
  id: string
  email: string
  name: string
  role: string
  created_at: string
}

interface Invite {
  id: string
  email: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)

    const [membersResult, invitesResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('invites')
        .select('*')
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }),
    ])

    if (membersResult.data) setMembers(membersResult.data)
    if (invitesResult.data) setInvites(invitesResult.data)

    setLoading(false)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return

    setSending(true)
    setMessage(null)

    try {
      const token = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { error } = await supabase.from('invites').insert({
        email: inviteEmail,
        token,
        expires_at: expiresAt.toISOString(),
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: `Convite criado! Link: ${window.location.origin}/invite/${token}`,
      })
      setInviteEmail('')
      await loadData()
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Erro ao enviar convite',
      })
    } finally {
      setSending(false)
    }
  }

  const toggleRole = async (member: Member) => {
    const newRole = member.role === 'admin' ? 'member' : 'admin'

    await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', member.id)

    await loadData()
  }

  const filteredMembers = members.filter(
    (m) =>
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Membros</h1>
        <p className="text-gray-500">Gerencie os membros da comunidade</p>
      </div>

      {/* Invite Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Convidar Membro</h2>
        <form onSubmit={handleInvite} className="flex flex-wrap gap-4">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@exemplo.com"
            className="flex-1 min-w-[250px] px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
            required
          />
          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <UserPlus size={20} />
            )}
            <span>{sending ? 'Enviando...' : 'Enviar Convite'}</span>
          </button>
        </form>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">
            Convites Pendentes ({invites.length})
          </h2>
          <div className="space-y-2">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Mail className="text-gray-400" size={18} />
                  <span className="text-gray-700">{invite.email}</span>
                </div>
                <span className="text-sm text-gray-500">
                  Expira em {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar membros..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
        />
      </div>

      {/* Members List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="animate-spin mx-auto text-gray-400" size={32} />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="mx-auto mb-2 text-gray-300" size={48} />
            <p>Nenhum membro encontrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Membro</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Email</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Funcao</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Desde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {member.name?.[0]?.toUpperCase() || member.email[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-gray-800">
                        {member.name || 'Sem nome'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{member.email}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleRole(member)}
                      className={`
                        flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition
                        ${member.role === 'admin'
                          ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }
                      `}
                    >
                      {member.role === 'admin' ? (
                        <Shield size={12} />
                      ) : (
                        <User size={12} />
                      )}
                      {member.role}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(member.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
