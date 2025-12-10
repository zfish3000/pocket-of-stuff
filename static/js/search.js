document.addEventListener("DOMContentLoaded", () => {
  const resultsContainer = document.getElementById("search-results");
  if (!resultsContainer || typeof lunr === "undefined") {
    // Not on the search results page, or lunr not available
    return;
  }

  const headerInput = document.getElementById("site-search-input");
  const pageInput = document.getElementById("search-input");

  // Choose which input to use:
  // - On desktop: header search
  // - On mobile: in-page search box
  let input = headerInput;

  if (window.innerWidth < 768 && pageInput) {
    input = pageInput;
  } else if (!headerInput && pageInput) {
    input = pageInput;
  }

  if (!input) {
    console.warn("No search input found for search page.");
    return;
  }

  const rootUrl = (document.body.dataset.rootUrl || "/").replace(/\/+$/, "");
  const indexUrl = rootUrl + "/search-index.json";

  let idx = null;
  let docs = [];

  const renderResults = (hits) => {
    if (!hits.length) {
      resultsContainer.innerHTML = "<p>No results found.</p>";
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "search-results-list";

    hits.forEach((hit) => {
      const doc = docs.find(d => d.url === hit.ref);
      if (!doc) return;

      const li = document.createElement("li");
      li.className = "search-results-item";

      const titleEl = document.createElement("p");
      titleEl.className = "search-results-item-title";

      const link = document.createElement("a");
      link.href = doc.url;
      link.textContent = doc.title;
      titleEl.appendChild(link);

      const snippetEl = document.createElement("p");
      snippetEl.className = "search-results-item-snippet";

      const body = doc.body || "";
      const query = input.value.trim();
      let snippet = body.slice(0, 160);
      if (query) {
        const idxPos = body.toLowerCase().indexOf(query.toLowerCase());
        if (idxPos >= 0) {
          const start = Math.max(0, idxPos - 40);
          const end = Math.min(body.length, idxPos + query.length + 60);
          snippet = (start > 0 ? "…" : "") + body.slice(start, end) + (end < body.length ? "…" : "");
        }
      }
      snippetEl.textContent = snippet;

      li.appendChild(titleEl);
      li.appendChild(snippetEl);
      ul.appendChild(li);
    });

    resultsContainer.innerHTML = "";
    resultsContainer.appendChild(ul);
  };

  const performSearch = (query) => {
    if (!idx) return;
    const q = query.trim();
    if (!q) {
      resultsContainer.innerHTML = "";
      return;
    }

    try {
      const hits = idx.search(q);
      renderResults(hits);
    } catch (e) {
      console.error("Search error:", e);
      resultsContainer.innerHTML = "<p>There was an error running the search.</p>";
    }
  };

  // Load search index
  fetch(indexUrl)
    .then(res => {
      if (!res.ok) throw new Error("Failed to load search index");
      return res.json();
    })
    .then(data => {
      docs = data;

      idx = lunr(function () {
        this.ref("url");
        this.field("title");
        this.field("body");

        docs.forEach(doc => this.add(doc));
      });

      // If we arrived with ?q=foo in the URL (from header search), run it
      const params = new URLSearchParams(window.location.search);
      const initialQuery = params.get("q");
      if (initialQuery) {
        input.value = initialQuery;
        performSearch(initialQuery);
      }
    })
    .catch(err => {
      console.error("Error loading search index:", err);
      resultsContainer.innerHTML = "<p>Search is currently unavailable.</p>";
    });

  // Bind input events on the search page
  input.addEventListener("input", () => {
    performSearch(input.value);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      performSearch(input.value);
    }
  });
});
