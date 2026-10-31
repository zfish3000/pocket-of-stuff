# Pocket of Stuff

Zachary Fisher’s project portfolio, built as a set of clickable wooden blocks that begin in stable towers and become draggable physics objects.

The homepage stays inside a fixed, non-scrolling viewport. Blocks use flat colors without textures or shadows and retain their dimensions while rotating. Larger collections scale down to fit; reduced motion preserves the tower without running physics.

Block faces show only their project number and dot. Project titles appear in a tooltip on hover or keyboard focus and remain available to screen readers.

The site uses Palette 1 throughout: charcoal `#232221`, red `#cb2f2c`, blue `#1b96ba`, yellow `#f1be43`, and pale white `#e2e9e9`.

## Start the site

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

The static site is written to `dist/`.

## Add a project

Add one standalone HTML file directly inside `public/projects/`, then run the development server or build again. The build discovers the file automatically; there is no separate project list to update.

Filenames must use lowercase ASCII kebab-case:

- `weather-radio.html` — valid
- `Weather Radio.html` — invalid; rename it to `weather-radio.html`

Every project needs a non-empty `<title>`. Everything else is optional:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Weather Radio</title>
    <meta name="description" content="A short optional description">
    <meta name="pocket:color" content="aqua">
    <meta name="pocket:shape" content="arch">
    <meta name="pocket:order" content="20">
  </head>
  <body>
    <!-- Your project page is entirely yours. -->
  </body>
</html>
```

### Optional metadata

- `pocket:color`: `coral`, `aqua`, `lilac`, `plum`, `amber`, or `powder`
- `pocket:shape`: `brick`, `square`, `beam`, `arch`, `roof`, or `half-round`
- `pocket:order`: any finite number; lower values appear first
- `description`: used as project metadata but not shown as detached hover text

When color or shape is omitted, it is selected deterministically from the filename. Rebuilding will not reshuffle existing projects.

## Fix a build error

The generator names the offending file and the accepted values. Correct the filename, add a `<title>`, or replace an unknown `pocket:*` value, then rerun `npm run build`.

An empty `public/projects/` folder is valid. The homepage then shows an honest “Add an HTML file to projects” block instead of invented work.

## Commands

- `npm run dev` — regenerate projects and start Vite
- `npm run build` — regenerate projects, type-check, and build `dist/`
- `npm test` — run the full Vitest suite
- `npm run generate:projects` — regenerate only the JSON and semantic HTML project artifacts
