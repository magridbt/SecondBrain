'use client'

import { useParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Heart,
  Flame,
  Sparkles,
  Star,
  MessageCircle,
  Mail,
  Instagram,
  Youtube,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface CourseConfig {
  name: string
  icon: LucideIcon
  gradient: string
}

const COURSES_CONFIG: Record<string, CourseConfig> = {
  'dadiva-de-ananda': { name: 'Dádiva de Ananda', icon: Heart, gradient: 'from-pink-500 to-rose-600' },
  '81000-deeksha-yajna': { name: '81000 Deeksha Yajna', icon: Flame, gradient: 'from-orange-500 to-red-600' },
  'becoming-higher-being': { name: 'Becoming a Higher Being', icon: Sparkles, gradient: 'from-violet-500 to-purple-600' },
  'miracle-course': { name: 'Miracle Course', icon: Star, gradient: 'from-amber-400 to-yellow-600' },
}

interface Channel {
  slug: string
  name: string
  icon: LucideIcon
  gradient: string
  description: string
}

const CHANNELS: Channel[] = [
  {
    slug: 'whatsapp',
    name: 'WhatsApp',
    icon: MessageCircle,
    gradient: 'from-green-500 to-green-600',
    description: 'Mensagens, sequências e conteúdo para grupos e listas',
  },
  {
    slug: 'email',
    name: 'Email Marketing',
    icon: Mail,
    gradient: 'from-blue-500 to-blue-700',
    description: 'Emails de nutrição, lançamento e automação',
  },
  {
    slug: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    gradient: 'from-pink-500 to-purple-600',
    description: 'Legendas, stories, reels e carrosséis',
  },
  {
    slug: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    gradient: 'from-red-500 to-red-600',
    description: 'Scripts, títulos, descrições e thumbnails',
  },
]

export default function CourseChannelsPage() {
  const params = useParams()
  const course = params?.course as string

  if (!course) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-sage-500" size={32} />
      </div>
    )
  }

  const config = COURSES_CONFIG[course]
  if (!config) notFound()

  const CourseIcon = config.icon

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-gray-800 dark:to-gray-900">
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-sage-100/50 dark:border-sage-800/30 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/app/cursos"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
            title="Voltar para Cursos"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className={`w-10 h-10 bg-gradient-to-br ${config.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
            <CourseIcon className="text-white" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 dark:text-gray-100 tracking-tight">{config.name}</h1>
            <p className="text-xs text-sage-600 dark:text-sage-400 font-medium">
              Escolha o canal de conteúdo
            </p>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {CHANNELS.map((channel) => {
              const Icon = channel.icon
              return (
                <Link
                  key={channel.slug}
                  href={`/app/cursos/${course}/${channel.slug}`}
                  className="group bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-sage-100/50 dark:border-sage-800/30 overflow-hidden shadow-lg hover:shadow-sage-lg transition-all duration-300 hover:-translate-y-1"
                  style={{ boxShadow: '0 10px 30px -12px rgba(34, 197, 94, 0.15)' }}
                >
                  <div className="p-6">
                    <div className={`w-14 h-14 bg-gradient-to-br ${channel.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 mb-4`}>
                      <Icon className="text-white" size={28} />
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg mb-1">
                      {channel.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {channel.description}
                    </p>
                  </div>
                  <div className="px-6 py-3 border-t border-sage-100/50 dark:border-sage-800/30 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between">
                    <span className="text-xs font-medium text-sage-600 dark:text-sage-400">
                      Abrir
                    </span>
                    <ArrowRight size={14} className="text-sage-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
