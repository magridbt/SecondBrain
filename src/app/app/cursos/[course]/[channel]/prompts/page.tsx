'use client'

import { useParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import PromptsManagerPage from '@/components/PromptsManagerPage'

const VALID_COURSES: Record<string, string> = {
  'dadiva-de-ananda': 'Dádiva de Ananda',
  '81000-deeksha-yajna': '81000 Deeksha Yajna',
  'becoming-higher-being': 'Becoming a Higher Being',
  'miracle-course': 'Miracle Course',
}

const VALID_CHANNELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email Marketing',
  instagram: 'Instagram',
  youtube: 'YouTube',
}

export default function CursoChannelPromptsPage() {
  const params = useParams()
  const course = params.course as string
  const channel = params.channel as string

  const courseName = VALID_COURSES[course]
  const channelName = VALID_CHANNELS[channel]

  if (!courseName || !channelName) notFound()

  return (
    <PromptsManagerPage
      category={`cursos-${course}-${channel}`}
      title={`${courseName} - ${channelName}`}
      backPath={`/app/cursos/${course}/${channel}`}
    />
  )
}
