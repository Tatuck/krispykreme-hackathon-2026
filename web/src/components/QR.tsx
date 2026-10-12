"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QR({ value, size = 160, className = "" }: { value: string; size?: number; className?: string }) {
  const [svg, setSvg] = useState<string>("");
  useEffect(() => {
    QRCode.toString(value, { type: "svg", margin: 1, color: { dark: "#2B2B2B", light: "#FFFFFF" } })
      .then(setSvg)
      .catch(() => setSvg(""));
  }, [value]);
  return (
    <div
      className={`overflow-hidden rounded-xl bg-white [&>svg]:h-full [&>svg]:w-full ${className}`}
      style={{ width: size, height: size }}
      aria-label={`QR ${value}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
