import React, { useEffect, useRef, useState } from 'react';
import GlassOrb from './GlassOrb';
import { MousePosition } from '../types';

interface VisualizerProps {
  modelAnalyser: AnalyserNode | null;
  inputAnalyser: AnalyserNode | null;
  isOffline?: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ modelAnalyser, inputAnalyser, isOffline = false }) => {
  const [modelAmplitude, setModelAmplitude] = useState(0);
  const [mousePos, setMousePos] = useState<MousePosition>({ x: 0, y: 0 });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mouse Tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // 1. Model Audio Analysis Loop (For GlassOrb Mouth)
  useEffect(() => {
    if (!modelAnalyser || isOffline) {
      setModelAmplitude(0);
      return;
    }

    const dataArray = new Uint8Array(modelAnalyser.frequencyBinCount);
    let rafId: number;
    
    const analyzeModel = () => {
      modelAnalyser.getByteTimeDomainData(dataArray);

      // Calculate RMS
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const x = (dataArray[i] - 128) / 128.0;
        sum += x * x;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const amplified = Math.min(rms * 5, 1);
      
      setModelAmplitude(prev => {
        if (amplified > prev) return amplified; 
        return prev * 0.9;
      });

      rafId = requestAnimationFrame(analyzeModel);
    };

    analyzeModel();
    return () => cancelAnimationFrame(rafId);
  }, [modelAnalyser, isOffline]);

  // 2. Input Audio Analysis Loop (Canvas Waveform Halo)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    if (!inputAnalyser || isOffline) {
        ctx.clearRect(0, 0, rect.width, rect.height);
        return;
    }

    const bufferLength = inputAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let rafId: number;

    const drawInputWaveform = () => {
      rafId = requestAnimationFrame(drawInputWaveform);

      inputAnalyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, rect.width, rect.height);

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const baseRadius = 140; // Just outside the orb (w-64 = 256px -> r=128px)

      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)'; // Light Blue (Tailwind sky-400)
      ctx.beginPath();

      let maxVal = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // 128 is silence (1.0)
        const deviation = v - 1;
        maxVal = Math.max(maxVal, Math.abs(deviation));
        
        // Circular wrapping
        const angle = (i / bufferLength) * 2 * Math.PI;
        
        // Amplify the deviation for visual effect
        const radius = baseRadius + (deviation * 60); 

        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.closePath();
      
      // Only draw if there is sound
      if (maxVal > 0.01) {
          ctx.stroke();
      }
    };

    drawInputWaveform();
    return () => cancelAnimationFrame(rafId);

  }, [inputAnalyser, isOffline]);

  return (
    <div className="relative w-full h-[400px] flex items-center justify-center">
      {/* Input Visualizer Halo */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />
      
      {/* 3D Avatar */}
      <div className="relative z-10">
        <GlassOrb amplitude={modelAmplitude} mousePosition={mousePos} isOffline={isOffline} />
      </div>
    </div>
  );
};

export default Visualizer;