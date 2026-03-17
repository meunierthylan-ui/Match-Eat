import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Pour tester : autoriser tous les domaines (décommenter remotePatterns ci‑dessous et commenter celui avec la liste).
    // remotePatterns: [{ protocol: "https", hostname: "**", pathname: "/**" }, { protocol: "http", hostname: "**", pathname: "/**" }],
    remotePatterns: [
      { protocol: "https", hostname: "www.kodawari-ramen.com", pathname: "/**" },
      { protocol: "https", hostname: "www.bigmammagroup.com", pathname: "/**" },
      { protocol: "https", hostname: "lasdufallafel.com", pathname: "/**" },
      { protocol: "https", hostname: "www.bouillon-chartier.com", pathname: "/**" },
      { protocol: "https", hostname: "www.relaisentrecote.fr", pathname: "/**" },
      { protocol: "https", hostname: "www.sortiraparis.com", pathname: "/**" },
      { protocol: "https", hostname: "www.septime-charonne.fr", pathname: "/**" },
      { protocol: "https", hostname: "www.season-paris.com", pathname: "/**" },
      { protocol: "https", hostname: "www.lebonbon.fr", pathname: "/**" },
      // Supabase / stockage et autres CDN courants
      { protocol: "https", hostname: "*.supabase.co", pathname: "/**" },
      { protocol: "https", hostname: "supabase.co", pathname: "/**" },
      { protocol: "https", hostname: "upload.wikimedia.org", pathname: "/**" },
    ],
  },
};

export default nextConfig;
