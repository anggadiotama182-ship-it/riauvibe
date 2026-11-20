interface SanitySharePost {
  title: string;
  summary?: string;
  imageUrl?: string;
  slug?: string;
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug') || '';

  const PROJECT_ID = 'z0v67ol7';
  const DATASET = 'production';
  const targetArticleUrl = `https://riauvibe.com/?berita=${encodeURIComponent(slug)}`;

  let title = 'RiauVibe - Portal Berita Riau dan Kepulauan Riau Terkini';
  let description = 'Update berita terkini seputar peristiwa, pemerintahan, ekonomi, dan olahraga di Riau dan Kepulauan Riau.';
  let image = 'https://riauvibe.com/logo-riauvibe.jpg';

  if (slug) {
    try {
      const query = encodeURIComponent(
        `*[_type == "post" && (slug.current == $slug || _id == $slug)][0]{
          title,
          summary,
          "imageUrl": mainImage.asset->url,
          "slug": slug.current
        }`
      );
      const endpoint = `https://${PROJECT_ID}.api.sanity.io/v2021-10-21/data/query/${DATASET}?query=${query}&%24slug=%22${encodeURIComponent(slug)}%22`;
      const res = await fetch(endpoint);
      const data = await res.json();
      const post: SanitySharePost | null = data.result || null;

      if (post) {
        title = `${post.title} - RiauVibe`;
        description = post.summary || post.title;
        if (post.imageUrl) {
          image = `${post.imageUrl}?w=1200&h=630&fit=crop&auto=format`;
        }
      }
    } catch {
      // Gunakan metadata default jika Sanity gagal dijangkau
    }
  }

  const safeTitle = escapeAttr(title);
  const safeDesc = escapeAttr(description);
  const safeImage = escapeAttr(image);
  const safeUrl = escapeAttr(targetArticleUrl);

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />
  <meta property="og:site_name" content="RiauVibe" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:url" content="${safeUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeImage}" />
  <meta http-equiv="refresh" content="0;url=${safeUrl}" />
</head>
<body>
  <p>Mengalihkan ke berita: <a href="${safeUrl}">${safeTitle}</a>...</p>
  <script>window.location.replace(${JSON.stringify(targetArticleUrl)});</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 's-maxage=1800, stale-while-revalidate',
    },
  });
}
