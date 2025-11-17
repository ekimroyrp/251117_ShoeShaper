# 251117_ShoeShaper

251117_ShoeShaper is a Vite + React + Three.js playground that loads a base shoe OBJ and lets you sculpt it with layered noise displacement. The scene runs inside @react-three/fiber, keeps the OBJ in the repo for deployment, and mirrors the neon cyberpunk UI language from the FootwearFormer project so shader parameters feel like using a synthesizer.

## Features
- Vite + TypeScript scaffold with React 19, @react-three/fiber, @react-three/drei, and Zustand for fast iteration.
- BaseShoe.obj is bundled inside `public/models`, remeshed with `SimplifyModifier`, and displaced on the CPU with seeded simplex noise.
- Cyberpunk control deck cloned from the reference project, including neon sliders, dropdowns, and toggle actions.
- Parameter store tracks amplitude, frequency, warp, ridge strength, remesh density, wireframe, and autorotation so UI + scene stay in sync.
- Canvas scene ships with HDR environment, dual key lights, stats overlay, and Suspense-powered loader for OBJ fetching.

## Getting Started
1. `npm install`
2. `npm run dev` to start Vite on `http://localhost:5173`
3. `npm run lint` to keep the codebase tidy with ESLint
4. `npm run build` to emit a production build and type-check through `tsc -b`

## Controls
- **Noise Mode** dropdown switches between simplex, ridge, and warped layering styles.
- **Sliders:** Displacement (amplitude), Frequency, Roughness (octave falloff), Warp (domain warp), Ridge sharpening, Remesh Density, and Seed all map directly to the modifier pipeline.
- **Wireframe / Auto Orbit** toggle buttons let you inspect geometry or pause the hero camera sweep.
- **Pulse Seed** creates a new pseudo-random seed while keeping the rest of the stack untouched.
- **Reset Controls** snaps every slider/toggle back to the default preset from `useNoiseStore`.
