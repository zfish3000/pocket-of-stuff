const store = window.SidequestStore;

const addQuestDialog = document.querySelector("#addQuestDialog");
const addQuestForm = document.querySelector("#addQuestForm");
const addQuestError = document.querySelector("#addQuestError");
const filterForm = document.querySelector("#filterForm");
const questDialog = document.querySelector("#questDialog");
const questResult = document.querySelector("#questResult");
const questTitle = document.querySelector("#questTitle");
const questContent = document.querySelector("#questContent");
const peopleFilter = document.querySelector("#peopleFilter");
const vibeFilter = document.querySelector("#vibeFilter");
const locationFilter = document.querySelector("#locationFilter");
const priceFilter = document.querySelector("#priceFilter");

function populateFilters() {
  const sidequests = store.getSidequests();
  const maxPeople = Math.max(...sidequests.map((quest) => quest.maxPeople), 1);
  peopleFilter.innerHTML = '<option value="">Any group size</option>';
  for (let count = 1; count <= Math.min(maxPeople, 12); count += 1) {
    peopleFilter.insertAdjacentHTML("beforeend", `<option value="${count}">${count} ${count === 1 ? "person" : "people"}</option>`);
  }

  populateSelect(vibeFilter, "Any vibe", store.uniqueValues(sidequests, "vibe"));
  populateSelect(locationFilter, "Any location", store.uniqueValues(sidequests, "location"));
  populateSelect(priceFilter, "Any price", store.uniqueValues(sidequests, "price"));
}

function populateSelect(select, label, values) {
  select.innerHTML = `<option value="">${label}</option>`;
  values.forEach((value) => {
    select.insertAdjacentHTML("beforeend", `<option value="${store.escapeHtml(value)}">${store.escapeHtml(value)}</option>`);
  });
}

function getFilters() {
  const data = new FormData(filterForm);
  return {
    people: data.get("people"),
    vibe: data.get("vibe"),
    location: data.get("location"),
    price: data.get("price")
  };
}

function drawSidequest() {
  const filters = getFilters();
  const matches = store.getSidequests().filter((quest) => store.matchesFilters(quest, filters));

  if (!matches.length) {
    questTitle.textContent = "No sidequests fit those filters yet.";
    questContent.innerHTML = `
      <p>Try loosening one filter or add a sidequest that belongs here.</p>
    `;
    questDialog.showModal();
    return;
  }

  const seed = `${store.todayKey()}|${JSON.stringify(filters)}`;
  const quest = matches[store.seededIndex(seed, matches.length)];
  renderQuest(quest);
}

function renderQuest(quest) {
  questTitle.textContent = quest.title;
  questContent.innerHTML = `
    <p class="submitted-by">Submitted by ${store.escapeHtml(quest.submitter)}</p>
    <p>${store.escapeHtml(quest.description)}</p>
    <dl class="meta-grid">
      <div><dt>People</dt><dd>${quest.minPeople}-${quest.maxPeople}</dd></div>
      <div><dt>Vibe</dt><dd>${store.escapeHtml(quest.vibe)}</dd></div>
      <div><dt>Location</dt><dd>${store.escapeHtml(quest.location)}</dd></div>
      <div><dt>Price</dt><dd>${store.escapeHtml(quest.price)}</dd></div>
    </dl>
    <div class="modal-actions">
      <button class="danger-button" type="button" data-report-id="${store.escapeHtml(quest.id)}">Report</button>
    </div>
  `;
  questDialog.showModal();
}

function openAddQuest() {
  addQuestError.textContent = "";
  addQuestForm.reset();
  addQuestDialog.showModal();
}

function closeAddQuest() {
  addQuestDialog.close();
}

function addQuest(event) {
  event.preventDefault();
  addQuestError.textContent = "";
  const data = new FormData(addQuestForm);
  const minPeople = Number(data.get("minPeople"));
  const maxPeople = Number(data.get("maxPeople"));

  if (minPeople > maxPeople) {
    addQuestError.textContent = "Min people needs to be less than or equal to max people.";
    return;
  }

  const sidequests = store.getSidequests();
  const quest = {
    id: store.makeId("user"),
    title: data.get("title"),
    description: data.get("description"),
    submitter: data.get("submitter"),
    minPeople,
    maxPeople,
    vibe: data.get("vibe"),
    location: data.get("location"),
    price: data.get("price"),
    source: "submitted",
    createdAt: new Date().toISOString()
  };

  store.saveSidequests([quest, ...sidequests]);
  populateFilters();
  closeAddQuest();
  renderQuest(quest);
}

function reportQuest(questId) {
  const quest = store.getSidequests().find((item) => item.id === questId);
  if (!quest) return;

  const reports = store.getReports();
  reports.unshift({
    id: store.makeId("report"),
    questId,
    questTitle: quest.title,
    reportedAt: new Date().toISOString()
  });
  store.saveReports(reports);

  const reportButton = document.querySelector(`[data-report-id="${CSS.escape(questId)}"]`);
  if (reportButton) {
    reportButton.textContent = "Reported";
    reportButton.disabled = true;
  }
}

document.querySelector("#addQuestButton").addEventListener("click", openAddQuest);
document.querySelector("#closeAddQuest").addEventListener("click", closeAddQuest);
document.querySelector("#cancelAddQuest").addEventListener("click", closeAddQuest);
document.querySelector("#closeQuest").addEventListener("click", () => questDialog.close());
document.querySelector("#getQuestButton").addEventListener("click", drawSidequest);
addQuestForm.addEventListener("submit", addQuest);
questResult.addEventListener("click", (event) => {
  const reportButton = event.target.closest("[data-report-id]");
  if (reportButton) reportQuest(reportButton.dataset.reportId);
});

populateFilters();
