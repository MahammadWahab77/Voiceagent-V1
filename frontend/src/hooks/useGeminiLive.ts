import { useState, useRef, useCallback, useEffect } from 'react';
import { TranscriptItem, UseGeminiLiveReturn } from '../types';

// Helper to auto-derive WS URL from Backend URL
const getWsUrl = () => {
    const wsEnv = import.meta.env.VITE_BACKEND_WS_URL;
    if (wsEnv) return wsEnv;

    const httpUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    const isSecure = httpUrl.startsWith('https');
    const wsProtocol = isSecure ? 'wss' : 'ws';
    const domain = httpUrl.replace(/^https?:\/\//, '');
    return `${wsProtocol}://${domain}/ws/chat`;
};

const URL = getWsUrl();

export function useGeminiLive(): UseGeminiLiveReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isHandoff, setIsHandoff] = useState(false);
    const [handoffReason, setHandoffReason] = useState<string | null>(null);
    const [currentStage, setCurrentStage] = useState<number>(1);
    const [stageName, setStageName] = useState<string>('Welcome');
    const [error, setError] = useState<string | null>(null);
    const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);

    // Web Audio Refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputAnalyserRef = useRef<AnalyserNode | null>(null);
    const outputAnalyserRef = useRef<AnalyserNode | null>(null);
    const [inputAnalyser, setInputAnalyser] = useState<AnalyserNode | null>(null);
    const [outputAnalyser, setOutputAnalyser] = useState<AnalyserNode | null>(null);

    const websocketRef = useRef<WebSocket | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);

    // Audio Queue
    const audioQueueRef = useRef<Float32Array[]>([]);
    const isPlayingRef = useRef(false);

    // Initialize Audio Context
    const initAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            const outAnalyser = audioContextRef.current.createAnalyser();
            outAnalyser.fftSize = 256;
            outputAnalyserRef.current = outAnalyser;
            setOutputAnalyser(outAnalyser);
        }
        return audioContextRef.current;
    }, []);

    const connect = useCallback((studentId?: string) => {
        if (websocketRef.current) return;

        setIsConnecting(true);
        setError(null);

        const wsURL = studentId ? `${URL}?studentId=${studentId}` : URL;
        const ws = new WebSocket(wsURL);
        websocketRef.current = ws;

        ws.onopen = () => {
            console.log('Connected to Backend WS');
            setConnected(true);
            setIsConnecting(false);
            setIsConnected(true);

            // Add initial greeting transcript (simulated for now)
            setTranscripts(prev => [...prev, {
                id: crypto.randomUUID(),
                sender: 'model',
                text: "Hello! I'm Maya, your onboarding assistant. Are you ready to get started?",
                isFinal: true,
                timestamp: new Date()
            }]);
        };

        ws.onclose = () => {
            console.log('Disconnected');
            setConnected(false);
            setIsConnected(false);
            setIsConnecting(false);
            setIsRecording(false);
            websocketRef.current = null;
        };

        ws.onerror = (e) => {
            console.error("WebSocket Error", e);
            setError("Connection failed");
            setIsConnecting(false);
        };

        ws.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);

                // Handle Audio
                if (data.serverContent?.modelTurn?.parts) {
                    for (const part of data.serverContent.modelTurn.parts) {
                        if (part.inlineData?.mimeType.startsWith('audio/pcm')) {
                            const pcmData = base64ToFloat32Array(part.inlineData.data);
                            audioQueueRef.current.push(pcmData);
                            playAudioQueue();
                        }
                        // Handle Text parts for transcript
                        if (part.text) {
                            setTranscripts(prev => [...prev, {
                                id: crypto.randomUUID(),
                                sender: 'model',
                                text: part.text,
                                isFinal: true,
                                timestamp: new Date()
                            }]);
                        }
                    }
                }

                // Handle handoff trigger from backend
                if (data.type === 'HANDOFF_INITIATED') {
                    setIsHandoff(true);
                    setHandoffReason(data.reason || data.method || 'Handoff requested');
                }

                // Handle stage updates from backend
                if (data.type === 'STAGE_UPDATE') {
                    setCurrentStage(data.newStage);
                    setStageName(data.stageName || `Stage ${data.newStage}`);
                }

            } catch (e) {
                console.error(e);
            }
        };
    }, []);

    const setConnected = (status: boolean) => {
        // Helper to ensure consistency
        setIsConnected(status);
    };

    const playAudioQueue = async () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
        isPlayingRef.current = true;

        const ctx = initAudioContext();
        if (ctx.state === 'suspended') await ctx.resume();

        while (audioQueueRef.current.length > 0) {
            const chunk = audioQueueRef.current.shift();
            if (!chunk) continue;

            const buffer = ctx.createBuffer(1, chunk.length, 24000);
            buffer.getChannelData(0).set(chunk);

            const source = ctx.createBufferSource();
            source.buffer = buffer;

            // Connect to analyser then destination
            if (outputAnalyserRef.current) {
                source.connect(outputAnalyserRef.current);
                outputAnalyserRef.current.connect(ctx.destination);
            } else {
                source.connect(ctx.destination);
            }

            source.start();

            await new Promise((resolve) => {
                source.onended = resolve;
            });
        }

        isPlayingRef.current = false;
    };

    const startRecording = async () => {
        if (!navigator.mediaDevices) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });
            mediaStreamRef.current = stream;

            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const source = ctx.createMediaStreamSource(stream);

            // Setup Analyser for input visualization
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            inputAnalyserRef.current = analyser;
            setInputAnalyser(analyser);

            // Load AudioWorklet module
            await ctx.audioWorklet.addModule('/audio-processor.js');

            // Create AudioWorkletNode
            const workletNode = new AudioWorkletNode(ctx, 'audio-processor');

            // Handle messages from the worklet
            workletNode.port.onmessage = (event) => {
                if (event.data.type === 'audio' && websocketRef.current && !isMuted) {
                    const inputData = event.data.audioData;

                    // Convert and send
                    const pcm16 = floatTo16BitPCM(inputData);
                    const base64Audio = arrayBufferToBase64(pcm16);

                    const msg = {
                        realtime_input: {
                            media_chunks: [{ mime_type: "audio/pcm", data: base64Audio }]
                        }
                    };

                    if (websocketRef.current.readyState === WebSocket.OPEN) {
                        websocketRef.current.send(JSON.stringify(msg));
                    }
                }
            };

            source.connect(analyser);
            analyser.connect(workletNode);
            workletNode.connect(ctx.destination);

            audioWorkletNodeRef.current = workletNode as any;
            setIsRecording(true);

        } catch (err) {
            console.error("Mic Error", err);
            setError("Microphone access denied");
        }
    };

    const stopRecording = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (audioWorkletNodeRef.current) {
            audioWorkletNodeRef.current.disconnect();
        }
        setIsRecording(false);
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    const disconnect = useCallback(() => {
        if (websocketRef.current) {
            websocketRef.current.close();
            websocketRef.current = null;
        }
        stopRecording();
        setIsConnected(false);
    }, []);

    // Check for auto-start recording when connected
    useEffect(() => {
        if (isConnected && !isRecording) {
            startRecording();
        }
    }, [isConnected]);

    return {
        isConnected,
        isConnecting,
        isRecording,
        isMuted,
        isHandoff,
        handoffReason,
        currentStage,
        stageName,
        error,
        connect,
        disconnect,
        toggleMute,
        outputAnalyser,
        inputAnalyser,
        transcripts
    };
}

// Helpers
function floatTo16BitPCM(output: Float32Array) {
    const result = new Int16Array(output.length);
    for (let i = 0; i < output.length; i++) {
        const s = Math.max(-1, Math.min(1, output[i]));
        result[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return result.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToFloat32Array(base64: string) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
    }
    return float32;
}
