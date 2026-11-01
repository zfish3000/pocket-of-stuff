import { setupAdminPage } from './admin-page.js';
import { setNativeCursorHidden } from './cursor-visibility.js';
import { ExperimentController } from './experiment.js';
import { MouseInput } from './input.js';
import { getBeginTrialsButtonText, getInterfaceVersion, shouldShowExperimenterResults } from './interface-versions.js';
import { isSharedComputer, writeCompletedRecord } from './participant-checks.js';
import { Renderer } from './renderer.js';
import { getTrialPosition } from './scheduler.js';
import { STUDY } from './study-config.js';
import { TrialSounds } from './trial-sounds.js';
import { UploadQueue, buildUploadPayload } from './upload.js';
import { setupWelcomePage } from './welcome-page.js';

const isAdmin = new URLSearchParams(location.search).has('admin');
const canvas = document.querySelector('#experimentCanvas');
const renderer = new Renderer(canvas);
const trialSounds = new TrialSounds();
const uploadQueue = new UploadQueue();
let controller;
const input = new MouseInput(
  canvas,
  (sample) => controller.recordInput(sample),
  () => controller.handleInputInterrupted(),
);
controller = new ExperimentController({ canvas, renderer, input, trialSounds });

const screens = {
  welcome: document.querySelector('#welcomeScreen'),
  setup: document.querySelector('#setupScreen'),
  instructions: document.querySelector('#instructionsScreen'),
  trial: document.querySelector('#trialScreen'),
  intertrial: document.querySelector('#intertrialScreen'),
  complete: document.querySelector('#completeScreen'),
  withdrawn: document.querySelector('#withdrawnScreen'),
};

const beginTrialsButton = document.querySelector('#beginTrialsButton');
const continueButton = document.querySelector('#continueButton');
const practiceAgainButton = document.querySelector('#practiceAgainButton');
const trialCompleteText = document.querySelector('#trialCompleteText');
const intertrialText = document.querySelector('#intertrialText');
const practiceNote = document.querySelector('#practiceNote');
const goalReminder = document.querySelector('#goalReminder');
const pauseOverlay = document.querySelector('#pauseOverlay');
const stopDialog = document.querySelector('#stopDialog');
const chartCanvas = document.querySelector('#resultsChart');
const uploadMessage = document.querySelector('#uploadMessage');
const participantSaveControls = document.querySelector('#participantSaveControls');

const refreshHome = isAdmin
  ? setupAdminPage({ controller, study: STUDY, uploadQueue })
  : setupWelcomePage({ controller, study: STUDY, trialSounds, openStopDialog });
const homeScreen = isAdmin ? 'setup' : 'welcome';
showScreen(homeScreen);
refreshHome();

// Uploads left over from an earlier visit are retried quietly in the background.
if (STUDY.uploadUrl && uploadQueue.list().length) {
  uploadQueue.retryAll(STUDY.uploadUrl).then(refreshHome);
}

const isParticipantSession = () => controller.session?.mode === 'participant';

// Participant sessions run in fullscreen. Browsers only allow this in response to a click or key press.
function enterFullscreenForParticipant() {
  if (isParticipantSession() && !document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
}

beginTrialsButton.addEventListener('click', () => {
  enterFullscreenForParticipant();
  controller.beginNextTrial();
});

continueButton.addEventListener('click', () => {
  enterFullscreenForParticipant();
  controller.beginNextTrial();
});

practiceAgainButton.addEventListener('click', () => {
  enterFullscreenForParticipant();
  controller.repeatPractice();
});

document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && controller.state === 'intertrial' && !stopDialog.open) {
    event.preventDefault();
    enterFullscreenForParticipant();
    controller.beginNextTrial();
  }
});

// Escape releases Pointer Lock. The trial resets, and the participant chooses to continue or stop.
controller.onPaused = () => {
  pauseOverlay.hidden = false;
};

document.querySelector('#pauseContinueButton').addEventListener('click', () => {
  pauseOverlay.hidden = true;
  enterFullscreenForParticipant();
  setNativeCursorHidden(canvas, true);
  void controller.handleStartClick();
});

function openStopDialog() {
  if (document.pointerLockElement) document.exitPointerLock();
  stopDialog.showModal();
}

for (const button of document.querySelectorAll('.stop-button')) {
  button.addEventListener('click', openStopDialog);
}
document.querySelector('#stopCancelButton').addEventListener('click', () => stopDialog.close());
document.querySelector('#stopConfirmButton').addEventListener('click', () => {
  stopDialog.close();
  pauseOverlay.hidden = true;
  controller.withdraw();
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
});

document.querySelector('#withdrawnHomeButton').addEventListener('click', () => location.reload());
document.querySelector('#nextParticipantButton').addEventListener('click', () => location.reload());
document.querySelector('#summaryButton').addEventListener('click', () => controller.exportSummary());
document.querySelector('#motionButton').addEventListener('click', () => controller.exportMotion());
document.querySelector('#jsonButton').addEventListener('click', () => controller.exportJson());
document.querySelector('#downloadResultsButton').addEventListener('click', () => controller.exportJson());
document.querySelector('#retryUploadButton').addEventListener('click', () => saveResults(controller.session));

controller.onStateChange = (state, session) => {
  showScreen(state);
  if (state !== 'trial') pauseOverlay.hidden = true;

  if (state === 'instructions') {
    document.querySelector('#instructionSession').textContent = session.sessionId;
    document.querySelector('#instructionParticipant').textContent = session.participantId;
    const version = getInterfaceVersion(session.interfaceVersion);
    document.querySelector('#instructionText').textContent = version.instructions;
    document.querySelector('#goalNote').hidden = !version.goal;
    document.querySelector('#goalText').textContent = lowerFirst(version.goal ?? '');
    const position = getTrialPosition(session.schedule, session.currentTrialIndex);
    beginTrialsButton.textContent = getBeginTrialsButtonText(session.currentTrialIndex, position);
    practiceNote.hidden = !position?.isPractice;
    document.querySelector('#practiceCount').textContent = position?.total ?? '';
  }

  if (state === 'intertrial') showIntertrial(session);
  if (state === 'complete') showComplete(session);
};

function showIntertrial(session) {
  const finished = getTrialPosition(session.schedule, session.currentTrialIndex - 1);
  const next = getTrialPosition(session.schedule, session.currentTrialIndex);
  const measuredDone = finished && !finished.isPractice ? finished.number : 0;
  const measuredTotal = next?.total ?? finished?.total ?? 1;
  document.querySelector('#intertrialProgress span').style.width = `${(measuredDone / measuredTotal) * 100}%`;
  practiceAgainButton.hidden = !controller.canRepeatPractice();
  const goal = getInterfaceVersion(session.interfaceVersion).goal;
  goalReminder.hidden = !goal;
  goalReminder.textContent = goal ? `Remember: ${lowerFirst(goal)}. Move at a steady, comfortable pace; speed is not scored.` : '';

  if (finished?.isPractice && !next?.isPractice) {
    // The one moment participants must not miss: practice is over and scoring begins.
    trialCompleteText.textContent = 'Practice complete. The experiment starts now.';
    intertrialText.textContent = `From here on, all ${next.total} trials are scored. Some trials may feel delayed.`
      + (controller.canRepeatPractice() ? ' If you would like more practice first, select Practice again.' : '');
    continueButton.textContent = 'Start the experiment';
  } else {
    const name = finished?.isPractice ? 'Practice trial' : 'Trial';
    trialCompleteText.textContent = finished
      ? `${name} ${finished.number} of ${finished.total} complete.`
      : `Trial ${session.currentTrialIndex} complete.`;
    intertrialText.textContent = 'Take a short break if you need one. Press Space or select Continue when you are ready.';
    continueButton.textContent = 'Continue';
  }
}

function showComplete(session) {
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  const participant = session.mode === 'participant';
  const showResults = !participant && shouldShowExperimenterResults(getInterfaceVersion(session.interfaceVersion), session.developerMode);
  document.querySelector('#completeEyebrow').textContent = participant ? 'Finished' : 'Experimenter results';
  document.querySelector('#completeHeading').textContent = participant ? 'Thank you for taking part!' : 'Session complete';
  document.querySelector('#experimenterControls').hidden = !showResults;
  chartCanvas.hidden = !showResults;
  document.querySelector('#completeText').textContent = participant
    ? `Your participant code is ${session.participantId}.`
    : `${session.completedSummaries.length} trial summaries and ${session.motionData.length} progress-trace rows are ready to export. ${describeThreshold(session.thresholdResult)}`;
  if (showResults) renderer.drawResultsChart(chartCanvas, session.completedSummaries);

  const nextControls = document.querySelector('#nextParticipantControls');
  nextControls.hidden = participant && !isSharedComputer();
  document.querySelector('#nextParticipantButton').textContent = participant ? 'Start the next participant' : 'Back to the admin page';

  if (participant) {
    writeCompletedRecord({ participantId: session.participantId, sessionId: session.sessionId, completedAt: session.completedAt });
  }
  void saveResults(session);
}

// Results are queued in browser storage first, then uploaded. The unfinished-session copy is removed
// once the queue holds the data, so starting the next session cannot delete it.
async function saveResults(session) {
  const participant = session.mode === 'participant';
  const payload = buildUploadPayload(session, STUDY);
  const queued = uploadQueue.get(session.sessionId) ? true : uploadQueue.add(payload);
  if (queued) controller.clearSavedSession();

  uploadMessage.hidden = false;
  participantSaveControls.hidden = true;
  if (!STUDY.uploadUrl) {
    // Only say the results are saved on this computer if the browser actually kept a copy.
    if (!queued) {
      uploadMessage.textContent = participant
        ? `This browser could not keep a copy of your results. Please select Download results now. ${STUDY.contactText}`
        : 'This browser could not keep a copy of the session. Download it now.';
    } else {
      uploadMessage.textContent = participant
        ? `Your results are saved on this computer. Select Download results to keep a copy. ${STUDY.contactText}`
        : 'No upload address is set, so this session is saved on this computer only. Download it here or from the admin page.';
    }
    participantSaveControls.hidden = !participant;
    document.querySelector('#retryUploadButton').hidden = true;
    return;
  }

  uploadMessage.textContent = participant ? 'Saving your results… Please keep this page open.' : 'Uploading as test data…';
  try {
    await uploadQueue.send(STUDY.uploadUrl, payload);
    uploadMessage.textContent = participant
      ? 'Your results have been saved. You can close this page.'
      : 'Uploaded to the test tabs of the results spreadsheet.';
  } catch {
    uploadMessage.textContent = participant
      ? `We could not save your results yet. Check your internet connection and select Try again. If it still does not work, select Download results. ${STUDY.contactText}`
      : 'Upload failed. The session is saved on this computer; retry from the admin page.';
    participantSaveControls.hidden = !participant;
    document.querySelector('#retryUploadButton').hidden = false;
    if (!queued) uploadMessage.textContent += ' This browser is out of storage space, so please download your results now.';
  }
}

function lowerFirst(text) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function describeThreshold(result) {
  if (!result?.levels?.length) return '';
  const percent = Math.round((result.decline_ratio - 1) * 100);
  const threshold = result.threshold_ms === null
    ? `No threshold: average error did not stay ${percent}% above baseline through the longest delay.`
    : `Threshold: ${result.threshold_ms} ms (average error stayed at least ${percent}% above baseline from this delay up).`;
  return result.baseline_timed_out ? `${threshold} Warning: a 0 ms trial timed out, so the baseline is not reliable.` : threshold;
}

function showScreen(active) {
  for (const [name, element] of Object.entries(screens)) {
    element.hidden = name !== active;
  }
}
