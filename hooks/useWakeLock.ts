'use client'

import { useEffect, useRef, useCallback } from 'react'

interface WakeLockManager {
  requestLock: () => Promise<void>
  releaseLock: () => Promise<void>
  isSupported: boolean
}

/**
 * Hook personalizado para gerenciar a Wake Lock API
 * Impede que a tela do dispositivo desligue durante atividades críticas
 */
export function useWakeLock(): WakeLockManager {
  const wakeLockRef = useRef<any>(null)
  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator

  // Função para solicitar o bloqueio de tela
  const requestLock = useCallback(async () => {
    if (!isSupported) {
      console.warn('WakeLock API não é suportada neste navegador')
      return
    }

    try {
      // Se já existe um bloqueio ativo, não precisa solicitar novamente
      if (wakeLockRef.current) {
        return
      }

      const wakeLock = await (navigator as any).wakeLock.request('screen')
      wakeLockRef.current = wakeLock

      // Tratar o evento de release automático (quando o usuário minimiza o app)
      wakeLock.addEventListener('release', () => {
        wakeLockRef.current = null
      })

      console.log('WakeLock ativado: tela não desligará automaticamente')
    } catch (err: any) {
      console.warn('Erro ao ativar WakeLock:', err.message)
      wakeLockRef.current = null
    }
  }, [isSupported])

  // Função para liberar o bloqueio de tela
  const releaseLock = useCallback(async () => {
    if (!wakeLockRef.current) {
      return
    }

    try {
      await wakeLockRef.current.release()
      wakeLockRef.current = null
      console.log('WakeLock liberado: tela pode desligar normalmente')
    } catch (err: any) {
      console.warn('Erro ao liberar WakeLock:', err.message)
      wakeLockRef.current = null
    }
  }, [])

  // AÇÃO 1: Reativar o bloqueio quando o documento ficar visível novamente
  useEffect(() => {
    if (!isSupported) {
      return
    }

    const handleVisibilityChange = async () => {
      // Se o documento ficou visível e não há bloqueio ativo, reativar
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        // Pequeno delay para garantir que o navegador está pronto
        await new Promise(resolve => setTimeout(resolve, 100))
        await requestLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isSupported, requestLock])

  // Cleanup: Liberar o bloqueio quando o componente desmontar
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        releaseLock().catch(() => {
          // Ignorar erros no cleanup
        })
      }
    }
  }, [releaseLock])

  return {
    requestLock,
    releaseLock,
    isSupported,
  }
}
