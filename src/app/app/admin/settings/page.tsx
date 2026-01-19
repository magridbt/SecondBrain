'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, Plus, Edit2, Trash2, Save, X, Loader2, Upload, Sparkles } from 'lucide-react'

interface Source {
  id: string
  name: string
  description: string
  is_active: boolean
  document_count: number
}

export default function SettingsPage() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [showNew, setShowNew] = useState(false)

  // Avatar settings
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [systemName, setSystemName] = useState('Sri AB Teachings')
  const [systemSubtitle, setSystemSubtitle] = useState('Sri Amma Bhagavan')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingBranding, setSavingBranding] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  useEffect(() => {
    loadSources()
    loadBrandingSettings()
  }, [])

  const loadBrandingSettings = async () => {
    // Carregar configuracoes do localStorage por enquanto
    // Em producao, isso viria de uma tabela system_settings no Supabase
    const savedAvatar = localStorage.getItem('system_avatar_url')
    const savedName = localStorage.getItem('system_name')
    const savedSubtitle = localStorage.getItem('system_subtitle')

    if (savedAvatar) setAvatarUrl(savedAvatar)
    if (savedName) setSystemName(savedName)
    if (savedSubtitle) setSystemSubtitle(savedSubtitle)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    try {
      // Upload para o storage do Supabase
      const fileExt = file.name.split('.').pop()
      const fileName = `system-avatar.${fileExt}`

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (error) throw error

      // Obter URL publica
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const publicUrl = urlData.publicUrl + '?t=' + Date.now() // Cache bust
      setAvatarUrl(publicUrl)
      localStorage.setItem('system_avatar_url', publicUrl)
      // Dispatch custom event to notify Sidebar
      window.dispatchEvent(new Event('brandingUpdated'))
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      alert('Upload error: ' + error.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSaveBranding = () => {
    setSavingBranding(true)
    localStorage.setItem('system_name', systemName)
    localStorage.setItem('system_subtitle', systemSubtitle)
    // Dispatch custom event to notify Sidebar
    window.dispatchEvent(new Event('brandingUpdated'))
    setTimeout(() => {
      setSavingBranding(false)
      alert('Settings saved!')
    }, 500)
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl(null)
    localStorage.removeItem('system_avatar_url')
    // Dispatch custom event to notify Sidebar
    window.dispatchEvent(new Event('brandingUpdated'))
  }

  const loadSources = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('teaching_sources')
      .select('*')
      .order('name')

    if (data) setSources(data)
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return

    await supabase.from('teaching_sources').insert({
      name: newName.trim(),
      description: newDescription.trim() || null,
    })

    setNewName('')
    setNewDescription('')
    setShowNew(false)
    await loadSources()
  }

  const handleEdit = (source: Source) => {
    setEditingId(source.id)
    setEditName(source.name)
    setEditDescription(source.description || '')
  }

  const handleSave = async () => {
    if (!editingId || !editName.trim()) return

    await supabase
      .from('teaching_sources')
      .update({
        name: editName.trim(),
        description: editDescription.trim() || null,
      })
      .eq('id', editingId)

    setEditingId(null)
    await loadSources()
  }

  const handleToggleActive = async (source: Source) => {
    await supabase
      .from('teaching_sources')
      .update({ is_active: !source.is_active })
      .eq('id', source.id)

    await loadSources()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this source?')) return

    await supabase.from('teaching_sources').delete().eq('id', id)
    await loadSources()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Customize the system and manage sources</p>
      </div>

      {/* Branding Section */}
      <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Customization</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Customize the assistant appearance</p>
        </div>

        <div className="p-6">
          <div className="flex flex-wrap gap-8">
            {/* Avatar */}
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">System Avatar</p>
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <Sparkles className="text-white" size={36} />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="animate-spin text-white" size={24} />
                  ) : (
                    <Upload className="text-white" size={24} />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              {avatarUrl && (
                <button
                  onClick={handleRemoveAvatar}
                  className="mt-2 text-xs text-red-500 hover:text-red-600 transition"
                >
                  Remove avatar
                </button>
              )}
              <p className="text-xs text-gray-400 mt-2">Click to change</p>
            </div>

            {/* Name & Subtitle */}
            <div className="flex-1 min-w-[250px] space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  System Name
                </label>
                <input
                  type="text"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="Ex: SecondBrain"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={systemSubtitle}
                  onChange={(e) => setSystemSubtitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="Ex: Teachings of Sri Amma Bhagavan"
                />
              </div>

              <button
                onClick={handleSaveBranding}
                disabled={savingBranding}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                {savingBranding ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Save size={16} />
                )}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sources Section */}
      <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Teaching Sources</h2>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
          >
            <Plus size={16} />
            <span>New Source</span>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="animate-spin mx-auto text-gray-400" size={32} />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* New Source Form */}
            {showNew && (
              <div className="px-6 py-4 bg-green-50">
                <div className="flex flex-wrap gap-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Source name"
                    className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                  <button
                    onClick={handleCreate}
                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                  >
                    <Save size={18} />
                  </button>
                  <button
                    onClick={() => setShowNew(false)}
                    className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Sources List */}
            {sources.map((source) => (
              <div
                key={source.id}
                className={`px-6 py-4 ${!source.is_active ? 'bg-gray-50' : ''}`}
              >
                {editingId === source.id ? (
                  <div className="flex flex-wrap gap-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description"
                      className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                    <button
                      onClick={handleSave}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                    >
                      <Save size={18} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium ${source.is_active ? 'text-gray-800' : 'text-gray-400'}`}>
                          {source.name}
                        </h3>
                        <span className="text-xs text-gray-400">
                          ({source.document_count} docs)
                        </span>
                      </div>
                      {source.description && (
                        <p className="text-sm text-gray-500 mt-1">{source.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(source)}
                        className={`
                          px-3 py-1 rounded-full text-xs font-medium transition
                          ${source.is_active
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                          }
                        `}
                      >
                        {source.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => handleEdit(source)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(source.id)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                        disabled={source.document_count > 0}
                        title={source.document_count > 0 ? 'Remove documents first' : 'Delete'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
