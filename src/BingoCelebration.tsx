import { useEffect, useRef } from "react";
import "./bingo-celebration.css";

const DURATION_MS = 7_000;
const COLORS = ["#de4971", "#c18a18", "#238f9a", "#785ac2", "#3c955d"];

/** A short, decorative celebration. Mount with a new key for each new Bingo. */
export default function BingoCelebration({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!canvas || !context || motion.matches) {
      onCompleteRef.current();
      return;
    }

    let width = 0;
    let height = 0;
    let frame = 0;
    let finished = false;
    const start = performance.now();
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      // Cap the backing resolution to keep the effect light on mobile screens.
      const scale = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
    };
    resize();

    const confetti = Array.from({ length: width < 600 ? 95 : 145 }, () => ({
      x: Math.random(),
      y: -Math.random() * 0.95,
      speed: 0.22 + Math.random() * 0.14,
      sway: 12 + Math.random() * 35,
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 7,
      size: 5 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    const fireworks = Array.from({ length: 8 }, (_, index) => ({
      x: [0.24, 0.78, 0.5, 0.17, 0.82, 0.38, 0.68, 0.28][index],
      y: [0.22, 0.36, 0.16, 0.49, 0.2, 0.33, 0.47, 0.19][index],
      delay: [100, 650, 1250, 1900, 2600, 3350, 4200, 4850][index],
      color: COLORS[index % COLORS.length],
      rotation: Math.random() * Math.PI,
    }));

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
      context.clearRect(0, 0, width, height);
      onCompleteRef.current();
    };
    // Finish on time even when a background tab pauses requestAnimationFrame.
    const timeout = window.setTimeout(finish, DURATION_MS);
    const motionChanged = () => {
      if (motion.matches) finish();
    };

    function draw(now: number) {
      if (finished) return;
      const elapsed = now - start;
      if (elapsed >= DURATION_MS) {
        finish();
        return;
      }
      const seconds = elapsed / 1_000;
      context!.clearRect(0, 0, width, height);

      // Firework trails sit behind the foreground shower of paper confetti.
      for (const burst of fireworks) {
        const age = (elapsed - burst.delay) / 1_700;
        if (age < 0 || age > 1) continue;
        const spread = Math.min(width, height) * 0.36;
        const radius = spread * (1 - Math.pow(1 - age, 3));
        const tail = 3 + (1 - age) * 15;
        const drop = age * age * 42;
        const x = burst.x * width;
        const y = burst.y * height + drop;
        context!.globalAlpha = (1 - age) * 0.85;
        context!.strokeStyle = burst.color;
        context!.lineWidth = 2;
        context!.lineCap = "round";
        context!.beginPath();
        for (let spark = 0; spark < 36; spark++) {
          const angle = (spark / 36) * Math.PI * 2 + burst.rotation;
          const reach = radius * (spark % 2 === 0 ? 1 : 0.75);
          context!.moveTo(
            x + Math.cos(angle) * Math.max(0, reach - tail),
            y + Math.sin(angle) * Math.max(0, reach - tail),
          );
          context!.lineTo(
            x + Math.cos(angle) * reach,
            y + Math.sin(angle) * reach,
          );
        }
        context!.stroke();
      }

      context!.globalAlpha = Math.min(1, (DURATION_MS - elapsed) / 900);
      for (const piece of confetti) {
        const x =
          piece.x * width + Math.sin(seconds * 2 + piece.phase) * piece.sway;
        const y = (piece.y + seconds * piece.speed) * height;
        if (y < -20 || y > height + 20) continue;
        context!.save();
        context!.translate(x, y);
        context!.rotate(piece.phase + seconds * piece.spin);
        context!.scale(Math.cos(seconds * 4 + piece.phase) * 0.7 + 0.3, 1);
        context!.fillStyle = piece.color;
        context!.fillRect(
          -piece.size / 2,
          -piece.size / 2,
          piece.size,
          piece.size * 1.6,
        );
        context!.restore();
      }
      context!.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    motion.addEventListener("change", motionChanged);
    frame = requestAnimationFrame(draw);
    return () => {
      finished = true;
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
      window.removeEventListener("resize", resize);
      motion.removeEventListener("change", motionChanged);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="bingo-celebration" aria-hidden="true" />
  );
}
