import { useState, useRef, useCallback, useEffect } from 'react';
import { arrayBufferToBase64, base64ToFloat32Array } from '../utils/audioUtils';
import { TranscriptItem, User } from '../types';

export interface UseGeminiLiveReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connect: (user: User) => Promise<void>;
  disconnect: () => void;
  outputAnalyser: AnalyserNode | null;
  inputAnalyser: AnalyserNode | null;
  error: string | null;
  transcripts: TranscriptItem[];
  isMuted: boolean;
  toggleMute: () => void;
  isHandoff: boolean;
  clientWebSocket: WebSocket | null; // Expose WS for Dashboard
}

export const useGeminiLive = (): UseGeminiLiveReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isHandoff, setIsHandoff] = useState(false);
  const [clientWebSocket, setClientWebSocket] = useState<WebSocket | null>(null);

  // Refs for audio context and nodes
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const inputAnalyserRef = useRef<AnalyserNode | null>(null);

  const [outputAnalyser, setOutputAnalyser] = useState<AnalyserNode | null>(null);
  const [inputAnalyser, setInputAnalyser] = useState<AnalyserNode | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Queue for audio playback
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);

  const cleanup = useCallback(() => {
    // Haptic feedback for disconnect
    if (navigator.vibrate) navigator.vibrate(20);

    // Stop all scheduled sources
    scheduledSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch (e) { /* ignore */ }
    });
    scheduledSourcesRef.current.clear();

    // Close audio contexts
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    // Stop Microphone Stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setOutputAnalyser(null);
    setInputAnalyser(null);
    setIsMuted(false);
    setClientWebSocket(null);
    // Note: We do NOT reset isHandoff to allow UI to show the popup state if triggered
  }, []);

  const toggleMute = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(prev => !prev);
    }
  }, []);

  const connect = useCallback(async (user: User) => {
    if (isConnecting || isConnected) return;

    if (navigator.vibrate) navigator.vibrate(10);
    setIsConnecting(true);
    setError(null);
    setTranscripts([]);
    setIsHandoff(false);

    try {
      // 1. Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });

      await inputAudioContextRef.current.resume();
      await outputAudioContextRef.current.resume();

      // 2. Setup Output Analyser
      const outAnalyser = outputAudioContextRef.current.createAnalyser();
      outAnalyser.fftSize = 256;
      outAnalyser.smoothingTimeConstant = 0.1;
      outputAnalyserRef.current = outAnalyser;
      setOutputAnalyser(outAnalyser);

      outAnalyser.connect(outputAudioContextRef.current.destination);

      // 3. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 4. Connect WebSocket to Backend
      // Using user.id if available, or just 'unknown'. Ideally pass more auth info.
      // But for now, backend uses query param for studentId.
      // Since user object might not have ID, we might need to rely on localStorage or similar if strictly needed.
      // For now, let's assume 'test-student' if missing, or use user.mobileNumber as a fallback ID?
      // Better to check if user has an id property in the interface.
      // Interface User { name, mobileNumber }. No ID.
      // We'll pass mobileNumber as studentId for now or let backend handle lookup? 
      // The backend looks up by ID.
      // Let's assume the prop `user` passed to connect IS the student object from DB (which has ID).
      // If Typescript complains, we cast it.
      const studentId = (user as any).id || 'unknown';

      // Use localhost:3001 for dev
      const wsUrl = `ws://localhost:3001/ws/chat?studentId=${studentId}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setClientWebSocket(ws);

      ws.onopen = () => {
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        setIsConnected(true);
        setIsConnecting(false);

        // Start Audio Processing
        if (!inputAudioContextRef.current) return;

        const inAnalyser = inputAudioContextRef.current.createAnalyser();
        inAnalyser.fftSize = 256;
        inAnalyser.smoothingTimeConstant = 0.5;
        inputAnalyserRef.current = inAnalyser;
        setInputAnalyser(inAnalyser);

        const source = inputAudioContextRef.current.createMediaStreamSource(stream);
        inputSourceRef.current = source;

        const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;

          const inputData = e.inputBuffer.getChannelData(0);
          // Float32 -> PCM16
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = inputData[i] * 32768;
          }
          const uint8 = new Uint8Array(pcm16.buffer);
          const base64 = arrayBufferToBase64(uint8.buffer);

          // Send proper JSON message to backend
          ws.send(JSON.stringify({
            realtime_input: {
              media_chunks: [{
                mime_type: "audio/pcm",
                data: base64
              }]
            }
          }));
        };

        source.connect(inAnalyser);
        inAnalyser.connect(processor);
        processor.connect(inputAudioContextRef.current.destination);
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);

          // Handle custom generic messages like STAGE_UPDATE or HANDOFF
          if (message.type === 'HANDOFF_INITIATED') {
            setIsHandoff(true);
            return;
          }
          // Backend might proxy the raw Gemini message.
          // We look for 'serverContent' or 'toolCall' etc.
          const serverContent = message.serverContent;

          // Handle Transcription
          if (serverContent?.modelTurn?.parts?.[0]?.text) {
            // Sometimes text comes in modelTurn
            const text = serverContent.modelTurn.parts[0].text;
            setTranscripts(prev => [...prev, {
              id: Math.random().toString(36).substring(7),
              sender: 'model',
              text: text,
              isFinal: true
            }]);
          }

          if (serverContent?.modelTurn?.parts?.[0]?.inlineData) {
            // Audio Data
            const base64Audio = serverContent.modelTurn.parts[0].inlineData.data;
            if (base64Audio && outputAudioContextRef.current && outputAnalyserRef.current) {
              const ctx = outputAudioContextRef.current;
              const float32 = base64ToFloat32Array(base64Audio);
              const buffer = ctx.createBuffer(1, float32.length, 24000);
              buffer.getChannelData(0).set(float32);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(outputAnalyserRef.current);
              const currentTime = ctx.currentTime;
              if (nextStartTimeRef.current < currentTime) {
                nextStartTimeRef.current = currentTime;
              }
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              scheduledSourcesRef.current.add(source);
              source.onended = () => scheduledSourcesRef.current.delete(source);
            }
          }

          // Handle User Transcription (from backend if enabled, or echoed)
          // Currently Gemini API sends inputTranscription in serverContent too
          // But we might not have enabled it in backend config? 
          // Verify backend 'setupMessage' includes transcription config if we want this.
        } catch (e) {
          console.error("Error parsing WS message:", e);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket Disconnected");
        cleanup();
      };

      ws.onerror = (e) => {
        console.error("WebSocket Error:", e);
        setError("Connection Error");
        cleanup();
      };

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect");
      cleanup();
    }
  }, [isConnected, isConnecting, cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    outputAnalyser,
    inputAnalyser,
    error,
    transcripts,
    isMuted,
    toggleMute,
    isHandoff,
    clientWebSocket
  };
};