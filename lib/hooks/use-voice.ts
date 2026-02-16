"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type VoiceState = "idle" | "ready" | "listening" | "processing" | "speaking"

interface UseVoiceOptions {
  onWakeWord?: () => void
  onTranscript?: (text: string, isFinal: boolean) => void
  onStateChange?: (state: VoiceState) => void
  wakeWord?: string
  enabled?: boolean
}

interface UseVoiceReturn {
  state: VoiceState
  isListening: boolean
  isSpeaking: boolean
  startListening: () => void
  stopListening: () => void
  speak: (text: string) => Promise<void>
  cancelSpeech: () => void
  interimTranscript: string
  supported: boolean
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const {
    onWakeWord,
    onTranscript,
    onStateChange,
    wakeWord = "hey adnoc",
    enabled = true,
  } = options

  const [state, setState] = useState<VoiceState>("idle")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [supported, setSupported] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const wakeDetectedRef = useRef(false)
  const stateRef = useRef<VoiceState>("idle")

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Check browser support
  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition
        : null
    setSupported(!!SpeechRecognition && typeof window !== "undefined" && "speechSynthesis" in window)
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis
    }
  }, [])

  const updateState = useCallback(
    (newState: VoiceState) => {
      setState(newState)
      onStateChange?.(newState)
    },
    [onStateChange]
  )

  const startListening = useCallback(() => {
    if (!supported || !enabled) return

    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition

    if (!SpeechRecognition) return

    // Stop any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {
        // ignore
      }
    }

    const recognition = new (SpeechRecognition as new () => SpeechRecognition)()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ""
      let finalTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interim += transcript
        }
      }

      setInterimTranscript(interim)

      // Check for wake word if not yet detected
      if (!wakeDetectedRef.current) {
        const combined = (finalTranscript + " " + interim).toLowerCase()
        if (combined.includes(wakeWord.toLowerCase())) {
          wakeDetectedRef.current = true
          onWakeWord?.()
          updateState("listening")
          setInterimTranscript("")
          return
        }
      }

      // If wake word detected, pass transcripts through
      if (wakeDetectedRef.current && finalTranscript) {
        onTranscript?.(finalTranscript.trim(), true)
        setInterimTranscript("")
      } else if (wakeDetectedRef.current && interim) {
        onTranscript?.(interim.trim(), false)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn("Speech recognition error:", event.error)
      if (event.error === "not-allowed") {
        updateState("idle")
        return
      }
      // Auto-restart on non-fatal errors
      if (event.error !== "aborted" && stateRef.current !== "idle") {
        setTimeout(() => {
          if (stateRef.current !== "idle" && stateRef.current !== "speaking") {
            startListening()
          }
        }, 500)
      }
    }

    recognition.onend = () => {
      // Auto-restart if we're still in a listening state
      if (stateRef.current === "listening" || stateRef.current === "ready") {
        setTimeout(() => {
          if (stateRef.current !== "idle" && stateRef.current !== "speaking") {
            try {
              recognition.start()
            } catch {
              // ignore - may already be running
            }
          }
        }, 100)
      }
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
      if (!wakeDetectedRef.current) {
        updateState("ready")
      }
    } catch {
      // ignore
    }
  }, [supported, enabled, wakeWord, onWakeWord, onTranscript, updateState])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }
    wakeDetectedRef.current = false
    setInterimTranscript("")
    updateState("idle")
  }, [updateState])

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!synthRef.current) return

      // Cancel any ongoing speech
      synthRef.current.cancel()
      updateState("speaking")

      // Split by sentence for natural pauses
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]

      for (const sentence of sentences) {
        await new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(sentence.trim())
          utterance.rate = 0.95
          utterance.pitch = 1.0
          utterance.volume = 1.0
          utterance.lang = "en-US"

          // Try to find a good voice
          const voices = synthRef.current?.getVoices() || []
          const preferredVoice =
            voices.find((v) => v.name.includes("Samantha")) ||
            voices.find((v) => v.name.includes("Google") && v.lang.startsWith("en")) ||
            voices.find((v) => v.lang.startsWith("en") && v.localService)
          if (preferredVoice) utterance.voice = preferredVoice

          utterance.onend = () => resolve()
          utterance.onerror = () => resolve()
          synthRef.current?.speak(utterance)
        })

        // Natural pause between sentences
        await new Promise((resolve) => setTimeout(resolve, 600))
      }

      // After speaking, go back to listening
      if (stateRef.current === "speaking") {
        updateState("listening")
        // Restart recognition for next input
        if (wakeDetectedRef.current) {
          startListening()
        }
      }
    },
    [updateState, startListening]
  )

  const cancelSpeech = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel()
    }
    if (stateRef.current === "speaking") {
      updateState("listening")
    }
  }, [updateState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  return {
    state,
    isListening: state === "listening" || state === "ready",
    isSpeaking: state === "speaking",
    startListening,
    stopListening,
    speak,
    cancelSpeech,
    interimTranscript,
    supported,
  }
}
