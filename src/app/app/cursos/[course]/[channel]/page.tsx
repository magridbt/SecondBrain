'use client'

import { useParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import DirectChatPage from '@/components/DirectChatPage'
import {
  MessageCircle,
  Mail,
  Instagram,
  Youtube,
  Loader2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const VALID_COURSES: Record<string, string> = {
  'dadiva-de-ananda': 'Dádiva de Ananda',
  '81000-deeksha-yajna': '81000 Deeksha Yajna',
  'becoming-higher-being': 'Becoming a Higher Being',
  'miracle-course': 'Miracle Course',
}

interface ChannelConfig {
  name: string
  icon: LucideIcon
}

const CHANNEL_CONFIG: Record<string, ChannelConfig> = {
  whatsapp: { name: 'WhatsApp', icon: MessageCircle },
  email: { name: 'Email Marketing', icon: Mail },
  instagram: { name: 'Instagram', icon: Instagram },
  youtube: { name: 'YouTube', icon: Youtube },
}

export default function CursoChannelPage() {
  const params = useParams()
  const course = params?.course as string
  const channel = params?.channel as string

  if (!course || !channel) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-sage-500" size={32} />
      </div>
    )
  }

  const courseName = VALID_COURSES[course]
  const channelConfig = CHANNEL_CONFIG[channel]

  if (!courseName || !channelConfig) notFound()

  return (
    <DirectChatPage
      category={`cursos-${course}-${channel}`}
      title={`${courseName} - ${channelConfig.name}`}
      icon={channelConfig.icon}
      promptsPath={`/app/cursos/${course}/${channel}/prompts`}
    />
  )
}
