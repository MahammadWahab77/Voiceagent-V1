import { useState, useEffect, useRef, useCallback } from 'react';

const getWsUrl = () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
    if (backendUrl) {
        return backendUrl.replace(/^http/, 'ws') + '/ws/chat';
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/chat`;
};
const URL = getWsUrl();

export function useLiveAPI() {
    const [connected, setConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [volume, setVolume] = useState(0);
    const websocketRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioContextRef = useRef(null);
    const audioWorkletNodeRef = useRef(null);
    const sourceNodeRef = useRef(null);

    // Buffer to play incoming audio
    const audioQueueRef = useRef([]);
    const isPlayingRef = useRef(false);

    const connect = useCallback((studentId) => {
        if (websocketRef.current) return;

        const wsURL = studentId ? `${URL}?studentId=${studentId}` : URL;
        const ws = new WebSocket(wsURL);
        websocketRef.current = ws;

        ws.onopen = () => {
            console.log('Connected to Backend WS');
            setConnected(true);
        };

        ws.onclose = () => {
            console.log('Disconnected');
            setConnected(false);
            websocketRef.current = null;
        };

        ws.onmessage = async (event) => {
            try {
                const data = JSON.parse(event.data);

                // Handle Audio from Server (Gemini)
                if (data.serverContent && data.serverContent.modelTurn && data.serverContent.modelTurn.parts) {
                    for (const part of data.serverContent.modelTurn.parts) {
                        if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
                            const pcmData = base64ToFloat32Array(part.inlineData.data);
                            audioQueueRef.current.push(pcmData);
                            playAudioQueue();
                        }
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };
    }, []);

    const disconnect = useCallback(() => {
        if (websocketRef.current) {
            websocketRef.current.close();
            websocketRef.current = null;
        }
        stopRecording();
    }, []);

    const playAudioQueue = async () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
        isPlayingRef.current = true;

        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;

        while (audioQueueRef.current.length > 0) {
            const chunk = audioQueueRef.current.shift();
            const buffer = ctx.createBuffer(1, chunk.length, 24000);
            buffer.getChannelData(0).set(chunk);

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start();

            await new Promise((resolve) => {
                source.onended = resolve;
                // Calculate duration to update volume visualization roughly
                // (Not verified, simple wait)
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
                }
            });

            // Setup Audio Context for recording
            // We use a simple ScriptProcessor or AudioWorklet to downsample/encode to PCM16
            // For simplicity in this demo, we'll assume we can send Base64 chunks.
            // BUT Gemini expects "realtime_input" with "media_chunks".

            const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            const source = ctx.createMediaStreamSource(stream);
            const processor = ctx.createScriptProcessor(4096, 1, 1);

            source.connect(processor);
            processor.connect(ctx.destination);

            processor.onaudioprocess = (e) => {
                if (!websocketRef.current) return;
                const inputData = e.inputBuffer.getChannelData(0);

                // Calculate Volume for UI
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                setVolume(Math.sqrt(sum / inputData.length));

                // Convert Float32 to Int16 PCM Base64
                const pcm16 = floatTo16BitPCM(inputData);
                const base64Audio = arrayBufferToBase64(pcm16);

                const msg = {
                    realtime_input: {
                        media_chunks: [
                            {
                                mime_type: "audio/pcm",
                                data: base64Audio
                            }
                        ]
                    }
                };

                if (websocketRef.current.readyState === WebSocket.OPEN) {
                    websocketRef.current.send(JSON.stringify(msg));
                }
            };

            audioContextRef.current = ctx; // Reuse or separate? usually separate contexts for in/out to avoid loopback
            audioWorkletNodeRef.current = processor;
            sourceNodeRef.current = source;
            setIsRecording(true);

        } catch (err) {
            console.error("Mic Error", err);
        }
    };

    const stopRecording = () => {
        if (sourceNodeRef.current) sourceNodeRef.current.disconnect();
        if (audioWorkletNodeRef.current) {
            audioWorkletNodeRef.current.disconnect();
        }
        setIsRecording(false);
        setVolume(0);
    };

    return { connect, disconnect, connected, isRecording, startRecording, stopRecording, volume };
}


// Helpers
function floatTo16BitPCM(output) {
    const result = new Int16Array(output.length);
    for (let i = 0; i < output.length; i++) {
        const s = Math.max(-1, Math.min(1, output[i]));
        result[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return result.buffer;
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToFloat32Array(base64) {
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
