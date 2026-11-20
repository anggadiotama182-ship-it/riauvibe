interface SanityPost {
  slug: string;
  publishedAt?: string;
  _updatedAt?: string;
}

export async function GET() {
  const PROJECT_ID = 'z0v67ol7';
  const DATASET = 'production';
  const query = encodeURIComponent(
    `*[_type == "post" && defined(slug.current)] | order(publishedAt desc){
      "slug": slug.current,
      publishedAt,
      _updatedAt
    }`
  );

  try {
    const response = await fetch(
      `https://${PROJECT_ID}.api.sanity.io/v2021-10-21/data/query/${DATASET}?query=${query}`
    );
    const data = await response.json();
    const posts: SanityPost[] = data.result || [];

    const urls = posts
      .map((post) => {
        const lastMod = new Date(post._updatedAt || post.publishedAt || Date.now()).toISOString();
        return `
  <url>
    <loc>https://riauvibe.com/?berita=${encodeURIComponent(post.slug)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
      })
      .join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://riauvibe.com/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>${urls}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });
  } catch {
    return new Response('Gagal membuat sitemap', { status: 500 });
  }
}
