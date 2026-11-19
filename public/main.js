document.addEventListener('DOMContentLoaded', () => {
  const baseUrl = window.location.origin;
  const baseUrlEl = document.getElementById('base-url');
  if (baseUrlEl) baseUrlEl.innerText = baseUrl;

  const baseUrlBox = document.querySelector('.base-url-box');
  if (baseUrlBox) {
    baseUrlBox.addEventListener('click', () => {
      copyToClipboard(baseUrl, 'Base URL berhasil disalin: ' + baseUrl);
    });
  }

  // 1. 🔞 18+ Homepage & Catalog Endpoints
  const catalogEndpoints = [
    {
      displayPath: '/api/home',
      examplePath: '/api/home',
      desc: '18+ Homepage Feed (Trending 18+ Slider & Update Terbaru)',
      method: 'GET',
      badge: '18+'
    },
    {
      displayPath: '/api/webtoons',
      examplePath: '/api/webtoons?page=1&orderby=latest',
      desc: 'Semua 18+ Webtoon Terbaru (Paginated)',
      method: 'GET',
      badge: '18+'
    },
    {
      displayPath: '/api/webtoons?orderby=trending',
      examplePath: '/api/webtoons?page=1&orderby=trending',
      desc: '18+ Webtoon Paling Banyak Dicari / Trending',
      method: 'GET',
      badge: '18+'
    },
    {
      displayPath: '/api/webtoons?orderby=views',
      examplePath: '/api/webtoons?page=1&orderby=views',
      desc: '18+ Webtoon Terpopuler (Most Views All-Time)',
      method: 'GET',
      badge: '18+'
    },
    {
      displayPath: '/api/webtoons?orderby=rating',
      examplePath: '/api/webtoons?page=1&orderby=rating',
      desc: '18+ Webtoon dengan Rating Tertinggi',
      method: 'GET',
      badge: '18+'
    },
    {
      displayPath: '/api/genres',
      examplePath: '/api/genres',
      desc: 'Daftar Seluruh Kategori & Genre Komik Dewasa',
      method: 'GET'
    }
  ];

  // 2. 🔍 18+ Search & Discovery Endpoints
  const searchEndpoints = [
    {
      displayPath: '/api/search?q={query}',
      examplePath: '/api/search?q=secret&page=1',
      desc: 'Cari Judul Komik 18+: "secret"',
      method: 'GET',
      badge: '18+'
    },
    {
      displayPath: '/api/search?q={query}',
      examplePath: '/api/search?q=boarding&page=1',
      desc: 'Cari Judul Komik 18+: "boarding"',
      method: 'GET',
      badge: '18+'
    },
    {
      displayPath: '/api/search?q={query}',
      examplePath: '/api/search?q=circles&page=1',
      desc: 'Cari Judul Komik 18+: "circles"',
      method: 'GET',
      badge: '18+'
    }
  ];

  // 3. Details & Reader Endpoints
  const readerEndpoints = [
    {
      displayPath: '/api/detail/{slug}',
      examplePath: '/api/detail/secret-class',
      desc: 'Detail Komik, Sinopsis, Genre, Status, & Daftar Chapter',
      method: 'GET'
    },
    {
      displayPath: '/api/chapter/{slug}/{chapterSlug}',
      examplePath: '/api/chapter/secret-class/chapter-1',
      desc: 'Data Pembaca Chapter (Daftar URL Gambar / Reader)',
      method: 'GET'
    },
    {
      displayPath: '/api/info',
      examplePath: '/api/info',
      desc: 'Metadata Spesifikasi JSON API (Raw Scheme)',
      method: 'GET'
    }
  ];

  // Toast Handler
  let toastTimeout;
  function showToast(title = 'Berhasil Disalin!', desc = 'URL endpoint telah tersimpan di clipboard') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    const titleEl = toast.querySelector('.toast-title');
    const descEl = toast.querySelector('.toast-desc');
    if (titleEl) titleEl.innerText = title;
    if (descEl) descEl.innerText = desc;

    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  function copyToClipboard(path, customDesc) {
    const fullUrl = path.startsWith('http') ? path : window.location.origin + path;
    const displayDesc = customDesc || fullUrl;

    showToast('Berhasil Disalin!', displayDesc);

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(fullUrl).catch(() => {
        fallbackCopy(fullUrl);
      });
    } else {
      fallbackCopy(fullUrl);
    }
  }

  function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  }

  function renderCards(containerId, list) {
    const container = document.getElementById(containerId);
    if (!container || !list) return;

    list.forEach((ep) => {
      const card = document.createElement('div');
      card.className = 'endpoint-card';

      let badgeHtml = '';
      if (ep.badge === '18+') {
        badgeHtml = `<span class="tag-18">18+</span>`;
      } else if (ep.badge === 'SAFE') {
        badgeHtml = `<span class="tag-safe">NON-18+</span>`;
      }

      card.innerHTML = `
        <div class="info">
          <div class="method-badge-wrapper">
            <span class="method">${ep.method}</span>
            ${badgeHtml}
          </div>
          <span class="path">${ep.displayPath}</span>
          <span class="desc">${ep.desc}</span>
        </div>
        <div class="actions">
          <button class="btn copy-btn" title="Salin URL Endpoint">COPY</button>
        </div>
      `;

      // Klik kartu langsung buka endpoint di tab baru
      card.addEventListener('click', (e) => {
        if (!e.target.closest('.copy-btn')) {
          window.open(baseUrl + ep.examplePath, '_blank');
        }
      });

      // Tombol copy
      const copyBtn = card.querySelector('.copy-btn');
      copyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        copyToClipboard(ep.examplePath, ep.displayPath);

        const origText = copyBtn.innerText;
        copyBtn.innerText = 'COPIED!';
        copyBtn.style.color = '#00e599';
        copyBtn.style.borderColor = '#00e599';
        setTimeout(() => {
          copyBtn.innerText = origText;
          copyBtn.style.color = '';
          copyBtn.style.borderColor = '';
        }, 1500);
      });

      container.appendChild(card);
    });
  }

  renderCards('endpoint-grid-catalog', catalogEndpoints);
  renderCards('endpoint-grid-search', searchEndpoints);
  renderCards('endpoint-grid-reader', readerEndpoints);
});
