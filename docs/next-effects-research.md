# Further interaction upgrades

Research date: 10 November 2026. This follows implementation of continuous reel physics and perspective-projected WebGL deformation. These are proposals; the effects below have not been added.

## Implemented foundation

- Continuous distance-based wheel and trackpad input, with no timed selection gate.
- Mouse/touch dragging, bounded release momentum, and snap-to-project after input settles.
- An analytically integrated critically damped spring, checked for consistent timing at 60 and 120 Hz.
- Actual mesh deformation in depth, perspective projection, subtle directional shading, and pointer tilt.
- Texture coordinates matching cover-cropped images, instead of stretching the artwork.
- Smooth fades at the reel's wrapping boundary and a smaller canvas backing buffer after sustained slow active frames.
- Existing keyboard navigation, reduced motion, DOM fallback and modal/history behavior retained.

## Best next candidates

| Candidate | What visitors see | Implementation and scope | Recommendation |
| --- | --- | --- | --- |
| Pointer-driven fluid displacement | The focused project image gently ripples or flows beneath the pointer, then relaxes | A small flow field stored in alternating render targets displaces texture UVs. Feed pointer velocity into the field and let it dissipate. Limit it to the focused card and suspend the passes after the field settles. | Best next visual prototype. Keep the logo recognizable and the distortion restrained. |
| Video textures on project covers | A real moving scene continues to bend naturally with the reel | Decode an original muted inline project film, update its WebGL texture on `requestVideoFrameCallback`, and render when a decoded frame or reel motion needs it. Preserve a poster fallback. Pause offscreen and hidden-tab playback. | High visual impact, dependent on original source video. |
| Direction-aware project navigation | Forward, back and next-project navigation have distinct but related transitions | Use same-document View Transition types where supported, with the existing image bridge and WAAPI flight as a fallback. Keep only one system responsible for a given transition. | Useful polish after the physics upgrade is reviewed. |
| Native panel entry and exit transitions | About/Contact panels and their backdrops close as smoothly as they open | Combine `@starting-style` with supported discrete transitions, retaining explicit JavaScript behavior where display transitions are unsupported. | Practical modernization with little visual clutter. |
| Component-scoped View Transitions | A single section changes while the rest of the page stays visually stable | Evaluate `Element.startViewTransition()` behind feature detection. It is separate from the established document-level API and still marked experimental in the consulted compatibility data. | Experimental branch only; retain a complete fallback. |

## Why these fit this codebase

The gallery already owns a WebGL render loop and card textures. A flow field or video texture can extend that renderer without moving the whole site to a new UI framework. The current idle behavior is worth preserving: a decorative effect should stop scheduling frames when it has settled.

The original media is still recording-derived. Real project film will make a bigger content difference than generating apparent motion from a low-resolution still. Video-frame callbacks reduce unnecessary texture uploads, but their scheduling is not a guarantee that every frame will be presented on time.

The current gallery lives in one shared canvas. Native View Transitions still need a visible DOM image bridge for shared-image snapshots; naming a transparent DOM card does not capture the matching portion of a different canvas element.

## Research evidence

1. **Fluid field implementation:** OGL's official [Mouse Flowmap example](https://github.com/oframe/ogl/blob/master/examples/mouse-flowmap.html) stores pointer velocity in a flow texture and samples that texture to displace the source image. This is a concrete implementation reference, not a new browser requirement.
2. **Efficient video updates:** MDN's [requestVideoFrameCallback documentation](https://github.com/mdn/content/blob/main/files/en-us/web/api/htmlvideoelement/requestvideoframecallback/index.md) describes callbacks when video frames are sent to the compositor, at the lower of video and display rates. It also documents timing limitations.
3. **Directional transitions:** MDN's [View Transition types guide](https://github.com/mdn/content/blob/main/files/en-us/web/api/view_transition_api/using_types/index.md) describes applying different transition rules to different navigation types. Feature detection and the fallback remain necessary.
4. **Modern entry/exit styling:** MDN compatibility records for [`@starting-style`](https://github.com/mdn/browser-compat-data/blob/main/css/at-rules/starting-style.json) and [`transition-behavior`](https://github.com/mdn/browser-compat-data/blob/main/css/properties/transition-behavior.json). The latter includes partial support notes for transitioning `display`; support for the property alone is not sufficient evidence for every use case.
5. **Scoped transitions:** MDN's [`Element.startViewTransition` compatibility data](https://github.com/mdn/browser-compat-data/blob/main/api/Element.json) marks this experimental and lists missing implementations. Entries may describe upcoming browser versions, so verify actual target releases before use.

The current official sources were read through their GitHub-hosted documentation. No production-browser performance improvement is claimed from the research alone.

## Recommended next step

Prototype fluid displacement on one project card with a small flow buffer, a strict distortion limit, and reduced-motion/touch fallbacks. Compare it with the present renderer on physical desktop and mobile devices before expanding it. Introduce a video cover separately when original footage is available, so its decoding cost can be measured independently.
