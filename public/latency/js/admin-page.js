import { downloadTextFile } from './export.js';
import { INTERFACE_VERSIONS, getInterfaceVersion, hasEditableSettings } from './interface-versions.js';
import { clearCompletedRecord, isSharedComputer, readCompletedRecord, setSharedComputer } from './participant-checks.js';
import { buildTestPayload, postPayload } from './upload.js';

// The admin page (?admin): test sessions, version settings, and tools for uploads and this computer.
// It is not secret or password-protected. It only affects the browser it is opened in.
export function setupAdminPage({ controller, study, uploadQueue }) {
  const participantId = document.querySelector('#participantId');
  const sessionPreview = document.querySelector('#sessionPreview');
  const developerMode = document.querySelector('#developerMode');
  const resumeButton = document.querySelector('#resumeButton');
  const jumpCondition = document.querySelector('#jumpCondition');
  const interfaceVersion = document.querySelector('#interfaceVersion');
  const versionSettings = document.querySelector('#versionSettings');
  const settingInputs = [...versionSettings.querySelectorAll('input, select')];

  for (const version of INTERFACE_VERSIONS) {
    interfaceVersion.append(new Option(version.label, version.id));
  }
  // The study uses Test A, so every new session starts there. Other versions must be chosen on purpose.
  interfaceVersion.value = study.interfaceVersion;
  interfaceVersion.addEventListener('change', showVersionSettings);
  showVersionSettings();

  function showVersionSettings() {
    const version = getInterfaceVersion(interfaceVersion.value);
    const settings = version.settings;
    const editable = hasEditableSettings(version);
    versionSettings.hidden = !editable;
    for (const input of settingInputs) {
      input.value = settings?.[input.id] ?? '';
      input.closest('label').hidden = !editable || !(input.id in (settings ?? {}));
    }
  }

  function readVersionSettings() {
    return Object.fromEntries(settingInputs
      .filter((input) => !input.closest('label').hidden && input.value !== '')
      .map((input) => [input.id, input.type === 'number' ? Number(input.value) : input.value]));
  }

  sessionPreview.textContent = 'Session will be created at start.';

  document.querySelector('#startButton').addEventListener('click', () => {
    controller.clearSavedSession();
    controller.createSession({
      participantId: participantId.value || 'TEST',
      developerMode: developerMode.checked,
      interfaceVersion: interfaceVersion.value,
      interfaceSettings: readVersionSettings(),
      mode: 'admin',
    });
  });

  resumeButton.addEventListener('click', () => controller.resumeSession());

  document.querySelector('#fullscreenButton').addEventListener('click', () => {
    document.documentElement.requestFullscreen?.();
  });

  jumpCondition.addEventListener('change', () => {
    if (!controller.session || !developerMode.checked || !jumpCondition.value) return;
    const index = controller.session.schedule.findIndex((trial) => String(trial.latencyMs) === jumpCondition.value);
    if (index >= 0) {
      controller.session.currentTrialIndex = index;
      controller.beginNextTrial();
    }
  });

  const testUploadResult = document.querySelector('#testUploadResult');
  const testUploadButton = document.querySelector('#testUploadButton');
  testUploadButton.addEventListener('click', async () => {
    testUploadResult.textContent = 'Sending…';
    try {
      await postPayload(study.uploadUrl, buildTestPayload());
      testUploadResult.textContent = `Test upload received at ${new Date().toLocaleTimeString()}. Check the "Connection tests" tab of the results spreadsheet.`;
    } catch (error) {
      testUploadResult.textContent = `Test upload failed: ${error.message}`;
    }
  });

  document.querySelector('#retryPendingButton').addEventListener('click', async () => {
    document.querySelector('#pendingSummary').textContent = 'Retrying…';
    await uploadQueue.retryAll(study.uploadUrl);
    refresh();
  });

  document.querySelector('#discardSessionButton').addEventListener('click', () => {
    if (!globalThis.confirm('Discard the unfinished session? Its data will be deleted from this computer.')) return;
    controller.clearSavedSession();
    refresh();
  });

  const sharedToggle = document.querySelector('#sharedComputerToggle');
  sharedToggle.addEventListener('change', () => {
    setSharedComputer(sharedToggle.checked);
    refresh();
  });

  document.querySelector('#clearCompletedButton').addEventListener('click', () => {
    clearCompletedRecord();
    refresh();
  });

  function refresh() {
    document.querySelector('#uploadStatus').textContent = study.uploadUrl
      ? `Results are sent to ${new URL(study.uploadUrl).host}. Participant sessions go to the Sessions and Trials tabs; sessions started here go to the test tabs.`
      : 'No upload address is set in js/study-config.js, so results are only saved on this computer. Download them below.';
    testUploadButton.disabled = !study.uploadUrl;
    document.querySelector('#retryPendingButton').disabled = !study.uploadUrl;

    const pending = uploadQueue.list();
    document.querySelector('#pendingSummary').textContent = pending.length
      ? `${pending.length} session${pending.length === 1 ? ' is' : 's are'} saved on this computer and not yet uploaded.`
      : 'Nothing is waiting to upload.';
    document.querySelector('#pendingList').replaceChildren(...pending.map((sessionId) => {
      const payload = uploadQueue.get(sessionId);
      const item = document.createElement('li');
      item.textContent = `${payload?.participantId ?? '?'} · ${sessionId}${payload?.official ? '' : ' (test)'} `;
      const download = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Download' });
      download.addEventListener('click', () => {
        downloadTextFile(`${payload.participantId}_${sessionId}.json`, JSON.stringify(payload), 'application/json');
      });
      item.append(download);
      return item;
    }));

    const saved = controller.restoreSession();
    const unfinished = saved && !saved.completedAt;
    document.querySelector('#savedSessionSummary').textContent = unfinished
      ? `${saved.participantId} (${saved.mode ?? 'admin'} session) stopped before trial ${saved.currentTrialIndex + 1} of ${saved.schedule.length}.`
      : 'None.';
    document.querySelector('#discardSessionButton').disabled = !unfinished;
    resumeButton.hidden = !unfinished;

    sharedToggle.checked = isSharedComputer();
    const completed = readCompletedRecord();
    document.querySelector('#completedSummary').textContent = completed
      ? `${completed.count} participant session${completed.count === 1 ? ' has' : 's have'} finished in this browser, most recently ${completed.participantId} on ${new Date(completed.completedAt).toLocaleString()}. `
        + (sharedToggle.checked
          ? 'As a shared lab computer, it does not ask the next participant to confirm they are someone new.'
          : 'The next participant must confirm they are a different person who has not taken part before.')
      : 'No participant has finished in this browser.';
    document.querySelector('#clearCompletedButton').disabled = !completed;
  }

  return refresh;
}
