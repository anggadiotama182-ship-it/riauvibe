interface SanityPost {
  slug: string;
  publishedAt?: string;
  _updatedAt?: string;
}

function toSafeIsoDate(value?: string): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const PROJECT_ID = 'z0v67ol7';
  const DATASET = 'production';
  const nowIso = new Date().toISOString();

  const staticPages = [
    { loc: 'https://riauvibe.com/', lastmod: nowIso, changefreq: 'hourly', priority: '1.0' },
    { loc: 'https://riauvibe.com/tentang-kami.html', lastmod: nowIso, changefreq: 'monthly', priority: '0.6' },
    { loc: 'https://riauvibe.com/kontak.html', lastmod: nowIso, changefreq: 'monthly', priority: '0.6' },
    { loc: 'https://riauvibe.com/kebijakan-privasi.html', lastmod: nowIso, changefreq: 'monthly', priority: '0.6' },
    { loc: 'https://riauvibe.com/pedoman-redaksi.html', lastmod: nowIso, changefreq: 'monthly', priority: '0.6' },
  ];

  const query = encodeURIComponent(
    `*[_type == "post" && defined(slug.current)] | order(publishedAt desc){
      "slug": slug.current,
      publishedAt,
      _updatedAt
    }`
  );

  let postUrls = '';

  try {
    const response = await fetch(
      `https://${PROJECT_ID}.api.sanity.io/v2021-10-21/data/query/${DATASET}?query=${query}`
    );

    if (response.ok) {
      const data = await response.json();
      const posts: SanityPost[] = Array.isArray(data?.result) ? data.result : [];

      postUrls = posts
        .filter((post) => Boolean(post?.slug))
        .map((post) => {
          const loc = escapeXml(`https://riauvibe.com/?berita=${encodeURIComponent(post.slug)}`);
          const lastMod = toSafeIsoDate(post._updatedAt || post.publishedAt);
          return `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
        })
        .join('');
    }
  } catch {
    // Jika query Sanity gagal sesaat, tetap kembalikan XML valid dengan halaman utama & halaman statis
  }

  const staticXml = staticPages
    .map(
      (page) => `
  <url>
    <loc>${escapeXml(page.loc)}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticXml}${postUrls}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  });
}
