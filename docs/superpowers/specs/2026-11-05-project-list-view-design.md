# Project List View Design

## Intent

Add a second homepage view that makes every project title immediately scannable while preserving the existing toy-block identity. Visitors switch between the current physics collection and a vertically scrollable list using a small control in the upper-right corner.

## Goals

- Reuse the existing project links, order, metadata, colors, grain, typography, outlines, corner radii, numbers, and dots.
- Render each list item as a full-width colored bar with its project title and a decorative silhouette of its assigned block shape on the left.
- Keep the site mark and view control fixed while the list region scrolls.
- Pause physics and disable dragging and hover tooltips in list mode.
- Restore the collection view without losing the current block arrangement.
- Keep the toggle keyboard accessible and announce its state.
- Make list titles readable without truncation on narrow screens.

## Non-goals

- No new project metadata or manually maintained list.
- No separate page or duplicated project links.
- No sorting, filtering, or persistent view preference.
- No redesign of project pages.

## Anti-goals

- Do not shrink nine bars to fit one fixed viewport.
- Do not copy the reference composition literally.
- Do not allow physics transforms, drag cursors, or tooltips to leak into list mode.
- Do not rebuild the tower merely because the visitor inspected the list.

## Constraints

- The homepage currently uses one anchor per project and Matter.js owns each anchor's transform in collection mode.
- The document currently prevents page scrolling. List mode must create its own bounded scroll region.
- Arch, roof, and half-round blocks use generated SVG outlines; rectangular shapes use CSS geometry.
- Existing untracked design and plan documents belong to the user and must remain untouched.

## Approaches

1. **Morph the existing links — selected.** A view-state class restyles the same anchors as bars. This preserves one semantic project list, navigation behavior, and generated content. Decorative silhouette elements are added during enhancement.
2. **Duplicate list markup.** Styling would be isolated, but duplicate links create synchronization, focus, and accessibility risks.
3. **Create a separate list route.** This gives clean page-level separation but makes switching slower and loses the playful continuity of one homepage.

## Interaction and Layout

- The default load remains the collection view, preserving the portfolio's first impression.
- A compact top-right button uses a clear list/grid icon plus an accessible label. Its icon and label update to describe the view it will open.
- Entering list mode pauses physics but leaves body positions intact.
- The project region becomes a vertical scroller below the site mark. Bars use responsive height and spacing, with generous desktop silhouettes and compact mobile silhouettes.
- Each bar keeps its existing background color and deterministic two-tone grain. The number stays at the upper-left and the dot at the upper-right.
- A block-shaped cutout or silhouette occupies the left section. The project title sits to its right in the existing Archivo family and heavy condensed treatment.
- Focus states remain stronger than hover states. Reduced-motion mode switches instantly; otherwise, view changes use a short opacity/position transition.
- Returning to collection mode removes list presentation, resumes physics when appropriate, and preserves the current arrangement.
- Reloading returns to collection mode; view preference is not persisted.

## Verification

- Add lifecycle tests for entering list mode, pausing physics, returning to collection mode, preserving the physics instance, accessible control state, and cleanup.
- Add surface tests for one semantic set of project links, visible list titles, scroll containment, and responsive list rules.
- Run the full Vitest suite and production build.
- Inspect desktop and mobile layouts in a browser.

## Builder Calls

- Use the existing links instead of creating a second project list.
- Keep the toggle fixed beside the site mark rather than adding another footer control.
- Default to collection view on every fresh load.
- Allow title wrapping instead of ellipsis.
