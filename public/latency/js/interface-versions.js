// Each interface version is a set of options for one way of running the task.
// Add a new entry here to create another test version; it appears in the setup screen picker.
export const INTERFACE_VERSIONS = [
  {
    id: 'classic',
    label: 'Classic: thin path, direct mouse (not used in study)',
    pathStyle: 'line',
    control: 'position',
    schedule: 'full',
    instructions: 'Move the mouse so the blue cursor follows the path corridor as accurately as you can. Some trials may feel delayed. Do not try to guess the condition. Use the cursor you see on screen.',
  },
  {
    id: 'walled-velocity',
    label: 'Test A: matched paths, vector mouse, latency study (use this)',
    pathStyle: 'walled',
    control: 'velocity',
    schedule: 'test-a-latency',
    smoothCorners: true,
    trialTimeoutMs: 60000,
    instructions: 'Steer the blue ball from Start through the corridor to the Finish line. Moving the mouse pushes the ball in that direction, and it keeps gliding until it slows down. Some trials may feel delayed.',
    // The scored goal, shown on the instructions screen, before each trial, and during each trial.
    goal: 'Keep the ball on the dashed center line',
    // Defaults for the tunable settings on the setup screen. Speeds are in design-grid pixels.
    settings: {
      corridorWidthScale: 2,
      bendScale: 5,
      fillColoring: 'distance',
      gain: 4,
      drag: 1.2,
      maxSpeed: 500,
    },
    settingRanges: {
      corridorWidthScale: { min: 1, max: 2 },
      bendScale: { min: 3, max: 5 },
    },
  },
  {
    id: 'fixed-pace-tracking',
    label: 'Test B: fixed-pace target tracking (not used in study)',
    pathStyle: 'tracking',
    control: 'position',
    schedule: 'fixed-pace-latency',
    smoothCorners: true,
    trackingTarget: true,
    targetDurationMs: 12000,
    lockedSettings: true,
    hideResultsInParticipantMode: true,
    instructions: 'Keep the blue cursor as close as possible to the moving yellow target. The target follows the center of the path at a fixed speed, and every trial lasts the same amount of time. Some trials may feel delayed. Do not try to guess the condition; follow the target you see.',
    settings: {
      corridorWidthScale: 2,
      bendScale: 5,
    },
  },
];

export function getInterfaceVersion(id) {
  return INTERFACE_VERSIONS.find((version) => version.id === id) ?? INTERFACE_VERSIONS[0];
}

export function hasEditableSettings(version) {
  return Boolean(version.settings && !version.lockedSettings);
}

export function shouldShowExperimenterResults(version, developerMode) {
  return !version.hideResultsInParticipantMode || Boolean(developerMode);
}

export function resolveInterfaceSettings(version, overrides = {}) {
  const settings = { ...version.settings, ...overrides };
  for (const [name, range] of Object.entries(version.settingRanges ?? {})) {
    const value = Number(settings[name]);
    if (Number.isFinite(value)) {
      settings[name] = Math.min(range.max, Math.max(range.min, value));
    }
  }
  return settings;
}

// position comes from getTrialPosition() and lets practice and measured trials be counted separately.
export function getBeginTrialsButtonText(currentTrialIndex, position = null) {
  if (!position) {
    return currentTrialIndex === 0 ? 'Begin trial 1' : `Resume trial ${currentTrialIndex + 1}`;
  }
  const name = `${position.isPractice ? 'practice trial' : 'trial'} ${position.number}`;
  return currentTrialIndex === 0 ? `Begin ${name}` : `Resume ${name}`;
}
