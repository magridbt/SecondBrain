'use client'

import { ReactNode } from 'react'

interface ResponsiveTableProps {
  children: ReactNode
  className?: string
}

/**
 * Responsive table wrapper that handles horizontal scrolling on mobile devices.
 * Wrap your <table> element with this component for mobile-friendly tables.
 *
 * Usage:
 * <ResponsiveTable>
 *   <table>...</table>
 * </ResponsiveTable>
 */
export default function ResponsiveTable({ children, className = '' }: ResponsiveTableProps) {
  return (
    <div
      className={`overflow-x-auto -mx-4 sm:mx-0 ${className}`}
      role="region"
      aria-label="Scrollable table"
      tabIndex={0}
    >
      <div className="inline-block min-w-full align-middle px-4 sm:px-0">
        {children}
      </div>
    </div>
  )
}

/**
 * Mobile-friendly card view for table data.
 * Shows as cards on mobile, regular table on larger screens.
 */
interface TableCardProps {
  children: ReactNode
  className?: string
}

export function TableCard({ children, className = '' }: TableCardProps) {
  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700
        p-4 space-y-2 shadow-sm
        ${className}
      `}
    >
      {children}
    </div>
  )
}

interface TableCardRowProps {
  label: string
  children: ReactNode
  className?: string
}

export function TableCardRow({ label, children, className = '' }: TableCardRowProps) {
  return (
    <div className={`flex justify-between items-center ${className}`}>
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{children}</span>
    </div>
  )
}

/**
 * Utility classes for responsive tables
 */
export const tableStyles = {
  // Table container
  container: 'overflow-x-auto -mx-4 sm:mx-0',
  containerInner: 'inline-block min-w-full align-middle px-4 sm:px-0',

  // Table element
  table: 'min-w-full divide-y divide-gray-200 dark:divide-gray-700',

  // Table header
  thead: 'bg-gray-50 dark:bg-gray-800',
  th: 'px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap',

  // Table body
  tbody: 'bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700',
  tr: 'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
  td: 'px-4 py-4 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap',

  // Responsive helpers
  hideOnMobile: 'hidden sm:table-cell',
  showOnMobile: 'sm:hidden',
}
