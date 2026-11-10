# Osply studio recreation

A responsive recreation of the Osply portfolio shown in the supplied screen recordings. Built with vanilla JavaScript, CSS and Vite.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm ci --cache /tmp/osply-npm-cache
npm run dev -- --port 3000
```

```sh
npm run build
npm run preview -- --port 3000
```

## Interactions

- The project reel uses a perspective-projected WebGL surface with depth deformation, subtle directional shading, cover-correct texture cropping, pointer tilt and a DOM image fallback. Canvas resolution decreases after sustained slow rendering frames.
- A wordmark entrance and project-to-case-study zoom connect the pages. Case imagery reveals and gently distorts on scroll.
- Wheel/trackpad deltas move the reel continuously; touch and mouse dragging follow the pointer with release momentum. A critically damped spring settles on the nearest project after input stops, with consistent 60/120 Hz timing.
- Scroll, swipe, use arrow keys, click project names or use the up/down controls to move between four projects.
- Click the selected project to open its case study. Desktop has a fixed information panel and a separately scrolling image column; mobile uses a single scrolling layout.
- Close with the Close button or Escape. Project routes support direct entry and browser back/forward navigation.
- About and Contact open matching panels. Email opens the user's mail client; Copy Email uses the clipboard where available.
- Reduced motion preferences, keyboard focus, modal focus containment and touch input are supported.

## Reference and assets

The uploaded recordings are the visual reference. WebP project images were extracted from those recordings and are included locally in `public/images`; no external asset service is required. Their resolution is limited by the recordings. The wordmark is an SVG recreation.

The live reference was unavailable through the environment's network policy. The homepage and Ara Niko case study follow the supplied footage; unseen About/Contact content and the other project detail pages are matching interpretations. There is no backend or form submission service.

## Browser checks

With the server on port 3000, Python Playwright installed, and Chromium at `/usr/bin/chromium`:

```sh
python tests/smoke.py
python tests/motion.py
python tests/reel-browser.py
node --test tests/reel-physics.test.js
```

Checks desktop carousel navigation, all case studies, case scrolling, modal closing, browser history, About/Contact, mobile overflow and direct project URLs. Screenshots are saved outside the repository in `/tmp/osply-checks`.

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds and deploys on pushes to `main` (or a manual Actions run). In the repository's **Settings → Pages**, choose **GitHub Actions** as the source.

```sh
npm run build:pages
```

This builds for `/t011/` and generates static entries for About, Contact and all four project routes. Direct links and refreshes therefore work on GitHub Pages without server rewrites. The intended Pages address is `https://ejaubashi.github.io/t011/` once deployment succeeds.

The ordinary `npm run build` continues to target `/` for other hosting services. Such services should serve `index.html` for application routes.

To test the Pages build under a local `/t011/` directory, run the browser checks with `OSPLY_TEST_URL` pointing to that directory URL.
