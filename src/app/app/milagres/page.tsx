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

// ── Network Config ──

interface NetworkConfig {
  slug: string
  name: string
  icon: LucideIcon
  bg: string       // icon circle bg
  text: string     // icon + label color when idle
  activeBg: string // selected state bg
}

const NETWORKS: NetworkConfig[] = [
  { slug: 'youtube',   name: 'YouTube',      icon: Youtube,       bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-600 dark:text-red-400',    activeBg: 'bg-red-500' },
  { slug: 'instagram', name: 'Instagram',     icon: Instagram,     bg: 'bg-pink-100 dark:bg-pink-900/30',  text: 'text-pink-600 dark:text-pink-400',  activeBg: 'bg-gradient-to-br from-pink-500 to-purple-600' },
  { slug: 'x-twitter', name: 'X (Twitter)',   icon: Twitter,       bg: 'bg-gray-200 dark:bg-gray-700',     text: 'text-gray-800 dark:text-gray-200',  activeBg: 'bg-gray-900 dark:bg-gray-100' },
  { slug: 'facebook',  name: 'Facebook',      icon: Facebook,      bg: 'bg-blue-100 dark:bg-blue-900/30',  text: 'text-blue-600 dark:text-blue-400',  activeBg: 'bg-blue-600' },
  { slug: 'linkedin',  name: 'LinkedIn',      icon: Linkedin,      bg: 'bg-sky-100 dark:bg-sky-900/30',    text: 'text-sky-700 dark:text-sky-400',    activeBg: 'bg-sky-700' },
  { slug: 'tiktok',    name: 'TikTok',        icon: Music2,        bg: 'bg-gray-200 dark:bg-gray-700',     text: 'text-gray-800 dark:text-gray-200',  activeBg: 'bg-gray-900' },
  { slug: 'threads',   name: 'Threads',       icon: AtSign,        bg: 'bg-gray-200 dark:bg-gray-700',     text: 'text-gray-700 dark:text-gray-300',  activeBg: 'bg-gray-800' },
  { slug: 'pinterest', name: 'Pinterest',     icon: Pin,           bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-700 dark:text-red-400',    activeBg: 'bg-red-600' },
]

const SOURCE_ONLY: NetworkConfig[] = [
  { slug: 'whatsapp',  name: 'WhatsApp',      icon: MessageCircle, bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', activeBg: 'bg-green-500' },
  { slug: 'telegram',  name: 'Telegram',      icon: Send,          bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-500 dark:text-blue-400',   activeBg: 'bg-blue-500' },
  { slug: 'email',     name: 'E-mail',        icon: Mail,          bg: 'bg-gray-200 dark:bg-gray-700',      text: 'text-gray-600 dark:text-gray-300',   activeBg: 'bg-gray-600' },
  { slug: 'outro',     name: 'Outro',         icon: HelpCircle,    bg: 'bg-gray-200 dark:bg-gray-700',      text: 'text-gray-500 dark:text-gray-400',   activeBg: 'bg-gray-500' },
]

const ALL_SOURCES = [...NETWORKS, ...SOURCE_ONLY]

const AI_PROVIDERS = [
  { id: 'claude', name: 'Claude', description: 'Anthropic Claude Sonnet 4', icon: '🟠' },
  { id: 'chatgpt', name: 'ChatGPT', description: 'OpenAI GPT-4o', icon: '🟢' },
  { id: 'gemini', name: 'Gemini', description: 'Google Gemini 1.5 Pro', icon: '🔵' },
]

function getNetwork(slug: string) {
  return ALL_SOURCES.find(n => n.slug === slug) || ALL_SOURCES[ALL_SOURCES.length - 1]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ── Network Pill Component ──

function NetworkPill({ net, selected, onClick, size = 'md' }: {
  net: NetworkConfig
  selected: boolean
  onClick: () => void
  size?: 'sm' | 'md'
}) {
  const Icon = net.icon
  const sm = size === 'sm'
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 rounded-full transition-all duration-200
        ${sm ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'}
        font-medium
        ${selected
          ? `${net.activeBg} text-white shadow-md`
          : `bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${net.text} hover:shadow-sm hover:border-gray-300 dark:hover:border-gray-600`
        }
      `}
    >
      <span className={`
        inline-flex items-center justify-center rounded-full flex-shrink-0
        ${sm ? 'w-5 h-5' : 'w-6 h-6'}
        ${selected ? 'bg-white/20' : net.bg}
      `}>
        <Icon size={sm ? 11 : 13} className={selected ? 'text-white' : ''} />
      </span>
      {net.name}
    </button>
  )
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

  const handleSaveAndGenerate = async () => {
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
        showToast('Milagre salvo! Gerando copy...', 'success')
        // Auto-trigger generation after saving
        setSaving(false)
        setGenerating(true)
        setGeneratedCopy('')
        try {
          const promptToUse = selectedPrompt?.target_network === targetNetwork ? selectedPrompt : null
          const genRes = await fetch('/api/miracles/generate/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              miracle_id: data.miracle.id,
              miracle_content: data.miracle.content,
              target_network: targetNetwork,
              prompt_id: promptToUse?.id,
              custom_prompt: promptToUse?.system_prompt,
              ai_provider: selectedAI,
            }),
          })
          if (!genRes.ok) {
            const err = await genRes.json().catch(() => ({}))
            throw new Error(err.error || `Erro ${genRes.status}`)
          }
          const reader = genRes.body?.getReader()
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
                  loadCopies(data.miracle.id)
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
        return
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

  const handleCopy = async (text?: string) => {
    try {
      await navigator.clipboard.writeText(text || generatedCopy)
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
          body: JSON.stringify({ id: editingPrompt.id, name: promptName.trim(), target_network: promptNetwork, system_prompt: promptText.trim() }),
        })
        showToast('Prompt atualizado', 'success')
      } else {
        await fetch('/api/miracles/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: promptName.trim(), target_network: promptNetwork, system_prompt: promptText.trim() }),
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

  // ── Helpers ──

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
      {/* ── Left Sidebar ── */}
      <div className={`${showSidebar ? 'w-72' : 'w-0'} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 overflow-hidden flex-shrink-0`}>
        <div className="flex flex-col h-full w-72">
          {/* New miracle button */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => { setShowNewForm(true); setSelectedMiracle(null); setGeneratedCopy('') }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Plus size={16} />
              Novo Milagre
            </button>
          </div>

          {/* Filter */}
          <div className="px-3 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={miracleFilter}
                onChange={(e) => setMiracleFilter(e.target.value)}
                placeholder="Buscar milagres..."
                className="w-full pl-8 pr-7 py-1.5 text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-amber-400 focus:border-amber-400 outline-none placeholder-gray-400"
              />
              {miracleFilter && (
                <button onClick={() => setMiracleFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="px-3 flex border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setActiveTab('miracles')}
              className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'miracles' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              Milagres ({miracles.length})
            </button>
            <button
              onClick={() => setActiveTab('prompts')}
              className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'prompts' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              Prompts ({prompts.length})
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'miracles' ? (
              <>
                {loadingMiracles ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-300" size={20} /></div>
                ) : filteredMiracles.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">
                    {miracleFilter ? 'Nenhum resultado' : 'Nenhum milagre ainda'}
                  </div>
                ) : (
                  <div className="py-1">
                    {filteredMiracles.map((miracle) => {
                      const net = getNetwork(miracle.source_network)
                      const NetIcon = net.icon
                      const isActive = selectedMiracle?.id === miracle.id
                      return (
                        <div
                          key={miracle.id}
                          onClick={() => { setSelectedMiracle(miracle); setShowNewForm(false); setGeneratedCopy(''); setShowPromptForm(false) }}
                          className={`group flex items-center gap-2.5 px-3 py-2.5 mx-1 rounded-lg cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-amber-50 dark:bg-amber-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isActive ? net.activeBg : net.bg}`}>
                            <NetIcon size={13} className={isActive ? 'text-white' : net.text} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate font-medium ${isActive ? 'text-amber-700 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>
                              {miracle.title || miracle.content.substring(0, 40)}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(miracle.created_at)}</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteMiracle(miracle.id) }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                          >
                            <Trash2 size={13} className="text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="p-2">
                  <button
                    onClick={() => { setShowPromptForm(true); setEditingPrompt(null); setPromptName(''); setPromptText(''); setSelectedMiracle(null); setShowNewForm(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                  >
                    <Plus size={14} />
                    <span className="font-medium">Novo Prompt</span>
                  </button>
                </div>
                {loadingPrompts ? (
                  <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-300" size={20} /></div>
                ) : prompts.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">Nenhum prompt criado</div>
                ) : (
                  <div className="py-1">
                    {prompts.map((prompt) => {
                      const net = getNetwork(prompt.target_network)
                      const NetIcon = net.icon
                      return (
                        <div
                          key={prompt.id}
                          onClick={() => handleEditPrompt(prompt)}
                          className="group flex items-center gap-2.5 px-3 py-2.5 mx-1 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${net.bg}`}>
                            <NetIcon size={13} className={net.text} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate font-medium text-gray-700 dark:text-gray-300">{prompt.name}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{net.name}</p>
                          </div>
                          {!prompt.is_default && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeletePrompt(prompt.id) }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-all"
                            >
                              <Trash2 size={13} className="text-gray-400 hover:text-red-500" />
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
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2.5 flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-500"
          >
            <History size={18} />
          </button>
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
            <Star className="text-white" size={16} />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-gray-800 dark:text-gray-100 text-sm">Milagres</h1>
            <p className="text-[11px] text-gray-400">Cole milagres e gere copies para redes sociais</p>
          </div>

          {/* AI Provider */}
          <div className="relative">
            <button
              onClick={() => setShowAIDropdown(!showAIDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
            >
              <span>{selectedAIProvider.icon}</span>
              <span className="font-medium text-gray-700 dark:text-gray-200">{selectedAIProvider.name}</span>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${showAIDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showAIDropdown && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50 w-52">
                <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Bot size={10} /> Provedor de IA
                  </p>
                </div>
                {AI_PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedAI(p.id); setShowAIDropdown(false) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selectedAI === p.id ? 'bg-amber-50 dark:bg-amber-900/20' : ''}`}
                  >
                    <span>{p.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{p.name}</p>
                      <p className="text-[10px] text-gray-400">{p.description}</p>
                    </div>
                    {selectedAI === p.id && <Check size={14} className="text-amber-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-800">
          <div className="max-w-3xl mx-auto space-y-5">

            {/* ── New Miracle Form ── */}
            {showNewForm && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Star size={18} className="text-amber-500" />
                  Novo Milagre
                </h2>

                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Titulo (opcional)"
                  className="w-full px-3 py-2 mb-3 text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-amber-400 focus:border-amber-400 outline-none placeholder-gray-400"
                />

                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Origem</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {ALL_SOURCES.map((net) => (
                    <NetworkPill
                      key={net.slug}
                      net={net}
                      selected={newSourceNetwork === net.slug}
                      onClick={() => setNewSourceNetwork(net.slug)}
                      size="sm"
                    />
                  ))}
                </div>

                <textarea
                  ref={contentRef}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Cole o relato do milagre aqui..."
                  rows={6}
                  className="w-full px-3 py-2.5 mb-4 text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-amber-400 focus:border-amber-400 outline-none placeholder-gray-400 resize-y leading-relaxed"
                />

                <div className="flex gap-2 mb-5">
                  <button
                    onClick={handleSaveMiracle}
                    disabled={saving || !newContent.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin" size={15} /> : <Check size={15} />}
                    Salvar
                  </button>
                  <button
                    onClick={handleSaveAndGenerate}
                    disabled={saving || generating || !newContent.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {(saving || generating) ? <Loader2 className="animate-spin" size={15} /> : <Sparkles size={15} />}
                    Salvar e Gerar
                  </button>
                  <button
                    onClick={() => setShowNewForm(false)}
                    className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>

                {/* ── Inline Generation Options ── */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <Sparkles size={15} className="text-amber-500" />
                    Gerar Copy Para
                  </h3>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {NETWORKS.map((net) => (
                      <NetworkPill
                        key={net.slug}
                        net={net}
                        selected={targetNetwork === net.slug}
                        onClick={() => { setTargetNetwork(net.slug); setSelectedPrompt(null) }}
                        size="sm"
                      />
                    ))}
                  </div>

                  {/* Prompt selector for new form */}
                  {networkPromptsForTarget.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Prompt {selectedPrompt ? `— ${selectedPrompt.name}` : '(padrao)'}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {networkPromptsForTarget.map((prompt) => (
                          <button
                            key={prompt.id}
                            onClick={() => setSelectedPrompt(selectedPrompt?.id === prompt.id ? null : prompt)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                              selectedPrompt?.id === prompt.id
                                ? 'bg-amber-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-amber-300'
                            }`}
                          >
                            <Feather size={11} />
                            {prompt.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-gray-400 italic">
                    Clique em &quot;Salvar e Gerar&quot; para salvar o milagre e gerar a copy automaticamente.
                  </p>
                </div>
              </div>
            )}

            {/* ── Prompt Form ── */}
            {showPromptForm && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Settings size={18} className="text-amber-500" />
                  {editingPrompt ? 'Editar Prompt' : 'Novo Prompt'}
                </h2>

                <input
                  type="text"
                  value={promptName}
                  onChange={(e) => setPromptName(e.target.value)}
                  placeholder="Nome do prompt"
                  className="w-full px-3 py-2 mb-3 text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-amber-400 focus:border-amber-400 outline-none placeholder-gray-400"
                />

                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Rede Social Destino</p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {NETWORKS.map((net) => (
                    <NetworkPill
                      key={net.slug}
                      net={net}
                      selected={promptNetwork === net.slug}
                      onClick={() => setPromptNetwork(net.slug)}
                      size="sm"
                    />
                  ))}
                </div>

                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Instrucoes do system prompt..."
                  rows={8}
                  className="w-full px-3 py-2.5 mb-4 text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-amber-400 focus:border-amber-400 outline-none placeholder-gray-400 resize-y font-mono leading-relaxed"
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleSavePrompt}
                    disabled={!promptName.trim() || !promptText.trim()}
                    className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Check size={15} />
                    {editingPrompt ? 'Atualizar' : 'Criar'}
                  </button>
                  <button
                    onClick={() => { setShowPromptForm(false); setEditingPrompt(null) }}
                    className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* ── Selected Miracle ── */}
            {selectedMiracle && !showNewForm && !showPromptForm && (
              <>
                {/* Miracle content card */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                  <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                    {(() => {
                      const net = getNetwork(selectedMiracle.source_network)
                      const NetIcon = net.icon
                      return (
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center ${net.activeBg}`}>
                          <NetIcon size={13} className="text-white" />
                        </span>
                      )
                    })()}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                        {selectedMiracle.title || 'Milagre'}
                      </h2>
                      <p className="text-[11px] text-gray-400">{getNetwork(selectedMiracle.source_network).name} &middot; {formatDate(selectedMiracle.created_at)}</p>
                    </div>
                  </div>
                  <div className="px-5 py-4 max-h-60 overflow-y-auto">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {selectedMiracle.content}
                    </p>
                  </div>
                </div>

                {/* Generate card */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3">Gerar Copy Para</h3>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {NETWORKS.map((net) => (
                      <NetworkPill
                        key={net.slug}
                        net={net}
                        selected={targetNetwork === net.slug}
                        onClick={() => { setTargetNetwork(net.slug); setSelectedPrompt(null) }}
                        size="sm"
                      />
                    ))}
                  </div>

                  {/* Prompt selector */}
                  {networkPromptsForTarget.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Prompt {selectedPrompt ? `— ${selectedPrompt.name}` : '(padrao)'}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {networkPromptsForTarget.map((prompt) => (
                          <button
                            key={prompt.id}
                            onClick={() => setSelectedPrompt(selectedPrompt?.id === prompt.id ? null : prompt)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                              selectedPrompt?.id === prompt.id
                                ? 'bg-amber-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-amber-300'
                            }`}
                          >
                            <Feather size={11} />
                            {prompt.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Gerando com {selectedAIProvider.name}...
                      </>
                    ) : (
                      <>
                        <span>{selectedAIProvider.icon}</span>
                        Gerar para {NETWORKS.find(n => n.slug === targetNetwork)?.name}
                      </>
                    )}
                  </button>
                </div>

                {/* Generated copy */}
                {(generatedCopy || generating) && (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const net = getNetwork(targetNetwork)
                          const NetIcon = net.icon
                          return (
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center ${net.activeBg}`}>
                              <NetIcon size={11} className="text-white" />
                            </span>
                          )
                        })()}
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                          {NETWORKS.find(n => n.slug === targetNetwork)?.name}
                        </span>
                        {generating && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded-full text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            <Loader2 className="animate-spin" size={10} /> Gerando
                          </span>
                        )}
                      </div>
                      {!generating && generatedCopy && (
                        <div className="flex items-center gap-1">
                          <button onClick={handleGenerate} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-400" title="Gerar novamente">
                            <Sparkles size={14} />
                          </button>
                          <button
                            onClick={() => handleCopy()}
                            className={`p-1.5 rounded-lg transition-colors ${copied ? 'bg-amber-100 text-amber-600' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400'}`}
                            title="Copiar"
                          >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="px-5 py-4">
                      <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {generatedCopy}
                        {generating && <span className="inline-block w-1 h-4 bg-amber-500 animate-pulse ml-0.5 align-middle rounded-sm" />}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Previous copies */}
                {copies.length > 0 && !generating && (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                    <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Historico ({copies.length})</h3>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto">
                      {copies.map((copy) => {
                        const net = getNetwork(copy.target_network)
                        const NetIcon = net.icon
                        return (
                          <div key={copy.id} className="px-5 py-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${net.activeBg}`}>
                                  <NetIcon size={10} className="text-white" />
                                </span>
                                <span className="text-xs font-medium text-gray-500">{net.name}</span>
                                <span className="text-[10px] text-gray-400">{formatDate(copy.created_at)}</span>
                              </div>
                              <div className="flex gap-0.5">
                                <button onClick={() => handleCopy(copy.generated_copy)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
                                  <Copy size={12} className="text-gray-400" />
                                </button>
                                <button onClick={() => handleDeleteCopy(copy.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                                  <Trash2 size={12} className="text-gray-400 hover:text-red-500" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                              {copy.generated_copy}
                            </p>
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
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-5">
                  <Star className="text-amber-500" size={28} />
                </div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">Milagres</h2>
                <p className="text-sm text-gray-400 max-w-sm mb-5">
                  Cole relatos de milagres e gere copies otimizadas para cada rede social.
                </p>
                <button
                  onClick={() => setShowNewForm(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <Plus size={16} />
                  Adicionar Milagre
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
