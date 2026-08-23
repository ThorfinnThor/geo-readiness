import { ImageResponse } from "next/og";

import { SITE } from "@/lib/seo/site";

export const runtime = "edge";

// Dynamic Open Graph image. Pages set their metadata images to
// /og?title=...&category=... (see lib/seo/content-metadata). 1200x630, branded.
export function GET(request: Request): ImageResponse {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") || SITE.name).slice(0, 140);
  const category = (searchParams.get("category") || "").slice(0, 40);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0e1017",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "linear-gradient(120deg, #6d4dff, #06b6d4)",
            }}
          />
          <div style={{ color: "#9aa3b2", fontSize: 26, fontFamily: "monospace" }}>geo/readiness</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {category ? (
            <div style={{ display: "flex", color: "#8b93a3", fontSize: 24, letterSpacing: 4 }}>
              {category.toUpperCase()}
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              color: "#eef1f6",
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.15,
              maxWidth: "1040px",
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: "flex", color: "#626b7b", fontSize: 24 }}>{SITE.name}</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
