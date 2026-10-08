function Coin({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse rx={22} ry={8} cy={4} className="fill-accent-foreground/25" />
      <ellipse rx={22} ry={8} className="fill-accent stroke-accent-foreground/40" strokeWidth={2} />
    </g>
  );
}

/** A jar filling with coins and a sprout growing out of it. */
export function SavingsJarIllustration({ className }: { className?: string; idPrefix?: string }) {
  return (
    <svg viewBox="0 0 300 300" className={className} role="img" aria-label="A savings jar filling with coins and growing a plant">
      <circle cx={150} cy={160} r={130} className="fill-secondary" />
      {/* sprout */}
      <path d="M150 92 C150 70 150 56 150 40" className="stroke-primary" strokeWidth={5} fill="none" strokeLinecap="round" />
      <path d="M150 64 C126 62 112 46 112 28 C132 28 148 42 150 64 Z" className="fill-primary" />
      <path d="M150 52 C170 50 186 36 188 16 C166 18 152 32 150 52 Z" className="fill-chart-5" />
      {/* jar */}
      <rect x={112} y={86} width={76} height={18} rx={6} className="fill-clay" />
      <path
        d="M104 110 C92 120 86 140 86 170 L86 228 C86 248 100 260 120 260 L180 260 C200 260 214 248 214 228 L214 170 C214 140 208 120 196 110 Z"
        className="fill-card/80 stroke-primary/40"
        strokeWidth={4}
      />
      {/* coins inside */}
      <g>
        {[0, 1, 2, 3, 4].map((i) => (
          <Coin key={`a${i}`} x={124} y={240 - i * 12} />
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Coin key={`b${i}`} x={176} y={240 - i * 12} />
        ))}
        {[0, 1, 2].map((i) => (
          <Coin key={`c${i}`} x={150} y={244 - i * 12} />
        ))}
      </g>
      <path d="M104 140 C100 160 100 190 104 215" className="stroke-card" strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.8} />
    </svg>
  );
}

/** Growing stacks of coins with a percentage tag: borrowing against savings. */
export function LoanIllustration({ className }: { className?: string; idPrefix?: string }) {
  const stacks = [3, 5, 7, 9];
  return (
    <svg viewBox="0 0 300 300" className={className} role="img" aria-label="Stacks of coins growing taller with an interest rate tag">
      <circle cx={150} cy={160} r={130} className="fill-secondary" />
      {stacks.map((h, s) =>
        Array.from({ length: h }).map((_, i) => (
          <Coin key={`${s}-${i}`} x={78 + s * 48} y={248 - i * 13} />
        )),
      )}
      <path
        d="M66 180 C110 170 160 130 222 72"
        className="stroke-primary"
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
        strokeDasharray="1 11"
      />
      <path d="M204 68 L226 68 L226 90" className="stroke-primary" strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(92 92) rotate(-8)">
        <rect x={-36} y={-20} width={72} height={40} rx={10} className="fill-clay" />
        <circle cx={-24} cy={0} r={4} className="fill-card" />
        <text x={8} textAnchor="middle" dominantBaseline="central" className="fill-card font-heading text-[20px] font-semibold">
          5%
        </text>
      </g>
    </svg>
  );
}
