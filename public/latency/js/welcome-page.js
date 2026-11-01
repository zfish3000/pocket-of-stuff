import { findBlockingProblems, isSharedComputer, readCompletedRecord } from './participant-checks.js';

// Mice and trackpads are both allowed, and are recorded as one answer.
const ALLOWED_DEVICE = 'mouse-or-trackpad';

// The participant start page: consent, computer checks, and the mouse question.
export function setupWelcomePage({ controller, study, trialSounds, openStopDialog }) {
  const form = document.querySelector('#welcomeForm');
  const startButton = document.querySelector('#welcomeStartButton');
  const consentCheckbox = document.querySelector('#consentCheckbox');
  const differentPersonCheckbox = document.querySelector('#differentPersonCheckbox');
  const completedNotice = document.querySelector('#completedNotice');
  const participantInput = document.querySelector('#welcomeParticipantId');
  const deviceWarning = document.querySelector('#deviceWarning');
  const deviceInputs = [...document.querySelectorAll('input[name="inputDevice"]')];

  document.querySelector('#welcomeTitle').textContent = study.title;
  document.querySelector('#consentText').textContent = study.consentText;
  document.querySelector('#consentCheckboxText').textContent = study.consentCheckboxText;
  document.querySelector('#estimatedMinutes').textContent = study.estimatedMinutes;

  const selectedDevice = () => deviceInputs.find((input) => input.checked)?.value ?? null;
  const updateStartButton = () => {
    const device = selectedDevice();
    deviceWarning.hidden = !device || device === ALLOWED_DEVICE;
    const needsDifferentPerson = !completedNotice.hidden && !differentPersonCheckbox.checked;
    startButton.disabled = device !== ALLOWED_DEVICE || !consentCheckbox.checked || needsDifferentPerson;
  };
  for (const input of [...deviceInputs, consentCheckbox, differentPersonCheckbox]) {
    input.addEventListener('change', updateStartButton);
  }

  document.querySelector('#soundTestButton').addEventListener('click', () => {
    trialSounds.prepare();
    trialSounds.playStart();
  });

  startButton.addEventListener('click', () => {
    trialSounds.prepare();
    const previous = readCompletedRecord();
    controller.clearSavedSession();
    controller.createSession({
      participantId: participantInput.value,
      developerMode: false,
      interfaceVersion: study.interfaceVersion,
      mode: 'participant',
      inputDevice: selectedDevice(),
      previousSessionsOnDevice: previous?.count ?? 0,
      confirmedDifferentPerson: !completedNotice.hidden && differentPersonCheckbox.checked,
    });
  });

  document.querySelector('#welcomeResumeButton').addEventListener('click', () => {
    controller.resumeSession();
  });

  // Shows exactly one thing: a reason the participant cannot start, a way to resume, or the start form.
  // When this browser was used before, the form also asks the participant to confirm they are someone new.
  return function refresh() {
    const notices = {
      closed: document.querySelector('#closedNotice'),
      blocking: document.querySelector('#blockingNotice'),
      resume: document.querySelector('#welcomeResume'),
    };
    const problems = findBlockingProblems();
    const saved = controller.restoreSession();
    let shown = 'form';
    if (!study.studyOpen) {
      shown = 'closed';
    } else if (problems.length) {
      shown = 'blocking';
      const list = document.querySelector('#blockingList');
      list.replaceChildren(...problems.map((problem) => Object.assign(document.createElement('li'), { textContent: problem })));
    } else if (saved?.mode === 'participant' && !saved.completedAt) {
      shown = 'resume';
    }
    for (const [name, element] of Object.entries(notices)) {
      element.hidden = name !== shown;
    }
    form.hidden = shown !== 'form';
    completedNotice.hidden = !readCompletedRecord() || isSharedComputer();
    if (shown === 'resume') {
      notices.resume.querySelector('.stop-button')?.remove();
      const stop = Object.assign(document.createElement('button'), {
        type: 'button',
        className: 'stop-button',
        textContent: 'Stop and delete it',
      });
      stop.addEventListener('click', openStopDialog);
      notices.resume.querySelector('.button-row').append(stop);
    }
    updateStartButton();
  };
}
