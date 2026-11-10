# Osply portfolio: modern implementation research

Research date: 10 November 2026. Baseline captured before the continuous-physics/depth upgrade, using that repository state and its production build artifacts, and the primary documentation linked below. This is an implementation proposal, not a new deployment or a live performance audit.

Implementation update: continuous physics and deeper WebGL deformation are now implemented. See [further interaction research](next-effects-research.md) for the next candidates. The observations below preserve the earlier baseline.

## Recommendation

Keep the visual direction and lightweight foundation. Invest first in original media, continuous input-driven motion, and stronger case-study content. Introduce newer browser APIs progressively. A framework migration is useful only when publishing and maintaining more projects becomes a real requirement.

The proposed visual direction is a cinematic editorial portfolio: a continuous sculpted project reel, restrained typography, seamless transitions, and readable case studies. Every decorative effect should respond to an action, reveal information, or establish hierarchy.

## What the current implementation tells us

- The inspected JavaScript build is 21,172 bytes before compression and approximately 8.4 kB gzip. Its CSS is approximately 3.5 kB gzip. Bundle weight is already small; a larger stack would need a specific benefit.
- All seven WebP images together occupy 447,380 bytes. Their widths range from 624 to 943 pixels, and they are extracted from recordings. Original artwork would improve large-screen and high-density displays more than another distortion layer.
- The reel already has a segmented WebGL mesh, velocity-driven curvature, pointer parallax, a DOM fallback, and a render loop that settles when idle.
- Input still selects discrete projects using a 28-unit accumulated wheel threshold and a 220 ms gate. The visible easing is continuous, but the input model remains stepped.
- The shader bends vertices in screen-space X/Y and fixes their clip-space Z to zero. It has no true perspective depth. Its UV mapping also stretches the full texture to the plane instead of implementing the DOM image's `object-fit: cover` behavior.
- The canvas resolution has a fixed device-pixel-ratio cap of 1.75, rather than a quality level chosen from measured rendering performance.
- Case transitions already use the Web Animations API and a temporary image clone. Reduced-motion handling is present.
- The static route generator copies one HTML shell to every route. Project content and titles are then created in JavaScript. Individual projects do not yet have build-time content, distinct initial metadata, or social-preview images.

These are source observations. They do not establish poor real-user Core Web Vitals or a specific frame rate on physical phones.

## Ranked upgrades

| Priority | Upgrade | Visitor-visible result | Implementation |
| --- | --- | --- | --- |
| 1 | Original media and short project films | Crisp identities and genuinely moving project covers | Obtain original assets, create responsive AVIF/WebP variants, and use muted inline video selectively with poster images. Play only visible media; retain a still-image mode. |
| 1 | Continuous reel physics | Wheel, trackpad and touch input feel directly connected to the gallery | Feed normalized input deltas into a continuous position/velocity model. Snap to a project after input settles. Keep explicit keyboard and project-name navigation. |
| 1 | Better shader rendering | Curvature gains convincing depth without stretching artwork | Add cover-correct UVs, depth displacement and a perspective projection; tune curvature and camera response together. Use adaptive resolution on slower devices. |
| 2 | Cohesive transition choreography | A selected project expands into its case study, with a clear reverse transition | Preserve the existing FLIP-style image flight. Add progressive native View Transitions where they simplify DOM transitions, and use a shared motion configuration for timings and interruptions. |
| 2 | Editorial typography and case studies | The site feels designed around real work, with stronger explanations and hierarchy | Use a locally hosted, licensed variable font, short masked text entrances, original mockups, and project challenge/approach/result sections. Keep body text stable and legible. |
| 2 | Real HTML project routes | Faster access to content and better project-specific search and sharing previews | Pre-render project content and metadata from a shared content source. Astro content collections become a good fit if the portfolio expands. Static output can stay on GitHub Pages. |
| 3 | Native scroll-driven details | Case-study progress, subtle parallax and image reveals follow reading position | Use CSS `animation-timeline: view()` or `scroll()` behind feature detection; retain the existing IntersectionObserver/JavaScript behavior for unsupported browsers. |

Original images and video require actual source material. Upscaling the recorded frames cannot recover missing detail. The motion and rendering upgrades can be prototyped independently of those assets.

## Technology choices

### Native APIs first; one animation coordinator if needed

The Web Animations API already handles this site's transforms and opacity changes. Retain it for simple transitions. A small shared system for durations, easing, cancellation, and reduced motion will improve consistency without requiring a dependency.

If sequencing grows substantially, use **either** GSAP or Motion's vanilla JavaScript APIs. GSAP offers timelines and optional Observer, Flip, ScrollTrigger and text tools; Motion offers JavaScript animation and spring-based interactions. Choose one after a representative prototype and compare shipped bundle size and maintenance effort. Neither requires React. [3][4]

### View Transitions are useful, but the canvas needs a bridge

`document.startViewTransition()` is designed for same-document changes, with a feature-detected fallback. Base API support and newer options are separate compatibility questions. Cross-document transitions have their own requirements and should not be assumed from same-document support. [1]

Our reel's visible pictures are rendered into a shared canvas, while the matching DOM images are transparent. Giving a transparent project button a `view-transition-name` will not capture the card's visible canvas image. A shared-image transition therefore needs a temporary visible DOM image at the selected card's bounds, or should keep the existing FLIP implementation. Native transitions are a simpler first fit for About/Contact and other DOM-only changes. Avoid running two hero-transition systems simultaneously.

### Keep WebGL; consider OGL when the renderer grows

The present four-image scene is small enough for the custom renderer. **OGL** is a plausible next step if perspective cameras, video textures, more shader passes and resource management start dominating the code. Its stated design is a minimal WebGL abstraction with no dependencies. [5]

WebGPU is an option for a future much more demanding scene, but it offers little immediate benefit for four deforming images. Its compatibility still includes browser/platform restrictions; adopting it would add another rendering path to maintain. [9]

Add robust resource cleanup, a usable context-loss fallback, explicit texture sizing, and resolution adjustments based on frame-time observations. MDN documents smaller render buffers as a practical quality/performance tradeoff. [8]

### Use Lenis selectively

Lenis supports synchronized scroll scenes and animation integrations. It is potentially useful for a longer editorial case-study experience. Its nested-scroll configuration matters for this site's fixed information panel and separate scrolling content column. The official documentation explicitly discusses allowing or preventing nested scrolling and the cost of DOM checks. [6]

The homepage reel is a virtual gallery, not a normal document scroller. Its input physics should be fixed directly; adding global smooth scrolling would not, by itself, remove the reel's discrete selection gate. Use one animation clock when coordinating multiple systems.

### Astro is a content upgrade, not a prerequisite for better motion

Astro's static pages and content collections suit a portfolio with many case studies. Keep the interactive reel as a client-side module and generate the editorial content at build time. [7]

For the current four-project site, extending the existing build to emit genuine route-specific HTML is also reasonable. A React/Next.js migration would need a separate application requirement, such as an authenticated dashboard, rather than an animation requirement.

## Performance and interaction acceptance criteria

- Preserve explicit keyboard navigation, Escape to close, focus return, touch gestures and reduced-motion behavior.
- Tie a loader to actual critical-asset readiness, with a timeout/fallback; avoid imposing a fixed delay solely for a progress animation.
- Check reel responsiveness on a physical iPhone, Android phone, mouse and trackpad. Validate 60 Hz and high-refresh-rate timing. Target smooth rendering on the chosen devices, then reduce effect quality when necessary.
- Do not play or decode every project film continuously. Pause offscreen and hidden-tab media, and preserve poster images when video cannot autoplay.
- Measure LCP, INP and CLS with the official `web-vitals` library, and collect field data through a deliberately configured endpoint if ongoing monitoring is wanted. Local scores are not field measurements. [10]
- Set initial quality goals of LCP ≤2.5 s, INP ≤200 ms and CLS ≤0.1 at the 75th percentile, alongside manual readability and motion checks. These are goals, not current results.
- Keep testing direct `/t011/work/.../` links, back/forward navigation, WebGL failure, route changes during animations and image loading failures.

## Suggested delivery order

1. **Motion/rendering prototype:** continuous reel, cover-correct textures, restrained depth, adaptive quality, and one consistent transition vocabulary. Compare directly with the current deployed experience.
2. **Visual/content pass:** original images or film loops, a licensed typeface, and complete project narratives. Prepare responsive assets and media budgets.
3. **Publishing/performance pass:** genuine static project pages, unique titles/descriptions/canonical and social metadata, optional content collections, and measured performance checks.

A motion prototype is roughly a small multi-day task; a complete media/content and publishing pass depends on the source assets and final copy. These are scoping estimates, not a promised delivery schedule. Define the first prototype around one reel interaction and one representative case study before expanding it.

## Primary sources

Documentation was consulted through the projects' official GitHub-hosted sources because this environment restricts general outbound browsing. Browser compatibility data can include upcoming releases; use feature detection and verify the browsers actually targeted.

1. MDN: [startViewTransition](https://github.com/mdn/content/blob/main/files/en-us/web/api/document/startviewtransition/index.md), [View Transition API](https://github.com/mdn/content/blob/main/files/en-us/web/api/view_transition_api/index.md), and [Document compatibility data](https://github.com/mdn/browser-compat-data/blob/main/api/Document.json).
2. MDN: [`animation-timeline` compatibility data](https://github.com/mdn/browser-compat-data/blob/main/css/properties/animation-timeline.json).
3. [GSAP official repository and documentation links](https://github.com/greensock/GSAP).
4. [Motion official repository](https://github.com/motiondivision/motion).
5. [OGL official repository](https://github.com/oframe/ogl).
6. [Lenis official documentation](https://github.com/darkroomengineering/lenis#readme).
7. [Astro: Why Astro?](https://github.com/withastro/docs/blob/main/src/content/docs/en/concepts/why-astro.mdx).
8. [MDN: WebGL best practices](https://github.com/mdn/content/blob/main/files/en-us/web/api/webgl_api/webgl_best_practices/index.md).
9. [MDN: GPU compatibility data](https://github.com/mdn/browser-compat-data/blob/main/api/GPU.json).
10. [GoogleChrome: web-vitals](https://github.com/GoogleChrome/web-vitals).
