# Pocket of Stuff

Zachary Fisher’s project portfolio, built as a set of clickable wooden blocks that begin in stable towers and become draggable physics objects.

The homepage stays inside a fixed, non-scrolling viewport. Blocks use two-tone dithered gradients without shadows and retain their dimensions while rotating. Each project has a stable random grain pattern and angle. Larger collections scale down to fit; reduced motion preserves the tower without running physics.

Block sizes respond to both project count and viewport space: small collections use larger pieces, and larger collections use smaller pieces. The layout preserves aspect ratios, fits within the screen, and updates collision bodies to match.

Block grain is rendered at 4× resolution for a fine texture, with a subtler high-resolution version across the background. Block textures are reused during motion and regenerated only when enlarged layouts need more resolution; the background refreshes only after a viewport resize.

Block faces show only their project number and dot. Project titles appear in a tooltip on hover or keyboard focus and remain available to screen readers.

The site uses Palette 1 throughout: charcoal `#232221`, red `#cb2f2c`, blue `#1b96ba`, yellow `#f1be43`, and pale white `#e2e9e9`.

Project blocks use only red, blue, and yellow (plus their slightly lighter grain shade). The legacy metadata names map to those three colors: `coral`/`plum` → red, `aqua`/`powder` → blue, and `lilac`/`amber` → yellow.

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

## Deploy to GitHub Pages

In the repository's **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**. Commit and push the deployment workflow to `main`. It installs dependencies, runs tests, generates the blocks, builds the site, and publishes only `dist/`.

The deployment targets the custom domain `pocketofstuff.com`, with its domain file kept in `public/CNAME` so it is included in the build. The default Vite base `/` is correct for this custom domain.

Do not deploy the repository root directly using the branch-based Pages option. The source homepage contains a placeholder for generated project links and references TypeScript; it needs the Vite build step before publishing. A successful source upload can therefore show the heading with no blocks.

After changing project content, push the updated project files to `main`; GitHub Actions rebuilds and deploys them automatically. You do not need to commit `dist/`. Check the repository's **Actions** tab for the deployment result.

## Add a project

For a step-by-step walkthrough, see [the project page guide](docs/PROJECT-GUIDE.md). A copyable starter lives in [templates/project.html](templates/project.html).

The starter matches its page background to the block color, uses a large title, and includes left, right, and full-width image examples. Its shared styles and theme script live in `public/project-page.css` and `public/project-page.js`.

Add one standalone HTML file directly inside `public/projects/`, then run the development server or build again. The build discovers the file automatically; there is no separate project list to update.

If the development server is already running, run `npm run generate:projects` and refresh the homepage after adding a file or changing its metadata. The on-screen Rebuild button only restacks blocks; it does not scan the folder.

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

- `npm run randomize:projects` — rewrite project shape/color metadata with a balanced random mix, then regenerate blocks; refresh the homepage afterward
- `npm run dev` — regenerate projects and start Vite
- `npm run build` — regenerate projects, type-check, and build `dist/`
- `npm test` — run the full Vitest suite
- `npm run generate:projects` — regenerate only the JSON and semantic HTML project artifacts
