# Project Header Images

## Intent

Project pages may optionally lead with a full-viewport-width image. The image sits at the top of the page, and the project title crosses its lower edge. The introduction remains below the image on the project color. The image must also be available to code outside the project page through the same generated metadata path used for block color and shape.

The supplied `reference.png` guides composition only. It is not a site asset and will not be copied into the project.

## Goals

- Let an author add one optional metadata value to a project HTML file.
- Render that image as a full-bleed hero without duplicating the image URL in page markup.
- Keep the title in the centered reading column and left-align its text.
- Expose the canonical image URL in `src/generated/projects.json` and on the generated homepage project anchor.
- Preserve the existing layout exactly when a project has no header image.
- Keep the layout stable and usable across desktop, mobile, keyboard navigation, and reduced motion.

## Non-goals

- The homepage will not display project images yet.
- This change will not add image-position, focal-point, overlay, caption, or responsive-source metadata.
- Header images are decorative. Meaningful images still belong in page content with useful alternative text.
- Existing project files will not receive a header image automatically.

## Anti-goals

- Do not require authors to repeat the image path in both metadata and body markup.
- Do not center-align title text or place the introduction over a busy image.
- Do not copy the reference composition, imagery, or typography literally.
- Do not add a generic dark gradient over every image to compensate for uncontrolled contrast.

## Selected approach

Use one metadata value as the source of truth:

```html
<meta name="pocket:header-image" content="./assets/my-project/header.jpg">
```

`project-page.js` reads the value and creates an eager, decorative `<img>` in `.project-header`. The shared stylesheet makes the image full bleed and places the title across its lower boundary. The fixed responsive hero height prevents layout shift. If the image cannot load, the script removes the enhanced state and returns to the existing image-free header.

The manifest parser reads the same metadata. It resolves project-relative local paths against `/projects/<project-file>` so external consumers receive a page-independent URL. Root-relative and absolute URLs remain usable. The generated project object includes `headerImage`, and the homepage anchor includes `data-project-header-image` when present.

## Layout and behavior

- The hero touches the top and both sides of the viewport.
- The image uses `object-fit: cover` and a centered crop.
- The image height is responsive, roughly half a viewport on wide screens with sensible minimum and maximum bounds.
- The existing back link stays in the upper-left and receives an opaque project-color backing when it overlays the hero.
- The title remains left-aligned inside the same centered `70ch` reading column as text sections.
- The title overlaps the image’s lower boundary; the introduction follows below on the solid project color.
- Narrow screens retain the same reading order: back link, decorative image, title, introduction, body.
- The created image uses `alt=""`, `aria-hidden="true"`, eager loading, asynchronous decoding, and high fetch priority.
- Reduced-motion behavior does not change. The existing reveal may still run, but the hero adds no independent motion.

## Metadata contract

- Metadata name: `pocket:header-image`.
- Omitted or empty metadata means no hero and no generated `headerImage` field.
- A relative path such as `./assets/my-project/header.jpg` becomes `/projects/assets/my-project/header.jpg` in generated outputs.
- A root-relative path such as `/images/header.jpg` remains `/images/header.jpg`.
- An absolute `https:` URL remains absolute.
- The generated homepage attribute is HTML-escaped.
- The first implementation will not verify that the target file exists because absolute URLs and build-time test fixtures may not be locally resolvable.

## Failure handling

- A missing or failed image falls back to the current project header instead of showing a broken-image icon.
- Unrelated metadata, page content, block behavior, and project ordering remain unchanged.
- Existing pages without `pocket:header-image` remain byte-for-byte compatible in generated data except for normal regeneration formatting.

## Documentation and verification

- Update the project template with a commented optional metadata example.
- Update `README.md` and `docs/PROJECT-GUIDE.md` with the metadata contract and asset-path example.
- Add parser and generated-anchor regression tests for canonical URLs and escaping.
- Add project-page tests for hero creation, title-only overlap state, and load-error fallback.
- Run the focused tests, full test suite, production build, Impeccable detector, and bounded desktop/mobile visual checks.

## Approaches considered

1. **Metadata-driven `<img>` creation — selected.** One source of truth, direct manifest access, useful browser image controls, and clean fallback.
2. **Explicit `<img>` plus metadata.** Better without JavaScript, but duplicates the URL and permits page/manifest drift.
3. **CSS background from metadata.** Less markup, but weaker loading controls, more awkward URL handling, and poorer future support for responsive images.

## Builder discretion

- Choose exact responsive height clamps and overlap measurements after inspecting desktop and mobile renders.
- Choose the smallest internal helper structure needed to normalize local image URLs.
- Preserve the existing visual language and spacing scale while making optical corrections.
