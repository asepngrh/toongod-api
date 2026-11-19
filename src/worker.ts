import { toonGodScraper } from './scraper.js';
import { CONFIG, updateConfig } from './config.js';
import { httpClient } from './client.js';
import { DASHBOARD_HTML, DASHBOARD_JS } from './embeddedUi.js';

export interface Env {
  BASE_URL?: string;
  USER_AGENT?: string;
  COOKIE?: string;
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

export default {
  async fetch(request: Request, env: Env, _ctx: any): Promise<Response> {
    // 1. Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // 2. Sinkronisasi Environment Variables dari Cloudflare Worker
    if (env) {
      updateConfig(env);
      if (env.BASE_URL) httpClient.updateBaseUrl(env.BASE_URL);
      if (env.USER_AGENT) httpClient.updateUserAgent(env.USER_AGENT);
      if (env.COOKIE) httpClient.updateCookie(env.COOKIE);
    }

    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    try {
      // 1. Info API
      if (pathname === '/api/info') {
        return jsonResponse({
          name: 'ToonGod 18+ Scraper API',
          version: '2.0.0',
          edition: 'Adult 18+ Webtoon & Manhwa Only',
          platform: 'Cloudflare Workers',
          target: CONFIG.BASE_URL,
          endpoints: {
            home: 'GET /api/home (18+ Trending & Latest Releases)',
            webtoons: 'GET /api/webtoons?page=1&orderby=latest|trending|views|rating (Katalog 18+)',
            search: 'GET /api/search?q=:keyword&page=1 (Cari Komik 18+)',
            detail: 'GET /api/detail/:slug',
            chapter: 'GET /api/chapter/:slug/:chapterSlug',
            genres: 'GET /api/genres',
          },
        });
      }

      // 2. GET /api/home
      if (pathname === '/api/home') {
        const data = await toonGodScraper.getHome();
        return jsonResponse({ success: true, data });
      }

      // 3. GET /api/webtoons
      if (pathname === '/api/webtoons') {
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
        const orderby = searchParams.get('orderby') as any;
        const genre = searchParams.get('genre') || undefined;
        const status = searchParams.get('status') || undefined;

        const result = await toonGodScraper.getWebtoonList({ page, orderby, genre, status });
        return jsonResponse({
          success: true,
          pagination: result.pagination,
          data: result.items,
        });
      }

      // 4. GET /api/search
      if (pathname === '/api/search') {
        const query = searchParams.get('q') || '';
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
        const orderby = searchParams.get('orderby') as any;
        const genre = searchParams.get('genre') || undefined;
        const status = searchParams.get('status') || undefined;

        if (!query) {
          return jsonResponse({ success: false, message: 'Parameter query `q` wajib diisi' }, 400);
        }

        const result = await toonGodScraper.search(query, page, { orderby, genre, status });
        return jsonResponse({
          success: true,
          pagination: result.pagination,
          data: result.items,
        });
      }

      // 5. GET /api/detail/:slug
      if (pathname.startsWith('/api/detail/')) {
        const slug = pathname.replace('/api/detail/', '').replace(/^\/|\/$/g, '');
        if (!slug) {
          return jsonResponse({ success: false, message: 'Slug webtoon wajib diisi' }, 400);
        }

        try {
          const data = await toonGodScraper.getDetail(slug);
          return jsonResponse({ success: true, data });
        } catch (error: any) {
          const status = error.response?.status || 500;
          if (status === 404) {
            return jsonResponse(
              {
                success: false,
                message: `Webtoon dengan slug '${slug}' tidak ditemukan di ToonGod (404 Not Found).`,
              },
              404
            );
          }
          throw error;
        }
      }

      // 6. GET /api/chapter/:slug/:chapterSlug
      if (pathname.startsWith('/api/chapter/')) {
        const parts = pathname.replace('/api/chapter/', '').replace(/^\/|\/$/g, '').split('/');
        const slug = parts[0];
        const chapterSlug = parts[1];

        if (!slug || !chapterSlug) {
          return jsonResponse(
            {
              success: false,
              message: 'Format URL chapter harus: /api/chapter/:slug/:chapterSlug',
            },
            400
          );
        }

        try {
          const data = await toonGodScraper.getChapter(slug, chapterSlug);
          return jsonResponse({ success: true, data });
        } catch (error: any) {
          const status = error.response?.status || 500;
          if (status === 404) {
            return jsonResponse(
              {
                success: false,
                message: `Chapter '${chapterSlug}' pada webtoon '${slug}' tidak ditemukan di ToonGod (404 Not Found).`,
              },
              404
            );
          }
          throw error;
        }
      }

      // 7. GET /api/genres
      if (pathname === '/api/genres') {
        const data = await toonGodScraper.getGenres();
        return jsonResponse({ success: true, data });
      }

      // 8. DEBUG: GET /api/debug/chapter/:slug/:chapterSlug
      if (pathname.startsWith('/api/debug/chapter/')) {
        const parts = pathname.replace('/api/debug/chapter/', '').replace(/^\/|\/$/g, '').split('/');
        const slug = parts[0];
        const chapterSlug = parts[1];
        const targetUrl = `/webtoon/${slug}/${chapterSlug}/`;
        const html = await httpClient.get(targetUrl);
        return jsonResponse({
          success: true,
          htmlLength: html.length,
          preview: html.substring(0, 1000),
        });
      }

      // 9. Static Assets (Cloudflare Workers Assets binding jika diaktifkan)
      if (env.ASSETS) {
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status < 400) {
          return assetResponse;
        }
      }

      // 10. Dashboard UI (Root '/' atau '/index.html')
      if (pathname === '/' || pathname === '/index.html') {
        return new Response(DASHBOARD_HTML, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...CORS_HEADERS,
          },
        });
      }

      // 11. Script UI Dashboard ('/main.js')
      if (pathname === '/main.js') {
        return new Response(DASHBOARD_JS, {
          headers: {
            'Content-Type': 'application/javascript; charset=utf-8',
            ...CORS_HEADERS,
          },
        });
      }

      return jsonResponse({ success: false, message: 'Endpoint tidak ditemukan (404 Not Found)' }, 404);
    } catch (error: any) {
      return jsonResponse(
        {
          success: false,
          message: error.message || 'Internal Server Error',
        },
        500
      );
    }
  },
};
