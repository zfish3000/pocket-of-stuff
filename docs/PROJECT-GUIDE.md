# Adding projects to Pocket of Stuff

Each HTML file directly inside `public/projects/` becomes one clickable block on the homepage. The HTML file is also the project page that opens when someone clicks the block. You do not need to edit the homepage or maintain a separate project list.

## 1. Open the project folder

Open Terminal and run:

```bash
cd /Users/zach/Documents/Development/pocket-of-stuff
```

Run all the commands in this guide from that folder. If you move the repository, use its new location instead.

The first time you set up the repository on a computer, install its dependencies with `npm install`. You need Node.js and npm installed; if `node --version` and `npm --version` print version numbers, they are available. You do not need to reinstall dependencies every time you add a project.

## 2. Copy the starter page

Paste these command lines directly into Terminal. Do not put `bash` before `mkdir` or `cp`; `bash` is just the code block's language label.

```bash
mkdir -p public/projects
cp templates/project.html public/projects/my-project.html
```

Replace `my-project` with a short name for your project. Use lowercase letters, numbers, and hyphens, ending in `.html`.

| Valid filenames | Invalid filenames |
| --- | --- |
| `weather-radio.html` | `Weather Radio.html` |
| `paper-camera-2.html` | `paper_camera.html` |

Keep project HTML files directly inside `public/projects/`. HTML files inside subfolders are not scanned. Keep the original starter in `templates/`; putting a spare HTML template in `public/projects/` would create an extra block.

## 3. Edit your page

Open your new HTML file in your editor.

Edit the **HTML source** in Codex's file editor or a code editor. Avoid editing the rendered page in TextEdit: saving formatted HTML there can remove the stylesheet and theme script, and turn the Back link into `file:///`. If you use TextEdit, enable its setting to display HTML files as HTML code instead of formatted text before reopening the file.

Keep these shared file links in the head, and the homepage link in the body:

```html
<script src="/project-page.js"></script>
<link rel="stylesheet" href="/project-page.css">
<!-- In the body: -->
<a class="back-link" href="/">Back to Pocket of Stuff</a>
```

Preview by opening the server's URL (for example, `http://localhost:5173/projects/my-project.html`), or by clicking its homepage block. Do not double-click the HTML file in Finder: the `/` paths expect the website's server, not a `file://` URL.

The project settings near the top are:

```html
<title>My Project</title>
<meta name="description" content="A short description of what I made.">
<meta name="pocket:color" content="aqua">
<meta name="pocket:shape" content="arch">
<meta name="pocket:order" content="10">
```

Change `<title>` to the project name. This is the title shown when someone hovers over or focuses its block, and the browser tab title for the project page. A non-empty `<title>` is required. The starter gives the page a large heading at the top using its `<h1>`.

Also change the visible `<h1>My Project</h1>` and replace the paragraphs in the body with your project content. The `<title>` and `<h1>` are separate, so update both.

The other settings are optional. Delete a whole optional `<meta>` line if you do not want to specify it.

### Block colors

Use one of these exact metadata names, not a hex code or the word `blue`:

| `pocket:color` | Block color |
| --- | --- |
| `aqua` | Blue — `#1b96ba` |
| `lilac` | Yellow — `#f1be43` |
| `coral` | Red — `#cb2f2c` |

The older names `powder`, `amber`, and `plum` are also accepted and map to blue, yellow, and red respectively. The names come from the earlier palette; all blocks now use only these three colors.

The starter automatically uses the block color as the page background. Change `pocket:color` once to update both. Red pages use white text; blue and yellow pages use charcoal text. If you omit the color, the page uses the same filename-based choice as the block. View it through the local server so its shared theme script can load.

### Block shapes

| `pocket:shape` | Appearance |
| --- | --- |
| `brick` | Rectangle |
| `square` | Square |
| `beam` | Long rectangle |
| `arch` | Rectangle with an arch opening |
| `roof` | Five-sided roof block |
| `half-round` | Semicircle |

Arch blocks keep a solid rectangular collision shape, as configured for the homepage.

If color or shape is omitted, the generator chooses it consistently from the filename. It does not pick a new one every rebuild. Renaming the file can change those defaults and its grain pattern.

### Block order and numbering

`pocket:order` accepts a number. Lower values come first: `10`, then `20`, then `30`. Leaving gaps makes it easy to insert another project later with a value such as `15`.

Projects without an order come after ordered projects. Ties, and projects with no order, are sorted by filename. The little `01`, `02`, etc. numbers follow this sorted list; they can change when you add or reorder projects.

Order controls the project sequence and numbering. The tower layout chooses each block's physical position based on its shape and available screen space; order does not pin a block to a particular place in the tower.

The optional `description` is saved as metadata. It is not automatically added to the visible project page or the hover title.

## 4. Add images, video, or other assets

Keep supporting files in an assets subfolder, for example:

```text
public/
  projects/
    my-project.html
    assets/
      my-project/
        screenshot.jpg
        demo.mp4
```

Inside `my-project.html`, reference them like this:

```html
<img src="./assets/my-project/screenshot.jpg" alt="A useful description of the image.">
<video controls src="./assets/my-project/demo.mp4"></video>
```

Do not include `public/` in a browser URL: `public/projects/my-project.html` is served as `/projects/my-project.html`.

### Place an image left or right of the text

The starter includes commented examples for all three image layouts. Remove the surrounding `<!-- ... -->` markers to enable one, replace the image path and alt text, and write your paragraphs. You can duplicate sections as needed.

For an image on the **left**:

```html
<section class="project-section">
  <figure class="media-left">
    <img src="./assets/my-project/screenshot.jpg"
         alt="Describe what the image shows." loading="lazy">
    <figcaption>An optional caption.</figcaption>
  </figure>
  <h2>The idea</h2>
  <p>Your text sits beside the image, then continues below it.</p>
  <p>Add more paragraphs here.</p>
</section>
```

For an image on the **right**, change `class="media-left"` to `class="media-right"`. Keep the figure before the text in the HTML for either side. On narrow screens, both layouts put the image above the text. Each section clears its own images, so the following section starts below them.

### Place a full-width image below a paragraph

```html
<section class="project-section">
  <h2>The result</h2>
  <p>Introduce your image here.</p>
  <figure class="media-full">
    <img src="./assets/my-project/result.jpg"
         alt="Describe the result." loading="lazy">
    <figcaption>An optional caption.</figcaption>
  </figure>
</section>
```

Full width means the page's content width, with the page margins retained. Images keep their original proportions and are not cropped. The same figure classes also work with a `<video controls>` in place of an image. For text without images, use `class="project-section project-section--text"` to keep lines comfortable to read.

Project pages are standalone documents and allow scrolling. The starter links to `/project-page.css` for layout, local Archivo fonts, and image styles, and `/project-page.js` for matching the page background to the block. Keep both lines in the head of each page. These shared files live in `public/`; editing the stylesheet changes every page that uses it. They do not load homepage physics or its no-scroll behavior.

An older copied starter will not acquire these layouts automatically. Start a new page from the updated template, or replace its old inline styles with the two shared file links and use the classes shown above.

Files in `public/` are copied to the finished site as-is. Use ordinary browser-ready HTML, CSS, and JavaScript there; TypeScript and npm imports inside project pages are not automatically compiled by Vite.

## 5. Turn the page into a block and preview it

If the site is not running, start it with:

```bash
npm run dev
```

This scans `public/projects/`, generates the blocks, and starts the development server. Open the **Local** URL printed in Terminal. The port may differ from the design preview's `4173`; use the URL the command actually prints. Keep that Terminal session running. Press `Control+C` to stop it.

If the site is already running and you add, remove, rename, or change a project's metadata, open another Terminal in the repository and run:

```bash
npm run generate:projects
```

Then refresh the homepage. Terminal should print a message such as `Generated 1 project block.` The count should match the project HTML files in your folder.

The generator reads the filenames and metadata and writes:

- `src/generated/projects.json` — the project data.
- `src/generated/project-blocks.html` — the homepage links and block settings.

These are generated files: edit your project HTML, not these outputs. Vite inserts the generated block links into the homepage, and the homepage code turns them into the visual physics blocks.

**The on-screen Rebuild button only restacks the existing blocks. It does not scan the projects folder or generate new blocks.**

The design preview used sample projects stored separately from your real project folder. If you still see those sample names, stop that preview server and start a normal server with `npm run dev`. Your real portfolio is sourced from `public/projects/`.

Click your new block to check that it opens the project page, hover over it to check the title, and test any images and links on the page. You can also open `/projects/my-project.html` directly on the local server.

## 6. Shuffle block colors and shapes

From the repository folder, run this directly in Terminal:

```bash
npm run randomize:projects
```

This goes through the HTML files directly inside `public/projects/`, assigns new colors and shapes, writes their `pocket:color` and `pocket:shape` metadata, and regenerates the homepage block list. Refresh the homepage afterward. If you are viewing a production build, rebuild it too.

Assignments are shuffled while keeping the counts as even as possible across the three visible colors and six shapes. Counts differ by at most one: for 17 projects, colors have counts of 6, 6, and 5; shapes have counts of 3, 3, 3, 3, 3, and 2. Which choices get the extra block is randomized. This balances block counts, rather than total colored area.

The command replaces any shape and color choices you previously set by hand. It preserves filenames, titles, descriptions, order, page text, images, and other HTML. It adds the two metadata tags if they are missing. Project page backgrounds will follow the new block colors automatically when using the starter's theme script.

The results stay saved in your files until you edit them or run the command again; normal page loads and builds do not reshuffle them. Run it again whenever you want a new mix, or after adding projects to rebalance the collection. With a small collection, some choices may stay the same by chance.

The command prints each project's assigned color and shape, followed by the totals. If a project has an invalid filename, missing title, or invalid metadata, it reports the error before changing any files. Fix the reported file and run it again.

## 7. Build the finished website

```bash
npm run build
```

This regenerates the blocks, checks TypeScript, and creates the complete static website in `dist/`, including your project pages and assets. Build again after making changes that you want to publish.

To preview that finished build locally:

```bash
npx vite preview
```

Open the Local URL it prints. This serves the last build; it does not generate blocks or rebuild your changes. Stop it with `Control+C`.

Publish the **contents of `dist/`** using your chosen static hosting service. Running a build only creates local files; it does not publish the site. The current site uses root-relative URLs such as `/projects/my-project.html`, so it expects to be hosted at a domain's root. Hosting under a subfolder needs URL changes first.

### GitHub Pages for this website

The repository includes `.github/workflows/deploy.yml` to build and publish the website at `pocketofstuff.com`.

1. Open the GitHub repository's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Keep the custom domain set to `pocketofstuff.com`.
4. Commit and push the workflow and your site changes to `main`.
5. Open the **Actions** tab and wait for **Deploy website to GitHub Pages** to finish successfully. You can also start it manually using **Run workflow** once the workflow is on GitHub.

The workflow runs the tests and `npm run build`, which generates your blocks before uploading `dist/`. Future pushes to `main` repeat this automatically. The custom-domain file in `public/CNAME` is copied into the build as well.

Do not use **Deploy from a branch** to publish the repository root: that skips the build. The raw homepage has no project blocks inserted yet, and its TypeScript cannot run directly in a browser. This can leave only the heading visible even when GitHub reports a successful deployment.

## Updating or removing a project

- To change the content, edit its HTML file. Refresh that project page locally; run a new build before publishing.
- To change its hover title, block color, shape, or order, edit the metadata, regenerate the blocks, and refresh the homepage.
- To remove a block, move its HTML file out of `public/projects/` or delete the file, then regenerate or build. Removing only its metadata will not remove its block.
- Renaming a file also changes its page URL. Existing bookmarks to the old URL will need a redirect if you want to preserve them.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| New block is missing | File is directly in `public/projects/`, ends in `.html`, and you regenerated and refreshed. Check that you opened the correct server URL. |
| Old sample projects still appear | Start a normal `npm run dev` server rather than the isolated design preview. |
| Generator rejects a filename | Use lowercase letters, numbers, and hyphens; no spaces or underscores. |
| Generator reports a missing title | Add a non-empty `<title>` in `<head>`; an `<h1>` alone is not enough. |
| Generator rejects a color or shape | Use an exact accepted metadata value from the tables above. |
| Image is missing | Check the filename, capitalization, and path. Omit `public/` from URLs. |
| Page has no styling or Back leads to `file:///` | Check that a rich text editor has not rewritten the HTML. Restore the starter's shared file links and `href="/"`, edit the source in a code editor, and view it through the local server. |
| Changes are missing in build preview | Run `npm run build` again; `npx vite preview` serves the existing `dist/`. |
| Terminal says `package.json` cannot be found | Run the command from the repository folder, not `public/projects/`. |
| `/bin/mkdir: cannot execute binary file` | Run `mkdir -p public/projects` directly, without `bash` before it. Then run the `cp` command directly too. |
| Homepage shows the empty-state message | There are no project HTML files in the scanned folder. Add your first page and regenerate. |
| GitHub Pages shows only the heading and no blocks | Set Pages Source to GitHub Actions and use the included build-and-deploy workflow so Pages receives `dist/`, not the source repository. |

## Command reference

| Command | When to use it |
| --- | --- |
| `npm install` | Initial setup, or after dependency changes. |
| `npm run dev` | Generate blocks and start the development server. |
| `npm run generate:projects` | Update the project list while the server is already running. |
| `npm run randomize:projects` | Save a balanced random mix of colors and shapes, then regenerate the blocks. |
| `npm run build` | Generate blocks and create the finished website in `dist/`. |
| `npx vite preview` | Serve the last finished build locally. |
| `npm test` | Run the automated checks when changing the site's code. |
