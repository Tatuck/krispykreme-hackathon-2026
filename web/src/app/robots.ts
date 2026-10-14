import type { MetadataRoute } from "next";

// Crawlers stay on the landing page: /demo rings up a ticket per visit, the rest is per-user or staff.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/demo", "/t/", "/r/", "/me", "/login", "/auth/", "/staff", "/admin", "/api/"] },
  };
}
