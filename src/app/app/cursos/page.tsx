'use client'

import Link from 'next/link'
import {
  Heart,
  Flame,
  Sparkles,
  Star,
  GraduationCap,
  ArrowRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Course {
  slug: string
  name: string
  icon: LucideIcon
  gradient: string
  description: string
}

const COURSES: Course[] = [
  {
    slug: 'dadiva-de-ananda',
    name: 'Dádiva de Ananda',
    icon: Heart,
    gradient: 'from-pink-500 to-rose-600',
    description: 'Conteúdo para divulgação e nutrição do curso Dádiva de Ananda',
  },
  {
    slug: '81000-deeksha-yajna',
    name: '81000 Deeksha Yajna',
    icon: Flame,
    gradient: 'from-orange-500 to-red-600',
    description: 'Conteúdo para divulgação e nutrição do 81000 Deeksha Yajna',
  },
  {
    slug: 'becoming-higher-being',
    name: 'Becoming a Higher Being',
    icon: Sparkles,
    gradient: 'from-violet-500 to-purple-600',
    description: 'Conteúdo para divulgação e nutrição do curso Becoming a Higher Being',
  },
  {
    slug: 'miracle-course',
    name: 'Miracle Course',
    icon: Star,
    gradient: 'from-amber-400 to-yellow-600',
    description: 'Conteúdo para divulgação e nutrição do Miracle Course',
  },
]

export default function CursosPage() {
  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-gray-800 dark:to-gray-900">
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-sage-100/50 dark:border-sage-800/30 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg">
            <GraduationCap className="text-white" size={20} />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 dark:text-gray-100 tracking-tight">Cursos</h1>
            <p className="text-xs text-sage-600 dark:text-sage-400 font-medium">
              Produção massiva de conteúdo para seus cursos
            </p>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {COURSES.map((course) => {
              const Icon = course.icon
              return (
                <Link
                  key={course.slug}
                  href={`/app/cursos/${course.slug}`}
                  className="group bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-sage-100/50 dark:border-sage-800/30 overflow-hidden shadow-lg hover:shadow-sage-lg transition-all duration-300 hover:-translate-y-1"
                  style={{ boxShadow: '0 10px 30px -12px rgba(34, 197, 94, 0.15)' }}
                >
                  <div className="p-6">
                    <div className={`w-14 h-14 bg-gradient-to-br ${course.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 mb-4`}>
                      <Icon className="text-white" size={28} />
                    </div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg mb-1">
                      {course.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {course.description}
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
