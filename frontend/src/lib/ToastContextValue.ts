import { createContext, type ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
}

export interface ToastContextValue {
  toasts: Toast[]
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  dismiss: (id: string) => void
}

export interface ToastProviderProps {
  children: ReactNode
  autoDismissMs?: number
}

export const ToastContext = createContext<ToastContextValue | null>(null)