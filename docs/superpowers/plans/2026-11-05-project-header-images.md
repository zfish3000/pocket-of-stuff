# Project Header Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional metadata-driven, full-bleed project header images whose URL is also available in generated project data.

**Architecture:** `pocket:header-image` remains the single source of truth. The manifest parser canonicalizes the URL for external consumers, while the shared project-page script creates one decorative image and toggles enhancement classes consumed by the shared stylesheet. Projects without the metadata retain the existing path.

**Tech Stack:** Static HTML, CSS, browser JavaScript, Node.js ESM, parse5, Vite, Vitest, jsdom.

**Spec:** `docs/superpowers/specs/2026-11-05-project-header-images-design.md`

## Global Constraints

- Only the title overlaps the hero image; the introduction remains on the solid project color.
- Keep the title left-aligned inside the centered `70ch` reading column.
- Existing projects without `pocket:header-image` must retain the current layout and generated fields.
- The header image is decorative and must use empty alternative text.
- Do not add focal-point, overlay, caption, or responsive-source metadata.
- Do not copy `/Users/zach/Downloads/reference.png` into the site.
- Add no dependencies.
- Preserve any unrelated worktree changes that appear during execution. Do not commit unless the user separately authorizes it.

## File Structure

- `scripts/project-manifest.mjs` — parse and canonicalize header-image metadata; expose it in generated objects and anchors.
- `tests/project-manifest.test.ts` — pin metadata URL normalization, omission, and safe anchor output.
- `public/project-page.js` — create and remove the optional decorative hero image.
- `public/project-page.css` — implement full-bleed image, title overlap, back-link treatment, and responsive structure.
- `tests/project-page.test.ts` — pin DOM enhancement, unchanged no-image behavior, CSS contract, and failure fallback.
- `templates/project.html` — show the optional metadata without enabling a broken default image.
- `README.md` and `docs/PROJECT-GUIDE.md` — document authoring and generated-data access.

## Review Focus

- A project-relative path must resolve relative to `/projects/<filename>`, not the homepage; Task 1 tests this.
- Root-relative and absolute HTTPS URLs must not be rewritten incorrectly; Task 1 tests both.
- HTML-significant characters in the generated data attribute must be escaped; Task 1 tests this.
- A failed hero image must remove both the image and enhanced layout classes; Task 2 tests this.
- Missing metadata must not create image markup or enhanced layout classes; Task 2 tests this.

---

### Task 1: Generated header-image metadata

**Files:**
- Modify: `scripts/project-manifest.mjs:47-126`
- Modify: `tests/project-manifest.test.ts:18-104`

**Interfaces:**
- Consumes: `<meta name="pocket:header-image" content="...">` and the project filename.
- Produces: optional `headerImage: string` on `parseProjectDocument()` results and optional `data-project-header-image` on `renderProjectAnchors()` output.

- [ ] **Step 1: Write failing parser tests**

Extend `parses_required_and_optional_metadata` with `./assets/alpha/header.jpg` and expect:

```ts
headerImage: '/projects/assets/alpha/header.jpg'
```

Add `normalizes_header_image_urls_for_external_consumers` covering these literal results:

```ts
['/images/hero.jpg', '/images/hero.jpg']
['https://cdn.example/hero.jpg', 'https://cdn.example/hero.jpg']
['', undefined]
```

- [ ] **Step 2: Write the failing generated-anchor test**

Construct a project whose image URL contains `&` and assert the rendered anchor contains `data-project-header-image="...&amp;..."`. Also assert a project without metadata does not contain `data-project-header-image`.

- [ ] **Step 3: Run the focused tests and verify RED**

Run: `npm test -- tests/project-manifest.test.ts`

Expected: FAIL because `headerImage` and `data-project-header-image` are absent.

- [ ] **Step 4: Implement URL normalization and object output**

Add an internal helper with this contract:

```js
function projectAssetUrl(value, filename) // string | undefined
```

Return `undefined` for empty input. Preserve root-relative and absolute URLs. Resolve other values against `/projects/${filename}` with the platform-independent URL API. Add the optional field to the parsed object.

- [ ] **Step 5: Implement safe anchor output**

In `renderProjectAnchors(projects)`, append `data-project-header-image` only when `project.headerImage` exists. Pass the value through `escapeHtml()`.

- [ ] **Step 6: Run the focused tests and verify GREEN**

Run: `npm test -- tests/project-manifest.test.ts`

Expected: all tests in the file pass.

- [ ] **Step 7: Review the task diff**

Run: `git diff --check && git diff -- scripts/project-manifest.mjs tests/project-manifest.test.ts`

Expected: no whitespace errors and no unrelated changes.

---

### Task 2: Project-page hero lifecycle

**Files:**
- Modify: `public/project-page.js:1-69`
- Modify: `tests/project-page.test.ts:17-107`

**Interfaces:**
- Consumes: `meta[name="pocket:header-image"]` and `.project-header`.
- Produces: `.project-header-image`, `.project-header--with-image`, and `html.project-has-header-image` while the image remains valid.

- [ ] **Step 1: Add test metadata injection**

Extend the test-only `openProject()` helper to accept an optional `headerImage` argument and insert this tag into the parsed template head:

```html
<meta name="pocket:header-image" content="./assets/example/header.jpg">
```

- [ ] **Step 2: Write the failing enhancement test**

Add `header_image_metadata_creates_one_decorative_eager_hero`. Assert:

```ts
expect(header.querySelectorAll('.project-header-image')).toHaveLength(1);
expect(image.getAttribute('src')).toBe('./assets/example/header.jpg');
expect(image.getAttribute('alt')).toBe('');
expect(image.getAttribute('aria-hidden')).toBe('true');
expect(image.loading).toBe('eager');
expect(image.decoding).toBe('async');
expect(header.classList).toContain('project-header--with-image');
expect(document.documentElement.classList).toContain('project-has-header-image');
```

- [ ] **Step 3: Write failing fallback and omission tests**

Add `failed_header_image_restores_the_plain_header`: dispatch `error` on the created image, then assert the image and both enhancement classes are gone.

Add `missing_header_image_keeps_the_plain_header`: open a page without the metadata and assert no image or enhancement class exists.

- [ ] **Step 4: Run the focused tests and verify RED**

Run: `npm test -- tests/project-page.test.ts`

Expected: FAIL because no hero image is created.

- [ ] **Step 5: Implement the minimal hero lifecycle**

Inside the existing IIFE, add an internal function:

```js
function prepareHeaderImage() // HTMLImageElement | undefined
```

Read and trim the metadata. Return early when it is empty or `.project-header` is absent. Create the image with the tested attributes, set `fetchPriority = 'high'`, prepend it to the header, and add both enhancement classes. Register a one-shot `error` handler that removes the node and both classes. Call the function after the body exists and before the reveal starts.

- [ ] **Step 6: Run the focused tests and verify GREEN**

Run: `npm test -- tests/project-page.test.ts`

Expected: all tests in the file pass.

- [ ] **Step 7: Review the task diff**

Run: `git diff --check && git diff -- public/project-page.js tests/project-page.test.ts`

Expected: no whitespace errors and no unrelated behavior changes.

---

### Task 3: Full-bleed title-overlap layout

**Files:**
- Modify: `public/project-page.css:20-82`
- Modify: `tests/project-page.test.ts`

**Interfaces:**
- Consumes: the classes and image element produced by Task 2.
- Produces: responsive full-bleed hero layout with title-only overlap and plain-header fallback.

- [ ] **Step 1: Write failing CSS contract tests**

Open a project with header metadata and assert computed styles pin the behavior:

```ts
expect(getComputedStyle(image).objectFit).toBe('cover');
expect(getComputedStyle(image).width).toBe('100vw');
expect(getComputedStyle(title).textAlign).not.toBe('center');
expect(getComputedStyle(intro).position).not.toBe('absolute');
```

Keep the existing centered-column assertions. Open a page without metadata and assert its header retains the current block margins.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- tests/project-page.test.ts`

Expected: FAIL because the image has no hero layout.

- [ ] **Step 3: Implement the spatial model**

In `public/project-page.css`:

- clip horizontal overflow caused by the full-bleed element;
- remove top page padding only under `html.project-has-header-image`;
- position the back link over the hero with an opaque `--project-color` rectangular backing;
- make `.project-header-image` `display: block`, `width: 100vw`, `max-width: none`, `height: clamp(18rem, 50svh, 38rem)`, and `object-fit: cover`;
- center the full-bleed image with `margin-inline: calc(50% - 50vw)`;
- remove the enhanced header’s top margin;
- overlap only its `h1` across the image boundary with a negative block-start margin;
- leave `.project-intro` in normal flow;
- preserve the existing mobile media behavior and tune only the overlap measurement if the mobile render requires it.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `npm test -- tests/project-page.test.ts`

Expected: all tests in the file pass.

- [ ] **Step 5: Run bounded desktop and mobile visual checks**

Use the running local site server. Start a temporary read-only asset server with:

```bash
python3 -m http.server 8765 --directory /Users/zach/Downloads
```

In a browser-only DOM setup, apply the enhancement classes and set the image source to `http://127.0.0.1:8765/reference.png`. Do not copy it into the repository. Inspect one desktop viewport and one mobile viewport together. Confirm:

- the image touches the top and side viewport edges;
- only the title crosses the lower image edge;
- title and intro remain left-aligned in the centered reading column;
- the back link stays readable and keyboard reachable;
- no horizontal scrolling appears;
- the mobile crop remains intentional.

Apply at most one correction batch, then one confirmation pass.

- [ ] **Step 6: Review the task diff**

Run: `git diff --check && git diff -- public/project-page.css tests/project-page.test.ts`

Expected: no whitespace errors and only the header-image layout changes.

---

### Task 4: Authoring contract and generated artifacts

**Files:**
- Modify: `templates/project.html:12-23`
- Modify: `README.md:39-75`
- Modify: `docs/PROJECT-GUIDE.md:45-141`
- Regenerate: `src/generated/projects.json`
- Regenerate: `src/generated/project-blocks.html`

**Interfaces:**
- Consumes: the metadata and generated field from Tasks 1–3.
- Produces: an author-facing example and current generated artifacts.

- [ ] **Step 1: Add a safe template example**

Add a commented optional example so copying the template does not request a nonexistent image:

```html
<!-- Optional: <meta name="pocket:header-image" content="./assets/my-project/header.jpg"> -->
```

- [ ] **Step 2: Document header-image authoring**

In `README.md` and `docs/PROJECT-GUIDE.md`, document:

- the exact metadata name;
- project-relative asset paths;
- centered `object-fit: cover` cropping;
- decorative-image semantics;
- failure and omission behavior;
- `headerImage` in `src/generated/projects.json`;
- `data-project-header-image` on generated project anchors;
- the fact that the homepage does not display the image yet.

- [ ] **Step 3: Regenerate real project artifacts**

Run: `npm run generate:projects`

Expected: `Generated 9 project blocks.` Existing projects produce no header-image fields because none declares the metadata.

- [ ] **Step 4: Pin randomizer preservation and run documentation-adjacent tests**

Add `pocket:header-image` to the existing randomizer fixture and assert that the exact tag remains after color and shape randomization.

Run: `npm test -- tests/project-manifest.test.ts tests/project-page.test.ts tests/randomize-projects.test.js`

Expected: all selected tests pass, and randomization still preserves unrelated metadata.

- [ ] **Step 5: Review the task diff**

Run: `git diff --check && git diff -- templates/project.html README.md docs/PROJECT-GUIDE.md src/generated/projects.json src/generated/project-blocks.html`

Expected: no broken example paths and no unrelated generated changes.

---

### Task 5: Whole-feature verification

**Files:**
- Verify all modified files.

**Interfaces:**
- Consumes: completed Tasks 1–4.
- Produces: evidence that metadata, rendering, fallback, docs, and build work together.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 3: Run the required Impeccable detector once**

Run:

```bash
/Users/zach/.agents/skills/impeccable/scripts/impeccable detect --json public/project-page.css public/project-page.js templates/project.html
```

Expected: no unexplained layout, accessibility, overflow, or design-system findings.

- [ ] **Step 4: Confirm localhost still serves the project pages**

Run: `curl -I http://127.0.0.1:5173/projects/this-website.html`

Expected: `HTTP/1.1 200 OK`.

- [ ] **Step 5: Audit the final diff and worktree**

Run: `git diff --check && git status --short && git diff --stat`

Expected: no whitespace errors. Separate any unrelated worktree changes from this feature in the final report.
