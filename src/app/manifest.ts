import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AYAAN CLOTHING - Original-Branded Garments Manufacturer & Exporter",
    short_name: "AYAAN CLOTHING",
    description: "Original-Branded Garments Manufacturer & Exporter based in Uttara, Dhaka, Bangladesh. Established 2010.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
