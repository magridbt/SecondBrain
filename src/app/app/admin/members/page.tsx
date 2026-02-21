'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users, UserPlus, Mail, Loader2, Search, Shield, User,
  X, Settings2, ToggleLeft, ToggleRight, Save,
} from 'lucide-react'

interface Member {
  id: string
  email: string
  full_name: string | null
  name: string | null
  role: string
  created_at: string
  deleted_at: string | null
}

interface Invite {
  id: string
  email: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

interface ModulePermission {
  module_id: string
  name: string
  slug: string
  icon: string
  enabled: boolean
  role: string | null
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [sending, setSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Permissions modal
  const [permModalOpen, setPermModalOpen] = useState(false)
  const [permMember, setPermMember] = useState<Member | null>(null)
  const [permModules, setPermModules] = useState<ModulePermission[]>([])
  const [permGlobalRole, setPermGlobalRole] = useState('')
  const [permLoading, setPermLoading] = useState(false)
  const [permSaving, setPermSaving] = useState(false)

  // Remove confirmation
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setInviteRole('member')
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

  const openPermissions = async (member: Member) => {
    setPermMember(member)
    setPermGlobalRole(member.role)
    setPermModalOpen(true)
    setPermLoading(true)

    try {
      const res = await fetch(`/api/admin/members/${member.id}/permissions`)
      const data = await res.json()
      if (data.modules) {
        setPermModules(data.modules)
      }
    } catch {
      setPermModules([])
    } finally {
      setPermLoading(false)
    }
  }

  const savePermissions = async () => {
    if (!permMember) return
    setPermSaving(true)

    try {
      // Update global role if changed
      if (permGlobalRole !== permMember.role) {
        await supabase
          .from('profiles')
          .update({ role: permGlobalRole })
          .eq('id', permMember.id)
      }

      // Update module permissions
      await fetch(`/api/admin/members/${permMember.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: permModules }),
      })

      setPermModalOpen(false)
      setPermMember(null)
      await loadData()
    } catch {
      // silent
    } finally {
      setPermSaving(false)
    }
  }

  const toggleModule = (moduleId: string) => {
    setPermModules(prev =>
      prev.map(m =>
        m.module_id === moduleId
          ? { ...m, enabled: !m.enabled, role: !m.enabled ? 'viewer' : null }
          : m
      )
    )
  }

  const changeModuleRole = (moduleId: string, role: string) => {
    setPermModules(prev =>
      prev.map(m =>
        m.module_id === moduleId ? { ...m, role } : m
      )
    )
  }

  const removeMember = async (memberId: string) => {
    await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', memberId)

    setRemoveConfirm(null)
    await loadData()
  }

  const filteredMembers = members.filter(
    (m) =>
      (m.full_name || m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getMemberInitial = (m: Member) =>
    m.full_name?.[0]?.toUpperCase() || m.name?.[0]?.toUpperCase() || m.email[0].toUpperCase()

  const getMemberName = (m: Member) =>
    m.full_name || m.name || 'Sem nome'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Membros</h1>
        <p className="text-gray-500 dark:text-gray-400">Gerencie membros e suas permissões de acesso</p>
      </div>

      {/* Invite Section */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Convidar Membro</h2>
        <form onSubmit={handleInvite} className="flex flex-wrap gap-4">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@exemplo.com"
            className="flex-1 min-w-[250px] px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none"
            required
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-400 outline-none"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {sending ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
            <span>{sending ? 'Enviando...' : 'Enviar Convite'}</span>
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
            Convites Pendentes ({invites.length})
          </h2>
          <div className="space-y-2">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="text-gray-400" size={18} />
                  <span className="text-gray-700 dark:text-gray-300">{invite.email}</span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
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
          className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none"
        />
      </div>

      {/* Members Cards */}
      {loading ? (
        <div className="p-8 text-center">
          <Loader2 className="animate-spin mx-auto text-gray-400" size={32} />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <Users className="mx-auto mb-2 text-gray-300" size={48} />
          <p>Nenhum membro encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-white">
                    {getMemberInitial(member)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">
                    {getMemberName(member)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
                </div>
                <span className={`
                  inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0
                  ${member.role === 'admin'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }
                `}>
                  {member.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                  {member.role}
                </span>
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                Membro desde {new Date(member.created_at).toLocaleDateString('pt-BR')}
              </p>

              <div className="mt-auto flex gap-2">
                <button
                  onClick={() => openPermissions(member)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition"
                >
                  <Settings2 size={16} />
                  Permissões
                </button>
                <button
                  onClick={() => setRemoveConfirm(member.id)}
                  className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                >
                  Remover
                </button>
              </div>

              {removeConfirm === member.id && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-400 mb-2">
                    Remover {getMemberName(member)}?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => removeMember(member.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setRemoveConfirm(null)}
                      className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Permissions Modal */}
      {permModalOpen && permMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">Permissões</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {getMemberName(permMember)} ({permMember.email})
                </p>
              </div>
              <button
                onClick={() => { setPermModalOpen(false); setPermMember(null) }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Global Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Função Global
                </label>
                <div className="flex gap-2">
                  {['admin', 'member'].map((role) => (
                    <button
                      key={role}
                      onClick={() => setPermGlobalRole(role)}
                      className={`
                        flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition
                        ${permGlobalRole === role
                          ? role === 'admin'
                            ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-600'
                            : 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 dark:border-green-600'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      {role === 'admin' ? <Shield size={16} /> : <User size={16} />}
                      {role === 'admin' ? 'Admin' : 'Member'}
                    </button>
                  ))}
                </div>
                {permGlobalRole === 'admin' && (
                  <p className="mt-2 text-xs text-purple-600 dark:text-purple-400">
                    Admins têm acesso à área de administração.
                  </p>
                )}
              </div>

              {/* Module Access */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Acesso por Módulo
                </label>

                {permLoading ? (
                  <div className="py-8 text-center">
                    <Loader2 className="animate-spin mx-auto text-gray-400" size={24} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {permModules.map((mod) => (
                      <div
                        key={mod.module_id}
                        className={`
                          p-4 rounded-lg border transition
                          ${mod.enabled
                            ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10'
                            : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleModule(mod.module_id)}
                              className="text-gray-600 dark:text-gray-300"
                            >
                              {mod.enabled ? (
                                <ToggleRight size={28} className="text-green-600 dark:text-green-500" />
                              ) : (
                                <ToggleLeft size={28} className="text-gray-400" />
                              )}
                            </button>
                            <div>
                              <p className="font-medium text-gray-800 dark:text-gray-100 text-sm">
                                {mod.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{mod.slug}</p>
                            </div>
                          </div>

                          {mod.enabled && (
                            <select
                              value={mod.role || 'viewer'}
                              onChange={(e) => changeModuleRole(mod.module_id, e.target.value)}
                              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-green-400"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="editor">Editor</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { setPermModalOpen(false); setPermMember(null) }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={savePermissions}
                disabled={permSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {permSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {permSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
