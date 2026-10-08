import { Person, SKIN, type HairStyle } from "./person";

const MEMBERS: { shirt: string; hair: string; style: HairStyle }[] = [
  { shirt: "var(--accent)", hair: "var(--clay)", style: "wrap" },
  { shirt: "var(--primary)", hair: "#2b1d14", style: "short" },
  { shirt: "var(--clay)", hair: "#1c130d", style: "afro" },
  { shirt: "var(--sky)", hair: "#3b2a1e", style: "bun" },
  { shirt: "var(--chart-5)", hair: "#1c130d", style: "braids" },
  { shirt: "var(--primary)", hair: "#2b1d14", style: "bald" },
];

const C = 260;
const R = 178;

function polar(angleDeg: number, radius = R) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: C + radius * Math.cos(a), y: C + radius * Math.sin(a) };
}

/**
 * Six members sit around a slowly turning ring with the shared pot in the
 * middle; the member at the top is this month's recipient.
 */
export function MerryGoRoundIllustration({ className, idPrefix = "mgr" }: { className?: string; idPrefix?: string }) {
  return (
    <svg
      viewBox="0 0 520 520"
      className={className}
      role="img"
      aria-label="Six chama members sitting in a circle around a shared basket of contributions"
    >
      {/* soft backdrop */}
      <circle cx={C} cy={C} r={236} className="fill-secondary/60" />
      <circle cx={C} cy={C} r={120} className="fill-card" />

      {/* turning ring */}
      <g className="origin-center animate-spin-slow [transform-box:fill-box]">
        <circle
          cx={C}
          cy={C}
          r={R}
          fill="none"
          className="stroke-primary/40"
          strokeWidth={3}
          strokeDasharray="2 12"
          strokeLinecap="round"
        />
      </g>

      {/* clockwise chevrons between members */}
      {MEMBERS.map((_, i) => {
        const angle = -90 + i * 60 + 30;
        const { x, y } = polar(angle);
        return (
          <path
            key={`arrow-${i}`}
            d="M-6 -8 L4 0 L-6 8"
            transform={`translate(${x} ${y}) rotate(${angle + 90})`}
            fill="none"
            className="stroke-primary"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}

      {/* the basket (kiondo) holding contributions */}
      <g transform={`translate(${C} ${C + 12})`}>
        {/* coins popping out */}
        <g>
          <ellipse cx={-22} cy={-34} rx={20} ry={7} className="fill-accent stroke-accent-foreground/40" strokeWidth={2} />
          <ellipse cx={18} cy={-42} rx={20} ry={7} className="fill-accent stroke-accent-foreground/40" strokeWidth={2} />
          <ellipse cx={0} cy={-26} rx={20} ry={7} className="fill-accent stroke-accent-foreground/40" strokeWidth={2} />
          <g transform="translate(6 -78) rotate(-14)">
           <g className="animate-float">
            <circle r={16} className="fill-accent stroke-accent-foreground/40" strokeWidth={2} />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-accent-foreground font-heading text-[18px] font-semibold"
            >
              $
            </text>
           </g>
          </g>
        </g>
        {/* basket body */}
        <path d="M-58 -22 L58 -22 L44 44 Q0 56 -44 44 Z" className="fill-clay" />
        <path
          d="M-54 -4 L54 -4 M-50 14 L50 14 M-46 31 L46 31"
          className="stroke-card/70"
          strokeWidth={3}
        />
        <path
          d="M-30 -22 L-24 49 M0 -22 L0 52 M30 -22 L24 49"
          className="stroke-card/40"
          strokeWidth={3}
        />
        <ellipse cx={0} cy={-22} rx={58} ry={9} className="fill-clay stroke-card/70" strokeWidth={3} />
        {/* handle */}
        <path d="M-50 -24 C-50 -100 50 -100 50 -24" fill="none" className="stroke-clay" strokeWidth={6} strokeLinecap="round" />
      </g>

      {/* members */}
      {MEMBERS.map((m, i) => {
        const { x, y } = polar(-90 + i * 60);
        const isWinner = i === 0;
        return (
          <g key={i}>
            {isWinner && (
              <circle cx={x} cy={y} r={54} fill="none" className="stroke-accent" strokeWidth={5} />
            )}
            <Person id={`${idPrefix}-${i}`} x={x} y={y} skin={SKIN[i]} hair={m.hair} shirt={m.shirt} style={m.style} />
            {isWinner && (
              <g transform={`translate(${x + 38} ${y - 36})`}>
                <circle r={15} className="fill-accent stroke-card" strokeWidth={3} />
                <path
                  d="M0 -8 L2.4 -2.6 L8 -2.4 L3.6 1.2 L5 7 L0 3.8 L-5 7 L-3.6 1.2 L-8 -2.4 L-2.4 -2.6 Z"
                  className="fill-accent-foreground"
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
