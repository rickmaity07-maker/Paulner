/* The four-point stars scattered around the printed menu, twinkling out of step. */
const STARS = [
  { top: "12%", left: "6%", size: 34, color: "#b3203a", delay: "0s" },
  { top: "22%", left: "14%", size: 18, color: "#1f78ad", delay: "0.9s" },
  { top: "70%", left: "9%", size: 26, color: "#e8a33a", delay: "1.6s" },
  { top: "82%", left: "20%", size: 16, color: "#b3203a", delay: "0.4s" },
] as const;

export function Star4({ size = 24, color = "currentColor", className = "" }: { size?: number; color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path d="M12 0c.6 6.2 1.8 9.4 3.2 10.8S18.8 12 24 12c-5.2.6-7.4 1.8-8.8 3.2S12.6 18.8 12 24c-.6-5.2-1.8-7.4-3.2-8.8S5.2 12.6 0 12c5.2-.6 7.4-1.8 8.8-3.2S11.4 5.2 12 0z" fill={color} />
    </svg>
  );
}

export default function Sparkles() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block">
      {STARS.map((star, index) => (
        <span
          key={index}
          className="absolute animate-twinkle motion-reduce:animate-none"
          style={{ top: star.top, left: star.left, animationDelay: star.delay }}
        >
          <Star4 size={star.size} color={star.color} />
        </span>
      ))}
    </div>
  );
}
