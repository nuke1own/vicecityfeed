import type { CoverAccent, CoverScene } from "@/lib/types";

type Palette = {
  sky: string;
  mid: string;
  ground: string;
  disc: string;
  discCore: string;
  haze: string;
  landFar: string;
  landNear: string;
  ink: string;
  figure: string;
};

const PALETTE: Record<CoverAccent, Palette> = {
  cyan: {
    sky: "#071c1e",
    mid: "#0f3336",
    ground: "#071014",
    disc: "#3bb8b3",
    discCore: "#d7fffb",
    haze: "rgb(59 184 179 / 0.14)",
    landFar: "#1c5a5e",
    landNear: "#0b1c20",
    ink: "#041012",
    figure: "#8ee8e3",
  },
  magenta: {
    sky: "#1a0a14",
    mid: "#3a1630",
    ground: "#10080e",
    disc: "#d9568a",
    discCore: "#ffd6e6",
    haze: "rgb(217 86 138 / 0.14)",
    landFar: "#6a2a48",
    landNear: "#180e16",
    ink: "#12060d",
    figure: "#f0a8c4",
  },
  sunset: {
    sky: "#1c1008",
    mid: "#3a2214",
    ground: "#100a08",
    disc: "#f08a4a",
    discCore: "#ffe2a8",
    haze: "rgb(240 138 74 / 0.16)",
    landFar: "#6a3a1c",
    landNear: "#18100c",
    ink: "#100806",
    figure: "#ffc888",
  },
};

type CoverArtProps = {
  accent: CoverAccent;
  title: string;
  scene?: CoverScene;
  className?: string;
  lead?: boolean;
  kind?: string;
  imageUrl?: string;
};

function gradientId(accent: CoverAccent, scene: CoverScene, title: string) {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  return `sky-${accent}-${scene}-${hash.toString(36)}`;
}

function Scene({ scene, p }: { scene: CoverScene; p: Palette }) {
  switch (scene) {
    case "coast":
      return (
        <>
          <circle cx="1180" cy="260" r="170" fill={p.disc} />
          <circle cx="1180" cy="260" r="78" fill={p.discCore} />
          <path d="M0 500 C 260 430, 520 560, 820 470 C 1100 390, 1360 520, 1600 440 L 1600 900 L 0 900 Z" fill={p.figure} opacity="0.22" />
          <path d="M0 580 C 300 520, 620 640, 960 560 C 1240 490, 1460 620, 1600 560 L 1600 900 L 0 900 Z" fill={p.landFar} />
          <path d="M0 720 C 380 680, 760 780, 1140 700 C 1400 650, 1600 740, 1600 740 L 1600 900 L 0 900 Z" fill={p.ink} />
        </>
      );
    case "city":
      return (
        <>
          <rect x="70" y="380" width="150" height="520" fill={p.landFar} />
          <rect x="240" y="200" width="190" height="700" fill={p.ink} />
          <rect x="450" y="300" width="170" height="600" fill={p.figure} opacity="0.55" />
          <rect x="640" y="120" width="230" height="780" fill={p.ink} />
          <rect x="890" y="260" width="160" height="640" fill={p.landFar} />
          <rect x="1070" y="180" width="200" height="720" fill={p.ink} />
          <rect x="1290" y="330" width="180" height="570" fill={p.figure} opacity="0.4" />
          {[260, 480, 700, 920, 1140, 1360].flatMap((x, i) =>
            [0, 1, 2, 3].map((row) => (
              <rect
                key={`${x}-${row}`}
                x={x + (i % 2) * 16}
                y={240 + row * 70 + (i % 3) * 12}
                width="16"
                height="22"
                fill={p.discCore}
                opacity={0.45}
              />
            )),
          )}
          <path d="M0 800 L 1600 800 L 1600 900 L 0 900 Z" fill={p.ground} />
        </>
      );
    case "car":
      return (
        <>
          <circle cx="1280" cy="210" r="100" fill={p.disc} />
          <path d="M0 640 L 1600 580 L 1600 900 L 0 900 Z" fill={p.landNear} />
          <path d="M0 730 L 1600 730 L 1600 900 L 0 900 Z" fill={p.ink} />
          <rect x="80" y="716" width="1440" height="10" fill={p.figure} opacity="0.45" />
          <path
            d="M300 630 C 380 500, 520 470, 680 470 L 980 470 C 1140 470, 1240 520, 1320 630 L 1400 630 C 1450 630, 1470 670, 1440 710 L 250 710 C 210 670, 240 630, 300 630 Z"
            fill={p.figure}
          />
          <path d="M640 480 L 1000 480 L 1070 610 L 590 610 Z" fill={p.ink} opacity="0.45" />
          <circle cx="520" cy="710" r="64" fill={p.ink} />
          <circle cx="520" cy="710" r="28" fill={p.disc} />
          <circle cx="1160" cy="710" r="64" fill={p.ink} />
          <circle cx="1160" cy="710" r="28" fill={p.disc} />
        </>
      );
    case "map":
      return (
        <>
          <path
            d="M180 200 C 360 120, 560 210, 760 160 C 980 100, 1180 230, 1420 170 L 1480 640 C 1260 720, 1040 620, 820 690 C 600 760, 360 650, 160 700 Z"
            fill={p.figure}
          />
          <path
            d="M280 280 C 480 220, 720 300, 980 240 C 1180 190, 1320 300, 1380 280 L 1400 580 C 1180 640, 940 560, 720 620 C 500 680, 320 580, 250 600 Z"
            fill={p.landNear}
          />
          <path d="M340 360 C 640 300, 960 420, 1280 330" fill="none" stroke={p.discCore} strokeWidth="10" />
          <path d="M400 480 C 700 430, 1020 530, 1320 450" fill="none" stroke={p.disc} strokeWidth="6" />
          <circle cx="1280" cy="220" r="22" fill={p.discCore} />
          <circle cx="1280" cy="220" r="52" fill="none" stroke={p.discCore} strokeWidth="5" />
          <path d="M1280 168 L 1280 160 M1280 280 L 1280 272 M1228 220 L 1220 220 M1332 220 L 1340 220" stroke={p.discCore} strokeWidth="4" />
        </>
      );
    case "gun":
      return (
        <>
          <rect x="60" y="540" width="1480" height="260" fill={p.landNear} />
          <rect x="60" y="540" width="1480" height="22" fill={p.figure} />
          <rect x="160" y="340" width="1020" height="80" rx="16" fill={p.figure} />
          <rect x="1020" y="270" width="240" height="100" rx="14" fill={p.discCore} />
          <path d="M1020 420 L 1140 540 L 1020 540 Z" fill={p.figure} />
          <rect x="190" y="420" width="180" height="140" rx="10" fill={p.ink} />
          <rect x="1260" y="620" width="100" height="56" rx="8" fill={p.disc} />
          <rect x="1380" y="620" width="100" height="56" rx="8" fill={p.discCore} />
          <rect x="1260" y="696" width="100" height="56" rx="8" fill={p.disc} opacity="0.7" />
        </>
      );
    case "interior":
      return (
        <>
          <rect x="0" y="0" width="800" height="900" fill={p.mid} />
          <rect x="800" y="0" width="800" height="900" fill={p.landNear} />
          <rect x="160" y="120" width="460" height="540" fill={p.figure} opacity="0.35" />
          <rect x="980" y="120" width="460" height="540" fill={p.disc} opacity="0.28" />
          <rect x="210" y="170" width="360" height="440" fill={p.sky} />
          <rect x="1030" y="170" width="360" height="440" fill={p.ink} />
          <ellipse cx="390" cy="740" rx="78" ry="170" fill={p.figure} />
          <ellipse cx="1210" cy="740" rx="78" ry="170" fill={p.discCore} opacity="0.7" />
          <rect x="786" y="0" width="28" height="900" fill={p.ink} />
        </>
      );
    case "swamp":
      return (
        <>
          <circle cx="240" cy="220" r="110" fill={p.disc} opacity="0.75" />
          <path d="M0 500 C 300 460, 600 560, 900 500 C 1200 440, 1450 540, 1600 500 L 1600 900 L 0 900 Z" fill={p.landFar} />
          <path d="M0 640 C 400 600, 800 720, 1200 640 C 1450 590, 1600 680, 1600 680 L 1600 900 L 0 900 Z" fill={p.landNear} />
          <rect x="220" y="280" width="28" height="420" fill={p.ink} />
          <rect x="520" y="240" width="34" height="500" fill={p.ink} />
          <rect x="860" y="300" width="26" height="400" fill={p.ink} />
          <rect x="1180" y="260" width="32" height="460" fill={p.ink} />
          <ellipse cx="236" cy="280" rx="90" ry="28" fill={p.landFar} />
          <ellipse cx="536" cy="250" rx="110" ry="32" fill={p.landFar} />
          <ellipse cx="872" cy="310" rx="80" ry="24" fill={p.landFar} />
        </>
      );
    case "port":
      return (
        <>
          <path d="M0 540 L 1600 500 L 1600 900 L 0 900 Z" fill={p.landFar} />
          <path d="M0 700 L 1600 700 L 1600 900 L 0 900 Z" fill={p.ink} />
          <rect x="160" y="140" width="44" height="560" fill={p.figure} />
          <rect x="60" y="140" width="460" height="32" fill={p.discCore} />
          <rect x="460" y="140" width="28" height="240" fill={p.figure} />
          <rect x="620" y="400" width="170" height="160" fill={p.disc} />
          <rect x="810" y="360" width="170" height="200" fill={p.figure} />
          <rect x="1000" y="430" width="170" height="130" fill={p.discCore} />
          <rect x="1190" y="380" width="170" height="180" fill={p.disc} />
        </>
      );
    case "marina":
      return (
        <>
          <path d="M0 420 C 400 380, 800 480, 1200 400 C 1400 360, 1600 420, 1600 420 L 1600 900 L 0 900 Z" fill={p.landFar} />
          <path d="M0 620 L 1600 580 L 1600 900 L 0 900 Z" fill={p.ink} />
          <rect x="0" y="600" width="1600" height="18" fill={p.landNear} />
          <path d="M220 560 L 420 500 L 700 500 L 820 560 Z" fill={p.mid} />
          <path d="M900 570 L 1080 510 L 1320 510 L 1440 570 Z" fill={p.landNear} />
          <rect x="360" y="430" width="14" height="90" fill={p.disc} opacity="0.4" />
          <rect x="1120" y="430" width="14" height="90" fill={p.disc} opacity="0.4" />
        </>
      );
    case "street":
      return (
        <>
          <path d="M0 500 L 1600 440 L 1600 900 L 0 900 Z" fill={p.landNear} />
          <path d="M0 640 L 1600 640 L 1600 900 L 0 900 Z" fill={p.ink} />
          <rect x="200" y="628" width="80" height="12" fill={p.disc} opacity="0.3" />
          <rect x="400" y="628" width="80" height="12" fill={p.disc} opacity="0.3" />
          <rect x="600" y="628" width="80" height="12" fill={p.disc} opacity="0.3" />
          <path d="M980 560 L 1080 470 L 1380 470 L 1500 560 L 1480 620 L 1000 620 Z" fill={p.landFar} />
          <rect x="1120" y="490" width="160" height="70" fill={p.mid} />
          <circle cx="1100" cy="620" r="42" fill={p.ink} />
          <circle cx="1380" cy="620" r="42" fill={p.ink} />
          {[240, 480, 720, 960].map((x) => (
            <line key={x} x1={x} y1="80" x2={x - 40} y2="500" stroke={p.discCore} strokeWidth="2" opacity="0.12" />
          ))}
        </>
      );
    case "club":
      return (
        <>
          <rect x="0" y="0" width="1600" height="900" fill={p.ink} />
          <rect x="200" y="160" width="1200" height="420" fill={p.mid} />
          <rect x="280" y="220" width="1040" height="280" fill={p.sky} />
          <rect x="480" y="300" width="640" height="160" fill={p.landFar} />
          <rect x="160" y="620" width="80" height="160" fill={p.landNear} />
          <rect x="1360" y="620" width="80" height="160" fill={p.landNear} />
          <circle cx="800" cy="380" r="36" fill={p.disc} opacity="0.35" />
          <path d="M0 780 L 1600 780 L 1600 900 L 0 900 Z" fill={p.ground} />
        </>
      );
    case "workshop":
      return (
        <>
          <rect x="0" y="0" width="1600" height="900" fill={p.mid} />
          <rect x="80" y="80" width="520" height="420" fill={p.ink} />
          <rect x="120" y="120" width="80" height="40" fill={p.disc} opacity="0.3" />
          <rect x="220" y="120" width="80" height="40" fill={p.disc} opacity="0.2" />
          <rect x="320" y="120" width="80" height="40" fill={p.disc} opacity="0.3" />
          <rect x="720" y="360" width="720" height="40" fill={p.landFar} />
          <rect x="780" y="400" width="40" height="260" fill={p.landNear} />
          <rect x="1340" y="400" width="40" height="260" fill={p.landNear} />
          <rect x="0" y="660" width="1600" height="240" fill={p.ground} />
        </>
      );
    case "portrait":
      return (
        <>
          <rect x="0" y="0" width="1600" height="900" fill={p.ink} />
          <rect x="260" y="80" width="700" height="620" fill={p.mid} />
          <rect x="320" y="130" width="580" height="500" fill={p.sky} />
          <ellipse cx="610" cy="720" rx="120" ry="220" fill={p.landNear} />
          <circle cx="610" cy="430" r="86" fill={p.landFar} />
          <rect x="1080" y="0" width="520" height="900" fill={p.ground} />
        </>
      );
    case "desk":
      return (
        <>
          <rect x="0" y="0" width="1600" height="900" fill={p.mid} />
          <rect x="180" y="120" width="720" height="420" fill={p.ink} />
          <rect x="220" y="160" width="640" height="340" fill={p.sky} />
          <rect x="980" y="180" width="260" height="320" fill={p.landFar} />
          <rect x="1280" y="220" width="200" height="260" fill={p.landNear} />
          <rect x="0" y="620" width="1600" height="280" fill={p.ground} />
          <rect x="200" y="660" width="360" height="12" fill={p.disc} opacity="0.3" />
          <rect x="200" y="700" width="280" height="12" fill={p.discCore} opacity="0.18" />
        </>
      );
    default:
      return (
        <>
          <circle cx="800" cy="320" r="160" fill={p.disc} />
          <path d="M0 600 C 400 520, 800 680, 1600 560 L 1600 900 L 0 900 Z" fill={p.landNear} />
        </>
      );
  }
}

export function CoverArt({
  accent,
  title,
  scene = "coast",
  className = "",
  lead = false,
  kind,
  imageUrl,
}: CoverArtProps) {
  const palette = PALETTE[accent];
  const skyId = gradientId(accent, scene, title);

  return (
    <div
      className={`film-grain @container relative overflow-hidden bg-ink ${className}`}
      aria-hidden="true"
      data-cover-scene={scene}
      data-cover-image={imageUrl ? "true" : undefined}
    >
      {imageUrl ? (
        // Uploaded covers are remote Storage URLs rendered as-is.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          // Only the lead story cover loads eagerly; the rest wait until near the
          // screen, so pages do not preload images they never show.
          loading={lead ? "eager" : "lazy"}
          fetchPriority={lead ? "high" : "auto"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 1600 900"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id={skyId} x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0%" stopColor={palette.sky} />
              <stop offset="52%" stopColor={palette.mid} />
              <stop offset="100%" stopColor={palette.ground} />
            </linearGradient>
          </defs>
          <rect width="1600" height="900" fill={`url(#${skyId})`} />
          <ellipse cx="800" cy="300" rx="380" ry="140" fill={palette.haze} />
          <Scene scene={scene} p={palette} />
        </svg>
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 36%, transparent 46%, rgb(0 0 0 / 0.28) 100%)",
        }}
      />
      {kind ? (
        <span
          data-cover-kind={kind}
          className={`pointer-events-none absolute bottom-[6%] left-[-1%] z-[1] select-none px-3 font-display font-extrabold uppercase leading-none tracking-[-0.07em] text-white/18 ${
            lead
              ? "text-[clamp(3.6rem,28cqi,8.5rem)]"
              : "text-[clamp(2.4rem,32cqi,5.2rem)]"
          }`}
        >
          {kind}
        </span>
      ) : null}
      <span className="sr-only">{title}</span>
    </div>
  );
}
