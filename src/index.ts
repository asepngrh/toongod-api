import { toonGodScraper } from './scraper.js';

async function main() {
  console.log('====================================================');
  console.log('🔍 Testing ToonGod Scraper (https://www.toongod.org)');
  console.log('====================================================\n');

  try {
    // 1. Test Home
    console.log('⏳ Mengambil data dari Home (https://www.toongod.org/home/)...');
    const homeData = await toonGodScraper.getHome();

    console.log(`\n✅ Berhasil! Ditemukan:`);
    console.log(`   - Trending / Featured: ${homeData.trending.length} item`);
    console.log(`   - Latest Releases: ${homeData.latest.length} item\n`);

    // 2. Test 18+ Catalog
    console.log('⏳ Menguji Katalog [18+ Webtoon]...');
    const adultList = await toonGodScraper.getWebtoonList({ page: 1, orderby: 'latest' });
    console.log(`✅ [18+ Webtoon] ditemukan: ${adultList.items.length} item`);
    console.log(
      `   Pagination: Page ${adultList.pagination.currentPage} of ${adultList.pagination.totalPages || '?'} (hasNext: ${adultList.pagination.hasNextPage})`
    );
    if (adultList.items.length > 0) {
      console.log(`   Contoh 1: ${adultList.items[0].title} (${adultList.items[0].slug})`);
    }

    // 4. Test Detail & Chapter Reader
    if (homeData.latest.length > 0) {
      const sampleSlug = homeData.latest[0].slug;
      if (sampleSlug) {
        console.log(`\n⏳ Menguji getDetail() untuk: ${sampleSlug}...`);
        const detail = await toonGodScraper.getDetail(sampleSlug);
        console.log(`✅ Detail Webtoon: ${detail.title}`);
        console.log(`   Status        : ${detail.status}`);
        console.log(`   Genres        : ${detail.genres.join(', ') || 'N/A'}`);
        console.log(`   Total Chapter : ${detail.totalChapters}`);

        if (detail.chapters.length > 0) {
          const sampleChapter = detail.chapters[0];
          console.log(`\n⏳ Menguji getChapter() untuk: ${sampleChapter.slug}...`);
          const chapter = await toonGodScraper.getChapter(detail.slug, sampleChapter.slug);
          console.log(`✅ Chapter: ${chapter.title}`);
          console.log(`   Total Gambar : ${chapter.totalImages}`);
          if (chapter.images.length > 0) {
            console.log(`   Contoh URL Gambar 1 : ${chapter.images[0]}`);
          }
        }
      }
    }
  } catch (error: any) {
    console.error('\n❌ Error saat scraping:', error.message);
    console.log(
      '\n💡 Tips: Jika error Cloudflare 403, pastikan cookie `cf_clearance` dan `USER_AGENT` di file `.env` sudah di-update dengan nilai terbaru dari inspect browser kamu.'
    );
  }
}

main();
