# Project List View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a scrollable project-bar view that shares content and visual tokens with the existing physics-block view.

**Architecture:** Keep one set of project anchors and switch presentation through a `data-project-view` state on the shell. A small view controller pauses or resumes the existing physics instance, updates the toggle's accessible state, and leaves Matter.js body positions intact. Enhancement adds one decorative shape preview per link; CSS owns the list layout and reuses each block's existing color and grain variables.

**Tech Stack:** TypeScript, CSS, semantic HTML, Matter.js, Vitest, jsdom, Vite.

**Spec:** `docs/superpowers/specs/2026-11-05-project-list-view-design.md`

## Global Constraints

- Reuse the existing project anchors; do not create a second project list.
- Keep collection view as the fresh-load default and do not persist view preference.
- Keep the site mark and view toggle fixed while only the project region scrolls.
- Preserve project order, links, colors, grain, numbers, dots, fonts, outlines, and corner radii.
- Pause physics in list view and restore the same physics instance and block arrangement on return.
- Disable dragging and hover tooltips in list view.
- Wrap titles without ellipsis.
- Preserve reduced-motion behavior and keyboard navigation.
- Do not modify the user's unrelated untracked design or plan files.

## Review Focus

- Switching before the entrance reveal finishes must not start physics behind list view; Task 1 tests this state.
- Repeated list/collection toggles must not create a second physics world or duplicate shape previews; Tasks 1 and 2 test idempotence.
- Reduced-motion visitors must keep a static tower in collection view and a usable list without starting physics; Task 1 tests this transition.
- Empty project collections must keep the control harmless and avoid a false list announcement; Task 1 tests the empty state.
- Narrow and short screens must scroll the list without clipping wrapped titles or moving the fixed control; Task 3 verifies responsive CSS and browser layouts.

---

### Task 1: View State and Physics Lifecycle

**Files:**
- Modify: `index.html`
- Modify: `src/app.ts`
- Modify: `tests/app.test.ts`

**Interfaces:**
- Consumes: existing `PhysicsController.start()`, `pause()`, `resume()`, and `destroy()` behavior.
- Produces: `ProjectView = 'collection' | 'list'`, `PocketApp.view`, and `PocketApp.setView(view: ProjectView): void` for state changes and tests.

- [ ] **Step 1: Add failing lifecycle tests**

Add tests named:

- `switches_to_list_view_and_pauses_the_existing_physics_world`
- `returns_to_collection_view_with_the_same_physics_world`
- `toggle_updates_aria_pressed_label_and_live_status`
- `list_selected_before_reveal_completion_does_not_start_physics`
- `reduced_motion_toggle_never_starts_physics`
- `empty_state_toggle_is_harmless`
- `destroy_removes_view_toggle_listener`

Assert shell state, `app.view`, physics identity and running state, button copy and `aria-pressed`, and status text.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- tests/app.test.ts`

Expected: FAIL because `PocketApp.setView`, `PocketApp.view`, and `.view-control` do not exist.

- [ ] **Step 3: Add the semantic toggle control**

Add one `<button class="view-control" type="button" aria-pressed="false" aria-label="Show project list">` to `index.html`. Include decorative grid/list icon spans with `aria-hidden="true"`; keep all accessible copy on the button.

- [ ] **Step 4: Implement view state in `src/app.ts`**

Add `export type ProjectView = 'collection' | 'list'`. Extend `PocketApp` with `readonly view: ProjectView` and `setView(view: ProjectView): void`. The setter updates `data-project-view`, button state and label, live status, tooltip visibility, and physics running state. `startRebuiltPhysics()`, `finishEntrance()`, visibility handling, resize handling, motion preference changes, and `destroy()` must respect the selected view.

- [ ] **Step 5: Run the focused tests and verify success**

Run: `npm test -- tests/app.test.ts`

Expected: all `tests/app.test.ts` tests PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add index.html src/app.ts tests/app.test.ts
git commit -m "feat: add project view state"
```

### Task 2: Decorative Block Silhouettes

**Files:**
- Create: `src/projects/shape-preview.ts`
- Modify: `src/projects/blocks.ts`
- Modify: `tests/blocks.test.ts`

**Interfaces:**
- Consumes: `BlockShape` and each enhanced anchor's `data-project-shape`.
- Produces: `attachShapePreview(element: HTMLAnchorElement, shape: BlockShape): HTMLElement`, creating one `.project-block__preview` with an inline SVG silhouette and returning an existing preview on repeated calls.

- [ ] **Step 1: Add failing shape-preview tests**

Add tests named:

- `adds_one_decorative_shape_preview_to_each_project`
- `shape_preview_uses_the_assigned_shape`
- `shape_preview_enhancement_is_idempotent`
- `shape_preview_is_hidden_from_assistive_technology`

Cover all six `BlockShape` values and assert exactly one preview per anchor, matching `data-shape`, SVG geometry, and `aria-hidden="true"`.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- tests/blocks.test.ts`

Expected: FAIL because `.project-block__preview` and `attachShapePreview` do not exist.

- [ ] **Step 3: Implement `attachShapePreview`**

Create `src/projects/shape-preview.ts`. Use a normalized `viewBox="0 0 160 96"` and one SVG path per block shape. Keep geometry original to this project and compatible with CSS `currentColor` fills and strokes.

- [ ] **Step 4: Attach previews during block collection**

Call `attachShapePreview(element, shape)` once in `collectBlockSpecs()` after validating shape metadata. Do not change title sizing, block identity, hrefs, or existing outline generation.

- [ ] **Step 5: Run the focused tests and verify success**

Run: `npm test -- tests/blocks.test.ts`

Expected: all `tests/blocks.test.ts` tests PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/projects/shape-preview.ts src/projects/blocks.ts tests/blocks.test.ts
git commit -m "feat: add project shape previews"
```

### Task 3: Scrollable Bar Presentation

**Files:**
- Modify: `src/styles.css`
- Modify: `tests/blocks.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: `.pocket-shell[data-project-view="list"]`, `.view-control`, and `.project-block__preview` from Tasks 1 and 2.
- Produces: responsive collection/list presentation using existing custom properties and no new runtime API.

- [ ] **Step 1: Add failing CSS contract tests**

Add tests named:

- `list_view_is_a_bounded_vertical_scroller`
- `list_bars_reuse_block_color_grain_and_corner_tokens`
- `list_view_titles_are_visible_and_wrap_without_ellipsis`
- `list_view_resets_physics_transforms_and_drag_affordances`
- `view_control_is_fixed_in_the_top_right`
- `mobile_list_keeps_readable_bar_and_preview_sizes`

Assert explicit selectors and computed style where jsdom supports it. Assert no `text-overflow: ellipsis` or line clamp in list-title rules.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/blocks.test.ts`

Expected: FAIL because list-view selectors and `.view-control` rules do not exist.

- [ ] **Step 3: Style the fixed view control**

Match existing `--canvas`, `--ink`, 1 px outlines, and `0.62rem` corner radius. Place it at the upper-right with a 44 px minimum hit target, visible focus state, and CSS-drawn grid/list icons.

- [ ] **Step 4: Style the scroll region and bars**

In list mode, change `.project-stage` to a bounded vertical scroller below the header. Restyle anchors as full-width bars using `--block-color`, `--block-light`, and the existing deterministic grain element. Override inline width, height, transform, clip-path, physics positioning, cursor, and touch-action with state-scoped rules. Show the existing title, preserve number and dot positions, and place the decorative silhouette on the left.

- [ ] **Step 5: Add responsive and reduced-motion rules**

Use desktop bar heights near the reference without forcing all projects onscreen. Reduce bar and preview dimensions below `42rem`, preserve a 44 px control target, allow multiline titles, and remove view-transition movement under `prefers-reduced-motion: reduce`.

- [ ] **Step 6: Update the README behavior summary**

Document the list toggle, scroll behavior, visible titles, physics pause/resume, and fresh-load collection default.

- [ ] **Step 7: Run focused tests and verify success**

Run: `npm test -- tests/blocks.test.ts`

Expected: all `tests/blocks.test.ts` tests PASS.

- [ ] **Step 8: Commit Task 3**

```bash
git add src/styles.css tests/blocks.test.ts README.md
git commit -m "feat: style scrollable project list"
```

### Task 4: Integration Verification

**Files:**
- Modify if needed: files from Tasks 1–3 only.

**Interfaces:**
- Consumes: completed list-view feature.
- Produces: verified build with no new interface.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: project generation, TypeScript checking, and Vite build all succeed.

- [ ] **Step 3: Inspect desktop behavior in a browser**

At approximately `1440 × 900`, verify the list visually matches the collection system, title wrapping is clean, every silhouette matches its block, scrolling is contained, the toggle remains fixed, and returning to collection preserves the arrangement.

- [ ] **Step 4: Inspect mobile behavior in a browser**

At approximately `390 × 844`, verify the toggle does not overlap the site mark, bars remain readable, titles wrap, scrolling reaches the final project, focus states are visible, and no horizontal overflow appears.

- [ ] **Step 5: Verify reduced motion and keyboard navigation**

Confirm list switching is instant under reduced motion, every project and the toggle are reachable by keyboard, Enter activates them, and focus never lands on decorative previews.

- [ ] **Step 6: Review the final diff for scope**

Run: `git diff --check && git status --short`

Expected: no whitespace errors and only planned files plus pre-existing user files appear.

- [ ] **Step 7: Commit verification fixes if any**

```bash
git add index.html src/app.ts src/projects/shape-preview.ts src/projects/blocks.ts src/styles.css tests/app.test.ts tests/blocks.test.ts README.md
git commit -m "fix: polish project list integration"
```
