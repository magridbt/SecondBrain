'use client'

import Link from 'next/link'
import {
  Youtube,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Music2,
  AtSign,
  Pin,
  Share2,
  ArrowRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface SocialNetwork {
  slug: string
  name: string
  icon: LucideIcon
  gradient: string
  description: string
}

const NETWORKS: SocialNetwork[] = [
  {
    slug: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    gradient: 'from-red-500 to-red-600',
    description: 'Scripts, títulos, descrições e thumbnails',
  },
  {
    slug: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    gradient: 'from-pink-500 to-purple-600',
    description: 'Legendas, stories, reels e carrosséis',
  },
  {
    slug: 'x-twitter',
    name: 'X (Twitter)',
    icon: Twitter,
    gradient: 'from-gray-700 to-gray-900',
    description: 'Tweets, threads e posts de engajamento',
  },
  {
    slug: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    gradient: 'from-blue-500 to-blue-700',
    description: 'Posts, artigos e conteúdo de comunidade',
  },
  {
    slug: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    gradient: 'from-blue-600 to-blue-800',
    description: 'Posts profissionais, artigos e thought leadership',
  },
  {
    slug: 'tiktok',
    name: 'TikTok',
    icon: Music2,
    gradient: 'from-gray-900 to-pink-500',
    description: 'Scripts de vídeo curto e conteúdo trending',
  },
  {
    slug: 'threads',
    name: 'Threads',
    icon: AtSign,
    gradient: 'from-gray-800 to-gray-600',
    description: 'Posts conversacionais e discussões',
  },
  {
    slug: 'pinterest',
    name: 'Pinterest',
    icon: Pin,
    gradient: 'from-red-600 to-red-700',
    description: 'Descrições de pins, boards e ideias',
  },
]

export default function SocialMediaPage() {
  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-sage-100/50 dark:border-sage-800/30 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-sage-400 to-sage-600 rounded-2xl flex items-center justify-center shadow-sage">
            <Share2 className="text-white" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 dark:text-gray-100 tracking-tight">Redes Sociais</h1>
            <p className="text-xs text-sage-600 dark:text-sage-400 font-medium">
              Gere conteúdo para suas redes sociais
            </p>
          </div>
        </div>
      </header>

      {/* Grid */}
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {NETWORKS.map((network) => {
              const Icon = network.icon
              return (
                <Link
                  key={network.slug}
                  href={`/app/social-media/${network.slug}`}
                  className="group bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-sage-100/50 dark:border-sage-800/30 overflow-hidden shadow-lg hover:shadow-sage-lg transition-all duration-300 hover:-translate-y-1"
                  style={{ boxShadow: '0 10px 30px -12px rgba(34, 197, 94, 0.15)' }}
                >
                  <div className="p-6">
                    <div className={`w-14 h-14 bg-gradient-to-br ${network.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 mb-4`}>
                      <Icon className="text-white" size={28} />
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg mb-1">
                      {network.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {network.description}
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
