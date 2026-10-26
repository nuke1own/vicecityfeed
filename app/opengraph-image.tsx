import { readFileSync } from "node:fs";
import { ImageResponse } from "next/og";
import { LOGO_FILE_PNG } from "@/lib/logo";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";
export const alt = SITE.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const logoSrc = `data:image/png;base64,${readFileSync(LOGO_FILE_PNG).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#000000",
          color: "#FFFFFF",
          padding: 64,
        }}
      >
        <img
          src={logoSrc}
          width={282}
          height={140}
          alt=""
          style={{ objectFit: "contain", objectPosition: "left" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 72,
              lineHeight: 0.95,
              fontWeight: 800,
              letterSpacing: -2,
            }}
          >
            VICE CITY FEED
          </div>
          <div style={{ fontSize: 28, color: "#FFFFFF", fontWeight: 700 }}>
            {SITE.tagline}
          </div>
        </div>
        <div style={{ fontSize: 22, color: "#3BB8B3", fontWeight: 700 }}>
          {SITE.shortName}
        </div>
      </div>
    ),
    size,
  );
}
