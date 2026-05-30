import { useRef, useEffect } from 'react';

interface FieldOverlayProps {
  path: { x: number; y: number }[];
  currentPos: { x: number; y: number } | null;
  width: number;
  height: number;
}

export default function FieldOverlay({ path, currentPos, width, height }: FieldOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displaySize = Math.min(canvas.clientWidth, 400);
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    ctx.scale(dpr, dpr);

    const cw = displaySize;
    const ch = displaySize;

    ctx.clearRect(0, 0, cw, ch);

    // Field background
    ctx.fillStyle = '#0D1A14';
    ctx.fillRect(0, 0, cw, ch);

    // Field grid lines
    ctx.strokeStyle = '#1A3A28';
    ctx.lineWidth = 1;
    const gridLines = 6;
    for (let i = 1; i < gridLines; i++) {
      const x = (cw / gridLines) * i;
      const y = (ch / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, ch);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(cw, y);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = '#2A5A3A';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, cw, ch);

    function toCanvas(fx: number, fy: number) {
      return {
        x: (fx / width) * cw,
        y: ch - (fy / height) * ch,
      };
    }

    // Path trail - brand green
    if (path.length > 1) {
      ctx.strokeStyle = '#22A83A';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < path.length; i++) {
        const p = toCanvas(path[i].x, path[i].y);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Current position - brand blue
    if (currentPos) {
      const p = toCanvas(currentPos.x, currentPos.y);

      // Outer glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 87, 217, 0.2)';
      ctx.fill();

      // Outer ring
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#0057D9';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#0057D9';
      ctx.fill();
    }

    // Field labels
    ctx.fillStyle = '#4A8A6A';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText(`${width}'`, cw / 2 - 6, ch - 5);
    ctx.save();
    ctx.translate(8, ch / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${height}'`, -6, 3);
    ctx.restore();

  }, [path, currentPos, width, height]);

  return (
    <div style={{ width: '100%', maxWidth: 400, aspectRatio: '1' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', borderRadius: 8 }}
      />
    </div>
  );
}
