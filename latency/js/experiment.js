import { CONFIG } from './config.js';
import { setNativeCursorHidden } from './cursor-visibility.js';
import { downloadTextFile, rowsToCsv, buildFullSessionJson } from './export.js';
import { getInterfaceVersion, resolveInterfaceSettings } from './interface-versions.js';
import { LatencyBuffer } from './latency-buffer.js';
import { VelocityCursor, constrainToCorridor, constrainToRect } from './motion.js';
import { getGoal, getStart, distance, closestPointOnPath, getPathById, getPathLength, pointAtDistance, scalePath, shapePath } from './paths.js';
import { addProgressSlices, createProgressSlices, findLatencyThreshold, normalizeSummaries, summarizeTrackingTrial, summarizeTrial, isGoalReached, isTimedOut, round } from './scoring.js';
import { createFixedPaceLatencySchedule, createTestALatencySchedule, createTrialSchedule, getTrialPosition } from './scheduler.js';
import { clearSession, loadSession, saveSession } from './storage.js';

export class ExperimentController {
  constructor({ canvas, renderer, input, trialSounds = null, persistSession = saveSession, restoreSession = loadSession }) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.input = input;
    this.trialSounds = trialSounds ?? { prepare() {}, playStart() {}, playEnd() {} };
    this.persistSession = persistSession;
    this.restoreSession = restoreSession;
    this.buffer = new LatencyBuffer();
    this.onStateChange = () => {};
    // Called when Pointer Lock ends partway through a trial, for example when the participant presses Escape.
    this.onPaused = () => {};
    this.animationId = null;
    this.state = 'setup';
    this.session = null;
    this.active = null;
    this.canvas.addEventListener('click', () => {
      void this.handleStartClick();
    });
  }

  // Size of one design-grid pixel in canvas pixels.
  get ui() {
    return this.canvas.width / CONFIG.designWidth;
  }

  // mode is 'participant' for real sessions and 'admin' for sessions started from the admin page.
  createSession({ participantId, developerMode, interfaceVersion, interfaceSettings = {}, mode = 'admin', inputDevice = null, previousSessionsOnDevice = 0, confirmedDifferentPerson = false }) {
    const cleanParticipantId = cleanParticipantCode(participantId) || generateParticipantId();
    const seed = Math.floor(Math.random() * 1_000_000_000);
    const version = getInterfaceVersion(interfaceVersion);
    this.session = {
      schemaVersion: CONFIG.schemaVersion,
      configVersion: CONFIG.configVersion,
      participantId: cleanParticipantId,
      sessionId: `S-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.floor(Math.random() * 1000)}`,
      startedAt: new Date().toISOString(),
      seed,
      developerMode,
      interfaceVersion: version.id,
      interfaceSettings: resolveInterfaceSettings(version, interfaceSettings),
      currentTrialIndex: 0,
      schedule: createSchedule(version.schedule, seed),
      motionData: [],
      completedSummaries: [],
      baselineValues: {},
      deviceInfo: getDeviceInfo(),
      mode,
      inputDevice,
      // Sessions already finished in this browser before this one, and whether this participant confirmed
      // they are a different person. Used to review possible repeat participation.
      previousSessionsOnDevice,
      confirmedDifferentPerson,
      practiceRounds: 1,
      resumeCount: 0,
      completedAt: null,
    };
    this.persistSession(this.session);
    this.state = 'instructions';
    this.onStateChange(this.state, this.session);
  }

  resumeSession() {
    const saved = this.restoreSession();
    if (!saved) return false;
    this.session = saved;
    // Resumed sessions are flagged in the data, because the break may affect performance.
    this.session.resumeCount = (saved.resumeCount ?? 0) + 1;
    this.saveCheckpoint();
    this.state = 'instructions';
    this.onStateChange(this.state, this.session);
    return true;
  }

  saveCheckpoint() {
    try {
      this.persistSession(this.session);
    } catch {
      // Keep the in-memory run usable if the browser refuses a checkpoint.
      this.session.autosaveFailed = true;
    }
  }

  hasSavedSession() {
    return Boolean(this.restoreSession());
  }

  beginNextTrial() {
    if (!this.session || this.session.currentTrialIndex >= this.session.schedule.length) {
      this.complete();
      return;
    }
    const trial = this.session.schedule[this.session.currentTrialIndex];
    const version = getInterfaceVersion(this.session.interfaceVersion);
    const settings = { ...version.settings, ...this.session.interfaceSettings };
    const basePath = getPathById(trial.pathId, this.session.configVersion);
    const widePath = { ...basePath, corridorWidth: basePath.corridorWidth * (settings.corridorWidthScale ?? 1) };
    const path = scalePath(
      shapePath(widePath, { bendScale: settings.bendScale ?? 1, smooth: Boolean(version.smoothCorners) }),
      this.canvas.width,
      this.canvas.height,
    );
    this.buffer.clear();
    this.active = {
      trial,
      path,
      version,
      settings,
      pathLength: getPathLength(path),
      timeoutMs: version.targetDurationMs ?? version.trialTimeoutMs ?? CONFIG.trialTimeoutMs,
      startTime: null,
      awaitingStart: true,
      requestingLock: false,
      ...freshAttemptState(),
    };
    this.state = 'trial';
    setNativeCursorHidden(this.canvas, true);
    this.onStateChange(this.state, this.session, trial);
    this.drawActiveTrial({ waitingForStart: true });
  }

  async handleStartClick() {
    if (this.state !== 'trial' || !this.active?.awaitingStart || this.active.requestingLock) {
      return;
    }
    // A click anywhere starts the trial; the cursor always begins on the Start marker.
    const start = getStart(this.active.path);
    this.trialSounds.prepare();
    this.active.requestingLock = true;
    const locked = await this.input.start(start);
    if (this.state !== 'trial' || !this.active) {
      if (locked) this.input.stop();
      return;
    }
    this.active.requestingLock = false;
    if (!locked) {
      this.resetActiveAttempt('Pointer lock is required. Click to try again.');
      return;
    }
    const now = performance.now();
    if (this.active.version?.control === 'velocity') {
      const { gain, drag, maxSpeed } = this.active.settings;
      this.input.takeMovement();
      this.active.cursor = new VelocityCursor({
        x: start.x,
        y: start.y,
        gain: gain * this.ui,
        drag,
        maxSpeed: maxSpeed * this.ui,
      });
      this.active.lastStepTime = now;
    }
    this.buffer.clear();
    this.buffer.addSample({ time: now, x: start.x, y: start.y });
    this.active.lastRaw = { time: now, x: start.x, y: start.y };
    this.active.startTime = now;
    this.trialSounds.playStart();
    this.active.awaitingStart = false;
    this.loop();
  }

  handleInputInterrupted() {
    if (this.state === 'trial' && this.active && !this.active.awaitingStart) {
      this.resetActiveAttempt('Paused. Click to restart this trial.');
      setNativeCursorHidden(this.canvas, false);
      this.onPaused();
    }
  }

  // Practice can be repeated once, right after the last practice trial and before any scored trial.
  canRepeatPractice() {
    if (!this.session) return false;
    const practiceCount = this.session.schedule.filter((trial) => trial.phase === 'practice').length;
    return practiceCount > 0
      && this.session.currentTrialIndex === practiceCount
      && (this.session.practiceRounds ?? 1) <= CONFIG.maxPracticeRepeats;
  }

  repeatPractice() {
    if (!this.canRepeatPractice()) return false;
    this.session.currentTrialIndex = 0;
    this.session.practiceRounds = (this.session.practiceRounds ?? 1) + 1;
    this.saveCheckpoint();
    this.beginNextTrial();
    return true;
  }

  // Stops the session and deletes its data from this browser. Participants may withdraw at any time.
  withdraw() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.input.stop();
    setNativeCursorHidden(this.canvas, false);
    this.clearSavedSession();
    this.session = null;
    this.active = null;
    this.state = 'withdrawn';
    this.onStateChange(this.state, null);
  }

  resetActiveAttempt(startPromptText) {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.input.stop();
    this.buffer.clear();
    Object.assign(this.active, {
      startTime: null,
      awaitingStart: true,
      requestingLock: false,
      ...freshAttemptState(),
    });
    this.drawActiveTrial({ waitingForStart: true, startPromptText });
  }

  recordInput(sample) {
    // Velocity control builds its own samples each frame in stepCursor().
    if (this.active?.version?.control === 'velocity') return;
    this.buffer.addSample(sample);
    if (this.active) {
      this.active.lastRaw = sample;
    }
  }

  stepCursor(now) {
    const { cursor, path, version } = this.active;
    const dtMs = Math.min(50, now - this.active.lastStepTime);
    this.active.lastStepTime = now;
    const movement = this.input.takeMovement();
    cursor.push(movement.x, movement.y);
    const radius = CONFIG.pointerRadiusPx * this.ui;
    const constrain = version.pathStyle === 'walled'
      ? (point) => constrainToCorridor(point, path, radius)
      : (point) => constrainToRect(point, this.canvas.width, this.canvas.height);
    const { contact } = cursor.step(dtMs, constrain);
    if (contact && !this.active.wallContact) {
      this.active.wallHits += 1;
    }
    this.active.wallContact = contact;
    const sample = { time: now, x: cursor.x, y: cursor.y };
    this.buffer.addSample(sample);
    this.active.lastRaw = sample;
  }

  loop() {
    if (this.state !== 'trial' || !this.active || this.active.awaitingStart) {
      return;
    }
    const now = performance.now();
    const { trial, path, version } = this.active;
    if (this.active.cursor) {
      this.stepCursor(now);
    }
    const delayed = version.trackingTarget
      ? this.buffer.getDelayedHeldSample(now, trial.latencyMs)
      : this.buffer.getDelayedSample(now, trial.latencyMs);
    const elapsedMs = now - this.active.startTime;
    const targetDurationMs = version.targetDurationMs ?? this.active.timeoutMs;
    const targetDistancePx = version.trackingTarget
      ? this.active.pathLength * Math.min(1, elapsedMs / targetDurationMs)
      : 0;
    const targetPosition = version.trackingTarget ? pointAtDistance(path, targetDistancePx) : null;
    let displayedWallContact = false;

    if (delayed) {
      if (version.trackingTarget) {
        this.recordTrackingSample({ delayed, targetPosition, elapsedMs, now });
        this.active.goalReached = elapsedMs >= targetDurationMs;
        this.active.timedOut = false;
      } else {
      const goal = getGoal(path);
      const nearest = closestPointOnPath(delayed, path);
      const pathErrorPx = nearest.distance;
      const distanceToGoalPx = distance(delayed, goal);
      const insideCorridor = pathErrorPx <= path.corridorWidth / 2;
      displayedWallContact = version.pathStyle === 'walled'
        ? constrainToCorridor(delayed, path, CONFIG.pointerRadiusPx * this.ui).contact
        : false;
      const speedPxS = this.active.cursor ? this.active.cursor.speed : null;
      // Fill in the corridor behind the cursor. Ignore jumps to a later, nearby section of the path.
      if (nearest.distanceAlong <= this.active.progressPx + path.corridorWidth && nearest.distanceAlong > this.active.progressPx) {
        const wallLimit = path.corridorWidth / 2 - CONFIG.pointerRadiusPx * this.ui;
        addFillSegment(this.active.fillSegments, this.active.progressPx, nearest.distanceAlong, pathErrorPx / wallLimit);
        this.active.progressSlices ??= createProgressSlices(CONFIG.progressSlicePx * this.ui, getStart(path));
        addProgressSlices(this.active.progressSlices, nearest.distanceAlong, {
          errorPx: pathErrorPx,
          x: delayed.x,
          y: delayed.y,
          elapsedMs,
          speedPxS,
          wallContact: displayedWallContact,
        });
        this.active.progressPx = nearest.distanceAlong;
      }
      // Frame samples stay in memory for the trial summary; only the progress trace is saved.
      this.active.samples.push({
        elapsedMs,
        actualSampleAgeMs: delayed.actualSampleAgeMs,
        pathErrorPx,
        insideCorridor,
        distanceToGoalPx,
        wallContact: displayedWallContact,
        speedPxS,
      });
      this.active.lastDisplayed = delayed;
      this.active.goalReached = version.pathStyle === 'walled'
        ? this.active.progressPx >= this.active.pathLength - 0.5
        : isGoalReached(distanceToGoalPx, CONFIG.goalRadiusPx * this.ui);
      this.active.timedOut = isTimedOut(elapsedMs, this.active.timeoutMs);
      }
    }

    this.drawActiveTrial({
      displayedCursor: delayed,
      targetPosition,
      elapsedMs,
      actualAgeMs: delayed?.actualSampleAgeMs,
      wallContact: displayedWallContact,
    });

    if (this.active.goalReached || this.active.timedOut) {
      this.finishTrial();
      return;
    }

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  recordTrackingSample({ delayed, targetPosition, elapsedMs, now }) {
    const { trial, version } = this.active;
    const raw = this.active.lastRaw ?? delayed;
    const trackingErrorPx = distance(delayed, targetPosition);
    const exportRow = {
      participant_id: this.session.participantId,
      session_id: this.session.sessionId,
      interface_version: version.id,
      trial_number: trial.trialNumber,
      phase: trial.phase,
      difficulty: trial.difficulty,
      path_id: trial.pathId,
      latency_ms: trial.latencyMs,
      repeat_number: trial.repeatNumber,
      elapsed_ms: round(Math.min(elapsedMs, version.targetDurationMs)),
      absolute_timestamp_ms: round(now),
      raw_mouse_x: round(raw.x),
      raw_mouse_y: round(raw.y),
      displayed_cursor_x: delayed.x,
      displayed_cursor_y: delayed.y,
      target_x: round(targetPosition.x),
      target_y: round(targetPosition.y),
      tracking_error_px: round(trackingErrorPx),
      target_progress_percent: round(Math.min(1, elapsedMs / version.targetDurationMs) * 100),
      requested_latency_ms: trial.latencyMs,
      actual_sample_age_ms: delayed.actualSampleAgeMs,
    };
    this.active.samples.push({
      elapsedMs: Math.min(elapsedMs, version.targetDurationMs),
      actualSampleAgeMs: delayed.actualSampleAgeMs,
      trackingErrorPx,
      exportRow,
    });
    this.active.lastDisplayed = delayed;
  }

  drawActiveTrial({ displayedCursor = null, targetPosition = null, elapsedMs = 0, waitingForStart = false, startPromptText, actualAgeMs, wallContact = false }) {
    const { trial, path, version } = this.active;
    this.renderer.drawTrial({
      path,
      version,
      displayedCursor,
      targetPosition,
      trial,
      elapsedMs,
      timeoutMs: this.active.timeoutMs,
      progressPx: this.active.progressPx,
      fillSegments: this.active.fillSegments,
      fillColoring: this.active.settings?.fillColoring,
      wallContact,
      totalTrials: this.session.schedule.length,
      position: getTrialPosition(this.session.schedule, this.session.currentTrialIndex),
      waitingForStart,
      startPromptText,
      developerMode: this.session.developerMode,
      diagnostics: {
        latencyMs: trial.latencyMs,
        actualAgeMs,
        phase: trial.phase,
        difficulty: trial.difficulty,
        pathId: trial.pathId,
        pathErrorPx: this.active.samples.at(-1)?.pathErrorPx?.toFixed(1),
        trackingErrorPx: this.active.samples.at(-1)?.trackingErrorPx?.toFixed(1),
        speed: this.active.cursor ? (this.active.cursor.speed / this.ui).toFixed(0) : null,
        wallHits: version?.pathStyle === 'walled' ? this.active.wallHits : null,
        progressPercent: this.active.pathLength ? ((this.active.progressPx / this.active.pathLength) * 100).toFixed(0) : null,
      },
    });
  }

  finishTrial() {
    cancelAnimationFrame(this.animationId);
    this.animationId = null;
    this.input.stop();
    setNativeCursorHidden(this.canvas, false);
    this.trialSounds.playEnd();
    const trialSamples = this.active.samples;
    this.session.motionData.push(...(this.active.version.trackingTarget
      ? trialSamples.map((sample) => sample.exportRow)
      : buildProgressTrace(this.session, this.active.trial, this.active.progressSlices?.points ?? [])));
    const summary = this.active.version.trackingTarget
      ? summarizeTrackingTrial({
        participantId: this.session.participantId,
        sessionId: this.session.sessionId,
        interfaceVersion: this.active.version.id,
        trial: this.active.trial,
        samples: trialSamples,
        trialDurationMs: this.active.version.targetDurationMs,
      })
      : summarizeTrial({
        participantId: this.session.participantId,
        sessionId: this.session.sessionId,
        interfaceVersion: this.active.version.id,
        trial: this.active.trial,
        samples: trialSamples,
        goalReached: this.active.goalReached,
        timedOut: this.active.timedOut,
        wallHits: this.active.wallHits,
        progressSliceErrors: this.active.progressSlices?.errors ?? [],
        progressPercent: this.active.pathLength ? (this.active.progressPx / this.active.pathLength) * 100 : null,
      });
    summary.practice_round = this.active.trial.phase === 'practice' ? (this.session.practiceRounds ?? 1) : '';
    this.session.completedSummaries.push(summary);
    this.session.completedSummaries = normalizeSummaries(this.session.completedSummaries);
    this.session.baselineValues = collectBaselineValues(this.session.completedSummaries, this.session.schedule);
    this.session.thresholdResult = findLatencyThreshold(this.session.completedSummaries);
    this.session.currentTrialIndex += 1;
    this.saveCheckpoint();
    this.active = null;
    this.state = this.session.currentTrialIndex >= this.session.schedule.length ? 'complete' : 'intertrial';
    if (this.state === 'complete') {
      this.session.completedAt = new Date().toISOString();
      this.saveCheckpoint();
    }
    this.onStateChange(this.state, this.session);
  }

  complete() {
    this.input.stop();
    setNativeCursorHidden(this.canvas, false);
    this.state = 'complete';
    this.onStateChange(this.state, this.session);
  }

  exportSummary() {
    downloadTextFile('trial_summary.csv', rowsToCsv(this.session.completedSummaries), 'text/csv');
  }

  exportMotion() {
    downloadTextFile('motion_data.csv', rowsToCsv(this.session.motionData), 'text/csv');
  }

  exportJson() {
    downloadTextFile('full_session.json', buildFullSessionJson(this.session), 'application/json');
  }

  clearSavedSession() {
    clearSession();
  }
}

function createSchedule(scheduleName, seed) {
  if (scheduleName === 'test-a-latency') return createTestALatencySchedule({ seed });
  if (scheduleName === 'fixed-pace-latency') return createFixedPaceLatencySchedule({ seed });
  return createTrialSchedule({ seed });
}

function freshAttemptState() {
  return {
    samples: [],
    goalReached: false,
    timedOut: false,
    lastRaw: null,
    lastDisplayed: null,
    cursor: null,
    lastStepTime: null,
    progressPx: 0,
    progressSlices: null,
    fillSegments: [],
    wallHits: 0,
    wallContact: false,
  };
}

// One row per 10 design pixels of forward progress. Distances, positions, and speeds are 4K canvas pixels.
export function buildProgressTrace(session, trial, points) {
  return points.map((point, index) => ({
    participant_id: session.participantId,
    session_id: session.sessionId,
    trial_number: trial.trialNumber,
    phase: trial.phase,
    path_id: trial.pathId,
    latency_ms: trial.latencyMs,
    slice: index + 1,
    progress_px: round(point.progressPx),
    elapsed_ms: round(point.elapsedMs),
    ball_x: round(point.x),
    ball_y: round(point.y),
    center_distance_px: round(point.errorPx),
    ball_speed_px_s: point.speedPxS === null ? '' : round(point.speedPxS),
    wall_contact: point.wallContact,
  }));
}

// Records how far the cursor was from the center line (0 = center, 1 = touching the wall)
// while each stretch of the corridor was filled in. Neighboring stretches with nearly the same
// distance are merged to keep the list short.
export function addFillSegment(segments, fromPx, toPx, centerOffset, buckets = 40) {
  const offset = Math.min(1, Math.max(0, centerOffset));
  const last = segments.at(-1);
  if (last && last.toPx === fromPx && Math.round(last.centerOffset * buckets) === Math.round(offset * buckets)) {
    last.toPx = toPx;
    return;
  }
  segments.push({ fromPx, toPx, centerOffset: offset });
}

function collectBaselineValues(summaries, schedule) {
  const normalized = normalizeSummaries(summaries);
  const difficulties = [...new Set(schedule.map((trial) => trial.difficulty))];
  return Object.fromEntries(difficulties.map((difficulty) => {
    const row = normalized.find((summary) => summary.difficulty === difficulty && (
      typeof summary.baseline_rms_error_px === 'number'
      || typeof summary.baseline_rms_tracking_error_px === 'number'
    ));
    return [difficulty, row?.baseline_rms_tracking_error_px ?? row?.baseline_rms_error_px ?? null];
  }));
}

// Participant codes may only contain letters, numbers, hyphens, and underscores, so no names or emails slip in.
export function cleanParticipantCode(value = '') {
  return String(value).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 24);
}

// Codes for participants who were not given one, for example "W-7K3QX9". Ambiguous characters are left out.
export function generateParticipantId(random = Math.random) {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = 'W-';
  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(random() * alphabet.length)];
  }
  return code;
}

function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    screenWidth: screen.width,
    screenHeight: screen.height,
    windowWidth: globalThis.innerWidth ?? null,
    windowHeight: globalThis.innerHeight ?? null,
    devicePixelRatio,
    stageWidth: CONFIG.stageWidth,
    stageHeight: CONFIG.stageHeight,
    language: navigator.language,
  };
}
