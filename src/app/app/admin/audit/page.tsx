'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Activity,
  AlertTriangle,
  MessageSquare,
  Trash2,
  FileText,
  Search,
  Loader2,
  Eye,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react'

interface AuditLog {
  id: string
  user_id: string
  user_email: string
  action: string
  entity_type: string
  entity_id: string
  details: any
  created_at: string
}

interface FlaggedContent {
  id: string
  user_id: string
  content_type: string
  content_text: string
  reason: string
  severity: string
  status: string
  created_at: string
  profiles?: {
    email: string
    full_name: string
  }
}

export default function AuditPage() {
  const [activeTab, setActiveTab] = useState<'logs' | 'flagged'>('logs')
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [flaggedContent, setFlaggedContent] = useState<FlaggedContent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const supabase = createClient()

  const loadData = useCallback(async () => {
    setLoading(true)

    if (activeTab === 'logs') {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (!error && data) {
        setAuditLogs(data)
      }
    } else {
      const { data, error } = await supabase
        .from('flagged_content')
        .select('*, profiles:user_id(email, full_name)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (!error && data) {
        setFlaggedContent(data)
      }
    }

    setLoading(false)
  }, [activeTab, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  const updateFlagStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('flagged_content')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (!error) {
      loadData()
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'chat_message':
        return <MessageSquare className="w-4 h-4" />
      case 'delete_conversation':
        return <Trash2 className="w-4 h-4" />
      case 'upload_document':
        return <FileText className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'chat_message':
        return 'bg-blue-100 text-blue-800'
      case 'delete_conversation':
        return 'bg-red-100 text-red-800'
      case 'upload_document':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 text-white'
      case 'high':
        return 'bg-orange-500 text-white'
      case 'medium':
        return 'bg-yellow-500 text-black'
      default:
        return 'bg-gray-200 text-gray-800'
    }
  }

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      !searchTerm ||
      log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAction = !actionFilter || log.action === actionFilter

    return matchesSearch && matchesAction
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="w-8 h-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit & Control</h1>
            <p className="text-gray-500">Monitor user activity and flagged content</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b">
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'logs'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Activity Logs</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('flagged')}
          className={`pb-2 px-4 font-medium ${
            activeTab === 'flagged'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Flagged Content</span>
            {flaggedContent.filter((f) => f.status === 'pending').length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {flaggedContent.filter((f) => f.status === 'pending').length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by email or action..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        {activeTab === 'logs' && (
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Actions</option>
            <option value="chat_message">Chat Messages</option>
            <option value="delete_conversation">Deleted Conversations</option>
            <option value="upload_document">Document Uploads</option>
          </select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : activeTab === 'logs' ? (
        /* Audit Logs Table */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {log.user_email || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(
                        log.action
                      )}`}
                    >
                      {getActionIcon(log.action)}
                      <span>{log.action}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {log.details?.messagePreview || log.details?.messageCount
                      ? `${log.details.messageCount} messages`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Flagged Content Table */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Content
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {flaggedContent.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(item.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.profiles?.email || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                    <div className="truncate" title={item.content_text}>
                      {item.content_text?.substring(0, 100)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.reason}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(
                        item.severity
                      )}`}
                    >
                      {item.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        item.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : item.status === 'reviewed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateFlagStatus(item.id, 'reviewed')}
                          className="text-green-600 hover:text-green-900"
                          title="Mark as reviewed"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateFlagStatus(item.id, 'dismissed')}
                          className="text-gray-600 hover:text-gray-900"
                          title="Dismiss"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {flaggedContent.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No flagged content found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Log Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="text-gray-900">{formatDate(selectedLog.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">User</label>
                  <p className="text-gray-900">{selectedLog.user_email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Action</label>
                  <p className="text-gray-900">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Entity</label>
                  <p className="text-gray-900">
                    {selectedLog.entity_type} - {selectedLog.entity_id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Details</label>
                  <pre className="bg-gray-100 rounded p-4 text-sm overflow-auto">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
