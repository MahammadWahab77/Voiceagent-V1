import React, { useState, useEffect, useRef } from 'react';
import {
    Mic, MicOff, PhoneOff, Settings, RefreshCw, Loader2,
    MessageCircle, VolumeX, Headphones, Hexagon, Wrench
} from 'lucide-react';

import { User, Stage, STAGES, UseGeminiLiveReturn, TranscriptItem } from '../types';
import { StageTracker } from './StageTracker';
import { Visualizer } from './Visualizer';

interface DashboardProps {
    user: User;
    liveData: UseGeminiLiveReturn;
    onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, liveData, onLogout }) => {
    const {
        isConnected, isConnecting, isMuted, isHandoff, error,
        connect, disconnect, toggleMute,
        outputAnalyser, inputAnalyser, transcripts
    } = liveData;

    const [stages, setStages] = useState<Stage[]>(STAGES);
    const [showGuidelines, setShowGuidelines] = useState(true);
    const [showHandoffPopup, setShowHandoffPopup] = useState(false);
    const [showDevTools, setShowDevTools] = useState(false);
    const [isOfflineOverride, setIsOfflineOverride] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);

    const isOffline = (!isConnected && !isConnecting) || isOfflineOverride;

    // Auto-scroll transcript
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcripts]);

    // Handle Handoff Trigger
    useEffect(() => {
        if (isHandoff) {
            triggerHandoffSequence();
        }
    }, [isHandoff]);

    const triggerHandoffSequence = () => {
        setShowHandoffPopup(true);
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

        setTimeout(() => {
            handleEndSession();
        }, 5000);
    };

    const handleEndSession = () => {
        disconnect();
        onLogout();
    };

    const handleDismissGuidelines = () => {
        setShowGuidelines(false);
        // Auto-connect if ready logic desired, or just wait for user
    };

    const handleRetryConnection = () => {
        setIsOfflineOverride(false);
        connect();
    };

    // -- Dev Tools --
    const devNextStage = () => {
        setStages(prev => {
            const activeIndex = prev.findIndex(s => s.active);
            if (activeIndex === -1 || activeIndex === prev.length - 1) return prev;

            const newStages = [...prev];
            newStages[activeIndex] = { ...newStages[activeIndex], active: false, completed: true };
            newStages[activeIndex + 1] = { ...newStages[activeIndex + 1], active: true };
            return newStages;
        });
    };

    const devResetStages = () => {
        setStages(STAGES);
    };

    return (
        <div className="relative h-screen w-full bg-white overflow-hidden font-sans text-slate-800">

            {/* Background Blobs */}
            <div className={`absolute top-[-20%] right-[-10%] w-[800px] h-[800px] rounded-full blur-[100px] opacity-40 animate-[float-slow_20s_infinite] transition-colors duration-1000 ${isOffline ? 'bg-slate-300' : 'bg-[#C9F0FF]'}`} />
            <div className={`absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[80px] opacity-40 animate-[float_15s_infinite_reverse] transition-colors duration-1000 ${isOffline ? 'bg-slate-400' : 'bg-[#E7D9FF]'}`} />

            {/* Header */}
            <header className="relative z-20 flex justify-between items-center px-6 py-4 bg-white/60 backdrop-blur-md border-b border-white/50 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-900 p-2 rounded-xl">
                        <Hexagon className="text-white w-5 h-5 fill-current" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-tight">Maya</h1>
                        <p className="text-xs text-slate-500 font-medium">
                            {user.name} | {user.mobileNumber}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {isOffline ? (
                        <button
                            onClick={handleRetryConnection}
                            className="px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-semibold flex items-center gap-2 border border-red-100 hover:bg-red-100 transition-colors"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Offline — Reconnect
                        </button>
                    ) : isConnecting ? (
                        <div className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold flex items-center gap-2 border border-blue-100">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Connecting...
                        </div>
                    ) : (
                        <div className="px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-xs font-semibold flex items-center gap-2 border border-green-100 relative">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Live
                        </div>
                    )}
                </div>
            </header>

            {/* Connection Lost Banner */}
            {isOffline && (
                <div className="relative z-20 bg-red-50 border-b border-red-100 px-6 py-2 text-xs font-medium text-red-600 flex justify-center items-center animate-fadeInUp">
                    Connection lost. Please check your internet or click Reconnect.
                </div>
            )}

            {/* Main Content Layout */}
            <main className="relative z-10 h-[calc(100vh-80px)] p-4 md:p-6 flex flex-col md:flex-row gap-6">

                {/* Left: Stages */}
                <section className="hidden md:block w-72 shrink-0">
                    <StageTracker stages={stages} isOffline={isOffline} />
                </section>

                {/* Mobile: Stages (Horizontal) */}
                <section className="md:hidden w-full shrink-0">
                    <StageTracker stages={stages} mobileView isOffline={isOffline} />
                </section>

                {/* Center: Visualizer */}
                <section className="flex-1 flex flex-col items-center justify-center relative min-h-[300px]">
                    <Visualizer
                        outputAnalyser={outputAnalyser}
                        inputAnalyser={inputAnalyser}
                        isOffline={isOffline}
                    />

                    {/* Error Toast */}
                    {error && (
                        <div className="absolute bottom-4 bg-red-500 text-white px-4 py-2 rounded-lg text-sm shadow-lg animate-fadeInUp">
                            {error}
                        </div>
                    )}
                </section>

                {/* Right: Transcript */}
                <section className={`
            glass-panel rounded-2xl flex flex-col transition-all duration-300
            md:w-96 md:h-full
            w-full h-1/3 md:h-auto
            ${isOffline ? 'opacity-50' : ''}
        `}>
                    <div className="p-4 border-b border-white/50 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-slate-400" />
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Transcript</h3>
                    </div>

                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar scroll-smooth"
                    >
                        {transcripts.map((t) => (
                            <div
                                key={t.id}
                                className={`flex ${t.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`
                    max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm
                    ${t.sender === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-none'
                                        : 'bg-white/80 backdrop-blur-sm text-slate-700 border border-slate-100 rounded-bl-none'}
                 `}>
                                    {t.text}
                                </div>
                            </div>
                        ))}
                        {transcripts.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                                <p>Conversation will appear here...</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* Controls Footer */}
            <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-6">
                {isOffline ? (
                    <button
                        onClick={handleRetryConnection}
                        className="h-16 w-16 bg-red-500 rounded-full shadow-lg shadow-red-500/30 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all"
                    >
                        <RefreshCw className="w-8 h-8" />
                    </button>
                ) : (
                    <>
                        {!isConnecting && (
                            <button
                                onClick={toggleMute}
                                className={`
                    h-14 w-14 rounded-full border shadow-lg flex items-center justify-center transition-all
                    ${isMuted
                                        ? 'bg-red-50 border-red-200 text-red-500'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}
                  `}
                            >
                                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                            </button>
                        )}

                        <button
                            onClick={isConnected ? handleEndSession : () => connect()}
                            className={`
                h-16 w-16 rounded-full shadow-xl flex items-center justify-center text-white transition-all transform hover:scale-105 active:scale-95
                ${isConnected
                                    ? 'bg-red-500 shadow-red-500/40 hover:bg-red-600'
                                    : 'bg-blue-600 shadow-blue-500/40 hover:bg-blue-700'}
              `}
                            disabled={isConnecting}
                        >
                            {isConnecting ? (
                                <Loader2 className="w-8 h-8 animate-spin" />
                            ) : isConnected ? (
                                <PhoneOff className="w-8 h-8" />
                            ) : (
                                <Mic className="w-8 h-8" />
                            )}
                        </button>
                    </>
                )}
            </footer>

            {/* Guidelines Modal */}
            {showGuidelines && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-xl animate-fadeIn">
                    <div className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-md mx-4 text-center border border-white/50">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Settings className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Get Ready</h2>
                        <p className="text-slate-500 text-sm mb-8">Please check the following before we start.</p>

                        <div className="space-y-4 mb-8 text-left">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50">
                                <Headphones className="w-6 h-6 text-slate-400" />
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">Wear Earphones</p>
                                    <p className="text-xs text-slate-500">For best audio quality</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50">
                                <VolumeX className="w-6 h-6 text-slate-400" />
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">Silent Environment</p>
                                    <p className="text-xs text-slate-500">Minimize background noise</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50">
                                <MessageCircle className="w-6 h-6 text-slate-400" />
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">Say "Hello"</p>
                                    <p className="text-xs text-slate-500">To start the conversation</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleDismissGuidelines}
                            className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition"
                        >
                            I'm Ready
                        </button>
                    </div>
                </div>
            )}

            {/* Handoff Popup */}
            {showHandoffPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-3xl p-8 w-80 text-center shadow-2xl animate-[pulse-glow_2s_infinite]">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
                            <Headphones className="w-10 h-10 animate-bounce" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Connecting Listener</h3>
                        <p className="text-slate-500 text-sm mb-6">Please wait while we transfer you to a human expert...</p>
                        <div className="flex justify-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-0" />
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100" />
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200" />
                        </div>
                    </div>
                </div>
            )}

            {/* Dev Tools Toggle */}
            <button
                onClick={() => setShowDevTools(!showDevTools)}
                className="fixed bottom-4 left-4 z-50 p-3 bg-white/20 hover:bg-white/40 backdrop-blur rounded-full transition-all text-slate-400 hover:text-slate-800"
            >
                <Wrench className="w-4 h-4" />
            </button>

            {/* Dev Tools Panel */}
            {showDevTools && (
                <div className="fixed bottom-16 left-4 z-50 glass-panel p-4 rounded-2xl w-48 space-y-2 animate-fadeInUp">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Dev Tools</h4>
                    <button onClick={devNextStage} className="w-full text-xs text-left p-2 hover:bg-white/50 rounded flex justify-between">
                        Next Stage
                    </button>
                    <button onClick={() => triggerHandoffSequence()} className="w-full text-xs text-left p-2 hover:bg-white/50 rounded flex justify-between">
                        Test Handoff
                    </button>
                    <button onClick={() => setShowGuidelines(true)} className="w-full text-xs text-left p-2 hover:bg-white/50 rounded flex justify-between">
                        Open Guidelines
                    </button>
                    <button onClick={() => setIsOfflineOverride(!isOfflineOverride)} className="w-full text-xs text-left p-2 hover:bg-white/50 rounded flex justify-between text-red-500">
                        Force Offline
                    </button>
                    <button onClick={devResetStages} className="w-full text-xs text-left p-2 hover:bg-white/50 rounded flex justify-between text-blue-500">
                        Reset Stages
                    </button>
                </div>
            )}

        </div>
    );
};
