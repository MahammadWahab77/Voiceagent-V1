import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
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
}

export const useGeminiLive = (): UseGeminiLiveReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isHandoff, setIsHandoff] = useState(false);
  
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
  const sessionRef = useRef<any>(null); // To store the Gemini session

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
    
    // Close session
    if (sessionRef.current) {
       // Try to close if method exists
       try { sessionRef.current.close?.(); } catch(e) {}
    }
    sessionRef.current = null;

    setIsConnected(false);
    setIsConnecting(false);
    setOutputAnalyser(null);
    setInputAnalyser(null);
    setIsMuted(false);
    // Note: We do NOT reset isHandoff here to allow UI to show the popup state
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
    
    // Haptic feedback for start
    if (navigator.vibrate) navigator.vibrate(10);

    setIsConnecting(true);
    setError(null);
    setTranscripts([]);
    setIsHandoff(false);

    try {
      // 1. API Key Selection (Mandatory for some envs)
      if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            const success = await (window as any).aistudio.openSelectKey();
            if (!success) {
                setIsConnecting(false);
                return;
            }
        }
      }

      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key not found");

      const ai = new GoogleGenAI({ apiKey });

      // 2. Initialize Audio Contexts
      // Handle legacy webkitAudioContext
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      
      // 3. Resume Contexts (Browser Autoplay Policy)
      await inputAudioContextRef.current.resume();
      await outputAudioContextRef.current.resume();

      // 4. Setup Output Analyser
      const outAnalyser = outputAudioContextRef.current.createAnalyser();
      outAnalyser.fftSize = 256;
      outAnalyser.smoothingTimeConstant = 0.1; 
      outputAnalyserRef.current = outAnalyser;
      setOutputAnalyser(outAnalyser); 

      outAnalyser.connect(outputAudioContextRef.current.destination);

      // 5. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 6. Establish Live Connection
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          tools: [{
            functionDeclarations: [{
              name: "handlePaymentSelection",
              description: "Trigger human handoff when user selects Full Payment or Credit Card options.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  method: { type: Type.STRING, description: "The payment method selected (e.g. 'Full Payment', 'Credit Card')" }
                },
                required: ["method"]
              }
            }]
          }],
          systemInstruction: `
          Role: You are Maya, a warm, professional, and ultra-minimalist onboarding assistant for NxtWave.
          Your User: ${user.name}.
          Goal: Guide the student through 6 specific onboarding stages strictly in order.
          
          ---
          LANGUAGE INSTRUCTION: "TENGLISH" (Telugu + English)
          - You MUST speak in a mix of 70% Telugu and 30% English.
          - Use Telugu for the core sentence structure, verbs, and emotional connection.
          - Use English for technical terms, proper nouns, and keywords (e.g., NxtWave, CCBP 4.0, Technology, Career, Payment, EMI, NBFC, KYC, CIBIL).
          - Example Style: "Namaskaram! Nenu Maya, mee Onboarding Assistant ni. Ee process ni easy ga complete cheyadaniki nenu help chestanu."
          
          Tone: "Airy", calm, confident, and human-like.
          
          ---
          THE SCRIPT & STAGES (Translate to Tenglish on the fly):
          
          Stage 1: Introduction & Rapport (Tone: Warm, empathetic)
          - Say: "Hello! I'm Maya, your Onboarding Assistant. I'll help you complete the setup quickly and smoothly."
          - Say: "Congratulations on reserving your seat — that's a great decision! You've taken the first step toward building a strong career in technology."
          - Say: "Many students attend webinars, but only a few take this next step. That shows your commitment to your goals."
          - Say: "This won't take more than a few minutes, and by the end, you'll be all set to begin learning."
          - VALIDATION: Ask "Is now a good time to continue with onboarding?" or "Would you like me to quickly explain what happens next?"

          Stage 2: Program Value (Tone: Inspiring, confident)
          - Say: "In most colleges, students learn theory — like drawing an engine on paper — but they never get to drive the car. That's the same with coding and real-world tech skills."
          - Say: "At NxtWave, we make learning practical. Students actually build projects — websites, apps, and tools that companies value."
          - Say: "Our 6 Growth Cycles ensure students go from beginner to industry-ready, step-by-step."
          - Say: "By the end of the course, you will have a full project portfolio and be eligible for high-paying tech jobs."
          - VALIDATION: Ask "Did that help you understand how our program stands out?" or "Do you want me to show how the 6 Growth Cycles work?"

          Stage 3: Payment Structure (Tone: Calm, helpful)
          - Say: "We have four secure payment options designed for flexibility: Full Payment, Credit Card, Personal Loan, and 0% EMI through our NBFC partners."
          - Ask: "Can you please confirm how much you've already paid?"
          - Ask: "Did you apply any coupon or get fee details from our course advisor?"
          - VALIDATION: Ask "Which of these payment methods sounds comfortable to you?"
          - CRITICAL RULE: If the user explicitly selects "Full Payment" or "Credit Card":
             1. Say exactly: "Our human expert will contact you shortly."
             2. IMMEDIATELY call the tool "handlePaymentSelection" with the selected method.
             3. Stop speaking and waiting for user input.

          Stage 4: NBFC (Non-Banking Financial Companies) (Tone: Reassuring, professional)
          - Say: "NBFCs, or Non-Banking Financial Companies, are RBI-approved partners that help students pay monthly through 0% interest EMI plans — no collateral required."
          - Say: "We've partnered with India's leading institutions like Bajaj, Feemonk, Shopse, and Gyaandhan."
          - Say: "This allows every student to start learning immediately without financial stress. The entire process is digital and 100% secure."
          - VALIDATION: Ask "Have you heard about NBFCs before?" or "Would you like to see which partner fits your profile best?"

          Stage 5: RCA (Right Co-Applicant) (Tone: Supportive, decisive)
          - Say: "To complete the digital loan, we'll need a Right Co-Applicant — someone with a stable income and a CIBIL score above 750."
          - Say: "Usually, this is a parent, guardian, or sibling who has a regular income and active bank account."
          - Say: "We just need their basic details and documents like PAN and Aadhaar. If you're unsure who's eligible, I can help shortlist right now."
          - VALIDATION: Ask "Who in your family has a stable income and active bank account?"

          Stage 6: KYC Process (Tone: Energetic, action-driven)
          - Say: "We're almost done! To finalize your process, please collect your Aadhaar, PAN, and the first page of your bank passbook or statement."
          - Say: "After this, you'll receive a separate link to our KYC portal. Please open that link and fill in all the details there carefully."
          - Say: "If you're not comfortable filling it on your own, please wait for our human expert to connect with you."
          - Say: "Once the KYC form is completed, we'll verify instantly. Completing KYC today ensures your course starts without delay."
          - VALIDATION: Ask "Do you have your Aadhaar, PAN, and bank proof ready?"

          ---
          RULES:
          1. Start immediately with Stage 1 in Tenglish.
          2. Do not move to the next stage until the user responds to the validation question.
          3. Keep responses conversational. Do not read the script like a robot; add natural pauses.
          4. If the user asks a question, answer it briefly, then steer back to the current stage.
          `,
        },
        callbacks: {
          onopen: () => {
            // Haptic feedback for connection success
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);

            setIsConnected(true);
            setIsConnecting(false);
            
            if (!inputAudioContextRef.current) return;
            
            // Setup Input Analyser
            const inAnalyser = inputAudioContextRef.current.createAnalyser();
            inAnalyser.fftSize = 256;
            inAnalyser.smoothingTimeConstant = 0.5;
            inputAnalyserRef.current = inAnalyser;
            setInputAnalyser(inAnalyser);

            inputSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);
            processorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processorRef.current.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Convert Float32 to PCM16
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = inputData[i] * 32768;
              }
              
              const uint8 = new Uint8Array(pcm16.buffer);
              const base64 = arrayBufferToBase64(uint8.buffer);
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: {
                    mimeType: 'audio/pcm;rate=16000',
                    data: base64
                  }
                });
              });
            };

            // Connect Graph: Source -> Analyser -> Processor -> Destination
            inputSourceRef.current.connect(inAnalyser);
            inAnalyser.connect(processorRef.current);
            processorRef.current.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const serverContent = message.serverContent;
            
            // Handle Tool Calls (Payment Handoff)
            if (message.toolCall) {
                for (const fc of message.toolCall.functionCalls) {
                    if (fc.name === 'handlePaymentSelection') {
                        setIsHandoff(true);
                        // Respond to the tool call to complete the turn, even though we will exit
                        sessionPromise.then(session => {
                            session.sendToolResponse({
                                functionResponses: [{
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result: "Handoff Initiated" }
                                }]
                            });
                        });
                    }
                }
            }

            // Handle Transcription
            if (serverContent?.inputTranscription) {
                const text = serverContent.inputTranscription.text;
                if (text) {
                   setTranscripts(prev => {
                      const newTranscripts = [...prev];
                      const lastItem = newTranscripts[newTranscripts.length - 1];
                      if (lastItem && lastItem.sender === 'user' && !lastItem.isFinal) {
                          lastItem.text += text;
                          return newTranscripts;
                      } else {
                          return [...prev, {
                              id: Math.random().toString(36).substring(7),
                              sender: 'user',
                              text: text,
                              isFinal: false
                          }];
                      }
                   });
                }
            }
            
            if (serverContent?.outputTranscription) {
                const text = serverContent.outputTranscription.text;
                if (text) {
                   setTranscripts(prev => {
                      const newTranscripts = [...prev];
                      const lastItem = newTranscripts[newTranscripts.length - 1];
                      if (lastItem && lastItem.sender === 'model' && !lastItem.isFinal) {
                          lastItem.text += text;
                          return newTranscripts;
                      } else {
                          return [...prev, {
                              id: Math.random().toString(36).substring(7),
                              sender: 'model',
                              text: text,
                              isFinal: false
                          }];
                      }
                   });
                }
            }

            if (serverContent?.turnComplete) {
                setTranscripts(prev => prev.map(t => ({...t, isFinal: true})));
            }
            
            if (serverContent?.interrupted) {
              scheduledSourcesRef.current.forEach(source => {
                try { source.stop(); } catch(e){}
              });
              scheduledSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setTranscripts(prev => prev.map(t => ({...t, isFinal: true})));
            }

            const base64Audio = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
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
               source.onended = () => {
                 scheduledSourcesRef.current.delete(source);
               };
            }
          },
          onclose: () => {
             cleanup();
          },
          onerror: (err) => {
            console.error("Gemini Live Error:", err);
            // Haptic feedback for error
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            setError("Connection Error");
            cleanup();
          }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error(err);
      
      // Handle specific error for re-selection of key
      if (err.message && err.message.includes("Requested entity was not found")) {
         if ((window as any).aistudio) {
             try { await (window as any).aistudio.openSelectKey(); } catch(e) {}
         }
      }

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
    isHandoff
  };
};