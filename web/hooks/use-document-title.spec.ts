import { defaultSystemFeatures } from '@/types/feature'
import { act, renderHook } from '@testing-library/react'
import useDocumentTitle from './use-document-title'
import { useGlobalPublicStore } from '@/context/global-public-context'

jest.mock('@/service/common', () => ({
  getSystemFeatures: jest.fn(() => ({ ...defaultSystemFeatures })),
}))

describe('title should be empty if systemFeatures is pending', () => {
  act(() => {
    useGlobalPublicStore.setState({
      systemFeatures: { ...defaultSystemFeatures, branding: { ...defaultSystemFeatures.branding, enabled: false } },
      isGlobalPending: true,
    })
  })
  it('document title should be empty if set title', () => {
    renderHook(() => useDocumentTitle('test'))
    expect(document.title).toBe('')
  })
  it('document title should be empty if not set title', () => {
    renderHook(() => useDocumentTitle(''))
    expect(document.title).toBe('')
  })
})

describe('use default branding', () => {
  beforeEach(() => {
    act(() => {
      useGlobalPublicStore.setState({
        isGlobalPending: false,
        systemFeatures: { ...defaultSystemFeatures, branding: { ...defaultSystemFeatures.branding, enabled: false } },
      })
    })
  })
  it('document title should be test-Fanfei if set title', () => {
    renderHook(() => useDocumentTitle('test'))
    expect(document.title).toBe('test - Fanfei')
  })

  it('document title should be Fanfei if not set title', () => {
    renderHook(() => useDocumentTitle(''))
    expect(document.title).toBe('Fanfei')
  })
})

describe('use specific branding', () => {
  beforeEach(() => {
    act(() => {
      useGlobalPublicStore.setState({
        isGlobalPending: false,
        systemFeatures: { ...defaultSystemFeatures, branding: { ...defaultSystemFeatures.branding, enabled: true, application_title: 'Test' } },
      })
    })
  })
  it('document title should be test-Test if set title', () => {
    renderHook(() => useDocumentTitle('test'))
    expect(document.title).toBe('test - Test')
  })

  it('document title should be Test if not set title', () => {
    renderHook(() => useDocumentTitle(''))
    expect(document.title).toBe('Test')
  })
})
