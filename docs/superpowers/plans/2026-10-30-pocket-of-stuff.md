# Pocket of Stuff Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static personal portfolio whose project HTML files become semantic, clickable wooden blocks arranged in stable, draggable 2D physics towers.

**Architecture:** A prebuild Node script scans `public/projects/*.html`, validates metadata, and produces both JSON and a static anchor partial. Vite injects those anchors into `index.html`; TypeScript measures and enhances the same elements with deterministic tower layout and Matter.js physics. CSS owns the Toymaker’s Assembly Mat material system and all static, reduced-motion, and JavaScript-failure fallbacks.

**Tech Stack:** Vite, vanilla TypeScript, Matter.js, parse5, Vitest with jsdom, local Fontsource packages, semantic HTML/CSS.

**Spec:** `docs/superpowers/specs/2026-10-30-pocket-of-stuff-design.md`

## Global Constraints

- Project files live directly in `public/projects/` and use lowercase ASCII kebab-case filenames matching `[a-z0-9]+(?:-[a-z0-9]+)*.html`.
- Every project requires a non-empty `<title>`; optional `pocket:color`, `pocket:shape`, and `pocket:order` metadata must validate against the spec.
- Built `index.html` must contain every project anchor before JavaScript runs.
- Homepage copy is limited to `POCKET OF STUFF`, `Zachary Fisher`, `Drag to rearrange · Click to open`, and interaction/status copy defined by the spec.
- Palette values are exactly `#F7EBD2`, `#2A2030`, `#E36862`, `#58B9B2`, `#C6A5D2`, `#634572`, `#E6B84B`, `#9AB7C1`, and `#8B796B`.
- Every project title remains visible and attached to its block; no hover-only labels or visual truncation.
- The minimum touch target is 44 by 44 CSS pixels; the stage grows instead of shrinking blocks below that limit.
- Reduced motion disables live physics and rearrangement animation while preserving all project links.
- Supported browsers are the current and previous major Chrome, Firefox, Safari, and Edge releases plus iOS/iPadOS Safari 16.4 and newer.
- Individual project pages are copied unchanged and are not redesigned.
- Do not fabricate production projects; zero projects produces the specified instructional empty state.

## Review Focus

- A malformed or case-colliding filename must stop the build with the offending filename and a valid rename example; Task 1 tests this.
- Titles containing HTML entities, non-Latin text, or a long unbroken token must remain safe and readable without breaking block geometry; Tasks 1–3 test this.
- A pointer release after crossing the drag threshold must never navigate, while the next clean click must navigate normally; Task 4 tests this.
- A 36-project mobile collection must retain every link, a 44px minimum target, and reachable stage bounds; Tasks 2 and 5 test this.
- Resize, tab visibility changes, reduced-motion changes, and rebuild during an active drag must not strand a constraint or a body outside the world; Tasks 4–5 test this.

---

## File Structure

### Build and project discovery

- `package.json` — scripts and dependency contract.
- `package-lock.json` — reproducible dependency versions.
- `tsconfig.json` — strict browser TypeScript configuration.
- `vite.config.ts` — injects the generated semantic project partial into the homepage.
- `scripts/project-manifest.mjs` — parsing, validation, deterministic defaults, discovery, and rendering functions.
- `scripts/generate-project-manifest.mjs` — CLI wrapper that writes generated files.
- `src/generated/projects.json` — generated project data, committed so the empty state is explicit.
- `src/generated/project-blocks.html` — generated semantic anchors or the empty-state block.
- `tests/project-manifest.test.ts` — parser, validation, ordering, escaping, and artifact tests.
- `tests/fixtures/projects/` — non-production project HTML fixtures.

### Homepage and layout

- `index.html` — semantic page shell and generated-partial marker.
- `src/styles.css` — complete Toymaker’s Assembly Mat system, responsive/static states, and focus styles.
- `src/fonts.ts` — imports local Archivo and IBM Plex Mono font files from installed packages.
- `src/projects/types.ts` — shared browser-side project and style types.
- `src/projects/blocks.ts` — measures and decorates server-generated anchors without recreating them.
- `src/physics/shapes.ts` — maps visual shape names to stable Matter.js body definitions.
- `src/physics/tower-layout.ts` — deterministic course generation and stage sizing.
- `tests/blocks.test.ts` — long-title and semantic-anchor enhancement tests.
- `tests/tower-layout.test.ts` — deterministic, non-overlapping, multi-count layout tests.

### Interaction and lifecycle

- `src/physics/gesture.ts` — pointer displacement classification.
- `src/physics/world.ts` — Matter.js engine, bounds, sleeping bodies, constraints, and DOM transforms.
- `src/app.ts` — page controller, rebuild, resize, visibility, reduced-motion, and status behavior.
- `src/main.ts` — imports fonts/styles and boots the controller.
- `tests/gesture.test.ts` — click/drag boundary tests.
- `tests/app.test.ts` — DOM-level navigation suppression, empty state, rebuild, and reduced-motion tests.

### Documentation and verification

- `README.md` — setup, project-file contract, optional metadata, commands, and deployment output.
- `.gitignore` — dependencies, build output, and local runtime artifacts.

---

### Task 1: Static project discovery and build injection

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `scripts/project-manifest.mjs`
- Create: `scripts/generate-project-manifest.mjs`
- Create: `src/generated/projects.json`
- Create: `src/generated/project-blocks.html`
- Create: `tests/project-manifest.test.ts`
- Create: `tests/fixtures/projects/alpha-project.html`
- Create: `tests/fixtures/projects/long-title.html`
- Create: `.gitignore`

**Interfaces:**
- Consumes: the metadata and filename contract in the approved spec.
- Produces: `parseProjectDocument(html: string, filename: string): ProjectSeed`; `discoverProjects(directory: string): Promise<ProjectRecord[]>`; `renderProjectAnchors(projects: ProjectRecord[]): string`; `generateArtifacts(options: { projectsDir: string; jsonPath: string; htmlPath: string }): Promise<ProjectRecord[]>`; generated `projects.json`; generated semantic HTML partial.

- [ ] **Step 1: Initialize the repository and install the minimal build/test dependencies**

Run `git init`, create the package configuration with `dev`, `build`, `test`, `test:watch`, and `generate:projects` scripts, then install Vite, TypeScript, Vitest, jsdom, parse5, Matter.js types/runtime, and the two Fontsource packages. `dev` and `build` must run `generate:projects` before Vite.

- [ ] **Step 2: Write failing manifest tests**

Add tests named `parses_required_and_optional_metadata`, `derives_stable_defaults_from_slug`, `sorts_by_order_then_filename`, `rejects_invalid_slug_and_case_collision`, `rejects_missing_title_and_unknown_metadata`, `escapes_entities_and_preserves_unicode`, `renders_real_anchors_before_javascript`, and `renders_the_exact_empty_state_when_no_projects_exist`.

Assertions must pin the allowed color/shape values, `/projects/<slug>.html` hrefs, strict filename rule, stable output across two runs, safe escaping, and the exact empty-state folder copy from the spec.

- [ ] **Step 3: Run the focused tests and verify they fail**

Run: `npm test -- tests/project-manifest.test.ts`

Expected: FAIL because the manifest module does not exist.

- [ ] **Step 4: Implement the project-manifest module and CLI**

Implement the produced interfaces with parse5. Use a deterministic non-cryptographic hash over the slug to choose default color and shape. Render anchors with `data-project-*` attributes, visible title text, and escaped values; render one non-link `.empty-block` when the array is empty.

- [ ] **Step 5: Add Vite HTML injection**

Add an `<!-- pocket:project-blocks -->` marker inside a named project navigation region in `index.html`. Implement one `transformIndexHtml` plugin that replaces it with `src/generated/project-blocks.html` during dev and build, failing clearly if generation has not run.

- [ ] **Step 6: Run the manifest tests and zero-project build**

Run: `npm test -- tests/project-manifest.test.ts && npm run build`

Expected: all manifest tests PASS; build succeeds; `dist/index.html` contains the empty-state block and no fabricated project anchors.

- [ ] **Step 7: Commit the discovery pipeline**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html scripts src/generated tests .gitignore
git commit -m "feat: generate project blocks from html files"
```

### Task 2: Deterministic block sizing and tower layout

**Files:**
- Create: `src/projects/types.ts`
- Create: `src/projects/blocks.ts`
- Create: `src/physics/shapes.ts`
- Create: `src/physics/tower-layout.ts`
- Create: `tests/blocks.test.ts`
- Create: `tests/tower-layout.test.ts`

**Interfaces:**
- Consumes: generated anchors with `data-project-slug`, `data-project-color`, and `data-project-shape` from Task 1.
- Produces: `BlockShape`, `BlockColor`, `BlockSpec`, `ViewportSpec`, `BlockPlacement`, `TowerLayout`; `collectBlockSpecs(root: HTMLElement): BlockSpec[]`; `createTowerLayout(blocks: BlockSpec[], viewport: ViewportSpec): TowerLayout`; `createBodyForShape(spec: BlockSpec, placement: BlockPlacement): Matter.Body`.

- [ ] **Step 1: Write failing block and tower tests**

Add tests named `collects_existing_anchors_without_replacing_them`, `expands_a_block_for_long_and_unbroken_titles`, `creates_the_same_layout_for_the_same_input`, `keeps_initial_aabbs_non_overlapping`, `uses_one_or_multiple_related_towers_by_count`, `grows_the_mobile_stage_for_36_projects`, `keeps_every_target_at_least_44_pixels`, and `places_roofs_only_on_upper_courses`.

Test 1, 6, 18, and 36 project arrays across 390×844, 1024×768, and 1440×900 viewports. Assert every slug appears exactly once and every placement lies inside the declared stage bounds.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm test -- tests/blocks.test.ts tests/tower-layout.test.ts`

Expected: FAIL because the block and layout modules do not exist.

- [ ] **Step 3: Implement shared types and block measurement**

Define discriminated unions for the six shapes and six colors. Implement `collectBlockSpecs` to preserve existing anchors, apply classes/custom properties, measure rendered title needs after fonts are ready, allow up to four wrapped lines, and return dimensions used by both CSS and physics.

- [ ] **Step 4: Implement deterministic course generation**

Implement `createTowerLayout` as a pure function. Use stable courses of supports/bridges, multiple tower groups when horizontal space permits, and vertical stage growth when minimum block dimensions would otherwise be violated. Return initial positions and angles without mutating inputs.

- [ ] **Step 5: Implement stable shape bodies**

Map bricks, squares, and beams to rectangles; roofs and half-rounds to convex vertex sets; arches to a three-rectangle compound body. Body dimensions must match `BlockSpec` bounds and favor stable collision over pixel-perfect concavity.

- [ ] **Step 6: Run the layout tests**

Run: `npm test -- tests/blocks.test.ts tests/tower-layout.test.ts`

Expected: all tests PASS for all counts and viewport classes.

- [ ] **Step 7: Commit the deterministic block system**

```bash
git add src/projects src/physics/shapes.ts src/physics/tower-layout.ts tests/blocks.test.ts tests/tower-layout.test.ts
git commit -m "feat: add deterministic block tower layouts"
```

### Task 3: Toymaker’s Assembly Mat visual surface and static fallback

**Files:**
- Create: `src/fonts.ts`
- Create: `src/styles.css`
- Modify: `index.html`
- Modify: `tests/blocks.test.ts`

**Interfaces:**
- Consumes: generated anchor classes/data and shape/color custom properties from Tasks 1–2.
- Produces: complete first viewport, static CSS tower fallback, responsive stage styling, focus/hover/held/moved states, and the exact homepage copy.

- [ ] **Step 1: Add failing DOM/style contract tests**

Add tests named `homepage_uses_exact_approved_copy`, `every_palette_token_matches_the_spec`, `project_region_has_an_accessible_name`, `focus_state_is_not_hover_dependent`, and `long_titles_have_wrap_not_truncation_rules`.

Assert the exact palette hex values, wordmark/author/instruction copy, `nav[aria-label="Projects"]`, no `text-overflow: ellipsis`, and the presence of `overflow-wrap: anywhere`.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm test -- tests/blocks.test.ts`

Expected: FAIL on missing approved copy and style tokens.

- [ ] **Step 3: Import local fonts and implement design tokens**

Import Archivo variable and IBM Plex Mono from local package files. Define the exact canvas, ink, six block colors, and graphite tokens; set the page to the warm assembly-mat ground with no generic gradient, glass, or card treatment.

- [ ] **Step 4: Implement the page shell and block material**

Place the compact wordmark/author upper-left, instruction lower-left, hidden-until-needed `Rebuild` lower-right, project region across the stage, and polite status region. Style shallow matte blocks with restrained grain/registration detail, readable printed labels, shape-specific geometry, and one rule per rest/focus/held/moved state.

- [ ] **Step 5: Implement static, responsive, and no-JavaScript states**

Before enhancement, use CSS grid/flex placement to display all anchors as a composed stack. Add desktop, tablet, and mobile rules with 44px minimum targets; make the stage vertically grow rather than reduce targets. Ensure the empty-state block is visually intentional.

- [ ] **Step 6: Run style-contract tests and a build**

Run: `npm test -- tests/blocks.test.ts && npm run build`

Expected: tests PASS; build emits local font assets and contains no remote font requests.

- [ ] **Step 7: Commit the visual surface**

```bash
git add index.html src/fonts.ts src/styles.css tests/blocks.test.ts
git commit -m "feat: create the toymaker portfolio surface"
```

### Task 4: Physics world and reliable click-versus-drag interaction

**Files:**
- Create: `src/physics/gesture.ts`
- Create: `src/physics/world.ts`
- Create: `tests/gesture.test.ts`
- Create: `tests/world.test.ts`
- Create: `tests/app.test.ts`

**Interfaces:**
- Consumes: `BlockSpec[]`, `TowerLayout`, and `createBodyForShape` from Task 2.
- Produces: `classifyGesture(origin: Point, current: Point, threshold: number): "click" | "drag"`; `createPhysicsWorld(options: PhysicsWorldOptions): PhysicsController`; `PhysicsController` methods `start()`, `rebuild(layout)`, `pause()`, `resume()`, `cancelActiveDrag()`, and `destroy()`; callbacks `onFirstMove` and `onSettled`.

- [ ] **Step 1: Write failing gesture and world tests**

Add tests named `movement_below_threshold_is_click`, `movement_at_or_above_threshold_is_drag`, `drag_release_suppresses_only_that_navigation`, `next_clean_click_is_not_suppressed`, `initial_bodies_are_dynamic_but_sleeping`, `world_has_reachable_side_and_floor_bounds`, `rebuild_cancels_an_active_constraint`, and `paused_world_stops_the_render_loop`.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm test -- tests/gesture.test.ts tests/world.test.ts tests/app.test.ts`

Expected: FAIL because gesture/world modules do not exist.

- [ ] **Step 3: Implement pointer gesture classification**

Use squared Euclidean distance and a device-scaled threshold supplied by the controller. Track each pointer sequence independently. Crossing the threshold permanently marks only that sequence as a drag and prevents its release from following the anchor.

- [ ] **Step 4: Implement the Matter.js world**

Create engine, runner, side/floor bounds, sleeping dynamic bodies, pointer constraint, and one requestAnimationFrame DOM-transform loop that stops when all bodies sleep. Map bodies to existing anchors; never draw project blocks on a canvas.

- [ ] **Step 5: Implement lifecycle safety**

`rebuild` must cancel the current constraint, clear velocities/angular velocities, place bodies from the new layout, sleep them, and update stage bounds. `pause` and `destroy` must release listeners and animation frames; `resume` must not duplicate them.

- [ ] **Step 6: Run the physics tests**

Run: `npm test -- tests/gesture.test.ts tests/world.test.ts tests/app.test.ts`

Expected: all gesture/world tests PASS, including drag-then-click navigation behavior and active-drag rebuild.

- [ ] **Step 7: Commit the physics engine**

```bash
git add src/physics/gesture.ts src/physics/world.ts tests/gesture.test.ts tests/world.test.ts tests/app.test.ts
git commit -m "feat: add tactile block physics interactions"
```

### Task 5: Page controller, responsive lifecycle, rebuild, and reduced motion

**Files:**
- Create: `src/app.ts`
- Create: `src/main.ts`
- Modify: `index.html`
- Modify: `src/styles.css`
- Modify: `tests/app.test.ts`

**Interfaces:**
- Consumes: block collection/layout and `PhysicsController` from Tasks 2–4.
- Produces: `createPocketApp(root: Document, options?: PocketAppOptions): PocketApp`; `PocketApp.rebuild({ animate: boolean }): void`; `PocketApp.destroy(): void`; complete browser lifecycle.

- [ ] **Step 1: Extend the failing app tests**

Add tests named `boots_by_enhancing_existing_anchors`, `does_not_boot_physics_for_empty_state`, `reveals_rebuild_after_first_displacement`, `rebuild_announces_tower_rebuilt`, `reduced_motion_keeps_static_clickable_links`, `visibility_change_pauses_and_resumes_once`, `minor_resize_preserves_positions_after_interaction`, and `major_breakpoint_resize_rebuilds_with_reachable_bounds`.

- [ ] **Step 2: Run app tests and verify the new cases fail**

Run: `npm test -- tests/app.test.ts`

Expected: FAIL because `createPocketApp` does not exist.

- [ ] **Step 3: Implement application boot and empty-state behavior**

Wait for `document.fonts.ready`, collect existing anchors, and exit cleanly when only the empty state exists. For projects, calculate viewport class/layout, enhance anchors, create the physics controller, and expose the page as ready without replacing DOM links.

- [ ] **Step 4: Implement rebuild and status behavior**

Reveal `Rebuild` only after meaningful movement. On activation, cancel active drag and recompute the layout. Use one short coordinated return animation only when motion is allowed, then announce `Tower rebuilt` through the polite status region.

- [ ] **Step 5: Implement environment lifecycle**

Pause on `document.hidden`; resume once when visible. Listen for reduced-motion changes. Debounce resize: preserve proportionally positioned bodies for minor same-class resizes after interaction, and rebuild for breakpoint changes or unsafe bounds.

- [ ] **Step 6: Run all tests and production build**

Run: `npm test && npm run build`

Expected: all tests PASS; strict TypeScript and Vite build succeed.

- [ ] **Step 7: Commit the integrated application**

```bash
git add src/app.ts src/main.ts index.html src/styles.css tests/app.test.ts
git commit -m "feat: integrate responsive portfolio lifecycle"
```

### Task 6: Real-project fixture verification, browser QA, and handoff documentation

**Files:**
- Create: `README.md`
- Modify: any implementation files required by bounded QA findings
- Test: `tests/fixtures/projects/*`

**Interfaces:**
- Consumes: the complete application from Tasks 1–5.
- Produces: verified build, user documentation, desktop/mobile evidence, and no production placeholder projects.

- [ ] **Step 1: Write README usage documentation**

Document installation, `npm run dev`, `npm run build`, the exact `public/projects/` filename/title requirement, all optional metadata values, deterministic defaults, output location, and how to remove/fix validation errors. Include one example HTML head without adding it to production.

- [ ] **Step 2: Verify fixture builds without polluting production**

Run the generator against `tests/fixtures/projects/` into a temporary generated-artifact directory, then run tests that assert every fixture href resolves to its copied HTML counterpart. Restore/regenerate the production zero-project artifacts afterward.

Expected: fixture manifest includes every test page; production `public/projects/` remains empty; the final homepage remains the honest empty state.

- [ ] **Step 3: Launch the local preview and capture one bounded QA round**

Run the Vite preview per the local-preview skill guidance. Inspect 1440×900 desktop and 390×844 mobile, plus reduced-motion mode. Capture `.impeccable/review/desktop.png` and `.impeccable/review/mobile.png` from the document top after fonts load and entrance motion settles.

- [ ] **Step 4: Exercise interactions with temporary fixture output**

Verify clean click navigation, drag suppression, the next clean click, keyboard focus/Enter, touch drag, rebuild, resize across a breakpoint, hidden/visible pause, and all links at 1, 6, 18, and 36 projects. Confirm no block can be stranded outside reachable bounds.

- [ ] **Step 5: Apply one batched correction pass and reconfirm once**

Fix every material issue from the desktop/mobile/reduced-motion inspection in one batch, rebuild once, and recapture only the same viewports. Do not begin an open-ended polish loop.

- [ ] **Step 6: Run the mechanical design detector**

Run:

```bash
/Users/zach/.agents/skills/impeccable/scripts/impeccable detect --json index.html src/styles.css src/app.ts src/main.ts src/projects src/physics
```

Expected: no unresolved mechanical violations; fix only objective findings before review.

- [ ] **Step 7: Run final verification**

Run: `npm test && npm run build && git status --short`

Expected: all tests PASS; production build succeeds with the zero-project empty state; only intentional documentation/review artifacts remain uncommitted before the final commit.

- [ ] **Step 8: Commit documentation and QA fixes**

```bash
git add README.md index.html src tests .impeccable/review
git commit -m "docs: document and verify the project block workflow"
```

## Plan Self-review

- **Spec coverage:** project discovery, static HTML, six shapes/colors, deterministic towers, physics, drag/click, rebuild, responsive growth, reduced motion, no-JavaScript fallback, empty state, browser support, performance lifecycle, accessibility, README, and bounded visual QA each map to a task.
- **Step scan:** every task has a failing-test step, a focused failure command, named interfaces, implementation actions, passing verification, and a commit.
- **Type consistency:** `BlockSpec`, `ViewportSpec`, `TowerLayout`, `PhysicsController`, and `PocketApp` names remain consistent across producer and consumer tasks.
- **Review Focus coverage:** invalid slugs/collisions map to Task 1; hostile titles to Tasks 1–3; drag navigation to Task 4; 36-project mobile reachability to Tasks 2/5; lifecycle races to Tasks 4/5.
- **Proportion:** implementation bodies remain with the implementer; the plan records only signatures, pinned values, test names/assertions, boundaries, and verification commands.
