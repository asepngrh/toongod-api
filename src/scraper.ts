import * as cheerio from 'cheerio';
import { httpClient } from './client.js';
import { CONFIG } from './config.js';
import {
  ChapterDetail,
  ChapterItem,
  FilterOptions,
  PaginationInfo,
  ScrapedListResult,
  WebtoonDetail,
  WebtoonItem
} from './types.js';

export class ToonGodScraper {
  /**
   * Helper untuk membersihkan string / whitespace berlebih
   */
  private cleanText(text: string | null | undefined): string {
    return text ? text.replace(/\s+/g, ' ').trim() : '';
  }

  /**
   * Helper untuk mengekstrak slug dari URL webtoon
   * Contoh: https://www.toongod.org/webtoon/solo-leveling/ -> solo-leveling
   */
  private extractSlug(url: string | null | undefined): string {
    if (!url) return '';
    const cleanUrl = url.replace(CONFIG.BASE_URL, '').replace(/^\/|\/$/g, '');
    const parts = cleanUrl.split('/');
    // Jika path diawali 'webtoon', ambil bagian berikutnya
    if (parts[0] === 'webtoon' && parts[1]) {
      return parts[1];
    }
    return parts[parts.length - 1] || '';
  }

  /**
   * Helper untuk mengekstrak slug chapter
   * Contoh: https://www.toongod.org/webtoon/solo-leveling/chapter-10/ -> chapter-10
   */
  private extractChapterSlug(url: string | null | undefined): string {
    if (!url) return '';
    const cleanUrl = url.replace(CONFIG.BASE_URL, '').replace(/^\/|\/$/g, '');
    const parts = cleanUrl.split('/');
    return parts[parts.length - 1] || '';
  }

  /**
   * Helper untuk mendapatkan atribut image terbaik (mengatasi lazy-loading Madara)
   */
  private extractImageSrc($el: cheerio.Cheerio<any>): string {
    const raw = (
      $el.attr('data-src') ||
      $el.attr('data-lazy-src') ||
      $el.attr('data-cfsrc') ||
      $el.attr('data-orig-file') ||
      $el.attr('data-full-url') ||
      $el.attr('data-original') ||
      $el.attr('data-url') ||
      $el.attr('srcset')?.split(' ')[0] ||
      $el.attr('src') ||
      ''
    ).trim();

    // Jika bernilai base64 placeholder svg, cari atribut alternatif lain
    if (raw.startsWith('data:image')) {
      const alt = (
        $el.attr('data-src') ||
        $el.attr('data-lazy-src') ||
        $el.attr('data-cfsrc') ||
        $el.attr('data-orig-file') ||
        $el.attr('data-full-url') ||
        $el.attr('data-original') ||
        ''
      ).trim();
      if (alt) return alt;
    }

    return raw;
  }

  /**
   * Helper untuk mengekstrak informasi pagination secara komprehensif
   */
  private extractPagination($: cheerio.CheerioAPI, requestedPage = 1): PaginationInfo {
    // 1. Current page
    const currentText = $('.wp-pagenavi span.current, .pagination .current, .nav-links span.current').first().text();
    const currentPage = currentText ? parseInt(currentText.trim(), 10) : requestedPage;

    // 2. Total pages (WP-PageNavi: "Page X of Y")
    let totalPages: number | undefined = undefined;
    const pagesText = $('.wp-pagenavi span.pages').first().text();
    if (pagesText) {
      const match = pagesText.match(/of\s+([0-9]+)/i);
      if (match && match[1]) {
        totalPages = parseInt(match[1], 10);
      }
    }

    // Jika belum ketemu dari teks .pages, cek dari nomor halaman tertinggi di pagination
    if (!totalPages) {
      const pageNumbers: number[] = [];
      $('.wp-pagenavi a, .wp-pagenavi span, .pagination a, .pagination span, .nav-links a, .nav-links span').each((_, el) => {
        const txt = $(el).text().trim();
        const num = parseInt(txt, 10);
        if (!isNaN(num) && num > 0) {
          pageNumbers.push(num);
        }
      });
      if (pageNumbers.length > 0) {
        totalPages = Math.max(...pageNumbers);
      }
    }

    // 3. Next & Prev Page
    const hasNextSelector =
      $('.nextpostslink, a.next, a.next.page-numbers, .nav-previous, a[rel="next"], .pagination-next').length > 0;
    const hasNextPage = totalPages ? currentPage < totalPages : hasNextSelector;

    const hasPrevSelector =
      $('.previouspostslink, a.prev, a.prev.page-numbers, .nav-next, a[rel="prev"], .pagination-prev').length > 0;
    const hasPrevPage = currentPage > 1 || hasPrevSelector;

    const nextPage = hasNextPage ? currentPage + 1 : null;
    const prevPage = hasPrevPage ? currentPage - 1 : null;

    return {
      currentPage,
      hasPrevPage,
      hasNextPage,
      prevPage,
      nextPage,
      totalPages: totalPages || (hasNextPage ? currentPage + 1 : currentPage)
    };
  }

  /**
   * Scraping Halaman Utama (Homepage) - Khusus 18+ Webtoon
   */
  public async getHome(): Promise<{
    trending: WebtoonItem[];
    latest: WebtoonItem[];
  }> {
    // Ambil Trending 18+ Webtoon & Update Terbaru 18+ Webtoon
    const [trendingResult, latestResult] = await Promise.all([
      this.getWebtoonList({ page: 1, orderby: 'trending', adult: 'only' }),
      this.getWebtoonList({ page: 1, orderby: 'latest', adult: 'only' })
    ]);

    return {
      trending: trendingResult.items.slice(0, 10),
      latest: latestResult.items
    };
  }

  /**
   * Mengambil Katalog Webtoon dengan Paginasi & Filter (Default 18+ Adult Only)
   * Orderby: 'latest' | 'alphabet' | 'rating' | 'trending' | 'views' | 'new-manga'
   */
  public async getWebtoonList(options: FilterOptions = {}): Promise<ScrapedListResult> {
    const page = options.page || 1;
    let url = page > 1 ? `/webtoon/page/${page}/` : `/webtoon/`;

    const params: Record<string, string> = {
      adult: '1' // SELALU FILTER KHUSUS 18+ (Adult Only)
    };

    if (options.orderby) {
      params['m_orderby'] = options.orderby;
    }
    if (options.genre) {
      params['genre'] = options.genre;
    }
    if (options.status) {
      params['status'] = options.status;
    }

    const queryString = new URLSearchParams(params).toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    const html = await httpClient.get(url);
    const $ = cheerio.load(html);
    const items: WebtoonItem[] = [];

    $('.page-item-detail, .page-listing-item .row > div, .badge-pos-1, .manga-item').each((_, el) => {
      const $el = $(el);
      const titleLink = $el.find('.post-title a, h3 a, h5 a').first();
      const title = this.cleanText(titleLink.text() || titleLink.attr('title'));
      const href = titleLink.attr('href') || '';
      const img = $el.find('.item-thumb img, .item-summary img, img').first();
      const thumbnail = this.extractImageSrc(img);
      const rating = this.cleanText($el.find('.score, .rating-result').first().text());

      const chapLink = $el.find('.list-chapter .chapter-item a, .chapters-wrapper .chapter a, .chapter-item a').first();
      const chapTitle = this.cleanText(chapLink.text());
      const chapHref = chapLink.attr('href') || '';

      if (title && href && !items.some((item) => item.title === title)) {
        items.push({
          title,
          slug: this.extractSlug(href),
          url: href.startsWith('http') ? href : `${CONFIG.BASE_URL}${href}`,
          thumbnail,
          rating: rating || undefined,
          latestChapter: chapHref
            ? {
                title: chapTitle,
                slug: this.extractChapterSlug(chapHref),
                url: chapHref.startsWith('http') ? chapHref : `${CONFIG.BASE_URL}${chapHref}`
              }
            : undefined
        });
      }
    });

    // Ekstrak informasi pagination lengkap
    const pagination = this.extractPagination($, page);

    return {
      pagination,
      items
    };
  }

  /**
   * Mencari Webtoon berdasarkan Judul / Keyword (Khusus 18+ Adult)
   */
  public async search(
    keyword: string,
    page = 1,
    options: Omit<FilterOptions, 'page'> = {}
  ): Promise<ScrapedListResult> {
    const params: Record<string, string> = {
      s: keyword,
      post_type: 'wp-manga',
      adult: '1' // SELALU KHUSUS 18+ (Adult Only)
    };

    if (options.orderby) {
      params['m_orderby'] = options.orderby;
    }
    if (options.genre) {
      params['genre'] = options.genre;
    }
    if (options.status) {
      params['status'] = options.status;
    }

    const queryString = new URLSearchParams(params).toString();
    const path = page > 1 ? `/page/${page}/?${queryString}` : `/?${queryString}`;

    const html = await httpClient.get(path);
    const $ = cheerio.load(html);
    const items: WebtoonItem[] = [];

    $('.c-tabs-item__content, .search-wrap .row > div, .page-item-detail, .manga-item').each((_, el) => {
      const $el = $(el);
      const titleLink = $el.find('.post-title a, h3 a, h4 a').first();
      const title = this.cleanText(titleLink.text() || titleLink.attr('title'));
      const href = titleLink.attr('href') || '';
      const img = $el.find('.item-thumb img, .tab-thumb img, img').first();
      const thumbnail = this.extractImageSrc(img);
      const rating = this.cleanText($el.find('.score, .rating-result').first().text());

      const chapLink = $el.find('.list-chapter .chapter-item a, .chapter a').first();
      const chapTitle = this.cleanText(chapLink.text());
      const chapHref = chapLink.attr('href') || '';

      if (title && href && !items.some((item) => item.title === title)) {
        items.push({
          title,
          slug: this.extractSlug(href),
          url: href.startsWith('http') ? href : `${CONFIG.BASE_URL}${href}`,
          thumbnail,
          rating: rating || undefined,
          latestChapter: chapHref
            ? {
                title: chapTitle,
                slug: this.extractChapterSlug(chapHref),
                url: chapHref.startsWith('http') ? chapHref : `${CONFIG.BASE_URL}${chapHref}`
              }
            : undefined
        });
      }
    });

    // Ekstrak informasi pagination lengkap
    const pagination = this.extractPagination($, page);

    return {
      pagination,
      items
    };
  }

  /**
   * Mengambil Detail Webtoon & Daftar Chapter
   * URL: https://www.toongod.org/webtoon/{slug}/
   */
  public async getDetail(slug: string): Promise<WebtoonDetail> {
    const url = `/webtoon/${slug}/`;
    const html = await httpClient.get(url);
    const $ = cheerio.load(html);

    // Title
    const title = this.cleanText($('.post-title h1, .post-title h3').first().text());
    
    // Alternative Titles
    let alternativeTitles = '';
    $('.post-content_item').each((_, el) => {
      const heading = $(el).find('.summary-heading').text().toLowerCase();
      if (heading.includes('alt') || heading.includes('alternative')) {
        alternativeTitles = this.cleanText($(el).find('.summary-content').text());
      }
    });

    // Thumbnail Cover
    const coverImg = $('.summary_image img').first();
    const thumbnail = this.extractImageSrc(coverImg);

    // Authors & Artists
    const authors: string[] = [];
    $('.author-content a').each((_, el) => {
      const name = this.cleanText($(el).text());
      if (name) authors.push(name);
    });

    const artists: string[] = [];
    $('.artist-content a').each((_, el) => {
      const name = this.cleanText($(el).text());
      if (name) artists.push(name);
    });

    // Genres
    const genres: string[] = [];
    $('.genres-content a').each((_, el) => {
      const g = this.cleanText($(el).text());
      if (g) genres.push(g);
    });

    // Status
    let status = this.cleanText($('.post-status .summary-content').first().text());
    if (!status) {
      $('.post-content_item').each((_, el) => {
        const heading = $(el).find('.summary-heading').text().toLowerCase();
        if (heading.includes('status')) {
          status = this.cleanText($(el).find('.summary-content').text());
        }
      });
    }

    // Rating
    const rating = this.cleanText($('.post-total-rating .score').first().text());

    // Synopsis
    const synopsis = this.cleanText(
      $('.description-summary .summary__content, .manga-excerpt').first().text()
    );

    // Chapter List
    let chapters: ChapterItem[] = [];

    const parseChaptersFromSelector = ($ctx: cheerio.CheerioAPI): ChapterItem[] => {
      const list: ChapterItem[] = [];
      $ctx('li.wp-manga-chapter, .sub-chap li').each((_i: number, el: any) => {
        const $el = $ctx(el);
        const link = $el.find('a').first();
        const chTitle = this.cleanText(link.text());
        const href = link.attr('href') || '';
        const releaseDate = this.cleanText($el.find('.chapter-release-date').text());

        if (chTitle && href) {
          list.push({
            title: chTitle,
            slug: this.extractChapterSlug(href),
            url: href.startsWith('http') ? href : `${CONFIG.BASE_URL}${href}`,
            releaseDate: releaseDate || undefined
          });
        }
      });
      return list;
    };

    chapters = parseChaptersFromSelector($);

    // Jika chapter dimuat lewat AJAX (ciri khas tema Madara tertentu)
    if (chapters.length === 0) {
      // 1. Coba endpoint AJAX spesifik Madara /webtoon/{slug}/ajax/chapters/
      try {
        const ajaxHtml = await httpClient.post(`/webtoon/${slug}/ajax/chapters/`, '');
        if (ajaxHtml && typeof ajaxHtml === 'string' && ajaxHtml.includes('chapter')) {
          const $ajax = cheerio.load(ajaxHtml);
          chapters = parseChaptersFromSelector($ajax);
        }
      } catch {
        // Fallback
      }

      // 2. Jika masih kosong, coba admin-ajax dengan data-id manga
      if (chapters.length === 0) {
        const mangaId =
          $('#manga-chapters-holder').attr('data-id') ||
          $('input.rating-post-id').val() ||
          $('[id^="manga-chapters-holder"]').attr('data-id') ||
          $('input#manga_id').val();

        if (mangaId) {
          try {
            const ajaxHtml = await httpClient.post('/wp-admin/admin-ajax.php', {
              action: 'manga_get_chapters',
              manga: mangaId
            });
            if (ajaxHtml && typeof ajaxHtml === 'string') {
              const $ajax = cheerio.load(ajaxHtml);
              chapters = parseChaptersFromSelector($ajax);
            }
          } catch {
            // Abaikan jika tidak ada response
          }
        }
      }
    }

    return {
      title,
      slug,
      url: `${CONFIG.BASE_URL}${url}`,
      thumbnail,
      alternativeTitles: alternativeTitles || undefined,
      authors,
      artists,
      genres,
      status: status || 'Unknown',
      rating: rating || undefined,
      synopsis,
      totalChapters: chapters.length,
      chapters
    };
  }

  /**
   * Mengambil Halaman Gambar Chapter (Reader)
   * URL: https://www.toongod.org/webtoon/{slug}/{chapterSlug}/
   */
  public async getChapter(slug: string, chapterSlug: string): Promise<ChapterDetail> {
    // 1. Coba resolve URL asli chapter dari detail komik agar slug tidak salah
    let targetPath = `/webtoon/${slug}/${chapterSlug}/`;
    let chapterTitle = `${slug} - ${chapterSlug}`;
    let prevChapter: string | undefined = undefined;
    let nextChapter: string | undefined = undefined;

    try {
      const detail = await this.getDetail(slug);
      if (detail && detail.chapters && detail.chapters.length > 0) {
        const normTarget = chapterSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = detail.chapters.find((c) => {
          const normC = c.slug.toLowerCase().replace(/[^a-z0-9]/g, '');
          return c.slug === chapterSlug || normC === normTarget || normC.endsWith(normTarget);
        });

        if (found) {
          targetPath = found.url.replace(CONFIG.BASE_URL, '');
          chapterTitle = found.title;

          const idx = detail.chapters.findIndex((c) => c.slug === found.slug);
          if (idx !== -1) {
            if (idx > 0) nextChapter = detail.chapters[idx - 1].slug;
            if (idx < detail.chapters.length - 1) prevChapter = detail.chapters[idx + 1].slug;
          }
        }
      }
    } catch {
      // Gunakan default path jika resolve gagal
    }

    if (!targetPath.endsWith('/')) {
      targetPath += '/';
    }

    // Set Referer ke halaman detail komik agar ToonGod tidak me-redirect request
    const chapterHeaders = {
      Referer: `${CONFIG.BASE_URL}/webtoon/${slug}/`
    };

    let html = '';
    try {
      // Coba request dengan ?style=list
      html = await httpClient.get(`${targetPath}?style=list`, { headers: chapterHeaders });
    } catch {
      // Fallback tanpa parameter query
      html = await httpClient.get(targetPath, { headers: chapterHeaders });
    }

    const $ = cheerio.load(html);

    // Ambil title chapter jika belum ter-resolve
    const domTitle = this.cleanText(
      $('h1#chapter-heading, .breadcrumb li.active, .c-breadcrumb li:last-child, .entry-title')
        .first()
        .text()
    );
    if (domTitle && domTitle !== 'Secret Class') {
      chapterTitle = domTitle;
    }

    const images: string[] = [];

    const addImage = (rawSrc: string | null | undefined) => {
      if (!rawSrc) return;
      let cleanSrc = rawSrc.trim();
      if (
        !cleanSrc ||
        cleanSrc.startsWith('data:image') ||
        cleanSrc.includes('blank.gif') ||
        cleanSrc.includes('spacer.png')
      ) {
        return;
      }
      if (cleanSrc.startsWith('//')) {
        cleanSrc = 'https:' + cleanSrc;
      } else if (cleanSrc.startsWith('/')) {
        cleanSrc = `${CONFIG.BASE_URL}${cleanSrc}`;
      }
      if (cleanSrc.startsWith('http') && !images.includes(cleanSrc)) {
        images.push(cleanSrc);
      }
    };

    // 1. Selector DOM Madara WP-Manga
    $(
      '.reading-content img, .wp-manga-chapter-img, div.page-break img, li.blocks-gallery-item img, #chapter_images img, .entry-content img, .entry-content-single img, .text-left img, #image-0, img[id^="image-"]'
    ).each((_i: number, el: any) => {
      const $img = $(el);
      const src = this.extractImageSrc($img);
      addImage(src);
    });

    // 2. Cek jika gambar berada di atribut div.page-break langsung
    if (images.length === 0) {
      $('div.page-break, .page-break').each((_i: number, el: any) => {
        const $el = $(el);
        const dataSrc = $el.attr('data-src') || $el.attr('data-url');
        if (dataSrc) {
          addImage(dataSrc);
        }
      });
    }

    // 3. Cek jika gambar disimpan dalam script array JavaScript (Madara AJAX / preloaded reader)
    if (images.length === 0) {
      $('script').each((_i: number, el: any) => {
        const scriptText = $(el).html() || '';
        if (
          scriptText.includes('chapter_preloaded_images') ||
          scriptText.includes('chapter_images') ||
          scriptText.includes('wpmangaimg') ||
          scriptText.includes('wp-content/uploads')
        ) {
          const arrayMatches = scriptText.match(
            /(?:chapter_preloaded_images|chapter_images|wpmangaimg|images|pages)\s*=\s*(\[[^;]+\])/i
          );
          if (arrayMatches && arrayMatches[1]) {
            try {
              const parsed = JSON.parse(arrayMatches[1]);
              if (Array.isArray(parsed)) {
                parsed.forEach((item: any) => {
                  const urlStr = typeof item === 'string' ? item : item?.src || item?.url;
                  addImage(urlStr);
                });
              }
            } catch {
              const urlMatches = arrayMatches[1].match(/https?:\/\/[^\s"',\]\\]+/g);
              if (urlMatches) {
                urlMatches.forEach(addImage);
              }
            }
          }

          if (images.length === 0) {
            const uploadMatches = scriptText.match(
              /https?:\/\/[^\s"',\\]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^\s"',\\]*)?/gi
            );
            if (uploadMatches) {
              uploadMatches.forEach(addImage);
            }
          }
        }
      });
    }

    // Navigasi Prev / Next Chapter
    const prevHref = $('.nav-previous a, .prev_page, a.btn.prev_page').first().attr('href');
    const nextHref = $('.nav-next a, .next_page, a.btn.next_page').first().attr('href');
    if (!prevChapter && prevHref) prevChapter = this.extractChapterSlug(prevHref);
    if (!nextChapter && nextHref) nextChapter = this.extractChapterSlug(nextHref);

    return {
      slug,
      chapterSlug,
      title: chapterTitle,
      prevChapter: prevChapter || undefined,
      nextChapter: nextChapter || undefined,
      totalImages: images.length,
      images
    };
  }

  /**
   * Mengambil Daftar Genre yang Tersedia
   */
  public async getGenres(): Promise<{ name: string; slug: string; url: string }[]> {
    const html = await httpClient.get('/webtoon/');
    const $ = cheerio.load(html);
    const genres: { name: string; slug: string; url: string }[] = [];

    $('.genres li a, .sub-nav-genres a, .genre-item a').each((_, el) => {
      const $el = $(el);
      const name = this.cleanText($el.text());
      const href = $el.attr('href') || '';
      if (name && href && !genres.some((g) => g.name === name)) {
        const parts = href.replace(CONFIG.BASE_URL, '').replace(/^\/|\/$/g, '').split('/');
        const genreSlug = parts[parts.length - 1] || '';
        genres.push({
          name,
          slug: genreSlug,
          url: href.startsWith('http') ? href : `${CONFIG.BASE_URL}${href}`
        });
      }
    });

    return genres;
  }
}

export const toonGodScraper = new ToonGodScraper();
