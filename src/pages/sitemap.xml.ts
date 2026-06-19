import { getCollection } from 'astro:content';
import { SITE_URL } from '../consts';

const staticRoutes = [
	'/',
	'/about/',
	'/blog/',
	'/privacy/',
	'/tools/',
	'/tools/drawdown-recovery/',
	'/tools/expectancy/',
	'/tools/monte-carlo/',
	'/tools/risk-reward/',
	'/tools/win-rate/',
];

function escapeXml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

export async function GET() {
	const posts = await getCollection('blog');
	const urls = [
		...staticRoutes.map((pathname) => ({
			loc: new URL(pathname, SITE_URL).href,
		})),
		...posts.map((post) => ({
			loc: new URL(`/blog/${post.id}/`, SITE_URL).href,
			lastmod: (post.data.updatedDate ?? post.data.pubDate).toISOString(),
		})),
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
		.map(({ loc, lastmod }) => `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ''}
  </url>`)
		.join('\n')}
</urlset>`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
		},
	});
}