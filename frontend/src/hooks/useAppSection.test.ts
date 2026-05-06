import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AppSectionProvider } from '@/contexts/AppSectionContext'
import { useAppSection } from './useAppSection'

describe('useAppSection', () => {
  it('provides initial section as connect', () => {
    const { result } = renderHook(() => useAppSection(), {
      wrapper: AppSectionProvider,
    })

    expect(result.current.section).toBe('connect')
  })

  it('allows changing section', () => {
    const { result } = renderHook(() => useAppSection(), {
      wrapper: AppSectionProvider,
    })

    act(() => {
      result.current.setSection('library')
    })

    expect(result.current.section).toBe('library')
  })

  it('throws when used outside provider', () => {
    expect(() => renderHook(() => useAppSection())).toThrow(
      'useAppSection must be used within AppSectionProvider'
    )
  })
})