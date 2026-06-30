(function () {
  const STORAGE_KEY = "sidequests.database.v1";
  const REPORTS_KEY = "sidequests.reports.v1";

  const starterSidequests = [
    {
      id: "seed-bike-ride",
      title: "Go on a Bike Ride",
      description: "Go on a bike ride with or without friends and explore.",
      minPeople: 1,
      maxPeople: 10,
      location: "Anywhere",
      price: "Free",
      vibe: "Exploration",
      submitter: "Seed database",
      source: "seed",
      createdAt: "2026-06-27T00:00:00.000Z"
    },
    {
      id: "seed-hike",
      title: "Go on a Hike",
      description: "Go on a hike with or without friends somewhere you've never been before.",
      minPeople: 1,
      maxPeople: 10,
      location: "Anywhere",
      price: "Free",
      vibe: "Exploration",
      submitter: "Seed database",
      source: "seed",
      createdAt: "2026-06-27T00:00:00.000Z"
    },
    {
      id: "seed-random-hangout",
      title: "Random Hangout",
      description: "Do something random with friends.",
      minPeople: 2,
      maxPeople: 10,
      location: "Anywhere",
      price: "Cheap",
      vibe: "Friendship",
      submitter: "Seed database",
      source: "seed",
      createdAt: "2026-06-27T00:00:00.000Z"
    }
  ];

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeQuest(quest) {
    return {
      ...quest,
      title: String(quest.title || "").trim(),
      description: String(quest.description || "").trim(),
      submitter: String(quest.submitter || "Anonymous").trim(),
      vibe: String(quest.vibe || "").trim(),
      location: String(quest.location || "").trim(),
      price: String(quest.price || "").trim(),
      minPeople: Number(quest.minPeople),
      maxPeople: Number(quest.maxPeople)
    };
  }

  function getSidequests() {
    const existing = readJson(STORAGE_KEY, null);
    if (Array.isArray(existing)) return existing.map(normalizeQuest);
    writeJson(STORAGE_KEY, starterSidequests);
    return starterSidequests.map(normalizeQuest);
  }

  function saveSidequests(sidequests) {
    writeJson(STORAGE_KEY, sidequests.map(normalizeQuest));
  }

  function getReports() {
    const reports = readJson(REPORTS_KEY, []);
    return Array.isArray(reports) ? reports : [];
  }

  function saveReports(reports) {
    writeJson(REPORTS_KEY, reports);
  }

  function makeId(prefix) {
    if (window.crypto && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function uniqueValues(sidequests, key) {
    return [...new Set(sidequests.map((quest) => quest[key]).filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b)));
  }

  function todayKey() {
    return new Date().toLocaleDateString("en-CA");
  }

  function seededIndex(seed, length) {
    let hash = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
      hash ^= seed.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash) % length;
  }

  function matchesFilters(quest, filters) {
    const people = Number(filters.people);
    const matchesPeople = !people || (quest.minPeople <= people && quest.maxPeople >= people);
    return (
      matchesPeople &&
      (!filters.vibe || quest.vibe === filters.vibe) &&
      (!filters.location || quest.location === filters.location) &&
      (!filters.price || quest.price === filters.price)
    );
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char];
    });
  }

  window.SidequestStore = {
    getSidequests,
    saveSidequests,
    getReports,
    saveReports,
    makeId,
    uniqueValues,
    todayKey,
    seededIndex,
    matchesFilters,
    escapeHtml
  };
})();
