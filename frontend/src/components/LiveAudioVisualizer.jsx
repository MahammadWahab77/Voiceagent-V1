import { useEffect, useRef } from 'react';

export function LiveAudioVisualizer({ volume }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationId;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Simple circle growing with volume
            // volume is usually 0.0 to 1.0 (or smaller, from RMS)
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = 20 + volume * 200; // Base 20px + scaling

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = `rgba(64, 128, 255, ${0.5 + volume})`;
            ctx.fill();

            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => cancelAnimationFrame(animationId);
    }, [volume]);

    return <canvas ref={canvasRef} width={300} height={300} className="w-full h-full" />;
}
