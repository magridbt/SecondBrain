'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, FileText, Trash2, Loader2, Search, Type, RefreshCw, Eye } from 'lucide-react'

interface Document {
  id: string
  name: string
  type: string
  status: string
  chunk_count: number
  created_at: string
  metadata: any
  storage_path: string | null
  original_filename: string | null
  source: {
    id: string
    name: string
  }
}

interface Source {
  id: string
  name: string
}

const PROGRAM_81000_YEARS = [
  { value: 'ano1_2021', label: 'Year 1 - 2021' },
  { value: 'ano2_2022', label: 'Year 2 - 2022' },
  { value: 'ano3_2023', label: 'Year 3 - 2023' },
  { value: 'ano4_2024', label: 'Year 4 - 2024' },
  { value: 'ano5_2025', label: 'Year 5 - 2025' },
  { value: 'ano6_2026', label: 'Year 6 - 2026' },
  { value: 'ano7_2027', label: 'Year 7 - 2027' },
  { value: 'ano8_2028', label: 'Year 8 - 2028' },
  { value: 'ano9_2029', label: 'Year 9 - 2029' },
  { value: 'ano10_2030', label: 'Year 10 - 2030' },
]

const LANGUAGES = [
  { value: 'pt', label: 'Portuguese' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
]

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedSource, setSelectedSource] = useState<string>('')
  const [selectedSourceName, setSelectedSourceName] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')

  // Campos extras para 81000
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('pt')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

  // Estados para modo texto
  const [textMode, setTextMode] = useState(false)
  const [textTitle, setTextTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [submittingText, setSubmittingText] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)

  // Campos extras para Kalki Dharma Videos
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [publishDate, setPublishDate] = useState('')

  // Campo extra para Sri AB Original Videos
  const [videoOrigin, setVideoOrigin] = useState('')

  const supabase = createClient()

  // Reprocess all pending documents
  const handleReprocessAll = async () => {
    if (!confirm('Reprocess all pending documents? This may take a while.')) return

    setReprocessing(true)
    setUploadError(null)
    setUploadSuccess(null)

    try {
      const response = await fetch('/api/admin/documents/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error reprocessing')
      }

      setUploadSuccess(result.message)
      // Reload data after a delay to show updated status
      setTimeout(loadData, 2000)
    } catch (err: any) {
      setUploadError(err.message)
    } finally {
      setReprocessing(false)
    }
  }

  // Reprocess single document
  const handleReprocessOne = async (docId: string) => {
    try {
      const response = await fetch('/api/admin/documents/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error reprocessing')
      }

      // Reload data after a delay
      setTimeout(loadData, 2000)
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  const is81000Program = selectedSourceName.includes('81000')
  const isKalkiDharma = selectedSourceName.toLowerCase().includes('kalki')
  const isCompassionateLight = selectedSourceName.toLowerCase().includes('compassionate light')
  const isSriABOriginal = selectedSourceName.toLowerCase().includes('sri ab original')
  const isTejasaji = selectedSourceName.toLowerCase().includes('tejasa')
  const isYoutubeSource = isKalkiDharma || isCompassionateLight
  const isOriginSource = isSriABOriginal || isTejasaji

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-refresh when there are documents processing or pending
  useEffect(() => {
    const hasProcessing = documents.some(
      doc => doc.status === 'processing' || doc.status === 'pending'
    )

    if (hasProcessing) {
      const interval = setInterval(() => {
        loadData()
      }, 3000) // Refresh every 3 seconds

      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents])

  const loadData = async () => {
    setLoading(true)

    const [docsResponse, sourcesResult] = await Promise.all([
      fetch('/api/admin/documents').then(res => res.json()),
      supabase
        .from('teaching_sources')
        .select('id, name')
        .eq('is_active', true)
        .order('name'),
    ])

    if (docsResponse.documents) setDocuments(docsResponse.documents)
    if (sourcesResult.data) setSources(sourcesResult.data)

    setLoading(false)
  }

  const handleSourceChange = (sourceId: string) => {
    setSelectedSource(sourceId)
    const source = sources.find(s => s.id === sourceId)
    setSelectedSourceName(source?.name || '')
    // Reset extra fields
    setSelectedYear('')
    setSelectedDate('')
    setSelectedLanguage('pt')
    // Reset Kalki Dharma fields
    setYoutubeUrl('')
    setPublishDate('')
    // Reset Sri AB Original fields
    setVideoOrigin('')
  }

  const canUpload = () => {
    if (!selectedSource) return false
    if (is81000Program) {
      return selectedYear && selectedDate && selectedLanguage
    }
    if (isYoutubeSource) {
      return youtubeUrl && publishDate && selectedLanguage
    }
    if (isOriginSource) {
      return videoOrigin && publishDate && selectedLanguage
    }
    return true
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !canUpload()) return

    setUploading(true)
    setUploadError(null)
    setUploadSuccess(null)

    let successCount = 0
    let errorMessages: string[] = []

    for (const file of Array.from(files)) {
      // Build metadata
      const metadata: any = {}
      if (is81000Program) {
        metadata.program_year = selectedYear
        metadata.darshan_date = selectedDate
        metadata.language = selectedLanguage
      }
      if (isYoutubeSource) {
        metadata.youtube_url = youtubeUrl
        metadata.darshan_date = publishDate
        metadata.language = selectedLanguage
      }
      if (isOriginSource) {
        metadata.origin = videoOrigin
        metadata.darshan_date = publishDate
        metadata.language = selectedLanguage
      }

      // Build document name
      let docName = file.name.replace(/\.[^/.]+$/, '')
      if (is81000Program) {
        const yearLabel = PROGRAM_81000_YEARS.find(y => y.value === selectedYear)?.label
        const langMap: Record<string, string> = { pt: 'PT', en: 'EN', es: 'ES' }
        const langLabel = langMap[selectedLanguage] || selectedLanguage
        docName = `${yearLabel} - ${selectedDate} - ${langLabel} - ${docName}`
      }
      if (isKalkiDharma) {
        const langMap: Record<string, string> = { pt: 'PT', en: 'EN', es: 'ES' }
        const langLabel = langMap[selectedLanguage] || selectedLanguage
        docName = `Kalki Dharma - ${publishDate} - ${langLabel} - ${docName}`
      }
      if (isCompassionateLight) {
        const langMap: Record<string, string> = { pt: 'PT', en: 'EN', es: 'ES' }
        const langLabel = langMap[selectedLanguage] || selectedLanguage
        docName = `Great Compassionate Light - ${publishDate} - ${langLabel} - ${docName}`
      }
      if (isSriABOriginal) {
        const langMap: Record<string, string> = { pt: 'PT', en: 'EN', es: 'ES' }
        const langLabel = langMap[selectedLanguage] || selectedLanguage
        docName = `Sri AB Original - ${publishDate} - ${langLabel} - ${docName}`
      }
      if (isTejasaji) {
        const langMap: Record<string, string> = { pt: 'PT', en: 'EN', es: 'ES' }
        const langLabel = langMap[selectedLanguage] || selectedLanguage
        docName = `Tejasaji - ${publishDate} - ${langLabel} - ${docName}`
      }

      // Upload via API
      const formData = new FormData()
      formData.append('file', file)
      formData.append('source_id', selectedSource)
      formData.append('name', docName)
      formData.append('metadata', JSON.stringify(metadata))

      const response = await fetch('/api/admin/documents', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Upload error:', result.error)
        errorMessages.push(`${file.name}: ${result.error}`)
        continue
      }

      successCount++
    }

    if (errorMessages.length > 0) {
      setUploadError(errorMessages.join('\n'))
    }
    if (successCount > 0) {
      setUploadSuccess(`${successCount} file(s) uploaded successfully!`)
      // Clear fields after success
      setSelectedYear('')
      setSelectedDate('')
      setSelectedLanguage('pt')
      setYoutubeUrl('')
      setPublishDate('')
      setVideoOrigin('')
    }

    await loadData()
    setUploading(false)
    e.target.value = ''
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document? This will also remove all indexed chunks.')) return

    await fetch(`/api/admin/documents?id=${id}`, {
      method: 'DELETE',
    })

    await loadData()
  }

  // Preview/download file
  const handlePreview = async (docId: string, docName: string) => {
    try {
      const response = await fetch(`/api/admin/documents/preview?id=${docId}`)
      const result = await response.json()

      if (!response.ok) {
        alert(result.error || 'Could not load file')
        return
      }

      // Open file in new tab
      window.open(result.url, '_blank')
    } catch (err) {
      alert('Error loading file preview')
    }
  }

  const canSubmitText = () => {
    if (!selectedSource || !textTitle.trim() || !textContent.trim()) return false
    if (is81000Program) {
      return selectedYear && selectedDate && selectedLanguage
    }
    if (isYoutubeSource) {
      return youtubeUrl && publishDate && selectedLanguage
    }
    if (isOriginSource) {
      return videoOrigin && publishDate && selectedLanguage
    }
    return true
  }

  const handleTextSubmit = async () => {
    if (!canSubmitText()) return

    setSubmittingText(true)
    setUploadError(null)
    setUploadSuccess(null)

    try {
      // Build metadata
      const metadata: any = {}
      if (is81000Program) {
        metadata.program_year = selectedYear
        metadata.darshan_date = selectedDate
        metadata.language = selectedLanguage
      }
      if (isYoutubeSource) {
        metadata.youtube_url = youtubeUrl
        metadata.darshan_date = publishDate
        metadata.language = selectedLanguage
      }
      if (isOriginSource) {
        metadata.origin = videoOrigin
        metadata.darshan_date = publishDate
        metadata.language = selectedLanguage
      }

      // Build document name
      let docName = textTitle.trim()
      if (is81000Program) {
        const yearLabel = PROGRAM_81000_YEARS.find(y => y.value === selectedYear)?.label
        const langMap: Record<string, string> = { pt: 'PT', en: 'EN', es: 'ES' }
        const langLabel = langMap[selectedLanguage] || selectedLanguage
        docName = `${yearLabel} - ${selectedDate} - ${langLabel} - ${docName}`
      }
      if (isKalkiDharma) {
        const langMap: Record<string, string> = { pt: 'PT', en: 'EN', es: 'ES' }
        const langLabel = langMap[selectedLanguage] || selectedLanguage
        docName = `Kalki Dharma - ${publishDate} - ${langLabel} - ${docName}`
      }
      if (isCompassionateLight) {
        const langMap: Record<string, string> = { pt: 'PT', en: 'EN', es: 'ES' }
        const langLabel = langMap[selectedLanguage] || selectedLanguage
        docName = `Great Compassionate Light - ${publishDate} - ${langLabel} - ${docName}`
      }
      if (isSriABOriginal) {
        const langMap: Record<string, string> = { pt: 'PT', en: 'EN', es: 'ES' }
        const langLabel = langMap[selectedLanguage] || selectedLanguage
        docName = `Sri AB Original - ${publishDate} - ${langLabel} - ${docName}`
      }
      if (isTejasaji) {
        const langMap: Record<string, string> = { pt: 'PT', en: 'EN', es: 'ES' }
        const langLabel = langMap[selectedLanguage] || selectedLanguage
        docName = `Tejasaji - ${publishDate} - ${langLabel} - ${docName}`
      }

      const response = await fetch('/api/admin/documents/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_id: selectedSource,
          name: docName,
          content: textContent,
          metadata,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error saving text')
      }

      setUploadSuccess('Text inserted successfully! Processing started.')
      setTextTitle('')
      setTextContent('')
      setTextMode(false)
      // Clear fields after success
      setSelectedYear('')
      setSelectedDate('')
      setSelectedLanguage('pt')
      setYoutubeUrl('')
      setPublishDate('')
      setVideoOrigin('')
      await loadData()
    } catch (err: any) {
      setUploadError(err.message)
    } finally {
      setSubmittingText(false)
    }
  }

  // Filtrar e ordenar documentos por ano e data
  const filteredDocs = documents
    .filter(
      (doc) =>
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.source?.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Extrair ano do program_year (ex: 'ano1_2021' -> 2021)
      const getYear = (doc: Document) => {
        if (doc.metadata?.program_year) {
          const match = doc.metadata.program_year.match(/(\d{4})/)
          return match ? parseInt(match[1]) : 0
        }
        return 0
      }

      // Extrair data do darshan_date
      const getDate = (doc: Document) => {
        if (doc.metadata?.darshan_date) {
          return new Date(doc.metadata.darshan_date).getTime()
        }
        return new Date(doc.created_at).getTime()
      }

      const yearA = getYear(a)
      const yearB = getYear(b)

      // Primeiro ordenar por ano (crescente)
      if (yearA !== yearB) {
        return yearA - yearB
      }

      // Depois ordenar por data (crescente)
      return getDate(a) - getDate(b)
    })

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    processed: 'bg-green-100 text-green-700',
    indexed: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  }

  const formatMetadata = (doc: Document) => {
    if (!doc.metadata) return null
    const parts = []
    if (doc.metadata.program_year) {
      const year = PROGRAM_81000_YEARS.find(y => y.value === doc.metadata.program_year)
      parts.push(year?.label || doc.metadata.program_year)
    }
    if (doc.metadata.darshan_date) {
      parts.push(doc.metadata.darshan_date)
    }
    if (doc.metadata.language) {
      const langMap: Record<string, string> = { pt: 'PT', en: 'EN', es: 'ES' }
      parts.push(langMap[doc.metadata.language] || doc.metadata.language)
    }
    // Kalki Dharma fields
    if (doc.metadata.publish_date) {
      parts.push(doc.metadata.publish_date)
    }
    if (doc.metadata.youtube_url) {
      parts.push('YouTube')
    }
    // Sri AB Original fields
    if (doc.metadata.origin) {
      parts.push(`Origin: ${doc.metadata.origin}`)
    }
    return parts.length > 0 ? parts.join(' | ') : null
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Documents</h1>
        <p className="text-gray-500">Manage the system teachings</p>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Document Upload</h2>

        <div className="space-y-4">
          {/* Source Selection */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teaching Source
              </label>
              <select
                value={selectedSource}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              >
                <option value="">Select source...</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Extra fields for 81000 Program */}
          {is81000Program && (
            <div className="flex flex-wrap gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Program Year *
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="">Select year...</option>
                  {PROGRAM_81000_YEARS.map((year) => (
                    <option key={year.value} value={year.value}>
                      {year.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Darshan Date *
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white"
                />
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language *
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Extra fields for YouTube sources (Kalki Dharma & Great Compassionate Light) */}
          {isYoutubeSource && (
            <div className="flex flex-wrap gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex-1 min-w-[300px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  YouTube URL *
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white"
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Publish Date *
                </label>
                <input
                  type="date"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white"
                />
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language *
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Extra fields for Sri AB Original Videos and Tejasaji */}
          {isOriginSource && (
            <div className="flex flex-wrap gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex-1 min-w-[300px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Origin / Source *
                </label>
                <input
                  type="text"
                  value={videoOrigin}
                  onChange={(e) => setVideoOrigin(e.target.value)}
                  placeholder="Where did this content come from? (e.g., DVD, WhatsApp group, etc.)"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white"
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white"
                />
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language *
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Upload/Text Buttons */}
          <div className="flex flex-wrap gap-3">
            {!textMode ? (
              <>
                <label
                  className={`
                    inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition
                    ${canUpload()
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {uploading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Upload size={20} />
                  )}
                  <span>{uploading ? 'Uploading...' : 'Upload PDF/Word/TXT'}</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.txt,.md,.doc,.docx"
                    onChange={handleFileUpload}
                    disabled={!canUpload() || uploading}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={() => setTextMode(true)}
                  disabled={!selectedSource}
                  className={`
                    inline-flex items-center gap-2 px-4 py-2 rounded-lg transition
                    ${selectedSource
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  <Type size={20} />
                  <span>Insert Text</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setTextMode(false)
                  setTextTitle('')
                  setTextContent('')
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              >
                <Upload size={20} />
                <span>Back to Upload</span>
              </button>
            )}
          </div>

          {/* Text Input Form */}
          {textMode && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  placeholder="Ex: Teaching on Gratitude"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text Content *
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Paste or type the text here..."
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none bg-white resize-y"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {textContent.length} characters
                </p>
              </div>

              <button
                onClick={handleTextSubmit}
                disabled={!canSubmitText() || submittingText}
                className={`
                  inline-flex items-center gap-2 px-4 py-2 rounded-lg transition
                  ${canSubmitText() && !submittingText
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {submittingText ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <FileText size={20} />
                )}
                <span>{submittingText ? 'Saving...' : 'Save Text'}</span>
              </button>
            </div>
          )}

          {is81000Program && !canUpload() && selectedSource && !textMode && (
            <p className="text-sm text-green-700 mt-2">
              * Fill in all required fields to enable upload
            </p>
          )}

          {isYoutubeSource && !canUpload() && selectedSource && !textMode && (
            <p className="text-sm text-purple-700 mt-2">
              * Fill in YouTube URL, Publish Date, and Language to enable upload
            </p>
          )}

          {isOriginSource && !canUpload() && selectedSource && !textMode && (
            <p className="text-sm text-amber-700 mt-2">
              * Fill in Origin, Date, and Language to enable upload
            </p>
          )}

          {uploadError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <strong>Error:</strong> {uploadError}
            </div>
          )}

          {uploadSuccess && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {uploadSuccess}
            </div>
          )}
        </div>
      </div>

      {/* Auto-refresh indicator */}
      {documents.some(doc => doc.status === 'processing' || doc.status === 'pending') && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          <Loader2 className="animate-spin" size={16} />
          <span>Auto-refreshing every 3 seconds while documents are processing...</span>
        </div>
      )}

      {/* Search and Reprocess */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Filter documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />
        </div>
        <button
          onClick={handleReprocessAll}
          disabled={reprocessing}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
          title="Reprocess all pending documents"
        >
          <RefreshCw size={18} className={reprocessing ? 'animate-spin' : ''} />
          <span>{reprocessing ? 'Processing...' : 'Reprocess All'}</span>
        </button>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="animate-spin mx-auto text-gray-400" size={32} />
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="mx-auto mb-2 text-gray-300" size={48} />
            <p>No documents found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Source</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Details</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                <th className="text-center px-6 py-3 text-sm font-medium text-gray-500">File</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <FileText className="text-gray-400 flex-shrink-0" size={20} />
                      <span className="font-medium text-gray-800 truncate max-w-[200px]" title={doc.name}>
                        {doc.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{doc.source?.name}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {formatMetadata(doc) || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[doc.status]}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {doc.storage_path ? (
                      <button
                        onClick={() => handlePreview(doc.id, doc.name)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
                        title={`View: ${doc.original_filename || doc.name}`}
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {(doc.status === 'pending' || doc.status === 'error') && (
                        <button
                          onClick={() => handleReprocessOne(doc.id)}
                          className="p-2 text-gray-400 hover:text-orange-500 rounded-lg hover:bg-orange-50 transition"
                          title="Reprocess document"
                        >
                          <RefreshCw size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                        title="Delete document"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
