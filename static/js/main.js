document.addEventListener('DOMContentLoaded', () => {
  /* =========================================
     1. THEME TOGGLE (LIGHT / DARK)
     ========================================= */

  const rootHtml = document.documentElement;
  const THEME_KEY = 'pocket-of-stuff-theme';

  function applyTheme(theme) {
    rootHtml.setAttribute('data-theme', theme);
  }

  // Load saved theme or default to light
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'dark' || savedTheme === 'light') {
    applyTheme(savedTheme);
  } else {
    applyTheme('light');
  }

  const themeToggleButton = document.querySelector('.theme-toggle');
  const themeToggleIcon = themeToggleButton
    ? themeToggleButton.querySelector('.theme-toggle-icon')
    : null;

  function refreshThemeIcon() {
    if (!themeToggleIcon) return;
    const current = rootHtml.getAttribute('data-theme') || 'light';
    themeToggleIcon.textContent = current === 'dark' ? '☼' : '☾';
  }

  refreshThemeIcon();

  if (themeToggleButton) {
    themeToggleButton.addEventListener('click', () => {
      const current = rootHtml.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem(THEME_KEY, next);
      refreshThemeIcon();
    });
  }

  /* =========================================
     2. MOBILE NAV TOGGLE
     ========================================= */

  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      siteNav.classList.toggle('open');
    });
  }

  /* =========================================
     3. SEARCH (Lunr.js)
     ========================================= */

  const searchResultsEl = document.getElementById('search-results');

  if (searchResultsEl && window.lunr) {
    const staticPrefix =
      document.body.getAttribute('data-static-prefix') || '/static';

    const params = new URLSearchParams(window.location.search);
    const q = (params.get('q') || '').trim();

    const queryDisplayEl = document.getElementById('search-query-display');
    if (queryDisplayEl) {
      queryDisplayEl.textContent = q;
    }

    if (!q) {
      searchResultsEl.innerHTML =
        '<p>Type something in the search box above to see results.</p>';
    } else {
      fetch(`${staticPrefix}/search-index.json`)
        .then((res) => res.json())
        .then((data) => {
          const docs = data.documents || [];

          const index = lunr(function () {
            this.ref('id');
            this.field('title', { boost: 3 });
            this.field('content');

            docs.forEach((doc) => {
              this.add(doc);
            });
          });

          const results = index.search(q);

          if (!results.length) {
            searchResultsEl.innerHTML =
              '<p>No results found. Try a different search.</p>';
            return;
          }

          const byId = {};
          docs.forEach((doc) => {
            byId[doc.id] = doc;
          });

          const ul = document.createElement('ul');
          ul.className = 'search-results-list';

          results.forEach((hit) => {
            const doc = byId[hit.ref];
            if (!doc) return;

            const li = document.createElement('li');
            li.className = 'search-results-item';

            const title = document.createElement('h3');
            title.className = 'search-results-item-title';

            const link = document.createElement('a');
            link.href = doc.url;
            link.textContent = doc.title;

            title.appendChild(link);

            const snippet = document.createElement('p');
            snippet.className = 'search-results-item-snippet';
            snippet.textContent = doc.snippet || '';

            li.appendChild(title);
            li.appendChild(snippet);
            ul.appendChild(li);
          });

          searchResultsEl.innerHTML = '';
          searchResultsEl.appendChild(ul);
        })
        .catch((err) => {
          console.error('Error loading search index:', err);
          searchResultsEl.innerHTML =
            '<p>There was an error loading search results.</p>';
        });
    }
  }

  /* =========================================
     4. IMAGE LIGHTBOX
     ========================================= */

  // Create overlay elements once
  const lightboxOverlay = document.createElement('div');
  lightboxOverlay.className = 'image-lightbox-overlay';

  const lightboxInner = document.createElement('div');
  lightboxInner.className = 'image-lightbox-inner';

  const lightboxImg = document.createElement('img');
  lightboxInner.appendChild(lightboxImg);
  lightboxOverlay.appendChild(lightboxInner);

  // Clicking anywhere closes the overlay
  lightboxOverlay.addEventListener('click', () => {
    lightboxOverlay.classList.remove('open');
    lightboxImg.src = '';
    lightboxImg.alt = '';
  });

  document.body.appendChild(lightboxOverlay);

  // Attach click handler to all content images
  document.querySelectorAll('.notion-content img').forEach((img) => {
    img.addEventListener('click', () => {
      const src = img.getAttribute('src');
      if (!src) return;

      lightboxImg.src = src;
      lightboxImg.alt = img.alt || '';
      lightboxOverlay.classList.add('open');
    });
  });
});
