import { useEffect, useRef } from 'react';

interface VisualizerProps {
    outputAnalyser: AnalyserNode | null;
    inputAnalyser: AnalyserNode | null;
    isOffline: boolean;
}

export function Visualizer({ outputAnalyser, inputAnalyser, isOffline }: VisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        let dataArrayOutput: Uint8Array;
        let dataArrayInput: Uint8Array;

        if (outputAnalyser) {
            dataArrayOutput = new Uint8Array(outputAnalyser.frequencyBinCount);
        }
        if (inputAnalyser) {
            dataArrayInput = new Uint8Array(inputAnalyser.frequencyBinCount);
        }

        const draw = () => {
            // Resize
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }

            ctx.clearRect(0, 0, width, height);

            const centerX = width / 2;
            const centerY = height / 2;

            let outputAvg = 0;
            let inputAvg = 0;

            if (outputAnalyser && !isOffline) {
                // @ts-ignore
                outputAnalyser.getByteFrequencyData(dataArrayOutput);
                const sum = dataArrayOutput.reduce((a, b) => a + b, 0);
                outputAvg = sum / dataArrayOutput.length;
            }

            if (inputAnalyser && !isOffline) {
                // @ts-ignore
                inputAnalyser.getByteFrequencyData(dataArrayInput);
                const sum = dataArrayInput.reduce((a, b) => a + b, 0);
                inputAvg = sum / dataArrayInput.length;
            }

            // Base sizes
            const baseRadius = Math.min(width, height) * 0.25;

            // -- Input Halo (User) --
            // Expands outward when user speaks
            if (inputAvg > 5) {
                const haloRadius = baseRadius + (inputAvg * 0.8);
                ctx.beginPath();
                ctx.arc(centerX, centerY, haloRadius, 0, 2 * Math.PI);
                const haloGradient = ctx.createRadialGradient(centerX, centerY, baseRadius, centerX, centerY, haloRadius);
                haloGradient.addColorStop(0, 'rgba(59, 130, 246, 0.0)');
                haloGradient.addColorStop(1, 'rgba(59, 130, 246, 0.3)');
                ctx.fillStyle = haloGradient;
                ctx.fill();
            }

            // -- Core Orb (Agent) --
            const pulse = isOffline ? 0 : outputAvg * 0.5;
            const orbRadius = baseRadius + pulse;

            ctx.beginPath();
            ctx.arc(centerX, centerY, orbRadius, 0, 2 * Math.PI);

            const gradient = ctx.createRadialGradient(
                centerX - orbRadius * 0.3,
                centerY - orbRadius * 0.3,
                0,
                centerX,
                centerY,
                orbRadius
            );

            if (isOffline) {
                // Amber/Red glow
                gradient.addColorStop(0, '#fef3c7'); // light amber
                gradient.addColorStop(0.5, '#f59e0b'); // amber-500
                gradient.addColorStop(1, '#b45309'); // amber-700
            } else {
                // Blue/White glow
                gradient.addColorStop(0, '#ffffff');
                gradient.addColorStop(0.4, '#dbeafe'); // blue-50
                gradient.addColorStop(1, '#3b82f6'); // blue-500
            }

            ctx.fillStyle = gradient;
            ctx.shadowBlur = isOffline ? 20 : 50 + pulse;
            ctx.shadowColor = isOffline ? 'rgba(245, 158, 11, 0.5)' : 'rgba(59, 130, 246, 0.6)';
            ctx.fill();

            // -- Face Expression (Simple) --
            ctx.fillStyle = '#1e293b'; // slate-800

            if (isOffline) {
                // Worried eyes
                ctx.beginPath();
                ctx.ellipse(centerX - 30, centerY - 20, 8, 12, Math.PI / 8, 0, 2 * Math.PI);
                ctx.ellipse(centerX + 30, centerY - 20, 8, 12, -Math.PI / 8, 0, 2 * Math.PI);
                ctx.fill();

                // Frown
                ctx.beginPath();
                ctx.arc(centerX, centerY + 30, 20, Math.PI, 0); // Frown arc
                ctx.stroke();
            } else {
                // Normal/Talking eyes
                const blink = Math.random() > 0.99;
                if (!blink) {
                    ctx.beginPath();
                    ctx.arc(centerX - 30, centerY - 20, 8, 0, 2 * Math.PI); // L Eye
                    ctx.arc(centerX + 30, centerY - 20, 8, 0, 2 * Math.PI); // R Eye
                    ctx.fill();
                }

                // Mouth
                ctx.beginPath();
                const mouthOpen = 10 + (outputAvg * 0.5);
                ctx.ellipse(centerX, centerY + 20, 15, mouthOpen, 0, 0, 2 * Math.PI);
                ctx.fill();
            }

            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [outputAnalyser, inputAnalyser, isOffline]);

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            <canvas ref={canvasRef} className="w-full h-full max-w-[500px] max-h-[500px]" />
        </div>
    );
}
