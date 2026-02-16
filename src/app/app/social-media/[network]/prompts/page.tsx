'use client'

import { useParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import PromptsManagerPage from '@/components/PromptsManagerPage'

const VALID_NETWORKS: Record<string, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  'x-twitter': 'X (Twitter)',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  threads: 'Threads',
  pinterest: 'Pinterest',
}

export default function SocialMediaPromptsPage() {
  const params = useParams()
  const network = params.network as string

  const networkName = VALID_NETWORKS[network]

  if (!networkName) {
    notFound()
  }

  return (
    <PromptsManagerPage
      category={network}
      title={networkName}
      backPath={`/app/social-media/${network}`}
    />
  )
}
