# 251117_ShoeShaper

251117_ShoeShaper is a Vite + React + Three.js playground that loads a base shoe OBJ and lets you sculpt it with layered noise displacement. The scene runs inside @react-three/fiber, keeps the OBJ in the repo for deployment, and mirrors the neon cyberpunk UI language from the FootwearFormer project so shader parameters feel like using a synthesizer.

## Features
- Vite + TypeScript scaffold with React 19, @react-three/fiber, @react-three/drei, and Zustand for fast iteration.
- BaseShoe.obj is bundled inside `public/models` and displaced directly on the CPU with seeded simplex noise (no rebuild step required).
- Cyberpunk control deck cloned from the reference project, including neon sliders, dropdowns, and toggle actions.
- Local preset manager persists custom slider stacks in `localStorage`, so you can recall favorite noise fields instantly.
- Parameter store tracks amplitude, frequency, roughness (octave falloff), warp, ridge strength, smoothing, Clamp Outside/Inside, offsets, per-axis scaling/rotation, wireframe, autorotation, and tooltip overlays so UI + scene stay in sync.
- Canvas scene ships with HDR environment, dual key lights, stats overlay, axis-orientation widget, and a draggable falloff gizmo (sphere + height arrow + label) that matches screenshot/export visibility rules.
- Export Mesh and Take Screenshot buttons live in a unified button grid, capture OBJ / PNGs to disk, and omit helper gizmos (falloff handle + axis widget) for clean outputs.
- Algorithm-specific sliders (Worley Shift/Blend, Curl Strength/Detail, Alligator Wave/Crunch, etc.) directly remap the sculpted surface so every noise mode has responsive controls.

## Getting Started
1. `npm install`
2. `npm run dev` to start Vite on `http://localhost:5173`
3. `npm run lint` to keep the codebase tidy with ESLint
4. `npm run build` to emit a production build and type-check through `tsc -b`

## Controls
- **Noise Mode** dropdown now includes a NONE option that bypasses displacement (and hides sliders) plus the usual simplex, ridge, warped, Worley, curl, and alligator modes.
- **Sliders:** Displacement (amplitude), Frequency, Roughness (octave falloff), Warp (domain warp), Ridge sharpening, Smoothing, Clamp Outside/Inside, Offset X/Y/Z, Scale X/Y/Z, Rotate X/Y/Z, and Seed all map directly to the modifier pipeline.
- **Clamp Outside / Clamp Inside** sliders independently cap outward and inward displacement, letting you preserve silhouette volume while still carving detail.
- **Wireframe / Auto Orbit** toggle buttons let you inspect geometry or pause the hero camera sweep.
- **Presets** panel saves/loading/deletes custom sliders, persisted locally for quick recall.
- **Pulse Seed** creates a new pseudo-random seed while keeping the rest of the stack untouched.
- **Reset Controls** snaps every slider/toggle back to the default preset from `useNoiseStore`.
- **Viewport aids:** Drag the red falloff arrow to raise/lower the falloff point, drag the sphere to move it laterally, follow the neon tooltip (`LEFT CLICK TO ORBIT - RIGHT CLICK TO PAN - SCROLL TO ZOOM`), and reference the axis widget locked to the lower-left corner.

## Deployment
- **Local production preview:** `npm install`, then `npm run build` followed by `npm run preview` to inspect the compiled bundle.
- **Publish to GitHub Pages:** From a clean `main`, run `npm run build -- --base=./`. Checkout (or create) the `gh-pages` branch in a separate worktree, copy everything inside `dist/` plus a `.nojekyll` marker to its root, commit with a descriptive message, `git push origin gh-pages`, then switch back to `main`.
- **Live demo:** https://ekimroyrp.github.io/251117_ShoeShaper/
