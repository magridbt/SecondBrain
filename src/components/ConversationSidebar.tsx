'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Plus, Loader2, Trash2, MessageSquare, Search, X, Pencil, Hash,
} from 'lucide-react'

// ─── Generic item interface ─────────────────────────────────────
export interface SidebarItem {
  id: string
  title: string
  date: string // ISO string — used for sorting and grouping
}

// ─── Theme interface (optional themes tab) ──────────────────────
export interface SidebarTheme {
  id: string
  slug: string
  name_pt: string
  name_en: string
  name_es: string | null
  icon: string   // emoji
  color: string  // hex
}

// ─── Color presets ──────────────────────────────────────────────
type ColorTheme = 'green' | 'sage' | 'purple'

const COLORS: Record<ColorTheme, {
  gradient: string
  gradientHover: string
  activeBg: string
  activeText: string
  activeIcon: string
  tabActive: string
}> = {
  green: {
    gradient: 'from-green-500 to-emerald-500',
    gradientHover: 'hover:from-green-600 hover:to-emerald-600',
    activeBg: 'bg-green-50 dark:bg-green-900/30',
    activeText: 'text-green-700 dark:text-green-500',
    activeIcon: 'text-green-600 dark:text-green-500',
    tabActive: 'border-green-500 text-green-700 dark:text-green-400',
  },
  sage: {
    gradient: 'from-green-600 to-emerald-500',
    gradientHover: 'hover:from-green-700 hover:to-emerald-600',
    activeBg: 'bg-green-50 dark:bg-green-900/30',
    activeText: 'text-green-700 dark:text-green-500',
    activeIcon: 'text-green-600 dark:text-green-500',
    tabActive: 'border-green-500 text-green-700 dark:text-green-400',
  },
  purple: {
    gradient: 'from-purple-600 to-indigo-600',
    gradientHover: 'hover:from-purple-700 hover:to-indigo-700',
    activeBg: 'bg-purple-50 dark:bg-purple-900/30',
    activeText: 'text-purple-700 dark:text-purple-500',
    activeIcon: 'text-purple-600 dark:text-purple-500',
    tabActive: 'border-purple-500 text-purple-700 dark:text-purple-400',
  },
}

// ─── Time grouping ──────────────────────────────────────────────
const GROUP_LABELS = ['Hoje', 'Ontem', 'Esta semana', 'Este mês', 'Anteriores'] as const
type GroupLabel = typeof GROUP_LABELS[number]

function getGroup(dateStr: string): GroupLabel {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return 'Esta semana'
  if (diffDays < 30) return 'Este mês'
  return 'Anteriores'
}

// ─── Props ──────────────────────────────────────────────────────
interface ConversationSidebarProps {
  /** List of items to display */
  items: SidebarItem[]
  /** Currently selected item ID */
  activeId: string | null
  /** Loading items */
  loading: boolean
  /** Callbacks */
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
  onRename?: (id: string, newTitle: string) => Promise<void>
  /** Sidebar open state */
  open: boolean
  /** UI customization */
  width?: 'w-72' | 'w-80'
  colorTheme?: ColorTheme
  newButtonText?: string
  emptyMessage?: string
  /** Feature flags */
  searchable?: boolean
  groupByDate?: boolean
  renamable?: boolean
  /** Icon for each item (default: MessageSquare) */
  itemIcon?: React.ComponentType<{ size: number; className?: string }>
  /** Show item count next to "Histórico" label */
  showCount?: boolean
  /** Optional themes tab (only for Chat) */
  themes?: SidebarTheme[]
  loadingThemes?: boolean
  onThemeClick?: (theme: SidebarTheme) => void
}

export default function ConversationSidebar({
  items,
  activeId,
  loading,
  onSelect,
  onDelete,
  onNew,
  onRename,
  open,
  width = 'w-72',
  colorTheme = 'green',
  newButtonText = 'Nova conversa',
  emptyMessage = 'Nenhuma conversa ainda',
  searchable = true,
  groupByDate = true,
  renamable = true,
  itemIcon: ItemIcon = MessageSquare,
  showCount = false,
  themes,
  loadingThemes = false,
  onThemeClick,
}: ConversationSidebarProps) {
  const colors = COLORS[colorTheme]
  const hasThemesTab = themes !== undefined && onThemeClick !== undefined

  // ─── State ──────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'conversas' | 'temas'>('conversas')
  const [searchFilter, setSearchFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  // ─── Filtered + grouped items ─────────────────────────────
  const filteredItems = useMemo(() => {
    if (!searchFilter.trim()) return items
    const q = searchFilter.toLowerCase()
    return items.filter(item => item.title.toLowerCase().includes(q))
  }, [items, searchFilter])

  const groupedItems = useMemo(() => {
    if (!groupByDate) return null
    const groups = new Map<GroupLabel, SidebarItem[]>()
    for (const item of filteredItems) {
      const group = getGroup(item.date)
      if (!groups.has(group)) groups.set(group, [])
      groups.get(group)!.push(item)
    }
    // Return in correct order
    const result: { label: GroupLabel; items: SidebarItem[] }[] = []
    for (const label of GROUP_LABELS) {
      const groupItems = groups.get(label)
      if (groupItems && groupItems.length > 0) {
        result.push({ label, items: groupItems })
      }
    }
    return result
  }, [filteredItems, groupByDate])

  // ─── Rename handlers ──────────────────────────────────────
  const startRename = useCallback((id: string, currentTitle: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditingId(id)
    setEditingTitle(currentTitle)
  }, [])

  const confirmRename = useCallback(async () => {
    if (!editingId || !onRename) return
    const trimmed = editingTitle.trim()
    if (trimmed && trimmed.length <= 100) {
      await onRename(editingId, trimmed)
    }
    setEditingId(null)
    setEditingTitle('')
  }, [editingId, editingTitle, onRename])

  const cancelRename = useCallback(() => {
    setEditingId(null)
    setEditingTitle('')
  }, [])

  // ─── Delete handler with confirm ─────────────────────────
  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Tem certeza que quer deletar?')) return
    onDelete(id)
  }, [onDelete])

  // ─── Render a single item ─────────────────────────────────
  const renderItem = (item: SidebarItem) => {
    const isActive = activeId === item.id
    const isEditing = editingId === item.id

    return (
      <div
        key={item.id}
        onClick={() => !isEditing && onSelect(item.id)}
        className={`
          group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition
          ${isActive
            ? `${colors.activeBg} ${colors.activeText}`
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
          }
        `}
      >
        <ItemIcon
          size={16}
          className={`flex-shrink-0 ${isActive ? colors.activeIcon : 'text-gray-400'}`}
        />
        <div className="flex-1 min-w-0">
          {isEditing && renamable ? (
            <input
              ref={editInputRef}
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename()
                if (e.key === 'Escape') cancelRename()
              }}
              onBlur={confirmRename}
              onClick={(e) => e.stopPropagation()}
              maxLength={100}
              className="w-full text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-green-500"
            />
          ) : (
            <>
              <p
                className="text-sm truncate font-medium"
                onDoubleClick={() => renamable && onRename && startRename(item.id, item.title)}
              >
                {item.title}
              </p>
              {!groupByDate && (
                <p className="text-xs text-gray-400 mt-0.5">{formatRelativeDate(item.date)}</p>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
          {renamable && onRename && !isEditing && (
            <button
              onClick={(e) => startRename(item.id, item.title, e)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Renomear"
            >
              <Pencil size={13} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          )}
          <button
            onClick={(e) => handleDelete(item.id, e)}
            className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
            title="Deletar"
          >
            <Trash2 size={13} className="text-gray-400 hover:text-red-500" />
          </button>
        </div>
      </div>
    )
  }

  // ─── Render conversation list ─────────────────────────────
  const renderConversations = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-gray-400" size={20} />
        </div>
      )
    }

    if (filteredItems.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400 text-sm">
          {searchFilter ? 'Nenhum resultado' : emptyMessage}
        </div>
      )
    }

    if (groupByDate && groupedItems) {
      return (
        <div className="space-y-4">
          {groupedItems.map(({ label, items: groupItems }) => (
            <div key={label}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">
                {label}
              </p>
              <div className="space-y-0.5">
                {groupItems.map(renderItem)}
              </div>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="space-y-0.5">
        {filteredItems.map(renderItem)}
      </div>
    )
  }

  // ─── Render themes grid ───────────────────────────────────
  const renderThemes = () => {
    if (loadingThemes) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-gray-400" size={20} />
        </div>
      )
    }

    if (!themes || themes.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400 text-sm">
          Nenhum tema disponível
        </div>
      )
    }

    return (
      <div className="grid grid-cols-2 gap-2">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => {
              onThemeClick?.(theme)
              setActiveTab('conversas')
            }}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-center group"
          >
            <span className="text-2xl">{theme.icon}</span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">
              {theme.name_pt}
            </span>
            <div
              className="w-8 h-0.5 rounded-full opacity-60 group-hover:opacity-100 transition"
              style={{ backgroundColor: theme.color }}
            />
          </button>
        ))}
      </div>
    )
  }

  // ─── Main render ──────────────────────────────────────────
  return (
    <div className={`
      ${open ? width : 'w-0'}
      bg-white dark:bg-black border-r border-gray-200 dark:border-gray-700
      transition-all duration-300 overflow-hidden flex-shrink-0
    `}>
      <div className={`flex flex-col h-full ${width}`}>
        {/* New button */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={onNew}
            className={`w-full flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r ${colors.gradient} ${colors.gradientHover} text-white rounded-lg transition shadow-sm`}
          >
            <Plus size={18} />
            <span className="font-medium text-sm">{newButtonText}</span>
          </button>
        </div>

        {/* Tabs (if themes enabled) */}
        {hasThemesTab && (
          <div className="flex border-b border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('conversas')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition ${
                activeTab === 'conversas'
                  ? colors.tabActive
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <MessageSquare size={14} />
              Conversas
            </button>
            <button
              onClick={() => setActiveTab('temas')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition ${
                activeTab === 'temas'
                  ? colors.tabActive
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Hash size={14} />
              Temas
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {activeTab === 'temas' && hasThemesTab ? (
            renderThemes()
          ) : (
            <>
              {/* Search */}
              {searchable && (
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Buscar..."
                    className="w-full pl-8 pr-8 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-1 focus:ring-green-500 placeholder-gray-400"
                  />
                  {searchFilter && (
                    <button
                      onClick={() => setSearchFilter('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    >
                      <X size={12} className="text-gray-400" />
                    </button>
                  )}
                </div>
              )}

              {/* Label */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Histórico
                </p>
                {showCount && filteredItems.length > 0 && (
                  <span className="text-[10px] text-gray-400">
                    ({filteredItems.length})
                  </span>
                )}
              </div>

              {renderConversations()}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────
function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `${diffDays} dias atrás`
  return date.toLocaleDateString('pt-BR')
}
