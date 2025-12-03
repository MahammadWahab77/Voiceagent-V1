import React, { useEffect, useRef, useState } from 'react';
import { UseGeminiLiveReturn } from '../hooks/useGeminiLive';
import Visualizer from './Visualizer';
import StageTracker from './StageTracker';
import { STAGES, User, Stage } from '../types';
import { Mic, PhoneOff, Loader2, Info, MicOff, Headset, Headphones, VolumeX, MessageCircle, Wrench, Play, CreditCard, RefreshCw, X, WifiOff, AlertTriangle, RefreshCcw } from 'lucide-react';

interface DashboardProps {
  user: User;
  liveData: UseGeminiLiveReturn;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, liveData, onLogout }) => {
  const { isConnected, isConnecting, connect, disconnect, outputAnalyser, inputAnalyser, error, transcripts, isMuted, toggleMute, isHandoff } = liveData;
  const scrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const [showHandoffPopup, setShowHandoffPopup] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(true);
  
  // State for Stages (to allow DevTools to manipulate them)
  const [stages, setStages] = useState<Stage[]>(STAGES);
  const [showDevTools, setShowDevTools] = useState(false);

  const isOffline = !isConnected && !isConnecting;

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (mobileScrollRef.current) {
        mobileScrollRef.current.scrollTop = mobileScrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  // Handle Human Handoff Trigger
  useEffect(() => {
    if (isHandoff) {
        triggerHandoffSequence();
    }
  }, [isHandoff]);

  const triggerHandoffSequence = () => {
    setShowHandoffPopup(true);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    
    // Wait for the audio "Our human expert will contact you shortly" to finish (approx 4-5s)
    const timeout = setTimeout(() => {
        disconnect();
        onLogout();
    }, 5000);
    return () => clearTimeout(timeout);
  };

  const handleToggleMute = () => {
    if (navigator.vibrate) navigator.vibrate(10);
    toggleMute();
  };

  const handleDisconnect = () => {
    if (navigator.vibrate) navigator.vibrate(10);
    disconnect();
  };

  const handleEndSession = () => {
    if (navigator.vibrate) navigator.vibrate(10);
    disconnect();
    onLogout();
  };

  const handleConnect = () => {
    if (navigator.vibrate) navigator.vibrate(10);
    // Pass the user object to the connect function for personalized system instructions
    connect(user);
  };

  const handleDismissGuidelines = () => {
    setShowGuidelines(false);
  };

  // --- Dev Tools Logic ---
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

  const devTriggerHandoff = () => {
      triggerHandoffSequence();
  };

  const devShowGuidelines = () => {
      setShowGuidelines(true);
  };
  // -----------------------

  return (
    <div className="relative w-full h-screen bg-white flex flex-col overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top Right Blob */}
        <div className={`absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-[#C9F0FF] rounded-full mix-blend-multiply filter blur-[80px] opacity-40 animate-[float-slow_20s_infinite_reverse] transition-colors duration-1000 ${isOffline ? 'bg-gray-200' : ''}`} />
        {/* Bottom Left Blob */}
        <div className={`absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] bg-[#E7D9FF] rounded-full mix-blend-multiply filter blur-[80px] opacity-40 animate-[float-slow_25s_infinite] transition-colors duration-1000 ${isOffline ? 'bg-gray-300' : ''}`} />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col h-full">
        
        {/* Header */}
        <header className="px-6 py-4 md:p-8 flex justify-between items-center z-20 shrink-0 bg-white/50 backdrop-blur-sm border-b border-white/40">
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full transition-colors duration-500 ${isOffline ? 'bg-gray-400' : 'bg-black'}`} />
                    <span className="font-semibold text-lg tracking-tight text-gray-900">Maya</span>
                </div>
                <div className="text-xs text-gray-500 mt-1 font-medium">
                  {user.name} <span className="text-gray-300">|</span> {user.mobileNumber}
                </div>
            </div>
            
            <div className={`transition-all duration-300 relative`}>
                {isConnected ? (
                    <div className="px-4 py-2 bg-green-50/80 backdrop-blur-md rounded-full border border-green-100 text-xs font-medium text-green-700 shadow-sm flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Live
                    </div>
                ) : isConnecting ? (
                     <div className="px-4 py-2 bg-blue-50/80 backdrop-blur-md rounded-full border border-blue-100 text-xs font-medium text-blue-700 shadow-sm flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Connecting...
                    </div>
                ) : (
                    <button 
                        onClick={handleConnect}
                        className="group flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 backdrop-blur-md rounded-full border border-red-100 text-xs font-medium text-red-600 shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                    >
                         <span className="w-2 h-2 bg-red-500 rounded-full group-hover:animate-ping" />
                         Offline — Reconnect
                    </button>
                )}
            </div>
        </header>

        {/* Inline Error Banner (Visible when Offline) */}
        {isOffline && (
            <div className="w-full bg-gradient-to-r from-red-50 via-orange-50 to-red-50 border-b border-red-100 px-6 py-3 flex items-center justify-between animate-[fadeIn_0.3s_ease-out] z-30 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-red-900 leading-tight">Connection Lost</p>
                        <p className="text-xs text-red-700/80">Your network seems unstable. The session will resume once reconnected.</p>
                    </div>
                </div>
                <button 
                    onClick={handleConnect}
                    className="ml-4 px-4 py-2 bg-white text-red-600 text-xs font-semibold rounded-lg border border-red-100 shadow-sm hover:bg-red-50 hover:border-red-200 transition-all active:scale-95 whitespace-nowrap"
                >
                    Retry Connection
                </button>
            </div>
        )}

        {/* Mobile: Horizontal Stage Tracker */}
        <div className="md:hidden shrink-0 z-20">
           <StageTracker stages={stages} mobileView={true} isOffline={isOffline} />
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col md:flex-row md:items-center relative w-full max-w-7xl mx-auto overflow-hidden">
            
            {/* Left Column (Desktop Stages) */}
            <div className="hidden md:flex flex-col justify-center w-64 p-8 shrink-0">
                <StageTracker stages={stages} isOffline={isOffline} />
            </div>

            {/* Center: Visualizer */}
            <div className="flex-1 flex flex-col items-center justify-start md:justify-center relative min-h-0">
                {/* Visualizer Container */}
                <div className="w-full h-[250px] md:h-[400px] flex items-center justify-center shrink-0 transition-all duration-300">
                     <Visualizer modelAnalyser={outputAnalyser} inputAnalyser={inputAnalyser} isOffline={isOffline} />
                </div>
                
                {/* Mobile: Start Prompt (Only if completely idle and not showing error) */}
                {!isConnected && !isConnecting && !showGuidelines && !isOffline && (
                    <div className="md:hidden text-center -mt-8 mb-4">
                        <p className="text-gray-400 font-light text-sm">Tap mic to begin</p>
                    </div>
                )}
                
                {/* Error Message (Toast style for critical API errors not handled by banner) */}
                {error && (
                    <div className="absolute top-4 px-4 py-2 bg-red-50 text-red-500 rounded-lg text-sm border border-red-100 z-50 shadow-md">
                        {error}
                    </div>
                )}
                
                {/* Mobile: Visible Transcript Area */}
                <div className="md:hidden flex-1 w-full px-4 mb-4 min-h-0 flex flex-col">
                    <div className={`bg-white/40 backdrop-blur-md rounded-2xl border border-white/50 flex-1 overflow-hidden flex flex-col shadow-sm transition-colors duration-300 ${isOffline ? 'bg-gray-100/40' : ''}`}>
                         <div 
                           ref={mobileScrollRef} 
                           className="flex-1 overflow-y-auto px-4 py-6 space-y-3 no-scrollbar [mask-image:linear-gradient(to_bottom,transparent,black_20px,black_calc(100%-20px),transparent)]"
                         >
                             {transcripts.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
                                    Transcript will appear here...
                                </div>
                             ) : (
                                transcripts.map((item) => (
                                    <div key={item.id} className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[90%] p-2 rounded-xl text-xs ${
                                            item.sender === 'user' 
                                            ? 'bg-blue-600 text-white rounded-tr-sm' 
                                            : 'bg-white text-gray-800 rounded-tl-sm shadow-sm'
                                        }`}>
                                            {item.text}
                                        </div>
                                    </div>
                                ))
                             )}
                         </div>
                    </div>
                </div>
            </div>

             {/* Right Column (Desktop Transcript) */}
             <div className="hidden md:flex flex-col justify-center w-80 p-8 shrink-0 h-full max-h-[80vh]">
                 <div className={`w-full h-full glass-panel rounded-[24px] flex flex-col overflow-hidden relative transition-all duration-500 ${isOffline ? 'grayscale-[0.5] opacity-80' : ''}`}>
                    <div className="p-4 shrink-0 bg-white/5 backdrop-blur-sm border-b border-white/10 z-10">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Transcript</h3>
                    </div>
                    
                    <div 
                      ref={scrollRef} 
                      className="flex-1 overflow-y-auto no-scrollbar space-y-3 px-4 py-6 [mask-image:linear-gradient(to_bottom,transparent,black_20px,black_calc(100%-20px),transparent)]"
                    >
                        {transcripts.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-300 text-xs italic">
                                Conversation will appear here...
                            </div>
                        ) : (
                            transcripts.map((item) => (
                                <div key={item.id} className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] p-2 rounded-xl text-xs ${
                                        item.sender === 'user' 
                                        ? 'bg-blue-50 text-blue-900 rounded-tr-sm' 
                                        : 'bg-white/50 text-gray-800 rounded-tl-sm'
                                    }`}>
                                        {item.text}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                 </div>
            </div>

        </div>

        {/* Bottom Controls Area */}
        <div className="p-6 md:p-8 flex justify-center items-center gap-4 shrink-0 z-40 bg-gradient-to-t from-white via-white/80 to-transparent md:bg-none">
            {isConnected ? (
                <>
                   {/* Mute Button */}
                    <button 
                        onClick={handleToggleMute}
                        className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 border ${
                            isMuted 
                            ? 'bg-gray-200 text-gray-600 border-gray-300' 
                            : 'bg-white text-gray-800 border-white/60 hover:bg-gray-50'
                        }`}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? (
                            <MicOff className="w-6 h-6" />
                        ) : (
                            <Mic className="w-6 h-6" />
                        )}
                    </button>

                   {/* End Call Button */}
                    <button 
                        onClick={handleEndSession}
                        className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 border border-red-100"
                        title="End Call"
                    >
                        <PhoneOff className="w-6 h-6 md:w-8 md:h-8" />
                    </button>
                </>
            ) : (
                <button 
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className={`w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-full transition-all duration-300 shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 ring-4 ${
                        isOffline 
                        ? 'bg-red-50 text-red-500 ring-red-100 hover:bg-red-100' 
                        : 'bg-gray-900 text-white ring-black/5 hover:bg-black'
                    }`}
                >
                    {isConnecting ? (
                        <Loader2 className="w-6 h-6 md:w-8 md:h-8 animate-spin" />
                    ) : isOffline ? (
                        <RefreshCw className="w-6 h-6 md:w-8 md:h-8" /> 
                    ) : (
                        <Mic className="w-6 h-6 md:w-8 md:h-8" />
                    )}
                </button>
            )}
        </div>

        {/* DEV TOOLS (Floating Button & Panel) */}
        <div className="absolute bottom-6 left-6 z-[100]">
             {!showDevTools ? (
                 <button 
                    onClick={() => setShowDevTools(true)}
                    className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center shadow-md border border-gray-200 transition-colors"
                    title="Open Dev Tools"
                 >
                     <Wrench className="w-4 h-4 text-gray-600" />
                 </button>
             ) : (
                 <div className="bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-gray-200 w-64 animate-[fadeInUp_0.3s_ease-out]">
                     <div className="flex justify-between items-center mb-3">
                         <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dev Controls</h4>
                         <button onClick={() => setShowDevTools(false)} className="text-gray-400 hover:text-gray-600">
                             <X className="w-4 h-4" />
                         </button>
                     </div>
                     
                     <div className="space-y-2">
                         <button 
                            onClick={devNextStage}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors"
                         >
                             <Play className="w-3 h-3" /> Next Stage
                         </button>
                         
                         <button 
                            onClick={devTriggerHandoff}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-medium transition-colors"
                         >
                             <CreditCard className="w-3 h-3" /> Test Handoff (Popup)
                         </button>
                         
                         <button 
                            onClick={devShowGuidelines}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-colors"
                         >
                             <Info className="w-3 h-3" /> Test Guidelines
                         </button>

                         <button 
                            onClick={handleDisconnect}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-medium transition-colors"
                         >
                             <WifiOff className="w-3 h-3" /> Force Offline
                         </button>

                         <button 
                            onClick={devResetStages}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-medium transition-colors"
                         >
                             <RefreshCw className="w-3 h-3" /> Reset Stages
                         </button>
                     </div>
                 </div>
             )}
        </div>

      </main>

      {/* Guidelines Popup Overlay */}
      {showGuidelines && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-white/80 backdrop-blur-md animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-white p-8 rounded-[32px] shadow-2xl max-w-md w-full mx-4 border border-gray-100 text-center relative overflow-hidden">
                 {/* Decorative background blobs inside the card */}
                 <div className="absolute top-0 left-0 w-32 h-32 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 -translate-x-1/2 -translate-y-1/2"></div>
                 <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 translate-x-1/2 translate-y-1/2"></div>

                 <h2 className="text-2xl font-bold text-gray-900 mb-8 relative z-10">Get Ready</h2>
                 
                 <div className="grid grid-cols-3 gap-4 mb-8 relative z-10">
                    {/* Step 1: Headphones */}
                    <div className="flex flex-col items-center gap-3 animate-[fadeInUp_0.5s_ease-out_0ms_both]">
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-1 shadow-sm">
                            <Headphones className="w-8 h-8" />
                        </div>
                        <span className="text-xs font-semibold text-gray-600">Wear<br/>Earphones</span>
                    </div>

                    {/* Step 2: Silent Place */}
                    <div className="flex flex-col items-center gap-3 animate-[fadeInUp_0.5s_ease-out_200ms_both]">
                        <div className="w-16 h-16 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center mb-1 shadow-sm">
                             <VolumeX className="w-8 h-8" />
                        </div>
                         <span className="text-xs font-semibold text-gray-600">Silent<br/>Environment</span>
                    </div>

                    {/* Step 3: Say Hello */}
                    <div className="flex flex-col items-center gap-3 animate-[fadeInUp_0.5s_ease-out_400ms_both]">
                        <div className="w-16 h-16 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mb-1 shadow-sm">
                            <MessageCircle className="w-8 h-8" />
                        </div>
                         <span className="text-xs font-semibold text-gray-600">Say<br/>"Hello"</span>
                    </div>
                 </div>

                 <button 
                    onClick={handleDismissGuidelines}
                    className="w-full py-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-black transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg relative z-10"
                 >
                    I'm Ready
                 </button>
            </div>
        </div>
      )}

      {/* Human Handoff Popup Overlay */}
      {showHandoffPopup && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md animate-[fadeIn_0.5s_ease-out]">
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[32px] border border-white/60 shadow-2xl max-w-sm text-center transform scale-100 animate-[pulse-glow_2s_infinite]">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Headset className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Connecting to Expert</h2>
                <p className="text-gray-500 text-sm mb-6">Our human expert will contact you shortly to assist with your payment.</p>
                <div className="flex justify-center gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-[bounce_1s_infinite_0ms]"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-[bounce_1s_infinite_200ms]"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-[bounce_1s_infinite_400ms]"></span>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;