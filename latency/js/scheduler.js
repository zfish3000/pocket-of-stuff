import { CONFIG } from './config.js';
import { getMatchedPaths, getPathsByDifficulty, getPracticePaths } from './paths.js';

export function createTrialSchedule({ seed = Date.now() } = {}) {
  const random = createSeededRandom(seed);
  const schedule = [];
  const usedPathByDifficulty = new Map();

  schedule.push(makeTrial({
    trialNumber: 1,
    phase: 'practice',
    difficulty: 'easy',
    latencyMs: 0,
    repeatNumber: 1,
    pathId: pickPath('easy', random, usedPathByDifficulty),
  }));

  for (const difficulty of CONFIG.difficulties) {
    for (let repeat = 1; repeat <= CONFIG.baselineRepeats; repeat += 1) {
      schedule.push(makeTrial({
        trialNumber: schedule.length + 1,
        phase: 'baseline',
        difficulty,
        latencyMs: 0,
        repeatNumber: repeat,
        pathId: pickPath(difficulty, random, usedPathByDifficulty),
      }));
    }
  }

  const experimental = [];
  for (const latencyMs of CONFIG.latenciesMs) {
    for (const difficulty of CONFIG.difficulties) {
      for (let repeat = 1; repeat <= CONFIG.experimentalRepeats; repeat += 1) {
        experimental.push({ phase: 'experimental', difficulty, latencyMs, repeatNumber: repeat });
      }
    }
  }

  const randomized = guardedShuffle(experimental, random);
  for (const trial of randomized) {
    schedule.push(makeTrial({
      ...trial,
      trialNumber: schedule.length + 1,
      pathId: pickPath(trial.difficulty, random, usedPathByDifficulty),
    }));
  }

  return schedule;
}

function makeTrial(trial) {
  return {
    trialNumber: trial.trialNumber,
    phase: trial.phase,
    difficulty: trial.difficulty,
    pathId: trial.pathId,
    latencyMs: trial.latencyMs,
    repeatNumber: trial.repeatNumber,
  };
}

function guardedShuffle(items, random) {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const shuffled = shuffle([...items], random);
    if (hasAllowedLatencyRuns(shuffled)) {
      return shuffled;
    }
  }
  return items.sort((a, b) => a.latencyMs - b.latencyMs || a.difficulty.localeCompare(b.difficulty));
}

function hasAllowedLatencyRuns(trials) {
  let run = 1;
  for (let index = 1; index < trials.length; index += 1) {
    run = trials[index].latencyMs === trials[index - 1].latencyMs ? run + 1 : 1;
    if (run > 3) {
      return false;
    }
  }
  return true;
}

function pickPath(difficulty, random, usedPathByDifficulty) {
  const paths = getPathsByDifficulty(difficulty);
  const lastPathId = usedPathByDifficulty.get(difficulty);
  const candidates = paths.filter((path) => path.id !== lastPathId);
  const selected = candidates[Math.floor(random() * candidates.length)];
  usedPathByDifficulty.set(difficulty, selected.id);
  return selected.id;
}

function shuffle(items, random) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

export function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export const TEST_A_LATENCIES_MS = [0, 100, 200, 300, 400, 600, 1000];
// How many times each path runs at each delay. The 0 ms baseline runs each path twice, four trials in all,
// because every other score is divided by the baseline average.
const TEST_A_REPEATS_PER_PATH = (latencyMs) => (latencyMs === 0 ? 2 : 1);

// Test A opens with two unscored practice trials on mirror images of the matched paths, then
// shuffles both matched paths at every delay, including the 0 ms controls.
export function createTestALatencySchedule({ seed = Date.now() } = {}) {
  const random = createSeededRandom(seed);
  const schedule = [];
  const matchedPaths = getMatchedPaths();

  for (const path of shuffle([...getPracticePaths()], random)) {
    schedule.push(makeTrial({
      trialNumber: schedule.length + 1,
      phase: 'practice',
      difficulty: 'practice',
      latencyMs: 0,
      repeatNumber: schedule.length + 1,
      pathId: path.id,
    }));
  }

  // repeatNumber counts the trials at each delay: 1 to 4 at 0 ms, 1 to 2 at every other delay.
  const measuredTrials = [];
  for (const latencyMs of TEST_A_LATENCIES_MS) {
    let repeatNumber = 0;
    for (let repeat = 0; repeat < TEST_A_REPEATS_PER_PATH(latencyMs); repeat += 1) {
      for (const path of matchedPaths) {
        repeatNumber += 1;
        measuredTrials.push({
          phase: latencyMs === 0 ? 'baseline' : 'experimental',
          difficulty: 'standard',
          latencyMs,
          repeatNumber,
          pathId: path.id,
        });
      }
    }
  }

  for (const trial of shuffleMatchedTrials(measuredTrials, random, null)) {
    schedule.push(makeTrial({
      ...trial,
      trialNumber: schedule.length + 1,
    }));
  }

  return schedule;
}

const FIXED_PACE_LATENCIES_MS = [50, 100, 200, 400, 600, 800];

// Version 3 uses one control first, then mixes the second control into all delayed trials.
export function createFixedPaceLatencySchedule({ seed = Date.now() } = {}) {
  const random = createSeededRandom(seed);
  const matchedPaths = getMatchedPaths();
  const repeatNumber = (pathId) => pathId === 'matched-a' ? 1 : 2;
  const firstPath = shuffle([...matchedPaths], random)[0];
  const firstTrial = makeTrial({
    trialNumber: 1,
    phase: 'baseline',
    difficulty: 'standard',
    latencyMs: 0,
    repeatNumber: repeatNumber(firstPath.id),
    pathId: firstPath.id,
  });
  const remaining = matchedPaths
    .filter((path) => path.id !== firstPath.id)
    .map((path) => ({
      phase: 'baseline',
      difficulty: 'standard',
      latencyMs: 0,
      repeatNumber: repeatNumber(path.id),
      pathId: path.id,
    }));

  for (const latencyMs of FIXED_PACE_LATENCIES_MS) {
    for (const path of matchedPaths) {
      remaining.push({
        phase: 'experimental',
        difficulty: 'standard',
        latencyMs,
        repeatNumber: repeatNumber(path.id),
        pathId: path.id,
      });
    }
  }

  return [firstTrial, ...shuffleMatchedTrials(remaining, random, firstTrial).map((trial, index) => makeTrial({
    ...trial,
    trialNumber: index + 2,
  }))];
}

function shuffleMatchedTrials(trials, random, previousTrial) {
  const search = (remaining, ordered, previous) => {
    if (remaining.length === 0) return ordered;
    const candidates = shuffle([...remaining], random);
    for (const candidate of candidates) {
      if (previous && (candidate.pathId === previous.pathId || candidate.latencyMs === previous.latencyMs)) continue;
      const candidateIndex = remaining.indexOf(candidate);
      const nextRemaining = remaining.filter((_, index) => index !== candidateIndex);
      const result = search(nextRemaining, [...ordered, candidate], candidate);
      if (result) return result;
    }
    return null;
  };

  const result = search(trials, [], previousTrial);
  if (!result) {
    throw new Error('Unable to create a balanced Test A trial order.');
  }
  return result;
}

// Practice and measured trials are counted separately so participants see "Practice 1 of 2" and then "Trial 1 of 14".
export function getTrialPosition(schedule, index) {
  const trial = schedule[index];
  if (!trial) return null;
  const isPractice = trial.phase === 'practice';
  const group = schedule.filter((item) => (item.phase === 'practice') === isPractice);
  return { isPractice, number: group.indexOf(trial) + 1, total: group.length };
}
