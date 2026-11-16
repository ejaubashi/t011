# Cinematic project reveals and editorial scroll

Implemented on 16 November 2026 as the next pass over the liquid-metal design.

## GPU portal

A separate, reusable WebGL compositor transforms the selected image into an expanded refractive aperture and then into the project hero. Cover-correct texture sampling preserves the source image proportions throughout the reveal. A signed-distance mask creates the rounded aperture; radial UV displacement and restrained edge dispersion create the optical effect.

The shader is warmed during idle time. Bounds are calculated once per frame in JavaScript, scissoring avoids rendering outside those bounds, and extra colour samples are limited to the aperture edge. The backing buffer is capped and its resolution drops after slow frames. Opening progress preserves intermediate phases after an unusually slow frame; closing uses elapsed time for a prompt return.

Only one frame loop runs per reveal. The compositor and texture are reused rather than allocating a new WebGL context on every click. Temporary DOM layers are removed and destination visibility is restored on completion or cancellation. Wheel, pointer, scroll, resize, page visibility changes, Escape and route changes can interrupt the reveal. Unsupported or lost WebGL uses the pre-existing DOM image flight.

## Scroll-linked editorial content

Every project now has a short narrative headline. Word wrappers keep a readable base layer while a darker ink layer fills as the headline crosses the reading area. The accessible text is included once; the duplicate visual base is hidden from assistive technology.

CSS view timelines and animation ranges drive the effect in supporting browsers. A script fallback calculates matching cover ranges. The narrative container uses `overflow: clip`, preserving the actual case-study scroll container as the timeline source. Reduced motion renders fully filled text.

An ARIA progress bar, circular visual indicator and fine edge line show reading progress. The binding switches between the desktop content column and mobile case-study layout on resize, and remeasures as images load. These are reading controls/status, not animation performance counters.

## Surface lighting

The reel shader derives surface normals from the deformed mesh and rotates them with the surface. A pointer-positioned light and half-vector specular term create a restrained reflection that follows the curvature. Warm/cool tint varies with the light position. Lighting and the fluid field settle when the case-study overlay opens, avoiding simultaneous background work during the portal reveal.

## Validation

The new scripted check verifies actual GPU image coverage outside the starting card during the expanded phase, then checks cancellation, resize cleanup, native/script headline progression, reading progress on desktop/mobile, and reduced-motion/no-GPU fallbacks. Existing suites continue to cover route navigation, physics, flow texture decay and interrupted native View Transitions.

Checks run in headless Chromium, including software WebGL. They are not a claim of measured frame rates or battery performance on physical devices.
