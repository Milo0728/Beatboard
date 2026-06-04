import type { MetadataRoute } from "next";

import { db, schema } from "@/db/client";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/rankings`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/albums`, changeFrequency: "daily", priority: 0.8 },
  ];

  if (!db) return staticRoutes;

  const [albums, artists] = await Promise.all([
    db
      .select({
        slug: schema.albums.slug,
        createdAt: schema.albums.createdAt,
      })
      .from(schema.albums),
    db.select({ slug: schema.artists.slug }).from(schema.artists),
  ]);

  const albumRoutes: MetadataRoute.Sitemap = albums.map((a) => ({
    url: `${siteUrl}/albums/${a.slug}`,
    lastModified: a.createdAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const artistRoutes: MetadataRoute.Sitemap = artists.map((a) => ({
    url: `${siteUrl}/artists/${a.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...albumRoutes, ...artistRoutes];
}
