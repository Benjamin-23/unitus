export type HairStyle = "short" | "afro" | "bun" | "wrap" | "bald" | "braids";

export type PersonProps = {
  x: number;
  y: number;
  /** Radius of the round badge the bust sits in. */
  r?: number;
  skin: string;
  hair?: string;
  shirt: string;
  style?: HairStyle;
  id: string;
};

/**
 * A friendly, minimal bust drawn inside a round badge. All positions are
 * relative to the badge centre so it can be placed anywhere in a parent SVG.
 */
export function Person({
  x,
  y,
  r = 44,
  skin,
  hair = "#2b1d14",
  shirt,
  style = "short",
  id,
}: PersonProps) {
  const s = r / 44;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        <clipPath id={`clip-${id}`}>
          <circle r={42} />
        </clipPath>
      </defs>
      <circle r={44} className="fill-card stroke-border" strokeWidth={2} />
      <g clipPath={`url(#clip-${id})`}>
        <circle r={42} className="fill-secondary" />
        {style === "afro" && <circle cx={0} cy={-10} r={21} style={{ fill: hair }} />}
        {style === "braids" && (
          <path d="M-17 -12 L-20 22 M17 -12 L20 22" style={{ stroke: hair }} strokeWidth={7} strokeLinecap="round" />
        )}
        {/* shoulders */}
        <path d="M-34 46 C-34 18 -18 12 0 12 C18 12 34 18 34 46 Z" style={{ fill: shirt }} />
        {/* neck */}
        <rect x={-6} y={2} width={12} height={13} rx={5} style={{ fill: skin }} />
        {/* head */}
        <ellipse cx={0} cy={-9} rx={14} ry={16} style={{ fill: skin }} />
        {style === "short" && (
          <path d="M-14 -11 C-15 -28 15 -28 14 -11 C10 -18 -10 -18 -14 -11 Z" style={{ fill: hair }} />
        )}
        {style === "afro" && (
          <path d="M-14 -12 C-12 -24 12 -24 14 -12 C8 -17 -8 -17 -14 -12 Z" style={{ fill: hair }} />
        )}
        {style === "bun" && (
          <>
            <circle cx={0} cy={-29} r={8} style={{ fill: hair }} />
            <path d="M-14 -9 C-16 -29 16 -29 14 -9 C11 -19 -11 -19 -14 -9 Z" style={{ fill: hair }} />
          </>
        )}
        {style === "braids" && (
          <path d="M-15 -8 C-17 -30 17 -30 15 -8 C11 -19 -11 -19 -15 -8 Z" style={{ fill: hair }} />
        )}
        {style === "wrap" && (
          <>
            <path d="M-16 -12 C-18 -34 18 -34 16 -12 Z" style={{ fill: hair }} />
            <path d="M-16 -13 C-6 -18 6 -18 16 -13" stroke="white" strokeOpacity={0.35} strokeWidth={2} fill="none" />
            <circle cx={11} cy={-27} r={6} style={{ fill: hair }} />
          </>
        )}
        {/* smile */}
        <path d="M-5 -2 Q0 3 5 -2" stroke="#2b1d14" strokeOpacity={0.55} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <circle cx={-5} cy={-10} r={1.6} fill="#2b1d14" fillOpacity={0.7} />
        <circle cx={5} cy={-10} r={1.6} fill="#2b1d14" fillOpacity={0.7} />
      </g>
    </g>
  );
}

export const SKIN = ["#8d5524", "#c68642", "#5c3a1e", "#e0ac69", "#a0672f", "#f1c27d"];
