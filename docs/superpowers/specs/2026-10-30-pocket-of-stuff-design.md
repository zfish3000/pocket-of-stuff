# Pocket of Stuff Portfolio — Design Specification

Date: 2026-10-30

## Latest user revision

The user's subsequent direction supersedes the material and scrolling rules below: block faces use flat color with no wood texture or drop shadow. The homepage cannot scroll. All project blocks and the physics floor stay inside the visible viewport; larger collections scale down to fit. Native link dragging is disabled, block dimensions remain rigid during rotation, and resizing rebuilds the bounds for the new screen dimensions.

## Intent

Build “Pocket of Stuff,” Zachary Fisher’s personal project portfolio, as a small playable object rather than a conventional card grid. Every project is a real 2D wooden block. The homepage opens with those blocks assembled into stable tower formations; visitors can click a block to open its project or drag it to disturb the construction and let the physics system take over.

The experience should be memorable enough to communicate personality while remaining dependable as a portfolio. The central product tension is therefore explicit: play must enrich browsing, never obscure or trap the projects.

## Goals

- Make the project collection itself the first-viewport experience.
- Render every project as a semantic, clickable HTML block controlled by real 2D physics.
- Start from intentional, stable tower formations rather than random piles.
- Let a visitor add a project by adding one HTML file and running the normal build.
- Distinguish clicks from drags reliably for mouse, touch, keyboard, and trackpad use.
- Keep the page responsive, accessible, and useful with reduced motion or unavailable JavaScript.
- Transform the supplied Monument Valley color inspiration into an original toymaker/workbench visual system rather than copying its architecture.

## Non-goals

- Redesigning the individual project pages. They remain standalone user-authored HTML files.
- Adding the profile and list buttons shown in the proof of concept.
- Building a content-management system, database, account system, or runtime directory service.
- Reproducing Monument Valley compositions, characters, impossible geometry, or level design.
- Supporting user-authored arbitrary collision geometry in the first version.
- Publishing or choosing a hosting provider during this implementation unless requested separately.

## Anti-goals

- A game that happens to hide portfolio links inside it.
- A standard portfolio grid decorated with a few floating blocks.
- Glossy 3D blocks, isometric architecture, glass effects, or imitation game screenshots.
- Physics that begins chaotically, never settles, flings blocks offscreen, or makes links hard to activate.
- A second manually maintained project manifest.
- Project labels that appear only on hover or become detached from their blocks.

## Confirmed Constraints

- Greenfield web project in an otherwise empty workspace.
- The main interaction is a 2D block tower with drag, gravity, and collisions.
- Each project is represented by one block and links to one HTML file.
- Projects are discovered at build time from a projects folder.
- The visual palette is inspired by the supplied Monument Valley references.
- The selected visual direction is “The Toymaker’s Assembly Mat.”
- The selected build path is code-first.

## Approaches Considered

### 1. Semantic HTML blocks driven by Matter.js — selected

Each project is a real anchor element. Matter.js owns body position, rotation, collision, gravity, sleeping, and pointer constraints; the render loop maps each body to its corresponding element with CSS transforms.

This keeps text crisp, links semantic, keyboard behavior normal, and the physics robust. It also allows the visual layer to remain ordinary HTML/CSS rather than a canvas-only game.

### 2. Canvas-rendered physics

Canvas would centralize drawing and physics, but links, focus, text selection, accessible names, and responsive typography would require a second hidden interface. That duplication is a bad trade for a portfolio.

### 3. Handwritten physics with CSS transforms

This minimizes dependencies but makes stable stacking, collision response, sleeping, and pointer constraints the bulk of the project. The likely result is more brittle and less tactile than the selected approach.

## Technical Foundation

- Vite
- Vanilla TypeScript
- Matter.js
- Semantic HTML and CSS custom properties
- Vitest for deterministic parser/layout utilities
- A small Vite-compatible Node script for project discovery

The project remains a static site. No server is required after build.

### Proposed structure

```text
/
  index.html
  package.json
  public/
    projects/
      *.html
  scripts/
    generate-project-manifest.mjs
  src/
    main.ts
    styles.css
    physics/
      world.ts
      tower-layout.ts
      shapes.ts
    projects/
      manifest.ts
      types.ts
    generated/
      projects.json
      project-blocks.html
  tests/
```

`public/projects/` is the user-facing “projects folder.” Vite copies it unchanged to `dist/projects/`. The discovery script runs before development and production builds and writes both `src/generated/projects.json` and a semantic `src/generated/project-blocks.html` partial. A Vite HTML transform injects that partial into `index.html`, so project anchors exist in the built document before JavaScript runs. TypeScript enhances those same anchors with physics rather than recreating them.

## Project Discovery Contract

The only required metadata is a non-empty HTML `<title>`. The filename becomes the stable slug and destination URL. Filenames must be lowercase ASCII kebab-case matching `[a-z0-9]+(?:-[a-z0-9]+)*.html`; invalid names fail the build with a rename example. This avoids ambiguous encoding, case collisions, and cross-platform URL differences.

Example:

```html
<!doctype html>
<html lang="en">
  <head>
    <title>Project Name</title>
    <meta name="description" content="Optional short description">
    <meta name="pocket:color" content="coral">
    <meta name="pocket:shape" content="arch">
    <meta name="pocket:order" content="20">
  </head>
  <body>...</body>
</html>
```

Optional `pocket:*` values provide control without creating a second data file:

- `pocket:color`: `coral`, `aqua`, `lilac`, `plum`, `amber`, or `powder`.
- `pocket:shape`: `brick`, `square`, `beam`, `arch`, `roof`, or `half-round`.
- `pocket:order`: finite number used before the filename sort.

If color or shape is omitted, the build derives it deterministically from the slug. Rebuilding does not reshuffle existing blocks. Unknown optional values produce an actionable build error naming the file and allowed values. A missing title is a build error. Nested directories are out of scope for the first version.

The generated manifest contains only escaped metadata and relative URLs. Project HTML is treated as trusted user-authored static content and is not injected into the homepage.

## Visual Direction: The Toymaker’s Assembly Mat

### World

The page is a quiet maker’s surface, not a stage set. Blocks read as shallow, matte wooden pieces with screen-printed color, tiny registration inconsistencies, and restrained grain. Project labels are printed directly onto their blocks. Sparse graphite marks at the page edges make the surface feel used and measured without becoming faux-vintage decoration.

### Palette

- Canvas: `#F7EBD2`
- Ink: `#2A2030`
- Coral: `#E36862`
- Aqua: `#58B9B2`
- Lilac: `#C6A5D2`
- Plum: `#634572`
- Amber: `#E6B84B`
- Powder: `#9AB7C1`
- Graphite: `#8B796B`

The colors borrow the references’ warm/cool tension but avoid their exact level palettes. Blocks use flat pigment, never glossy gradients.

### Typography

- Display and block labels: locally bundled Archivo variable, mostly heavy and condensed through width/tracking rather than novelty lettering.
- Instructions and utility copy: locally bundled IBM Plex Mono.
- Project titles remain readable at rest and through moderate rotation.

### First viewport

- The physics field fills the page from the first frame.
- A compact “POCKET OF STUFF” wordmark and “Zachary Fisher” sit at the upper-left edge, outside the tower’s collision area.
- One brief instruction—“Drag to rearrange · Click to open”—sits near the lower-left edge.
- A small textual `Rebuild` control sits at the lower-right edge after interaction begins; it is not styled as the discarded list/profile controls.
- One central tower or a balanced group of towers occupies most of the available area.
- No introductory hero paragraph, card grid, top navigation bar, fake device frame, or decorative isometric scenery.

### Raises retained from rejected directions

- **Arcade state law:** rest, hover/focus, held, moved, and navigating states each have one consistent rule.
- **Night-instrument damping:** blocks feel weighty and settle quickly; the system is never twitchy.
- **Kinetic-sand fallback:** reduced motion is a deliberately composed static tower, not a broken physics mode.
- **Provenance discipline:** labels remain attached to their objects at every angle.

## Block System

Each project anchor contains a visual block surface and accessible text. The visible geometry and Matter.js body share the same measured dimensions.

- `brick`: medium rectangle.
- `square`: square support block.
- `beam`: long shallow rectangle.
- `arch`: compound body with a visible central cutout; collision may use a stable three-rectangle compound rather than pixel-perfect concavity.
- `roof`: simple convex triangle or shallow trapezoid.
- `half-round`: convex approximation with a flat base.

Shape selection must prioritize stable towers over maximal variety. Beams and arches appear less frequently than bricks and squares; roofs and half-rounds are placed on upper courses where their instability is intentional.

Block labels use orientation-aware layouts and are never visually truncated. Narrow shapes may wrap; the default maximum is three lines at the minimum readable size. A title that still does not fit receives a larger brick or beam, up to a viewport-safe width, and may use a fourth line. Unbroken text uses `overflow-wrap: anywhere`. The measured rendered block determines its collision body before the world starts, so long names change tower geometry honestly instead of disappearing behind ellipses. A small stamped project number may be included, but no invented category or date is shown.

## Tower Generation

The tower layout is deterministic for a given ordered manifest and viewport class.

1. Classify the viewport into desktop-wide, desktop-narrow/tablet, or mobile.
2. Select course templates sized for the current block count and aspect ratio.
3. Place stable supports first, bridge them with beams, then place expressive roof/half-round pieces on top.
4. Use one tower for small collections and multiple related towers when that preserves readable blocks.
5. Expand the physics stage vertically when the collection cannot fit above the minimum block size; never hide projects or silently replace them with a list.

All bodies are created in their final positions as temporarily static. After the first paint, they become dynamic and are put to sleep. Gravity therefore does not disturb the designed composition, but the first grabbed body wakes through the pointer constraint and collisions wake its neighbors naturally.

The world has side walls and a floor outside the visible crop. Restitution stays low, friction moderate, air friction slight, and rotation damping strong enough to settle quickly. Bodies cannot be thrown beyond the reachable world.

## Interaction Model

### Click versus drag

- Record pointer-down position and time.
- Treat movement under a small device-scaled threshold as a click.
- Crossing the threshold converts the gesture into a drag and suppresses link navigation for that pointer sequence.
- Releasing a moved block never opens a project accidentally.
- A subsequent clean click on the moved block opens it normally.

The precise threshold is a builder decision validated on mouse and touch rather than a fixed design value.

### Dragging

- Pointer/touch drag uses a Matter.js mouse or pointer constraint with a centered but forgiving grab point.
- The held block rises visually through shadow/outline and z-index, without changing its physics size.
- Neighboring blocks wake through collisions.
- The browser does not scroll while actively dragging a block, but ordinary page scrolling remains available outside blocks.

### Opening

- Each block is an ordinary `<a href="/projects/slug.html">`.
- Keyboard Enter follows the link without requiring physics.
- Focus has a clear high-contrast outline and slightly raises the block surface without moving its body.
- Navigation is same-tab by default.

### Rebuild

After the first meaningful displacement, show the `Rebuild` control. Activating it disables pointer constraints, clears velocities, recomputes the current viewport’s tower layout, and returns blocks in one short coordinated motion. With reduced motion, it snaps directly to the static composition.

## Responsive Behavior

- Desktop favors vertical towers with deliberate negative space around the title and instructions.
- Tablet uses a slightly broader, lower composition to avoid tiny labels.
- Mobile uses shorter courses and may extend the stage below one viewport so every project retains a usable touch target.
- Minor resizes before interaction recompute the tower. After interaction, small resizes preserve proportional positions; crossing a major viewport class triggers a rebuild so bodies do not become trapped.
- CSS uses `svh`-safe sizing and respects browser UI on mobile.

The design targets a practical minimum block touch area of 44 by 44 CSS pixels and a readable label size. If count and width conflict, the stage grows instead of shrinking below those limits.

## Accessibility and Failure Modes

- The blocks live inside a named `<nav aria-label="Projects">` or equivalent project collection region.
- DOM order follows manifest order and remains meaningful when visual positions change.
- All projects remain keyboard reachable as normal anchors.
- `prefers-reduced-motion: reduce` disables live physics and rearrangement animation; the blocks remain clickable in their composed tower.
- A polite status message announces `Tower rebuilt` but does not narrate ongoing collisions.
- Focus indicators meet contrast requirements across all block colors.
- If JavaScript fails, the anchors render as a static, responsive block stack through CSS.
- If the projects folder is empty, show one non-link outline block reading “Add an HTML file to projects” plus the exact expected folder path. Do not invent projects.
- The page does not rely on hover to explain how to open projects.

## Performance

- Run one requestAnimationFrame loop only while the engine is active or bodies are not asleep.
- Pause the engine when the page is hidden.
- Use transforms rather than layout properties during motion.
- Avoid per-frame DOM measurement; dimensions are computed during layout/rebuild.
- Texture is lightweight CSS material, not a large image per block.
- The implementation should remain smooth for a normal personal portfolio. Automated tests cover at least 1, 6, 18, and 36 projects; the stage may grow for the largest case.

## Browser Support

- Current and previous major versions of Chrome, Firefox, Safari, and Edge.
- iOS/iPadOS Safari 16.4 and newer.
- Pointer, keyboard, and touch behavior are verified separately.
- Internet Explorer and obsolete embedded webviews are not supported.

## Content and Copy

Homepage copy is intentionally sparse:

- `POCKET OF STUFF`
- `Zachary Fisher`
- `Drag to rearrange · Click to open`
- `Rebuild` after interaction

No project descriptions appear on the homepage unless later requested. Titles printed directly on blocks are the browsing interface.

Because the repository contains no real projects, production code will not fabricate them. Parser and layout tests use fixtures outside `public/projects/`. The live homepage initially shows the honest empty-state block until Zach adds project HTML files.

## Verification

- Unit-test manifest parsing, validation, stable ordering, and deterministic defaults.
- Unit-test tower generation for supported counts and viewport classes, including overlap-free initial bounds.
- Unit-test click-versus-drag classification.
- Build successfully with zero projects and with test fixtures.
- Browser-check desktop and mobile layouts.
- Verify mouse drag, touch drag, clean click navigation, keyboard navigation, rebuild, resize, and reduced motion.
- Confirm every generated URL maps to the copied project HTML file.
- Run accessibility checks for landmarks, names, focus visibility, target size, and contrast.
- Inspect the final desktop and mobile renders against the selected Toymaker’s Assembly Mat direction.

## Decisions Left to the Builder

- Exact Matter.js friction, restitution, damping, sleep, and constraint values after tactile testing.
- Exact click-drag distance threshold after mouse and touch testing.
- Internal course-template data structures and deterministic hashing function.
- Whether the discovery script is a Vite plugin or a prebuild script, as long as `dev` and `build` both regenerate the manifest automatically.
- Minor typographic optical adjustments and texture implementation that stay inside the chosen visual direction.

## Risks and Counterpoints

- **The best interaction may be the weakest portfolio.** If visitors spend time breaking the tower but cannot scan titles, the concept has failed. Readable labels and direct links outrank elaborate collisions.
- **Arbitrary project counts fight authored composition.** The deterministic multi-tower/expanding-stage system is necessary; a single handcrafted tower template would make the promised one-file workflow misleading.
- **Concave shapes can destabilize physics.** Visual arches should use simple stable compound collision bodies, not perfect outlines.
- **A reset control is required even though it was not in the proof of concept.** Without it, the homepage degrades permanently during a visit.
- **No real projects means the shipped first view will be an empty state.** Invented showcase projects would make the site look fuller but would misrepresent Zach’s work, so the design explicitly refuses that shortcut.
