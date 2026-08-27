// Dynamic share card for a scan result. When someone shares their /scan/<id>
// link on Reddit/X/LinkedIn, this renders "<domain> scored 75/100" so the score
// spreads on its own. Auto-merged into the route's metadata by Next.js.
import { ImageResponse } from "next/og";

import { exampleReport } from "@/lib/report/example";
import { getReportByScan, isUuid } from "@/lib/scans/repository";

export const runtime = "nodejs";
export const alt = "AI Search Readiness score";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Concrete hex (CSS variables do not resolve inside an OG image). Dark card so it
// stands out in a feed; level colors are the brighter dark-mode variants.
const BG = "#0b0d12";
const SURFACE = "#1b1f2a";
const FG = "#eef1f6";
const MUTED = "#9aa3b2";
const SUBTLE = "#626b7b";
const ACCENT = "#8b6dff";

function levelHex(level: string): string {
  switch (level) {
    case "Excellent":
    case "Strong":
      return "#34d399";
    case "Good":
      return "#38bdf8";
    case "Needs improvement":
      return "#fbbf24";
    default:
      return "#fb7185";
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = id === "demo" ? exampleReport : isUuid(id) ? await getReportByScan(id) : null;

  const domain = report?.meta.canonical_domain ?? "your website";
  const hasScore = report != null;
  const score = report ? Math.round(report.overall_score) : 0;
  const level = report?.overall_level ?? "measuring…";
  const color = levelHex(level);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          color: FG,
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                background: ACCENT,
                marginRight: 16,
              }}
            />
            <div style={{ display: "flex", fontSize: 30, fontWeight: 600 }}>Find Your AI Score</div>
          </div>
          <div style={{ display: "flex", fontSize: 26, color: MUTED }}>{domain}</div>
        </div>

        {/* score */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 4, color: SUBTLE }}>
            AI SEARCH READINESS
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", marginTop: 8 }}>
            <div style={{ display: "flex", fontSize: 200, fontWeight: 800, lineHeight: 1 }}>
              {hasScore ? String(score) : "—"}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 48,
                color: SUBTLE,
                marginLeft: 14,
                marginBottom: 30,
              }}
            >
              / 100
            </div>
            <div
              style={{
                display: "flex",
                marginLeft: "auto",
                marginBottom: 34,
                fontSize: 54,
                fontWeight: 700,
                color,
              }}
            >
              {level}
            </div>
          </div>
          {/* progress bar */}
          <div
            style={{
              display: "flex",
              width: "100%",
              height: 20,
              borderRadius: 999,
              background: SURFACE,
              marginTop: 20,
            }}
          >
            <div
              style={{
                width: `${hasScore ? score : 0}%`,
                height: "100%",
                borderRadius: 999,
                background: color,
              }}
            />
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 26, color: MUTED, maxWidth: 760, display: "flex" }}>
            Is your site ready to be cited by ChatGPT, Perplexity and Gemini?
          </div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: ACCENT }}>
            findyouraiscore.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
