'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ArrowLeft,
  Save,
  X,
  Eye,
  EyeOff,
  Zap,
  Heart,
  Brain,
  Share2,
  Star,
  MessageSquare,
  BookOpen,
  Lightbulb,
  Target,
  Flame,
  Feather,
  Copy,
  Check,
  Link,
  MoreHorizontal,
  MessageCircle,
  ExternalLink,
  Globe,
  Bot,
  Upload,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface PromptsManagerProps {
  category: string
  title: string
  backPath: string
}

type CreationMode = 'choose' | 'scratch' | 'import' | 'upload'

interface CustomPrompt {
  id: string
  name: string
  slug: string
  description: string
  system_prompt: string
  icon: string
  color: string
  is_active: boolean
  is_public: boolean
  is_owner: boolean
  usage_count: number
  conversation_starters: string[]
  ai_provider: string
  source_url: string | null
  created_at: string
}

const AI_PROVIDERS = [
  { id: 'claude', name: 'Claude', color: 'from-orange-400 to-orange-600', description: 'Anthropic - Excelente em analise e escrita' },
  { id: 'chatgpt', name: 'ChatGPT', color: 'from-green-500 to-emerald-600', description: 'OpenAI - Versatil e criativo' },
  { id: 'gemini', name: 'Gemini', color: 'from-blue-400 to-blue-600', description: 'Google - Rapido e multimodal' },
]

const ICONS = [
  { name: 'sparkles', icon: Sparkles, label: 'Sparkles' },
  { name: 'heart', icon: Heart, label: 'Heart' },
  { name: 'brain', icon: Brain, label: 'Brain' },
  { name: 'share-2', icon: Share2, label: 'Share' },
  { name: 'star', icon: Star, label: 'Star' },
  { name: 'message-square', icon: MessageSquare, label: 'Message' },
  { name: 'book-open', icon: BookOpen, label: 'Book' },
  { name: 'lightbulb', icon: Lightbulb, label: 'Idea' },
  { name: 'target', icon: Target, label: 'Target' },
  { name: 'flame', icon: Flame, label: 'Flame' },
  { name: 'feather', icon: Feather, label: 'Feather' },
  { name: 'zap', icon: Zap, label: 'Zap' },
]

const COLORS = [
  { name: 'sage', bg: 'bg-sage-500', text: 'Green' },
  { name: 'blue', bg: 'bg-blue-500', text: 'Blue' },
  { name: 'purple', bg: 'bg-purple-500', text: 'Purple' },
  { name: 'rose', bg: 'bg-rose-500', text: 'Rose' },
  { name: 'gold', bg: 'bg-gold-500', text: 'Gold' },
  { name: 'orange', bg: 'bg-orange-500', text: 'Orange' },
]

const getIconComponent = (iconName: string) => {
  const found = ICONS.find(i => i.name === iconName)
  return found ? found.icon : Sparkles
}

const getColorClass = (colorName: string) => {
  const found = COLORS.find(c => c.name === colorName)
  return found ? found.bg : 'bg-sage-500'
}

export default function PromptsManagerPage({ category, title, backPath }: PromptsManagerProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [prompts, setPrompts] = useState<CustomPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Edit/Create modal state
  const [showModal, setShowModal] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null)
  const [creationMode, setCreationMode] = useState<CreationMode>('choose')

  // Menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_prompt: '',
    icon: 'sparkles',
    color: 'sage',
    is_public: false,
    conversation_starters: ['', '', '', ''],
    ai_provider: 'claude',
    source_url: '',
  })

  useEffect(() => {
    loadPrompts()
  }, [category])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const loadPrompts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/prompts?includePublic=false&category=${category}`)
      const data = await response.json()
      if (data.prompts) {
        setPrompts(data.prompts)
      }
    } catch (error) {
      console.error('Error loading prompts:', error)
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingPrompt(null)
    setCreationMode('choose')
    setFormData({
      name: '',
      description: '',
      system_prompt: '',
      icon: 'sparkles',
      color: 'sage',
      is_public: false,
      conversation_starters: ['', '', '', ''],
      ai_provider: 'claude',
      source_url: '',
    })
    setShowModal(true)
  }

  const openEditModal = (prompt: CustomPrompt) => {
    setEditingPrompt(prompt)
    setCreationMode('scratch')
    const starters = prompt.conversation_starters || []
    setFormData({
      name: prompt.name,
      description: prompt.description || '',
      system_prompt: prompt.system_prompt,
      icon: prompt.icon,
      color: prompt.color,
      is_public: prompt.is_public,
      conversation_starters: [
        starters[0] || '',
        starters[1] || '',
        starters[2] || '',
        starters[3] || '',
      ],
      ai_provider: prompt.ai_provider || 'claude',
      source_url: prompt.source_url || '',
    })
    setShowModal(true)
    setOpenMenuId(null)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingPrompt(null)
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.system_prompt.trim()) {
      showToast('Name and Instructions are required', 'warning')
      return
    }

    setSaving(true)
    try {
      const url = '/api/prompts'
      const method = editingPrompt ? 'PUT' : 'POST'

      // Filter out empty starters
      const starters = formData.conversation_starters.filter(s => s.trim())

      const { source_url, ...restForm } = formData
      const body = editingPrompt
        ? { id: editingPrompt.id, ...restForm, conversation_starters: starters, ai_provider: formData.ai_provider, source_url: source_url || null }
        : { ...restForm, conversation_starters: starters, category, ai_provider: formData.ai_provider, source_url: source_url || null }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        showToast(editingPrompt ? 'Prompt updated successfully' : 'Prompt created successfully', 'success')
        loadPrompts()
        closeModal()
      } else {
        const data = await response.json()
        showToast(data.error || 'Error saving prompt', 'error')
      }
    } catch (error) {
      console.error('Save error:', error)
      showToast('Error saving prompt', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Prompt',
      message: 'Are you sure you want to delete this prompt? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    })

    if (!confirmed) return
    setOpenMenuId(null)

    try {
      await fetch(`/api/prompts?id=${id}`, { method: 'DELETE' })
      showToast('Prompt deleted successfully', 'success')
      loadPrompts()
    } catch (error) {
      console.error('Delete error:', error)
      showToast('Failed to delete prompt', 'error')
    }
  }

  const handleDuplicate = async (prompt: CustomPrompt) => {
    setOpenMenuId(null)

    try {
      const starters = prompt.conversation_starters || []
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${prompt.name} (Copy)`,
          description: prompt.description,
          system_prompt: prompt.system_prompt,
          icon: prompt.icon,
          color: prompt.color,
          is_public: false,
          conversation_starters: starters,
          category,
        }),
      })

      if (response.ok) {
        showToast('Prompt duplicated successfully', 'success')
        loadPrompts()
      } else {
        const data = await response.json()
        showToast(data.error || 'Error duplicating prompt', 'error')
      }
    } catch (error) {
      console.error('Duplicate error:', error)
      showToast('Error duplicating prompt', 'error')
    }
  }

  const handleShare = async (prompt: CustomPrompt) => {
    setOpenMenuId(null)

    if (!prompt.is_public) {
      const makePublic = await confirm({
        title: 'Make Prompt Public',
        message: 'This prompt needs to be public to share. Do you want to make it public now?',
        confirmText: 'Make Public',
        cancelText: 'Cancel',
        variant: 'default',
      })
      if (makePublic) {
        try {
          const response = await fetch('/api/prompts', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: prompt.id, is_public: true }),
          })
          if (response.ok) {
            loadPrompts()
            const shareUrl = `${window.location.origin}/share/prompt/${prompt.slug}`
            await navigator.clipboard.writeText(shareUrl)
            setCopiedId(prompt.id)
            showToast('Share link copied to clipboard', 'success')
            setTimeout(() => setCopiedId(null), 2000)
          }
        } catch (error) {
          console.error('Update error:', error)
          showToast('Failed to make prompt public', 'error')
        }
      }
      return
    }

    const shareUrl = `${window.location.origin}/share/prompt/${prompt.slug}`

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedId(prompt.id)
      showToast('Share link copied to clipboard', 'success')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Copy error:', error)
      showToast('Failed to copy link', 'error')
    }
  }

  const handleCopySlug = async (prompt: CustomPrompt) => {
    try {
      const textToCopy = prompt.is_public
        ? `${window.location.origin}/share/prompt/${prompt.slug}`
        : `/${prompt.slug}`

      await navigator.clipboard.writeText(textToCopy)
      setCopiedId(prompt.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Copy error:', error)
    }
  }

  const updateStarter = (index: number, value: string) => {
    const newStarters = [...formData.conversation_starters]
    newStarters[index] = value
    setFormData({ ...formData, conversation_starters: newStarters })
  }

  const IconComponent = getIconComponent(formData.icon)

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-sage-100/50 dark:border-sage-800/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(backPath)}
              className="p-2.5 hover:bg-sage-50 dark:hover:bg-sage-900/20 rounded-xl transition-all duration-200 text-gray-600 dark:text-gray-400 hover:text-sage-600 dark:hover:text-sage-400"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-sage-400 to-sage-600 rounded-2xl flex items-center justify-center shadow-sage">
                <Zap className="text-white" size={20} />
              </div>
              <div>
                <h1 className="font-bold text-gray-800 dark:text-gray-100 tracking-tight">Prompts - {title}</h1>
                <p className="text-xs text-sage-600 dark:text-sage-400 font-medium">
                  Configure your custom instructions
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sage-500 to-sage-400 hover:from-sage-600 hover:to-sage-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-sage hover:shadow-sage-lg"
          >
            <Plus size={18} />
            <span>New Prompt</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-sage-500" size={32} />
            </div>
          ) : prompts.length === 0 ? (
            <div className="text-center py-20 animate-fadeIn">
              <div className="w-24 h-24 bg-gradient-to-br from-sage-400 to-sage-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-sage-lg">
                <Zap className="text-white" size={40} />
              </div>
              <h2 className="text-2xl font-black tracking-tighter text-gray-800 dark:text-gray-100 mb-3">
                Create your first Prompt
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Prompts are custom instructions that define how messages will be generated for {title}.
              </p>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sage-500 to-sage-400 hover:from-sage-600 hover:to-sage-500 text-white font-semibold rounded-2xl transition-all duration-300 shadow-sage-lg hover:shadow-sage-xl"
              >
                <Plus size={20} />
                <span>Create Prompt</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {prompts.map((prompt) => {
                const PromptIcon = getIconComponent(prompt.icon)
                const colorClass = getColorClass(prompt.color)
                const starters = prompt.conversation_starters || []
                return (
                  <div
                    key={prompt.id}
                    className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-sage-100/50 dark:border-sage-800/30 overflow-hidden shadow-lg hover:shadow-sage-lg transition-all duration-300 animate-fadeIn group"
                    style={{ boxShadow: '0 10px 30px -12px rgba(34, 197, 94, 0.15)' }}
                  >
                    {/* Card Header */}
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 ${colorClass} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                          <PromptIcon className="text-white" size={28} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate pr-2">
                              {prompt.name}
                            </h3>
                            {/* Actions Menu */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenMenuId(openMenuId === prompt.id ? null : prompt.id)
                                }}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <MoreHorizontal size={18} className="text-gray-500" />
                              </button>
                              {openMenuId === prompt.id && (
                                <div
                                  className="absolute right-0 top-8 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 z-50"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => openEditModal(prompt)}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-300"
                                  >
                                    <Pencil size={16} />
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDuplicate(prompt)}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-300"
                                  >
                                    <Copy size={16} />
                                    Duplicate
                                  </button>
                                  <button
                                    onClick={() => handleShare(prompt)}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-300"
                                  >
                                    {copiedId === prompt.id ? (
                                      <>
                                        <Check size={16} className="text-green-500" />
                                        <span className="text-green-500">Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Share2 size={16} />
                                        Share
                                      </>
                                    )}
                                  </button>
                                  <div className="border-t border-gray-200 dark:border-gray-700 my-1.5" />
                                  <button
                                    onClick={() => handleDelete(prompt.id)}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 text-red-600"
                                  >
                                    <Trash2 size={16} />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                            {prompt.description || 'No description'}
                          </p>
                        </div>
                      </div>

                      {/* Conversation Starters Preview */}
                      {starters.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <MessageCircle size={12} />
                            Examples
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {starters.slice(0, 3).map((starter, idx) => (
                              <span
                                key={idx}
                                className="inline-block px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg truncate max-w-[150px]"
                                title={starter}
                              >
                                {starter}
                              </span>
                            ))}
                            {starters.length > 3 && (
                              <span className="inline-block px-2.5 py-1 text-xs bg-sage-100 dark:bg-sage-900/30 text-sage-600 dark:text-sage-400 rounded-lg">
                                +{starters.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Zap size={12} />
                          {prompt.usage_count} uses
                        </span>
                        {prompt.ai_provider && (
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            prompt.ai_provider === 'claude' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                            prompt.ai_provider === 'chatgpt' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                            'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          }`}>
                            <Bot size={10} />
                            {prompt.ai_provider === 'claude' ? 'Claude' : prompt.ai_provider === 'chatgpt' ? 'ChatGPT' : 'Gemini'}
                          </span>
                        )}
                        {prompt.source_url && (
                          <span className="flex items-center gap-1 text-purple-500">
                            <ExternalLink size={10} />
                            Imported
                          </span>
                        )}
                        {prompt.is_public && (
                          <span className="flex items-center gap-1 text-sage-500">
                            <Eye size={12} />
                            Public
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-5 py-3 border-t border-sage-100/50 dark:border-sage-800/30 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                      <button
                        onClick={() => handleCopySlug(prompt)}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-sage-600 transition-colors"
                        title={prompt.is_public ? 'Copy share link' : 'Copy command'}
                      >
                        {copiedId === prompt.id ? (
                          <>
                            <Check size={12} className="text-green-500" />
                            <span className="text-green-500">Link copied!</span>
                          </>
                        ) : prompt.is_public ? (
                          <>
                            <Share2 size={12} />
                            <span>Copy link</span>
                          </>
                        ) : (
                          <>
                            <Link size={12} />
                            <span className="font-mono">/{prompt.slug}</span>
                          </>
                        )}
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(prompt)}
                          className="p-2 hover:bg-sage-50 dark:hover:bg-sage-900/20 rounded-lg transition-colors text-gray-500 hover:text-sage-600"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleShare(prompt)}
                          className="p-2 hover:bg-sage-50 dark:hover:bg-sage-900/20 rounded-lg transition-colors text-gray-500 hover:text-sage-600"
                          title="Share"
                        >
                          <Share2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-slideUp"
            style={{ boxShadow: '0 25px 60px -12px rgba(34, 197, 94, 0.3)' }}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-sage-100/50 dark:border-sage-800/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {creationMode === 'choose' ? (
                  <div className="w-10 h-10 bg-gradient-to-br from-sage-400 to-sage-600 rounded-xl flex items-center justify-center">
                    <Plus className="text-white" size={20} />
                  </div>
                ) : (
                  <div className={`w-10 h-10 ${getColorClass(formData.color)} rounded-xl flex items-center justify-center`}>
                    <IconComponent className="text-white" size={20} />
                  </div>
                )}
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {editingPrompt ? 'Edit Prompt' : creationMode === 'choose' ? 'New Prompt' : creationMode === 'import' ? 'Import from Link' : creationMode === 'upload' ? 'Upload de Arquivo' : 'Create from Scratch'}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Creation Mode Chooser */}
            {creationMode === 'choose' && !editingPrompt && (
              <div className="p-8 space-y-4">
                <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                  Como deseja criar seu prompt?
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                  {/* Create from scratch */}
                  <button
                    onClick={() => setCreationMode('scratch')}
                    className="group p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-sage-400 dark:hover:border-sage-500 transition-all duration-300 text-left hover:shadow-lg"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-sage-400 to-sage-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Pencil className="text-white" size={24} />
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1">Criar do Zero</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Escreva suas instrucoes e escolha a IA preferida
                    </p>
                  </button>

                  {/* Upload file */}
                  <label
                    className="group p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-500 transition-all duration-300 text-left hover:shadow-lg cursor-pointer"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Upload className="text-white" size={24} />
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1">Upload de Arquivo</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Suba um arquivo .txt ou .md com o system prompt
                    </p>
                    <input
                      type="file"
                      accept=".txt,.md,.text,.markdown"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        if (file.size > 50000) {
                          showToast('Arquivo muito grande (max 50KB)', 'warning')
                          e.target.value = ''
                          return
                        }
                        const reader = new FileReader()
                        reader.onload = (ev) => {
                          const text = ev.target?.result as string
                          if (text) {
                            const truncated = text.slice(0, 4000)
                            setFormData((prev) => ({ ...prev, system_prompt: truncated, name: prev.name || file.name.replace(/\.(txt|md|text|markdown)$/i, '') }))
                            setCreationMode('upload')
                            showToast(`Arquivo "${file.name}" carregado (${truncated.length} chars)`, 'success')
                          }
                        }
                        reader.readAsText(file)
                        e.target.value = ''
                      }}
                    />
                  </label>

                  {/* Import from link */}
                  <button
                    onClick={() => setCreationMode('import')}
                    className="group p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-300 text-left hover:shadow-lg"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <ExternalLink className="text-white" size={24} />
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1">Importar de Link</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Cole um link do ChatGPT GPT ou outra fonte
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Form (shown for scratch, import, or editing) */}
            {(creationMode !== 'choose' || editingPrompt) && (
              <>
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
                  {/* Back to choose (only for new prompts) */}
                  {!editingPrompt && (
                    <button
                      onClick={() => setCreationMode('choose')}
                      className="flex items-center gap-2 text-sm text-gray-500 hover:text-sage-600 transition-colors"
                    >
                      <ArrowLeft size={16} />
                      Voltar
                    </button>
                  )}

                  {/* Import URL field (only for import mode) */}
                  {creationMode === 'import' && (
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800/50">
                      <label className="block text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2">
                        <span className="flex items-center gap-2">
                          <Globe size={16} />
                          Link de Referencia (ChatGPT GPT, etc.)
                        </span>
                      </label>
                      <input
                        type="url"
                        value={formData.source_url}
                        onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                        placeholder="https://chatgpt.com/g/g-xxxx..."
                        className="w-full px-4 py-3 border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none transition-all"
                      />
                      <p className="text-xs text-purple-500 dark:text-purple-400 mt-2">
                        Cole o link e preencha as instrucoes abaixo baseadas no GPT importado
                      </p>
                    </div>
                  )}

                  {/* AI Provider Selector */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      <span className="flex items-center gap-2">
                        <Bot size={16} className="text-sage-500" />
                        IA Preferida para Geracao
                      </span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {AI_PROVIDERS.map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() => setFormData({ ...formData, ai_provider: provider.id })}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                            formData.ai_provider === provider.id
                              ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/20 shadow-md'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className={`w-10 h-10 bg-gradient-to-br ${provider.color} rounded-xl flex items-center justify-center mb-2`}>
                            <Bot className="text-white" size={18} />
                          </div>
                          <p className="font-bold text-sm text-gray-800 dark:text-gray-100">{provider.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{provider.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name & Description Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Prompt Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="E.g.: Post Instagram Espiritual"
                        maxLength={100}
                        className="w-full px-4 py-3 border border-sage-100/50 dark:border-sage-800/30 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-sage-400 focus:border-transparent outline-none transition-all"
                      />
                      <p className="text-xs text-gray-400 mt-1 text-right">{formData.name.length}/100</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Short Description
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="E.g.: Gera legendas engajantes para Instagram"
                        maxLength={200}
                        className="w-full px-4 py-3 border border-sage-100/50 dark:border-sage-800/30 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-sage-400 focus:border-transparent outline-none transition-all"
                      />
                      <p className="text-xs text-gray-400 mt-1 text-right">{formData.description.length}/200</p>
                    </div>
                  </div>

                  {/* Icon & Color Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Icon
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {ICONS.map((iconOption) => {
                          const Icon = iconOption.icon
                          return (
                            <button
                              key={iconOption.name}
                              onClick={() => setFormData({ ...formData, icon: iconOption.name })}
                              className={`p-2.5 rounded-xl border-2 transition-all ${
                                formData.icon === iconOption.name
                                  ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/20'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-sage-300'
                              }`}
                              title={iconOption.label}
                            >
                              <Icon size={18} className={formData.icon === iconOption.name ? 'text-sage-600' : 'text-gray-500'} />
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Color
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {COLORS.map((colorOption) => (
                          <button
                            key={colorOption.name}
                            onClick={() => setFormData({ ...formData, color: colorOption.name })}
                            className={`w-10 h-10 rounded-xl ${colorOption.bg} transition-all ${
                              formData.color === colorOption.name
                                ? 'ring-2 ring-offset-2 ring-gray-400'
                                : 'hover:scale-110'
                            }`}
                            title={colorOption.text}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* System Prompt */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Instructions (System Prompt) *
                      </label>
                      <label
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-sage-600 dark:text-sage-400 bg-sage-50 dark:bg-sage-900/20 hover:bg-sage-100 dark:hover:bg-sage-900/40 rounded-lg cursor-pointer transition-colors border border-sage-200 dark:border-sage-800/50"
                      >
                        <Upload size={14} />
                        Upload .txt / .md
                        <input
                          type="file"
                          accept=".txt,.md,.text,.markdown"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            if (file.size > 50000) {
                              showToast('Arquivo muito grande (max 50KB)', 'warning')
                              e.target.value = ''
                              return
                            }
                            const reader = new FileReader()
                            reader.onload = (ev) => {
                              const text = ev.target?.result as string
                              if (text) {
                                const truncated = text.slice(0, 4000)
                                setFormData((prev) => ({ ...prev, system_prompt: truncated }))
                                showToast(`Arquivo "${file.name}" carregado (${truncated.length} chars)`, 'success')
                              }
                            }
                            reader.readAsText(file)
                            e.target.value = ''
                          }}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {creationMode === 'import'
                        ? 'Cole aqui as instrucoes do GPT importado ou adapte conforme necessario.'
                        : 'Digite as instruções ou faça upload de um arquivo .txt / .md com o system prompt.'
                      }
                    </p>
                    <textarea
                      value={formData.system_prompt}
                      onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                      placeholder={creationMode === 'import'
                        ? 'Cole aqui as instrucoes/system prompt do ChatGPT GPT...'
                        : `Example:
You are a social media expert specialized in ${title}.

RULES:
1. Create engaging, scroll-stopping content
2. Use the brand voice consistently
3. Include relevant hashtags

FORMAT:
- Hook (first line)
- Body (2-3 paragraphs)
- CTA + Hashtags`}
                      rows={8}
                      maxLength={4000}
                      className="w-full px-4 py-3 border border-sage-100/50 dark:border-sage-800/30 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-sage-400 focus:border-transparent outline-none transition-all font-mono text-sm resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">{formData.system_prompt.length}/4000</p>
                  </div>

                  {/* Conversation Starters */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      <span className="flex items-center gap-2">
                        <MessageCircle size={16} className="text-sage-500" />
                        Usage Examples (Conversation Starters)
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Add up to 4 example prompts to help users get started.
                    </p>
                    <div className="space-y-2">
                      {formData.conversation_starters.map((starter, index) => (
                        <input
                          key={index}
                          type="text"
                          value={starter}
                          onChange={(e) => updateStarter(index, e.target.value)}
                          placeholder={`Example ${index + 1}: E.g.: "Create a post about gratitude"`}
                          className="w-full px-4 py-2.5 border border-sage-100/50 dark:border-sage-800/30 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-sage-400 focus:border-transparent outline-none transition-all text-sm"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Source URL for scratch mode (optional) */}
                  {creationMode === 'scratch' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <span className="flex items-center gap-2">
                          <Globe size={16} className="text-gray-400" />
                          Link de Referencia (opcional)
                        </span>
                      </label>
                      <input
                        type="url"
                        value={formData.source_url}
                        onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-4 py-2.5 border border-sage-100/50 dark:border-sage-800/30 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-sage-400 focus:border-transparent outline-none transition-all text-sm"
                      />
                    </div>
                  )}

                  {/* Public toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      {formData.is_public ? <Eye size={20} className="text-sage-500" /> : <EyeOff size={20} className="text-gray-400" />}
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-100">Public Prompt</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Other users will be able to use this prompt
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setFormData({ ...formData, is_public: !formData.is_public })}
                      className={`w-12 h-7 rounded-full transition-colors ${
                        formData.is_public ? 'bg-sage-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          formData.is_public ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-sage-100/50 dark:border-sage-800/30 flex items-center justify-end gap-3">
                  <button
                    onClick={closeModal}
                    className="px-5 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sage-500 to-sage-400 hover:from-sage-600 hover:to-sage-500 text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 shadow-sage"
                  >
                    {saving ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Save size={18} />
                    )}
                    <span>{editingPrompt ? 'Save' : 'Create'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
