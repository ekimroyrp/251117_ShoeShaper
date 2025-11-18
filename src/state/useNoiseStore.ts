import { create } from 'zustand'
import { FLOOR_Y } from '../constants/environment'

export const noiseAlgorithms = ['none', 'simplex', 'alligator', 'worley', 'warped', 'curl', 'ridge'] as const

export type NoiseAlgorithm = (typeof noiseAlgorithms)[number]

export interface NoiseParams {
  seed: number
  amplitude: number
  clamp: number
  clampInside: number
  offsetX: number
  scaleX: number
  offsetY: number
  scaleY: number
  offsetZ: number
  scaleZ: number
  rotateX: number
  rotateY: number
  rotateZ: number
  resolution: number
  falloff: number
  falloffCenterX: number
  falloffCenterY: number
  falloffCenterZ: number
  frequency: number
  roughness: number
  warp: number
  ridge: number
  worleyJitter: number
  worleyBlend: number
  curlStrength: number
  curlScale: number
  alligatorBite: number
  alligatorPlateau: number
  noiseType: NoiseAlgorithm
}

export interface NoiseToggles {
  autoRotate: boolean
  wireframe: boolean
}

export interface SavedPreset {
  id: string
  name: string
  params: NoiseParams
}

type NumericParamKey = Exclude<keyof NoiseParams, 'noiseType'>
export type SliderParamKey = Exclude<NumericParamKey, 'resolution' | 'falloffCenterX' | 'falloffCenterY' | 'falloffCenterZ'>

export interface SliderDefinition {
  label: string
  min: number
  max: number
  step: number
  precision?: number
}

export const sliderDefinitions: Record<SliderParamKey, SliderDefinition> = {
  amplitude: { label: 'Displacement', min: 0, max: 6, step: 0.05, precision: 2 },
  falloff: { label: 'FALLOFF', min: 0, max: 10, step: 0.05, precision: 2 },
  clamp: { label: 'CLAMP OUTSIDE', min: 0, max: 6, step: 0.05, precision: 2 },
  clampInside: { label: 'CLAMP INSIDE', min: 0, max: 6, step: 0.05, precision: 2 },
  offsetX: { label: 'OFFSET X', min: -40, max: 40, step: 0.25, precision: 2 },
  offsetY: { label: 'OFFSET Y', min: -40, max: 40, step: 0.25, precision: 2 },
  offsetZ: { label: 'OFFSET Z', min: -40, max: 40, step: 0.25, precision: 2 },
  scaleX: { label: 'SCALE X', min: 0.1, max: 5, step: 0.05, precision: 2 },
  scaleY: { label: 'SCALE Y', min: 0.1, max: 5, step: 0.05, precision: 2 },
  scaleZ: { label: 'SCALE Z', min: 0.1, max: 5, step: 0.05, precision: 2 },
  rotateX: { label: 'ROTATE X', min: -360, max: 360, step: 0.05, precision: 2 },
  rotateY: { label: 'ROTATE Y', min: -360, max: 360, step: 0.05, precision: 2 },
  rotateZ: { label: 'ROTATE Z', min: -360, max: 360, step: 0.05, precision: 2 },
  frequency: { label: 'Frequency', min: 0, max: 4, step: 0.05, precision: 2 },
  roughness: { label: 'Roughness', min: 0, max: 1.6, step: 0.05, precision: 2 },
  warp: { label: 'Warp', min: 0, max: 2.5, step: 0.05, precision: 2 },
  ridge: { label: 'Ridge', min: 0, max: 1, step: 0.02, precision: 2 },
  seed: { label: 'Seed', min: 1, max: 9999, step: 1, precision: 0 },
  worleyJitter: { label: 'SHIFT', min: 0, max: 1, step: 0.01, precision: 2 },
  worleyBlend: { label: 'BLEND', min: 0, max: 1, step: 0.01, precision: 2 },
  curlStrength: { label: 'STRENGTH', min: 0, max: 4, step: 0.05, precision: 2 },
  curlScale: { label: 'DETAIL', min: 0.1, max: 3, step: 0.05, precision: 2 },
  alligatorBite: { label: 'WAVE', min: 0, max: 3, step: 0.05, precision: 2 },
  alligatorPlateau: { label: 'Plateau', min: 0, max: 1, step: 0.02, precision: 2 },
}

export const sliderOrder: SliderParamKey[] = [
  'amplitude',
  'falloff',
  'clamp',
  'clampInside',
  'frequency',
  'roughness',
  'warp',
  'ridge',
  'worleyJitter',
  'worleyBlend',
  'curlStrength',
  'curlScale',
  'alligatorBite',
  'alligatorPlateau',
  'offsetX',
  'offsetY',
  'offsetZ',
  'scaleX',
  'scaleY',
  'scaleZ',
  'rotateX',
  'rotateY',
  'rotateZ',
  'seed',
]

export const baseSliderKeys: SliderParamKey[] = [
  'amplitude',
  'falloff',
  'clamp',
  'clampInside',
  'frequency',
  'offsetX',
  'offsetY',
  'offsetZ',
  'scaleX',
  'scaleY',
  'scaleZ',
  'rotateX',
  'rotateY',
  'rotateZ',
  'seed',
]

export const algorithmSliderMap: Record<NoiseAlgorithm, SliderParamKey[]> = {
  none: [],
  simplex: ['roughness', 'warp'],
  ridge: ['roughness', 'ridge'],
  warped: ['roughness', 'warp'],
  worley: ['worleyJitter', 'worleyBlend'],
  curl: ['curlScale', 'curlStrength'],
  alligator: ['alligatorBite', 'alligatorPlateau'],
}

export const resolutionOptions = [0, 1, 2] as const
const clampResolution = (value: number) => {
  const min = resolutionOptions[0]
  const max = resolutionOptions[resolutionOptions.length - 1]
  const snapped = Math.round(value)
  return Math.min(max, Math.max(min, snapped))
}

interface NoiseStoreState {
  params: NoiseParams
  toggles: NoiseToggles
  presets: SavedPreset[]
  falloffDragging: boolean
  exportCounter: number
  screenshotCounter: number
  screenshotActive: boolean
  setParam: (key: NumericParamKey, value: number) => void
  setNoiseType: (algorithm: NoiseAlgorithm) => void
  randomizeSeed: () => void
  resetParams: () => void
  toggleFlag: (flag: keyof NoiseToggles) => void
  setFalloffCenter: (x: number, z: number) => void
  setFalloffHeight: (y: number) => void
  setFalloffDragging: (dragging: boolean) => void
  savePreset: (name: string) => void
  loadPreset: (id: string) => void
  deletePreset: (id: string) => void
  requestExport: () => void
  requestScreenshot: () => void
  setScreenshotActive: (active: boolean) => void
}

const defaultParams: NoiseParams = {
  seed: 4683,
  amplitude: 3.3,
  clamp: 0.6,
  clampInside: 1,
  offsetX: 0.5,
  scaleX: 0.55,
  offsetY: 6.5,
  scaleY: 0.9,
  offsetZ: 4,
  scaleZ: 3.65,
  rotateX: 5,
  rotateY: 2,
  rotateZ: 16,
  resolution: 1,
  falloff: 1.75,
  falloffCenterX: 0,
  falloffCenterY: FLOOR_Y + 2,
  falloffCenterZ: -16,
  frequency: 0.35,
  roughness: 0.15,
  warp: 0.25,
  ridge: 0.3,
  worleyJitter: 0.5,
  worleyBlend: 0.1,
  curlStrength: 0.2,
  curlScale: 1,
  alligatorBite: 2,
  alligatorPlateau: 0.12,
  noiseType: 'simplex',
}

const defaultToggles: NoiseToggles = {
  autoRotate: false,
  wireframe: false,
}

const storageKey = 'shoeshaper-presets'

const sliderMinimums = Object.fromEntries(
  Object.entries(sliderDefinitions).map(([key, def]) => [key, def.min]),
) as Partial<Record<SliderParamKey, number>>

const defaultParamBaseline = {
  seed: 4683,
  resolution: 1,
  falloffCenterX: 0,
  falloffCenterY: FLOOR_Y + 2,
  falloffCenterZ: -16,
}

const cloneParams = (params: NoiseParams = defaultParams): NoiseParams => ({
  ...defaultParams,
  ...params,
})

const buildLeftMostParams = (): NoiseParams => {
  const leftMost: Partial<NoiseParams> = {}
  ;(Object.keys(sliderDefinitions) as SliderParamKey[]).forEach((key) => {
    leftMost[key] = sliderMinimums[key] ?? defaultParams[key]
  })
  return {
    ...defaultParams,
    ...leftMost,
    ...defaultParamBaseline,
    seed: 1,
  }
}
const cloneToggles = (toggles: NoiseToggles): NoiseToggles => ({ ...toggles })

const readPresets = (): SavedPreset[] => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as SavedPreset[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(
      (preset): preset is SavedPreset =>
        typeof preset?.id === 'string' &&
        typeof preset?.name === 'string' &&
        typeof preset?.params === 'object',
    )
  } catch (error) {
    console.warn('Failed to parse saved presets', error)
    return []
  }
}

const persistPresets = (presets: SavedPreset[]) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(presets))
  } catch (error) {
    console.warn('Failed to persist presets', error)
  }
}

const createPreset = (name: string, params: NoiseParams): SavedPreset => ({
  id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name,
  params: cloneParams(params),
})

export const useNoiseStore = create<NoiseStoreState>((set) => ({
  params: cloneParams(defaultParams),
  toggles: cloneToggles(defaultToggles),
  presets: readPresets(),
  falloffDragging: false,
  exportCounter: 0,
  screenshotCounter: 0,
  screenshotActive: false,
  setParam: (key, value) =>
    set((state) => ({
      params: {
        ...state.params,
        [key]:
          key === 'seed'
            ? Math.round(value)
            : key === 'resolution'
              ? clampResolution(value)
              : value,
      },
    })),
  setNoiseType: (algorithm) =>
    set((state) => ({
      params: {
        ...state.params,
        noiseType: algorithm,
      },
    })),
  randomizeSeed: () =>
    set((state) => ({
      params: {
        ...state.params,
        seed: Math.floor(Math.random() * 9000) + 1,
      },
    })),
  resetParams: () =>
    set((state) => ({
      params: {
        ...buildLeftMostParams(),
        resolution: state.params.resolution,
        noiseType: state.params.noiseType,
      },
      toggles: cloneToggles(defaultToggles),
      falloffDragging: false,
    })),
  toggleFlag: (flag) =>
    set((state) => ({
      toggles: {
        ...state.toggles,
        [flag]: !state.toggles[flag],
      },
    })),
  setFalloffCenter: (x, z) =>
    set((state) => ({
      params: {
        ...state.params,
        falloffCenterX: x,
        falloffCenterZ: z,
      },
    })),
  setFalloffHeight: (y) =>
    set((state) => ({
      params: {
        ...state.params,
        falloffCenterY: y,
      },
    })),
  setFalloffDragging: (dragging) =>
    set(() => ({
      falloffDragging: dragging,
    })),
  savePreset: (name) => {
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }
    set((state) => {
      const nextPresets = [...state.presets, createPreset(trimmed, state.params)]
      persistPresets(nextPresets)
      return { presets: nextPresets }
    })
  },
  loadPreset: (id) =>
    set((state) => {
      const preset = state.presets.find((entry) => entry.id === id)
      if (!preset) {
        return state
      }
      return {
        params: cloneParams(preset.params),
      }
    }),
  deletePreset: (id) =>
    set((state) => {
      const nextPresets = state.presets.filter((preset) => preset.id !== id)
      persistPresets(nextPresets)
      return { presets: nextPresets }
    }),
  requestExport: () =>
    set((state) => ({
      exportCounter: state.exportCounter + 1,
    })),
  requestScreenshot: () =>
    set((state) => ({
      screenshotCounter: state.screenshotCounter + 1,
    })),
  setScreenshotActive: (active) =>
    set(() => ({
      screenshotActive: active,
    })),
}))
