# Liquid-metal visual implementation

Implemented on 15 November 2026, following the request for a distinctive modern visual and transition treatment.

## Delivered

- Chrome-gradient SVG identity with individually staggered, perspective-aware letter reveals.
- An atmospheric dark surface, restrained grain, warm/cool light pools, larger project images and editorial project captions.
- Pointer-responsive ambient light, magnetic navigation and a frosted project cursor for fine pointers. Native controls and keyboard focus remain available.
- A custom GPU flow field on two 128×128 RGBA8 framebuffer textures. Pointer or touch-drag velocity is injected, advected and dissipated; the result distorts focused image UVs with subtle optical colour separation and edge light.
- The flow texture is explicitly cleared when its energy decays, preventing residual distortion. Animation scheduling stops when the reel, pointer and fluid field settle.
- Sculpted image flights with a short light bloom between the WebGL gallery and DOM project view.
- Progressive native same-document View Transitions between open project/text panels. Separate overlay snapshots preserve the frosted panel during capture, while image and metadata groups animate independently.
- Native route revision guards: interrupted snapshot callbacks cannot recreate a panel after Escape or a newer navigation.
- Reduced-motion, no-WebGL and no-View-Transition paths. Touch receives the flow effect during deliberate dragging; magnetic controls and the custom cursor are limited to fine pointers.

This does not add video assets, require WebGPU, or migrate the site to a UI framework. It extends the existing renderer and browser animation APIs.

## Primary research consulted

- [OGL's mouse-flowmap example](https://github.com/oframe/ogl/blob/master/examples/mouse-flowmap.html), demonstrating the technique of using a velocity texture to displace image sampling. This site's renderer and RGBA8 flow implementation are custom; it does not import OGL.
- [MDN: Document.startViewTransition](https://github.com/mdn/content/blob/main/files/en-us/web/api/document/startviewtransition/index.md), for the same-document snapshot/update lifecycle and fallback approach.
- [MDN browser compatibility data](https://github.com/mdn/browser-compat-data/blob/main/api/Document.json), checked for the base document-level API. The implementation feature-detects that API and does not depend on experimental element-scoped transitions.

The official sources were retrieved through their GitHub-hosted documentation under the environment's network policy. API recency alone was not treated as a reason to introduce a dependency or a new GPU backend.

## Validation

The scripted checks cover real flow-texture readback before and after input, full decay to neutral, image-flight cleanup, project and text-panel native transitions, interruption during snapshot capture, reduced motion, API fallback and viewport fit. Existing navigation, reel physics, GPU-loss fallback and mobile interaction checks remain relevant. These are headless browser checks and timing simulations; they do not substitute for measurements on physical phones.
