'use client'

import { useState, createContext, useContext, useCallback } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'default'
  icon?: React.ReactNode
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}

const VARIANT_STYLES = {
  danger: {
    icon: 'bg-red-100 dark:bg-red-900/30 text-red-600',
    button: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  default: {
    icon: 'bg-sage-100 dark:bg-sage-900/30 text-sage-600',
    button: 'bg-gradient-to-r from-sage-500 to-sage-400 hover:from-sage-600 hover:to-sage-500 text-white',
  },
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    setIsOpen(true)
    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve)
    })
  }, [])

  const handleConfirm = () => {
    setIsOpen(false)
    resolvePromise?.(true)
  }

  const handleCancel = () => {
    setIsOpen(false)
    resolvePromise?.(false)
  }

  const variant = options?.variant || 'default'
  const styles = VARIANT_STYLES[variant]

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {/* Dialog */}
      {isOpen && options && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
            onClick={handleCancel}
          />

          {/* Dialog Content */}
          <div
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md animate-slideUp"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
          >
            <div className="p-6">
              {/* Icon */}
              <div className={`w-12 h-12 rounded-full ${styles.icon} flex items-center justify-center mx-auto mb-4`}>
                {options.icon || (variant === 'danger' ? <Trash2 size={24} /> : <AlertTriangle size={24} />)}
              </div>

              {/* Title */}
              <h2
                id="confirm-title"
                className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2"
              >
                {options.title}
              </h2>

              {/* Message */}
              <p
                id="confirm-message"
                className="text-gray-600 dark:text-gray-400 text-center"
              >
                {options.message}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
              >
                {options.cancelText || 'Cancel'}
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all ${styles.button}`}
              >
                {options.confirmText || 'Confirm'}
              </button>
            </div>

            {/* Close button */}
            <button
              onClick={handleCancel}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
