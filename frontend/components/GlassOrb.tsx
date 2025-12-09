import React, { useEffect, useState, useRef } from 'react';
import { MousePosition } from '../types';

interface GlassOrbProps {
  amplitude: number; // 0 to 1
  mousePosition: MousePosition;
  isOffline?: boolean;
}

const GlassOrb: React.FC<GlassOrbProps> = ({ amplitude, mousePosition, isOffline = false }) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Blinking Logic
  useEffect(() => {
    const blinkLoop = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 150); // Blink duration
      
      // Random interval between 2s and 6s
      const nextBlink = Math.random() * 4000 + 2000;
      setTimeout(blinkLoop, nextBlink);
    };

    const timeout = setTimeout(blinkLoop, 3000);
    return () => clearTimeout(timeout);
  }, []);

  // Parallax Calculation
  const parallaxX = (mousePosition.x - window.innerWidth / 2) * (isOffline ? 0.02 : 0.05); // Reduced physics when offline
  const parallaxY = (mousePosition.y - window.innerHeight / 2) * (isOffline ? 0.02 : 0.05);

  // Mouth Logic
  const safeAmp = Math.min(Math.max(amplitude, 0), 1);
  const baseWidth = 12;
  const baseHeight = 4;
  const maxWidth = 50;
  const maxHeight = 40;

  const currentWidth = baseWidth + (maxWidth - baseWidth) * safeAmp;
  const currentHeight = baseHeight + (maxHeight - baseHeight) * safeAmp;
  const jawDrop = (currentHeight - baseHeight) * 0.5;

  // Eye Scale
  const eyeScaleY = isBlinking ? 0.1 : 1 - (safeAmp * 0.2);

  return (
    <div className={`relative w-64 h-64 flex items-center justify-center transition-all duration-1000 ${isOffline ? '' : 'animate-[float_6s_ease-in-out_infinite]'}`}>
      {/* 1. Back Glow */}
      <div className={`absolute inset-0 rounded-full blur-3xl transition-colors duration-1000 ${
        isOffline 
        ? 'bg-amber-200/40 animate-[pulse-glow_3s_infinite]' // Worried/Warning glow
        : 'bg-blue-300 opacity-30 animate-[pulse-glow_4s_ease-in-out_infinite]'
      }`} />

      {/* 2. Core (The Brain) */}
      <div className={`absolute w-48 h-48 rounded-full shadow-inner transition-all duration-1000 ${
          isOffline
          ? 'bg-gradient-to-tr from-gray-200 to-amber-100 opacity-80 scale-95'
          : 'bg-gradient-to-tr from-[#C9F0FF] to-[#E7D9FF] opacity-90'
      }`} />

      {/* 3. Shell (Frosted Glass) */}
      <div className="absolute w-56 h-56 rounded-full bg-white/20 backdrop-blur-md border border-white/40 shadow-[inset_0_0_20px_rgba(255,255,255,0.6),0_10px_40px_rgba(0,0,0,0.1)] z-10" />

      {/* 4. Face Container (Parallax) */}
      <div 
        className="absolute z-20 flex flex-col items-center justify-center transition-transform duration-100 ease-out"
        style={{ transform: `translate(${parallaxX}px, ${parallaxY}px)` }}
      >
        {/* Eyes */}
        <div className="flex gap-8 mb-4">
          <div 
            className={`w-3 h-4 rounded-full transition-all duration-75 ${isOffline ? 'bg-gray-600 scale-90' : 'bg-gray-800'}`}
            style={{ transform: `scaleY(${eyeScaleY})` }} 
          />
          <div 
            className={`w-3 h-4 rounded-full transition-all duration-75 ${isOffline ? 'bg-gray-600 scale-90' : 'bg-gray-800'}`}
            style={{ transform: `scaleY(${eyeScaleY})` }} 
          />
        </div>

        {/* Mouth */}
        {isOffline ? (
            // Worried Frown (Offline)
            <div className="w-4 h-2 border-t-2 border-gray-600 rounded-t-full mt-1 opacity-70" />
        ) : (
            // Active Talking Mouth
            <div 
              className="bg-gray-800/80 rounded-full transition-all duration-[50ms] ease-linear"
              style={{
                width: `${currentWidth}px`,
                height: `${currentHeight}px`,
                transform: `translateY(${jawDrop}px)`
              }}
            />
        )}
      </div>
      
      {/* 5. Front Highlight (Gloss) */}
      <div className="absolute top-8 right-8 w-16 h-8 bg-white/40 rounded-full blur-md rotate-[-45deg] z-30 pointer-events-none" />
    </div>
  );
};

export default GlassOrb;