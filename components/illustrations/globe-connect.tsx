import { Person, SKIN, type HairStyle } from "./person";

const PLACES: {
  city: string;
  x: number;
  y: number;
  shirt: string;
  style: HairStyle;
  skin: string;
}[] = [
  { city: "Nairobi", x: 330, y: 330, shirt: "var(--accent)", style: "wrap", skin: SKIN[0] },
  { city: "London", x: 150, y: 150, shirt: "var(--primary)", style: "short", skin: SKIN[1] },
  { city: "Toronto", x: 70, y: 300, shirt: "var(--sky)", style: "bun", skin: SKIN[3] },
  { city: "Dubai", x: 410, y: 170, shirt: "var(--clay)", style: "afro", skin: SKIN[2] },
  { city: "Sydney", x: 420, y: 400, shirt: "var(--chart-5)", style: "braids", skin: SKIN[4] },
];

const HUB = { x: 250, y: 255 };

/** Members in different cities linked by dashed arcs to one shared pot. */
export function GlobeConnectIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 500 500"
      className={className}
      role="img"
      aria-label="Members in Nairobi, London, Toronto, Dubai and Sydney connected to one chama"
    >
      {/* globe */}
      <circle cx={250} cy={255} r={190} className="fill-secondary" />
      <g fill="none" className="stroke-primary/15" strokeWidth={2}>
        <ellipse cx={250} cy={255} rx={190} ry={60} />
        <ellipse cx={250} cy={255} rx={190} ry={125} />
        <line x1={60} y1={255} x2={440} y2={255} />
        <ellipse cx={250} cy={255} rx={60} ry={190} />
        <ellipse cx={250} cy={255} rx={125} ry={190} />
        <line x1={250} y1={65} x2={250} y2={445} />
      </g>
      {/* landmass hints */}
      <g className="fill-primary/10">
        <path d="M120 140 C160 110 220 120 230 160 C240 200 190 210 170 240 C150 270 110 240 100 200 C92 170 100 150 120 140 Z" />
        <path d="M260 120 C300 100 360 110 380 150 C395 185 350 190 330 220 C310 250 330 300 300 330 C280 350 260 320 262 290 C265 250 240 230 245 190 C248 160 245 135 260 120 Z" />
        <path d="M360 330 C390 315 430 330 432 360 C434 390 400 400 375 390 C355 380 345 345 360 330 Z" />
      </g>

      {/* connecting arcs */}
      {PLACES.map((p) => {
        const mx = (p.x + HUB.x) / 2;
        const my = (p.y + HUB.y) / 2 - 50;
        return (
          <path
            key={`arc-${p.city}`}
            d={`M${p.x} ${p.y} Q${mx} ${my} ${HUB.x} ${HUB.y}`}
            fill="none"
            className="stroke-primary/60"
            strokeWidth={2.5}
            strokeDasharray="6 8"
            strokeLinecap="round"
          />
        );
      })}

      {/* hub: the shared pot */}
      <g transform={`translate(${HUB.x} ${HUB.y})`}>
        <circle r={34} className="fill-primary" />
        <circle r={34} fill="none" className="stroke-card" strokeWidth={4} />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-primary-foreground font-heading text-[30px] font-semibold"
        >
          $
        </text>
      </g>

      {/* members */}
      {PLACES.map((p, i) => (
        <g key={p.city}>
          <Person id={`globe-${i}`} x={p.x} y={p.y} r={30} skin={p.skin} shirt={p.shirt} style={p.style} />
          <g transform={`translate(${p.x} ${p.y + 44})`}>
            <rect x={-38} y={-12} width={76} height={24} rx={12} className="fill-card stroke-border" strokeWidth={1.5} />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-foreground text-[12px] font-semibold"
            >
              {p.city}
            </text>
          </g>
        </g>
      ))}
    </svg>
  );
}
