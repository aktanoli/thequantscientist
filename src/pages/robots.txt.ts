import { SITE_URL } from '../consts';

export const GET = () => {
	const robots = [
		'User-agent: *',
		'Allow: /',
		`Sitemap: ${new URL('/sitemap.xml', SITE_URL).href}`,
	].join('\n');

	return new Response(robots, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
		},
	});
};