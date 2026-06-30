'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'

type SessionPhase = 'IDLE' | 'RUNNING' | 'SUCCESS'

const isWakeLockSupported = () =>
  typeof navigator !== 'undefined' && 'wakeLock' in navigator

interface FocusContextType {
  // Estado do timer
  phase: SessionPhase
  startTime: number | null
  endTime: number | null
  durationSeconds: number | null // Duração total em segundos
  timeLeft: number // Tempo restante em segundos (calculado dinamicamente)
  isPaused: boolean // Estado de pausa
  
  // Controles
  startFocus: (durationSeconds: number) => void
  stopFocus: () => void
  resetFocus: () => void
  togglePause: () => void // Nova função para pausar/retomar
  completeFocusEarly: () => void // Nova função para concluir antecipadamente
  
  // Estado auxiliar
  isActive: boolean
  getElapsedTime: () => number // Tempo decorrido em segundos
  getProgress: () => number // Progresso 0-100
}

const FocusContext = createContext<FocusContextType | undefined>(undefined)

export function FocusProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<SessionPhase>('IDLE')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const wakeLockRef = useRef<any>(null)
  const pausedTimeLeftRef = useRef<number>(0) // Armazenar timeLeft quando pausado

  // ——— Wake Lock API (global): mantém a tela acesa enquanto o timer está rodando ———
  useEffect(() => {
    if (!isWakeLockSupported()) return

    const isActive = phase === 'RUNNING'

    const requestLock = async () => {
      try {
        const wl = (navigator as any).wakeLock
        if (!wl) return
        const sentinel = await wl.request('screen')
        wakeLockRef.current = sentinel
        sentinel.addEventListener('release', () => {
          wakeLockRef.current = null
        })
      } catch (e) {
        // API pode falhar (ex.: low power, restrições do browser)
        wakeLockRef.current = null
      }
    }

    const releaseLock = async () => {
      if (!wakeLockRef.current) return
      try {
        await wakeLockRef.current.release()
      } catch (_) { /* no-op */ }
      wakeLockRef.current = null
    }

    // 1. Ativação: se o timer está rodando, solicitar bloqueio
    if (isActive) {
      requestLock()
    } else {
      // 2. Limpeza: quando não está ativo, liberar
      releaseLock()
    }

    // 3. Re-aquisição: ao voltar para a aba, se o timer ainda estiver ativo, solicitar de novo
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && phase === 'RUNNING') {
        requestLock()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      releaseLock()
    }
  }, [phase])

  // Atualizar timeLeft periodicamente quando ativo
  useEffect(() => {
    // Não atualizar se estiver pausado
    if (isPaused) {
      // Limpar intervalo quando pausado
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }
    
    if (phase === 'RUNNING' && endTime) {
      // Atualizar imediatamente
      const initialRemaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000))
      setTimeLeft(initialRemaining)
      pausedTimeLeftRef.current = initialRemaining
      
      // Configurar intervalo para atualizações frequentes
      intervalRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000))
        setTimeLeft(remaining)
        pausedTimeLeftRef.current = remaining
        
        // Se o tempo acabou, mudar para SUCCESS
        if (remaining <= 0) {
          setPhase('SUCCESS')
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      }, 100) // Atualiza a cada 100ms
    } else {
      // Limpar intervalo quando não está rodando
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      // Calcular timeLeft uma última vez ao parar
      if (endTime) {
        const finalRemaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000))
        setTimeLeft(finalRemaining)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [phase, endTime, isPaused])

  // Função para iniciar o foco
  const startFocus = useCallback((durationSeconds: number) => {
    const now = Date.now()
    const end = now + (durationSeconds * 1000)
    
    setStartTime(now)
    setEndTime(end)
    setDurationSeconds(durationSeconds)
    setTimeLeft(durationSeconds)
    setPhase('RUNNING')
    setIsPaused(false)
    setPauseStartTime(null)
  }, [])

  // Função para parar o foco (desistir)
  const stopFocus = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setPhase('IDLE')
    setStartTime(null)
    setEndTime(null)
    setDurationSeconds(null)
    setTimeLeft(0)
    setIsPaused(false)
    setPauseStartTime(null)
  }, [])

  // Função para concluir o foco antecipadamente
  const completeFocusEarly = useCallback(() => {
    if (phase !== 'RUNNING') return
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    // Calcular tempo decorrido para salvar corretamente
    const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0
    
    setDurationSeconds(elapsed) // Ajustar duração para o tempo real decorrido
    setTimeLeft(0)
    setPhase('SUCCESS') // Mudar para estado de sucesso
  }, [phase, startTime])

  // Função para resetar completamente
  const resetFocus = useCallback(() => {
    stopFocus()
  }, [stopFocus])

  // Função para pausar/retomar o timer
  const togglePause = useCallback(() => {
    if (phase !== 'RUNNING') return
    
    if (!isPaused) {
      // Pausar: marcar o momento da pausa e salvar o timeLeft atual
      pausedTimeLeftRef.current = timeLeft
      setIsPaused(true)
      setPauseStartTime(Date.now())
    } else {
      // Retomar: ajustar startTime e endTime para compensar o tempo parado
      if (pauseStartTime && startTime && endTime) {
        const drift = Date.now() - pauseStartTime // Tempo que ficou parado em ms
        const newStartTime = startTime + drift
        const newEndTime = endTime + drift
        
        setStartTime(newStartTime)
        setEndTime(newEndTime)
      }
      setIsPaused(false)
      setPauseStartTime(null)
    }
  }, [phase, isPaused, pauseStartTime, startTime, endTime, timeLeft])

  // Preservar timeLeft quando pausado
  useEffect(() => {
    if (isPaused && pausedTimeLeftRef.current > 0) {
      setTimeLeft(pausedTimeLeftRef.current)
    }
  }, [isPaused])

  // Calcular tempo decorrido
  const getElapsedTime = useCallback(() => {
    if (!startTime) return 0
    return Math.floor((Date.now() - startTime) / 1000)
  }, [startTime])

  // Calcular progresso (0-100)
  const getProgress = useCallback(() => {
    if (!startTime || !endTime || !durationSeconds) return 0
    const total = durationSeconds
    const elapsed = getElapsedTime()
    return Math.min(100, (elapsed / total) * 100)
  }, [startTime, endTime, durationSeconds, getElapsedTime])

  const value: FocusContextType = {
    phase,
    startTime,
    endTime,
    durationSeconds,
    timeLeft,
    isPaused,
    startFocus,
    stopFocus,
    resetFocus,
    togglePause,
    completeFocusEarly,
    isActive: phase === 'RUNNING',
    getElapsedTime,
    getProgress,
  }

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>
}

export function useFocus() {
  const context = useContext(FocusContext)
  if (context === undefined) {
    throw new Error('useFocus must be used within a FocusProvider')
  }
  return context
}
