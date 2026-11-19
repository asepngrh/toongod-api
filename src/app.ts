import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import * as cheerio from 'cheerio';
import { CONFIG } from './config.js';
import { toonGodScraper } from './scraper.js';
import { httpClient } from './client.js';

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files dari folder public/ (UI Dashboard)
const publicDir = path.resolve(process.cwd(), 'public');
app.use(express.static(publicDir));

// Route Dashboard UI
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Route Info JSON
app.get('/api/info', (_req: Request, res: Response) => {
  res.json({
    name: 'ToonGod 18+ Scraper API',
    version: '2.0.0',
    edition: 'Adult 18+ Webtoon & Manhwa Only',
    target: CONFIG.BASE_URL,
    endpoints: {
      home: 'GET /api/home (18+ Trending & Latest Releases)',
      webtoons: 'GET /api/webtoons?page=1&orderby=latest|trending|views|rating (Katalog 18+)',
      search: 'GET /api/search?q=:keyword&page=1 (Cari Komik 18+)',
      detail: 'GET /api/detail/:slug',
      chapter: 'GET /api/chapter/:slug/:chapterSlug',
      genres: 'GET /api/genres'
    }
  });
});

// 1. GET /api/home (Khusus 18+ Trending & Latest)
app.get('/api/home', async (_req: Request, res: Response) => {
  try {
    const data = await toonGodScraper.getHome();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. GET /api/webtoons (Katalog Khusus 18+ Webtoon dengan Pagination)
app.get('/api/webtoons', async (req: Request, res: Response) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const orderby = req.query.orderby as any;
    const genre = req.query.genre as string;
    const status = req.query.status as string;

    const result = await toonGodScraper.getWebtoonList({ page, orderby, genre, status });
    res.json({
      success: true,
      pagination: result.pagination,
      data: result.items
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. GET /api/search (Pencarian Khusus Komik Dewasa 18+)
app.get('/api/search', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const orderby = req.query.orderby as any;
    const genre = req.query.genre as string;
    const status = req.query.status as string;

    if (!query) {
      return res.status(400).json({ success: false, message: 'Parameter query `q` wajib diisi' });
    }

    const result = await toonGodScraper.search(query, page, { orderby, genre, status });
    res.json({
      success: true,
      pagination: result.pagination,
      data: result.items
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. GET /api/detail/:slug
app.get('/api/detail/:slug', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug;
    const data = await toonGodScraper.getDetail(slug);
    res.json({ success: true, data });
  } catch (error: any) {
    const status = error.response?.status || 500;
    if (status === 404) {
      return res.status(404).json({
        success: false,
        message: `Webtoon dengan slug '${req.params.slug}' tidak ditemukan di ToonGod (404 Not Found). Pastikan slug diambil dari endpoint /api/webtoons atau /api/search.`
      });
    }
    res.status(status).json({ success: false, message: error.message });
  }
});

// 5. GET /api/chapter/:slug/:chapterSlug
app.get('/api/chapter/:slug/:chapterSlug', async (req: Request, res: Response) => {
  try {
    const { slug, chapterSlug } = req.params;
    const data = await toonGodScraper.getChapter(slug, chapterSlug);
    res.json({ success: true, data });
  } catch (error: any) {
    const status = error.response?.status || 500;
    if (status === 404) {
      return res.status(404).json({
        success: false,
        message: `Chapter '${req.params.chapterSlug}' pada webtoon '${req.params.slug}' tidak ditemukan di ToonGod (404 Not Found).`
      });
    }
    res.status(status).json({ success: false, message: error.message });
  }
});

// DEBUG: GET /api/debug/chapter/:slug/:chapterSlug
app.get('/api/debug/chapter/:slug/:chapterSlug', async (req: Request, res: Response) => {
  try {
    const { slug, chapterSlug } = req.params;
    const url = `/webtoon/${slug}/${chapterSlug}/`;
    const html = await httpClient.get(url);
    const $ = cheerio.load(html);

    const allImgTags = $('img')
      .map((_, el) => ({
        class: $(el).attr('class') || '',
        src: $(el).attr('src') || '',
        dataSrc: $(el).attr('data-src') || '',
        dataLazySrc: $(el).attr('data-lazy-src') || ''
      }))
      .get();

    const readingContentHtml =
      $('.reading-content, #chapter_images, .entry-content, .text-left').html()?.substring(0, 1500) || '';

    const scriptsWithImages = $('script')
      .map((_, el) => $(el).html() || '')
      .get()
      .filter(
        (s) =>
          s.includes('http') &&
          (s.includes('upload') ||
            s.includes('chapter') ||
            s.includes('.jpg') ||
            s.includes('.webp') ||
            s.includes('.png'))
      )
      .map((s) => s.substring(0, 500));

    res.json({
      success: true,
      htmlLength: html.length,
      pageTitle: $('title').text(),
      h1: $('h1').text(),
      breadcrumb: $('.breadcrumb').text(),
      totalImagesInDoc: allImgTags.length,
      sampleImages: allImgTags.slice(0, 10),
      readingContentSnippet: readingContentHtml,
      scriptsSnippet: scriptsWithImages.slice(0, 3)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message, status: error.response?.status });
  }
});

// 6. GET /api/genres
app.get('/api/genres', async (_req: Request, res: Response) => {
  try {
    const data = await toonGodScraper.getGenres();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export { app };
export default app;
