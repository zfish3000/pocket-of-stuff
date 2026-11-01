export const CONFIG = {
  schemaVersion: 'latency-path-study-v1',
  // Change this whenever a setting that affects the science changes, so each session records which design it used.
  configVersion: '2026-11-02-test-a-baseline4-v5',
  totalTrialCount: 43,
  // The canvas always renders at 4K. Paths and sizes are designed on a 1920 x 1080 grid and scaled up.
  stageWidth: 3840,
  stageHeight: 2160,
  designWidth: 1920,
  designHeight: 1080,
  trialTimeoutMs: 12000,
  goalRadiusPx: 22,
  pointerRadiusPx: 9,
  latenciesMs: [50, 100, 150, 200, 300, 400],
  difficulties: ['easy', 'medium', 'hard'],
  baselineRepeats: 2,
  experimentalRepeats: 2,
  practiceTrials: 1,
  // Participants may repeat the practice trials this many extra times before the scored trials begin.
  maxPracticeRepeats: 1,
  // Distance from the center line is recorded once per slice of forward progress (design pixels).
  progressSlicePx: 10,
  // A meaningful decline is average error at least 25% above the participant's 0 ms baseline.
  declineRatio: 1.25,
  storageKey: 'latency-path-study-session-v1',
};
