'use client'

import { useState, useEffect, useRef } from 'react'
import { useToast } from '@/components/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import {
  Sparkles,
  Plus,
  Trash2,
  Search,
  Loader2,
  Copy,
  Check,
  X,
  ChevronDown,
  Bot,
  Settings,
  Feather,
  History,
  Youtube,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Music2,
  AtSign,
  Pin,
  MessageCircle,
  Send,
  Mail,
  HelpCircle,
  Star,
  type LucideIcon,
} from 'lucide-react'

// ── Types ──

interface Miracle {
  id: string
  title: string
  content: string
  source_network: string
  tags: string[]
  created_at: string
}

interface MiraclePrompt {
  id: string
  name: string
  target_network: string
  system_prompt: string
  is_default: boolean
}

interface MiracleCopy {
  id: string
  miracle_id: string
  target_network: string
  generated_copy: string
  ai_provider: string
  ai_model: string
  created_at: string
}

// ── Constants ──

const NETWORKS: { slug: string; name: string; icon: LucideIcon; gradient: string; color: string; bg: string; border: string }[] = [
  { slug: 'youtube', name: 'YouTube', icon: Youtube, gradient: 'from-red-500 to-red-600', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/40' },
  { slug: 'instagram', name: 'Instagram', icon: Instagram, gradient: 'from-pink-500 to-purple-600', color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800/40' },
  { slug: 'x-twitter', name: 'X (Twitter)', icon: Twitter, gradient: 'from-gray-700 to-gray-900', color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-gray-300 dark:border-gray-600' },
  { slug: 'facebook', name: 'Facebook', icon: Facebook, gradient: 'from-blue-500 to-blue-700', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/40' },
  { slug: 'linkedin', name: 'LinkedIn', icon: Linkedin, gradient: 'from-blue-600 to-blue-800', color: 'text-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/40' },
  { slug: 'tiktok', name: 'TikTok', icon: Music2, gradient: 'from-gray-900 to-pink-500', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800/40' },
  { slug: 'threads', name: 'Threads', icon: AtSign, gradient: 'from-gray-800 to-gray-600', color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-gray-300 dark:border-gray-600' },
  { slug: 'pinterest', name: 'Pinterest', icon: Pin, gradient: 'from-red-600 to-red-700', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800/40' },
]

const SOURCE_NETWORKS = [
  ...NETWORKS,
  { slug: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, gradient: 'from-green-500 to-green-600', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800/40' },
  { slug: 'telegram', name: 'Telegram', icon: Send, gradient: 'from-blue-400 to-blue-500', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800/40' },
  { slug: 'email', name: 'E-mail', icon: Mail, gradient: 'from-gray-500 to-gray-600', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-gray-300 dark:border-gray-600' },
  { slug: 'outro', name: 'Outro', icon: HelpCircle, gradient: 'from-gray-400 to-gray-500', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-gray-300 dark:border-gray-600' },
]

const AI_PROVIDERS = [
  { id: 'claude', name: 'Claude', description: 'Anthropic Claude Sonnet 4', icon: '🟠' },
  { id: 'chatgpt', name: 'ChatGPT', description: 'OpenAI GPT-4o', icon: '🟢' },
  { id: 'gemini', name: 'Gemini', description: 'Google Gemini 1.5 Pro', icon: '🔵' },
]

function getNetwork(slug: string) {
  return SOURCE_NETWORKS.find(n => n.slug === slug) || SOURCE_NETWORKS[SOURCE_NETWORKS.length - 1]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ── Main Component ──

export default function MilagresPage() {
  const { showToast } = useToast()
  const { confirm } = useConfirm()

  // Tab state
  const [activeTab, setActiveTab] = useState<'miracles' | 'prompts'>('miracles')

  // Miracles state
  const [miracles, setMiracles] = useState<Miracle[]>([])
  const [loadingMiracles, setLoadingMiracles] = useState(false)
  const [selectedMiracle, setSelectedMiracle] = useState<Miracle | null>(null)
  const [miracleFilter, setMiracleFilter] = useState('')
  const [showSidebar, setShowSidebar] = useState(true)

  // New miracle form
  const [showNewForm, setShowNewForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newSourceNetwork, setNewSourceNetwork] = useState('whatsapp')
  const [saving, setSaving] = useState(false)

  // Generation state
  const [targetNetwork, setTargetNetwork] = useState('instagram')
  const [generating, setGenerating] = useState(false)
  const [generatedCopy, setGeneratedCopy] = useState('')
  const [copied, setCopied] = useState(false)
  const [selectedAI, setSelectedAI] = useState('claude')
  const [showAIDropdown, setShowAIDropdown] = useState(false)

  // Prompts state
  const [prompts, setPrompts] = useState<MiraclePrompt[]>([])
  const [loadingPrompts, setLoadingPrompts] = useState(false)
  const [selectedPrompt, setSelectedPrompt] = useState<MiraclePrompt | null>(null)
  const [showPromptForm, setShowPromptForm] = useState(false)
  const [promptName, setPromptName] = useState('')
  const [promptNetwork, setPromptNetwork] = useState('instagram')
  const [promptText, setPromptText] = useState('')
  const [editingPrompt, setEditingPrompt] = useState<MiraclePrompt | null>(null)

  // Copies state
  const [copies, setCopies] = useState<MiracleCopy[]>([])

  const contentRef = useRef<HTMLTextAreaElement>(null)

  // ── Load data ──

  useEffect(() => { loadMiracles() }, [])
  useEffect(() => { loadPrompts() }, [])
  useEffect(() => {
    if (selectedMiracle) loadCopies(selectedMiracle.id)
  }, [selectedMiracle?.id])

  const loadMiracles = async () => {
    setLoadingMiracles(true)
    try {
      const res = await fetch('/api/miracles?limit=200')
      const data = await res.json()
      if (data.miracles) setMiracles(data.miracles)
    } catch (err) {
      console.error('Load miracles error:', err)
    } finally {
      setLoadingMiracles(false)
    }
  }

  const loadPrompts = async () => {
    setLoadingPrompts(true)
    try {
      const res = await fetch('/api/miracles/prompts')
      const data = await res.json()
      if (data.prompts) setPrompts(data.prompts)
    } catch (err) {
      console.error('Load prompts error:', err)
    } finally {
      setLoadingPrompts(false)
    }
  }

  const loadCopies = async (miracleId: string) => {
    try {
      const res = await fetch(`/api/miracles/copies?miracle_id=${miracleId}`)
      const data = await res.json()
      if (data.copies) setCopies(data.copies)
    } catch (err) {
      console.error('Load copies error:', err)
    }
  }

  // ── Miracle CRUD ──

  const handleSaveMiracle = async () => {
    if (!newContent.trim()) {
      showToast('Cole o conteudo do milagre', 'error')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/miracles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
          source_network: newSourceNetwork,
        }),
      })
      const data = await res.json()
      if (data.miracle) {
        setMiracles(prev => [data.miracle, ...prev])
        setSelectedMiracle(data.miracle)
        setShowNewForm(false)
        setNewTitle('')
        setNewContent('')
        showToast('Milagre salvo!', 'success')
      } else {
        showToast(data.error || 'Erro ao salvar', 'error')
      }
    } catch {
      showToast('Erro ao salvar milagre', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMiracle = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir Milagre',
      message: 'Tem certeza? As copies geradas tambem serao excluidas.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await fetch(`/api/miracles?id=${id}`, { method: 'DELETE' })
      setMiracles(prev => prev.filter(m => m.id !== id))
      if (selectedMiracle?.id === id) {
        setSelectedMiracle(null)
        setGeneratedCopy('')
        setCopies([])
      }
      showToast('Milagre excluido', 'success')
    } catch {
      showToast('Erro ao excluir', 'error')
    }
  }

  // ── Generate Copy ──

  const handleGenerate = async () => {
    if (!selectedMiracle || generating) return
    setGenerating(true)
    setGeneratedCopy('')

    try {
      const networkPrompts = prompts.filter(p => p.target_network === targetNetwork)
      const promptToUse = selectedPrompt?.target_network === targetNetwork ? selectedPrompt : null

      const res = await fetch('/api/miracles/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          miracle_id: selectedMiracle.id,
          miracle_content: selectedMiracle.content,
          target_network: targetNetwork,
          prompt_id: promptToUse?.id,
          custom_prompt: promptToUse?.system_prompt,
          ai_provider: selectedAI,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Erro ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('Sem resposta')

      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'text') {
              fullText += event.text
              setGeneratedCopy(fullText)
            } else if (event.type === 'done') {
              loadCopies(selectedMiracle.id)
            } else if (event.type === 'error') {
              throw new Error(event.error)
            }
          } catch (e: any) {
            if (e.message && e.message !== 'Unexpected end of JSON input') throw e
          }
        }
      }
    } catch (err: any) {
      console.error('Generate error:', err)
      showToast(err?.message || 'Erro ao gerar copy', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCopy)
      setCopied(true)
      showToast('Copiado!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  // ── Prompt CRUD ──

  const handleSavePrompt = async () => {
    if (!promptName.trim() || !promptText.trim()) {
      showToast('Preencha nome e prompt', 'error')
      return
    }
    try {
      if (editingPrompt) {
        await fetch('/api/miracles/prompts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingPrompt.id,
            name: promptName.trim(),
            target_network: promptNetwork,
            system_prompt: promptText.trim(),
          }),
        })
        showToast('Prompt atualizado', 'success')
      } else {
        await fetch('/api/miracles/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: promptName.trim(),
            target_network: promptNetwork,
            system_prompt: promptText.trim(),
          }),
        })
        showToast('Prompt criado', 'success')
      }
      setShowPromptForm(false)
      setEditingPrompt(null)
      setPromptName('')
      setPromptText('')
      loadPrompts()
    } catch {
      showToast('Erro ao salvar prompt', 'error')
    }
  }

  const handleEditPrompt = (prompt: MiraclePrompt) => {
    setEditingPrompt(prompt)
    setPromptName(prompt.name)
    setPromptNetwork(prompt.target_network)
    setPromptText(prompt.system_prompt)
    setShowPromptForm(true)
  }

  const handleDeletePrompt = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir Prompt',
      message: 'Tem certeza que deseja excluir este prompt?',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await fetch(`/api/miracles/prompts?id=${id}`, { method: 'DELETE' })
      setPrompts(prev => prev.filter(p => p.id !== id))
      if (selectedPrompt?.id === id) setSelectedPrompt(null)
      showToast('Prompt excluido', 'success')
    } catch {
      showToast('Erro ao excluir prompt', 'error')
    }
  }

  const handleDeleteCopy = async (id: string) => {
    try {
      await fetch(`/api/miracles/copies?id=${id}`, { method: 'DELETE' })
      setCopies(prev => prev.filter(c => c.id !== id))
      showToast('Copy excluida', 'success')
    } catch {
      showToast('Erro ao excluir', 'error')
    }
  }

  // ── Filtered miracles ──

  const filteredMiracles = miracleFilter.trim()
    ? miracles.filter(m =>
        m.content.toLowerCase().includes(miracleFilter.toLowerCase()) ||
        m.title.toLowerCase().includes(miracleFilter.toLowerCase())
      )
    : miracles

  const selectedAIProvider = AI_PROVIDERS.find(p => p.id === selectedAI) || AI_PROVIDERS[0]
  const networkPromptsForTarget = prompts.filter(p => p.target_network === targetNetwork)

  // ── Render ──

  return (
    <div className="flex h-full">
      {/* ── Left Sidebar: Miracles List ── */}
      <div className={`${showSidebar ? 'w-80' : 'w-0'} bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-sage-100/50 dark:border-sage-800/30 transition-all duration-300 overflow-hidden flex-shrink-0`}>
        <div className="flex flex-col h-full w-80">
          {/* New miracle button */}
          <div className="p-4 border-b border-sage-100/50 dark:border-sage-800/30">
            <button
              onClick={() => { setShowNewForm(true); setSelectedMiracle(null); setGeneratedCopy('') }}
              className="w-full flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Plus size={18} />
              <span className="font-semibold">Novo Milagre</span>
            </button>
          </div>

          {/* Filter */}
          <div className="px-3 pt-3 pb-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={miracleFilter}
                onChange={(e) => setMiracleFilter(e.target.value)}
                placeholder="Filtrar milagres..."
                className="w-full pl-9 pr-8 py-2 text-sm border border-sage-100/50 dark:border-sage-800/30 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-1 focus:ring-amber-400 outline-none transition-all placeholder-gray-400"
              />
              {miracleFilter && (
                <button onClick={() => setMiracleFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="px-3 pt-2 flex gap-1">
            <button
              onClick={() => setActiveTab('miracles')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'miracles' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              Milagres ({miracles.length})
            </button>
            <button
              onClick={() => setActiveTab('prompts')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'prompts' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              Prompts ({prompts.length})
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {activeTab === 'miracles' ? (
              <>
                {loadingMiracles ? (
                  <div className="flex justify-center py-4"><Loader2 className="animate-spin text-amber-400" size={20} /></div>
                ) : filteredMiracles.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    {miracleFilter ? 'Nenhum resultado' : 'Nenhum milagre ainda'}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredMiracles.map((miracle) => {
                      const net = getNetwork(miracle.source_network)
                      const NetIcon = net.icon
                      return (
                        <div
                          key={miracle.id}
                          onClick={() => { setSelectedMiracle(miracle); setShowNewForm(false); setGeneratedCopy('') }}
                          className={`group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                            selectedMiracle?.id === miracle.id
                              ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-700/30'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-amber-50/50 dark:hover:bg-amber-900/20'
                          }`}
                        >
                          <div className={`w-7 h-7 bg-gradient-to-br ${net.gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <NetIcon className="text-white" size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate font-medium">{miracle.title || miracle.content.substring(0, 50)}</p>
                            <p className="text-xs text-gray-400">{formatDate(miracle.created_at)}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteMiracle(miracle.id) }}
                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                          >
                            <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Prompts list */}
                <div className="mb-2">
                  <button
                    onClick={() => { setShowPromptForm(true); setEditingPrompt(null); setPromptName(''); setPromptText('') }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 rounded-xl transition-all"
                  >
                    <Plus size={14} />
                    <span className="font-medium">Novo Prompt</span>
                  </button>
                </div>
                {loadingPrompts ? (
                  <div className="flex justify-center py-4"><Loader2 className="animate-spin text-amber-400" size={20} /></div>
                ) : prompts.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">Nenhum prompt criado</div>
                ) : (
                  <div className="space-y-1">
                    {prompts.map((prompt) => {
                      const net = getNetwork(prompt.target_network)
                      const NetIcon = net.icon
                      return (
                        <div
                          key={prompt.id}
                          onClick={() => handleEditPrompt(prompt)}
                          className="group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer text-gray-600 dark:text-gray-400 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-all"
                        >
                          <div className={`w-7 h-7 bg-gradient-to-br ${net.gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <NetIcon className="text-white" size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate font-medium">{prompt.name}</p>
                            <p className="text-xs text-gray-400">{net.name}</p>
                          </div>
                          {!prompt.is_default && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeletePrompt(prompt.id) }}
                              className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                            >
                              <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-sage-100/50 dark:border-sage-800/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all text-gray-600 dark:text-gray-400"
            >
              <History size={20} />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Star className="text-white" size={18} />
              </div>
              <div>
                <h1 className="font-bold text-gray-800 dark:text-gray-100 text-sm tracking-tight">Milagres</h1>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Cole milagres e gere copies para redes sociais
                </p>
              </div>
            </div>

            {/* AI Provider Selector */}
            <div className="relative">
              <button
                onClick={() => setShowAIDropdown(!showAIDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-sage-100/50 dark:border-sage-800/30 rounded-xl hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-all"
              >
                <span className="text-lg">{selectedAIProvider.icon}</span>
                <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{selectedAIProvider.name}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${showAIDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showAIDropdown && (
                <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-900 border border-sage-100/50 dark:border-sage-800/30 rounded-xl shadow-xl overflow-hidden z-50 w-56 animate-slideUp">
                  <div className="p-2 border-b border-sage-100/50 dark:border-sage-800/30">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 flex items-center gap-2">
                      <Bot size={12} /> Provedor de IA
                    </p>
                  </div>
                  {AI_PROVIDERS.map((provider) => (
                    <button
                      key={provider.id}
                      onClick={() => { setSelectedAI(provider.id); setShowAIDropdown(false) }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-colors text-left ${selectedAI === provider.id ? 'bg-amber-50 dark:bg-amber-900/30' : ''}`}
                    >
                      <span className="text-xl">{provider.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 dark:text-gray-100">{provider.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{provider.description}</p>
                      </div>
                      {selectedAI === provider.id && <Check size={16} className="text-amber-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-gray-800 dark:to-gray-900">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* ── New Miracle Form ── */}
            {showNewForm && (
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-[2rem] border border-amber-200/50 dark:border-amber-800/30 p-6 shadow-lg animate-fadeIn"
                   style={{ boxShadow: '0 15px 40px -12px rgba(245, 158, 11, 0.15)' }}>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Sparkles size={20} className="text-amber-500" />
                  Novo Milagre
                </h2>

                {/* Title */}
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Titulo (opcional)..."
                  className="w-full px-4 py-3 mb-3 border border-sage-100/50 dark:border-sage-800/30 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none transition-all placeholder-gray-400"
                />

                {/* Source network selector */}
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Rede Social de Origem</p>
                  <div className="flex flex-wrap gap-2">
                    {SOURCE_NETWORKS.map((net) => {
                      const NetIcon = net.icon
                      const isSelected = newSourceNetwork === net.slug
                      return (
                        <button
                          key={net.slug}
                          onClick={() => setNewSourceNetwork(net.slug)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                            isSelected
                              ? `bg-gradient-to-r ${net.gradient} text-white shadow-lg border-transparent`
                              : `${net.bg} ${net.border} ${net.color} hover:shadow-md`
                          }`}
                        >
                          <NetIcon size={14} />
                          {net.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Content */}
                <textarea
                  ref={contentRef}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Cole o relato do milagre aqui..."
                  rows={8}
                  className="w-full px-4 py-3 mb-4 border border-sage-100/50 dark:border-sage-800/30 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none transition-all placeholder-gray-400 resize-y leading-relaxed"
                />

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveMiracle}
                    disabled={saving || !newContent.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 shadow-lg"
                  >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                    Salvar Milagre
                  </button>
                  <button
                    onClick={() => setShowNewForm(false)}
                    className="px-6 py-3 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* ── Prompt Form ── */}
            {showPromptForm && (
              <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-[2rem] border border-amber-200/50 dark:border-amber-800/30 p-6 shadow-lg animate-fadeIn"
                   style={{ boxShadow: '0 15px 40px -12px rgba(245, 158, 11, 0.15)' }}>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Settings size={20} className="text-amber-500" />
                  {editingPrompt ? 'Editar Prompt' : 'Novo Prompt'}
                </h2>

                <input
                  type="text"
                  value={promptName}
                  onChange={(e) => setPromptName(e.target.value)}
                  placeholder="Nome do prompt..."
                  className="w-full px-4 py-3 mb-3 border border-sage-100/50 dark:border-sage-800/30 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none transition-all placeholder-gray-400"
                />

                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Rede Social Destino</p>
                  <div className="flex flex-wrap gap-2">
                    {NETWORKS.map((net) => {
                      const NetIcon = net.icon
                      const isSelected = promptNetwork === net.slug
                      return (
                        <button
                          key={net.slug}
                          onClick={() => setPromptNetwork(net.slug)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                            isSelected
                              ? `bg-gradient-to-r ${net.gradient} text-white shadow-lg border-transparent`
                              : `${net.bg} ${net.border} ${net.color} hover:shadow-md`
                          }`}
                        >
                          <NetIcon size={14} />
                          {net.name}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Instrucoes do prompt (system prompt)..."
                  rows={10}
                  className="w-full px-4 py-3 mb-4 border border-sage-100/50 dark:border-sage-800/30 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none transition-all placeholder-gray-400 resize-y font-mono text-sm leading-relaxed"
                />

                <div className="flex gap-3">
                  <button
                    onClick={handleSavePrompt}
                    disabled={!promptName.trim() || !promptText.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 shadow-lg"
                  >
                    <Check size={18} />
                    {editingPrompt ? 'Atualizar' : 'Criar Prompt'}
                  </button>
                  <button
                    onClick={() => { setShowPromptForm(false); setEditingPrompt(null) }}
                    className="px-6 py-3 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* ── Selected Miracle View + Generation ── */}
            {selectedMiracle && !showNewForm && !showPromptForm && (
              <>
                {/* Miracle content */}
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-[2rem] border border-sage-100/50 dark:border-sage-800/30 p-6 shadow-lg"
                     style={{ boxShadow: '0 15px 40px -12px rgba(245, 158, 11, 0.15)' }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                        {selectedMiracle.title || 'Milagre'}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        {(() => {
                          const net = getNetwork(selectedMiracle.source_network)
                          const NetIcon = net.icon
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r ${net.gradient} text-white rounded-full text-xs font-medium`}>
                              <NetIcon size={12} /> {net.name}
                            </span>
                          )
                        })()}
                        <span className="text-xs text-gray-400">{formatDate(selectedMiracle.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300 leading-relaxed text-sm max-h-[300px] overflow-y-auto">
                    {selectedMiracle.content}
                  </pre>
                </div>

                {/* Target network + Prompt selector + Generate */}
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-[2rem] border border-sage-100/50 dark:border-sage-800/30 p-6 shadow-lg"
                     style={{ boxShadow: '0 15px 40px -12px rgba(245, 158, 11, 0.15)' }}>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">Gerar Copy Para:</h3>

                  {/* Target network */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {NETWORKS.map((net) => {
                      const NetIcon = net.icon
                      const isSelected = targetNetwork === net.slug
                      return (
                        <button
                          key={net.slug}
                          onClick={() => { setTargetNetwork(net.slug); setSelectedPrompt(null) }}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                            isSelected
                              ? `bg-gradient-to-r ${net.gradient} text-white shadow-lg scale-105 border-transparent`
                              : `${net.bg} ${net.border} ${net.color} hover:shadow-md hover:scale-[1.02]`
                          }`}
                        >
                          <NetIcon size={16} />
                          {net.name}
                        </button>
                      )
                    })}
                  </div>

                  {/* Prompt selector for this network */}
                  {networkPromptsForTarget.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Prompt {selectedPrompt ? `— ${selectedPrompt.name}` : '(usar padrao)'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {networkPromptsForTarget.map((prompt) => (
                          <button
                            key={prompt.id}
                            onClick={() => setSelectedPrompt(selectedPrompt?.id === prompt.id ? null : prompt)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                              selectedPrompt?.id === prompt.id
                                ? 'bg-amber-500 text-white shadow-lg'
                                : 'bg-white dark:bg-gray-800 border border-sage-100/50 dark:border-sage-800/30 text-gray-600 dark:text-gray-400 hover:border-amber-300'
                            }`}
                          >
                            <Feather size={14} />
                            {prompt.name}
                            {selectedPrompt?.id === prompt.id && <Check size={14} className="ml-1" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generate button */}
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-2xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        <span>Gerando com {selectedAIProvider.name}...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg">{selectedAIProvider.icon}</span>
                        <span>Gerar Copy para {NETWORKS.find(n => n.slug === targetNetwork)?.name} com {selectedAIProvider.name}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Generated copy */}
                {(generatedCopy || generating) && (
                  <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-[2rem] border border-sage-100/50 dark:border-sage-800/30 overflow-hidden shadow-lg animate-slideUp"
                       style={{ boxShadow: '0 15px 40px -12px rgba(245, 158, 11, 0.15)' }}>
                    <div className="px-6 py-4 border-b border-sage-100/50 dark:border-sage-800/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100">
                          Copy Gerada — {NETWORKS.find(n => n.slug === targetNetwork)?.name}
                        </h3>
                        {generating && (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full text-xs font-medium text-amber-600 dark:text-amber-400">
                            <Loader2 className="animate-spin" size={12} /> Gerando...
                          </span>
                        )}
                      </div>
                      {!generating && generatedCopy && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={handleGenerate}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 text-gray-500 dark:text-gray-400 text-sm font-medium transition-all"
                          >
                            <Sparkles size={14} /> Gerar novamente
                          </button>
                          <button
                            onClick={handleCopy}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                              copied ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'hover:bg-amber-50 dark:hover:bg-amber-900/20 text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300 leading-relaxed">
                        {generatedCopy}
                        {generating && <span className="inline-block w-1.5 h-5 bg-amber-500 animate-pulse ml-0.5 align-middle rounded-sm" />}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Previous copies */}
                {copies.length > 0 && !generating && (
                  <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-[2rem] border border-sage-100/50 dark:border-sage-800/30 overflow-hidden shadow-lg">
                    <div className="px-6 py-4 border-b border-sage-100/50 dark:border-sage-800/30">
                      <h3 className="font-bold text-gray-800 dark:text-gray-100">
                        Copies Anteriores ({copies.length})
                      </h3>
                    </div>
                    <div className="divide-y divide-sage-100/50 dark:divide-sage-800/30 max-h-[400px] overflow-y-auto">
                      {copies.map((copy) => {
                        const net = getNetwork(copy.target_network)
                        const NetIcon = net.icon
                        return (
                          <div key={copy.id} className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r ${net.gradient} text-white rounded-full text-xs font-medium`}>
                                  <NetIcon size={10} /> {net.name}
                                </span>
                                <span className="text-xs text-gray-400">{formatDate(copy.created_at)}</span>
                                <span className="text-xs text-gray-400">({copy.ai_provider})</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={async () => {
                                    await navigator.clipboard.writeText(copy.generated_copy)
                                    showToast('Copiado!', 'success')
                                  }}
                                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                                >
                                  <Copy size={13} className="text-gray-400" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCopy(copy.id)}
                                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                                >
                                  <Trash2 size={13} className="text-gray-400 hover:text-red-500" />
                                </button>
                              </div>
                            </div>
                            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-6">
                              {copy.generated_copy}
                            </pre>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Empty state */}
            {!selectedMiracle && !showNewForm && !showPromptForm && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-xl mb-6">
                  <Star className="text-white" size={36} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Milagres</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
                  Cole relatos de milagres e gere copies otimizadas para cada rede social com IA.
                </p>
                <button
                  onClick={() => setShowNewForm(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all shadow-lg"
                >
                  <Plus size={18} />
                  Adicionar Primeiro Milagre
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
