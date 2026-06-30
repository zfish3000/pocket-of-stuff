const store = window.SidequestStore;

const allList = document.querySelector("#allSidequests");
const submittedList = document.querySelector("#submittedSidequests");
const reportedList = document.querySelector("#reportedSidequests");
const editQuestDialog = document.querySelector("#editQuestDialog");
const editQuestForm = document.querySelector("#editQuestForm");
const editQuestError = document.querySelector("#editQuestError");

function renderAdmin() {
  const sidequests = store.getSidequests();
  const reports = store.getReports();
  const submitted = sidequests.filter((quest) => quest.source === "submitted");

  document.querySelector("#allCount").textContent = sidequests.length;
  document.querySelector("#submittedCount").textContent = submitted.length;
  document.querySelector("#reportedCount").textContent = reports.length;

  allList.innerHTML = sidequests.length ? sidequests.map(renderQuestAdminCard).join("") : emptyMessage("No sidequests yet.");
  submittedList.innerHTML = submitted.length ? submitted.map(renderQuestAdminCard).join("") : emptyMessage("No submitted sidequests yet.");
  reportedList.innerHTML = reports.length ? reports.map((report) => renderReportCard(report, sidequests)).join("") : emptyMessage("No reports yet.");
}

function emptyMessage(message) {
  return `<p class="empty-list">${store.escapeHtml(message)}</p>`;
}

function renderQuestAdminCard(quest) {
  return `
    <article class="admin-card">
      <div>
        <p class="eyebrow">${store.escapeHtml(quest.source)} | ${store.escapeHtml(quest.submitter)}</p>
        <h3>${store.escapeHtml(quest.title)}</h3>
        <p>${store.escapeHtml(quest.description)}</p>
        <dl class="compact-meta">
          <div><dt>People</dt><dd>${quest.minPeople}-${quest.maxPeople}</dd></div>
          <div><dt>Vibe</dt><dd>${store.escapeHtml(quest.vibe)}</dd></div>
          <div><dt>Location</dt><dd>${store.escapeHtml(quest.location)}</dd></div>
          <div><dt>Price</dt><dd>${store.escapeHtml(quest.price)}</dd></div>
        </dl>
      </div>
      <div class="card-actions">
        <button class="secondary-button" type="button" data-edit-id="${store.escapeHtml(quest.id)}">Edit</button>
        <button class="danger-button" type="button" data-remove-id="${store.escapeHtml(quest.id)}">Remove</button>
      </div>
    </article>
  `;
}

function renderReportCard(report, sidequests) {
  const quest = sidequests.find((item) => item.id === report.questId);
  return `
    <article class="admin-card report-card">
      <div>
        <p class="eyebrow">${new Date(report.reportedAt).toLocaleString()}</p>
        <h3>${store.escapeHtml(report.questTitle)}</h3>
        <p>${quest ? store.escapeHtml(quest.description) : "This sidequest has already been removed."}</p>
      </div>
      <div class="card-actions">
        ${quest ? `<button class="danger-button" type="button" data-remove-id="${store.escapeHtml(quest.id)}">Remove quest</button>` : ""}
        <button class="secondary-button" type="button" data-dismiss-report="${store.escapeHtml(report.id)}">Dismiss report</button>
      </div>
    </article>
  `;
}

function removeQuest(questId) {
  store.saveSidequests(store.getSidequests().filter((quest) => quest.id !== questId));
  renderAdmin();
}

function dismissReport(reportId) {
  store.saveReports(store.getReports().filter((report) => report.id !== reportId));
  renderAdmin();
}

function openEditDialog(questId) {
  const quest = store.getSidequests().find((item) => item.id === questId);
  if (!quest) return;

  editQuestError.textContent = "";
  editQuestForm.elements.id.value = quest.id;
  editQuestForm.elements.title.value = quest.title;
  editQuestForm.elements.description.value = quest.description;
  editQuestForm.elements.submitter.value = quest.submitter;
  editQuestForm.elements.minPeople.value = quest.minPeople;
  editQuestForm.elements.maxPeople.value = quest.maxPeople;
  editQuestForm.elements.vibe.value = quest.vibe;
  editQuestForm.elements.location.value = quest.location;
  editQuestForm.elements.price.value = quest.price;
  editQuestDialog.showModal();
}

function closeEditDialog() {
  editQuestDialog.close();
}

function saveEdit(event) {
  event.preventDefault();
  editQuestError.textContent = "";
  const data = new FormData(editQuestForm);
  const minPeople = Number(data.get("minPeople"));
  const maxPeople = Number(data.get("maxPeople"));

  if (minPeople > maxPeople) {
    editQuestError.textContent = "Min people needs to be less than or equal to max people.";
    return;
  }

  const sidequests = store.getSidequests().map((quest) => {
    if (quest.id !== data.get("id")) return quest;
    return {
      ...quest,
      title: data.get("title"),
      description: data.get("description"),
      submitter: data.get("submitter"),
      minPeople,
      maxPeople,
      vibe: data.get("vibe"),
      location: data.get("location"),
      price: data.get("price"),
      updatedAt: new Date().toISOString()
    };
  });

  store.saveSidequests(sidequests);
  closeEditDialog();
  renderAdmin();
}

document.body.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-id]");
  const removeButton = event.target.closest("[data-remove-id]");
  const dismissButton = event.target.closest("[data-dismiss-report]");

  if (editButton) openEditDialog(editButton.dataset.editId);
  if (removeButton) removeQuest(removeButton.dataset.removeId);
  if (dismissButton) dismissReport(dismissButton.dataset.dismissReport);
});

document.querySelector("#closeEditQuest").addEventListener("click", closeEditDialog);
document.querySelector("#cancelEditQuest").addEventListener("click", closeEditDialog);
editQuestForm.addEventListener("submit", saveEdit);

renderAdmin();
