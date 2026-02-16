'use client'

import { useParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import ContentGeneratorPage from '@/components/ContentGeneratorPage'
import {
  Youtube,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Music2,
  AtSign,
  Pin,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface NetworkConfig {
  name: string
  icon: LucideIcon
}

const NETWORK_CONFIG: Record<string, NetworkConfig> = {
  youtube: { name: 'YouTube', icon: Youtube },
  instagram: { name: 'Instagram', icon: Instagram },
  'x-twitter': { name: 'X (Twitter)', icon: Twitter },
  facebook: { name: 'Facebook', icon: Facebook },
  linkedin: { name: 'LinkedIn', icon: Linkedin },
  tiktok: { name: 'TikTok', icon: Music2 },
  threads: { name: 'Threads', icon: AtSign },
  pinterest: { name: 'Pinterest', icon: Pin },
}

export default function SocialMediaNetworkPage() {
  const params = useParams()
  const network = params.network as string

  const config = NETWORK_CONFIG[network]

  if (!config) {
    notFound()
  }

  return (
    <ContentGeneratorPage
      category={network}
      title={config.name}
      icon={config.icon}
      promptsPath={`/app/social-media/${network}/prompts`}
    />
  )
}
