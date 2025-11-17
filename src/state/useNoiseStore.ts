import { create } from 'zustand'

export const noiseAlgorithms = ['simplex', 'ridge', 'warped'] as const

export type NoiseAlgorithm = (typeof noiseAlgorithms)[number]

export interface NoiseParams {
  seed: number
  amplitude: number
  clamp: number
  resolution: number
  falloff: number
  falloffCenterX: number
  falloffCenterZ: number
  frequency: number
  roughness: number
  warp: number
  ridge: number
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
type SliderParamKey = Exclude<NumericParamKey, 'resolution' | 'falloffCenterX' | 'falloffCenterZ'>

export interface SliderDefinition {
  key: SliderParamKey
  label: string
  min: number
  max: number
  step: number
  precision?: number
}

export const sliderDefinitions: SliderDefinition[] = [
  { key: 'amplitude', label: 'Displacement', min: 0, max: 6, step: 0.05, precision: 2 },
  { key: 'falloff', label: 'FALLOFF', min: 0, max: 10, step: 0.05, precision: 2 },
  { key: 'clamp', label: 'CLAMP', min: 0, max: 6, step: 0.05, precision: 2 },
  { key: 'frequency', label: 'Frequency', min: 0, max: 4, step: 0.05, precision: 2 },
  { key: 'roughness', label: 'Roughness', min: 0, max: 1.6, step: 0.05, precision: 2 },
  { key: 'warp', label: 'Warp', min: 0, max: 2.5, step: 0.05, precision: 2 },
  { key: 'ridge', label: 'Ridge', min: 0, max: 1, step: 0.02, precision: 2 },
  { key: 'seed', label: 'Seed', min: 1, max: 9999, step: 1, precision: 0 },
]

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
  setParam: (key: NumericParamKey, value: number) => void
  setNoiseType: (algorithm: NoiseAlgorithm) => void
  randomizeSeed: () => void
  resetParams: () => void
  toggleFlag: (flag: keyof NoiseToggles) => void
  setFalloffCenter: (x: number, z: number) => void
  setFalloffDragging: (dragging: boolean) => void
  savePreset: (name: string) => void
  loadPreset: (id: string) => void
  deletePreset: (id: string) => void
}

const defaultParams: NoiseParams = {
  seed: 1337,
  amplitude: 0,
  clamp: 0,
  resolution: 0,
  falloff: 0,
  falloffCenterX: 0,
  falloffCenterZ: -16,
  frequency: 0,
  roughness: 0,
  warp: 0,
  ridge: 0,
  noiseType: 'simplex',
}

const defaultToggles: NoiseToggles = {
  autoRotate: false,
  wireframe: false,
}

const storageKey = 'shoeshaper-presets'

const cloneParams = (params: NoiseParams = defaultParams): NoiseParams => ({
  ...defaultParams,
  ...params,
})
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
    set(() => ({
      params: cloneParams(defaultParams),
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
}))
