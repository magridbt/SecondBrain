'use client'

import ContentGeneratorPage from '@/components/ContentGeneratorPage'
import { Sparkles } from 'lucide-react'

export default function DailyTeachingPage() {
  return (
    <ContentGeneratorPage
      category="daily-teaching"
      title="Ensinamento Diário"
      icon={Sparkles}
      promptsPath="/app/daily-teaching/prompts"
    />
  )
}
