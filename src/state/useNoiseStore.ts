import { create } from 'zustand'

export const noiseAlgorithms = ['simplex', 'ridge', 'warped'] as const

export type NoiseAlgorithm = (typeof noiseAlgorithms)[number]

export interface NoiseParams {
  seed: number
  amplitude: number
  frequency: number
  roughness: number
  warp: number
  ridge: number
  remeshRatio: number
  noiseType: NoiseAlgorithm
}

export interface NoiseToggles {
  autoRotate: boolean
  wireframe: boolean
}

type NumericParamKey = Exclude<keyof NoiseParams, 'noiseType'>

export interface SliderDefinition {
  key: NumericParamKey
  label: string
  min: number
  max: number
  step: number
  precision?: number
}

export const sliderDefinitions: SliderDefinition[] = [
  { key: 'amplitude', label: 'Displacement', min: 0, max: 6, step: 0.05, precision: 2 },
  { key: 'frequency', label: 'Frequency', min: 0.15, max: 4, step: 0.05, precision: 2 },
  { key: 'roughness', label: 'Roughness', min: 0.2, max: 1.6, step: 0.05, precision: 2 },
  { key: 'warp', label: 'Warp', min: 0, max: 2.5, step: 0.05, precision: 2 },
  { key: 'ridge', label: 'Ridge', min: 0, max: 1, step: 0.02, precision: 2 },
  { key: 'remeshRatio', label: 'Remesh Density', min: 0.25, max: 1, step: 0.01, precision: 2 },
  { key: 'seed', label: 'Seed', min: 1, max: 9999, step: 1, precision: 0 },
]

interface NoiseStoreState {
  params: NoiseParams
  toggles: NoiseToggles
  setParam: (key: NumericParamKey, value: number) => void
  setNoiseType: (algorithm: NoiseAlgorithm) => void
  randomizeSeed: () => void
  resetParams: () => void
  toggleFlag: (flag: keyof NoiseToggles) => void
}

const defaultParams: NoiseParams = {
  seed: 1337,
  amplitude: 2.5,
  frequency: 1.4,
  roughness: 0.8,
  warp: 0.4,
  ridge: 0.25,
  remeshRatio: 0.65,
  noiseType: 'simplex',
}

const defaultToggles: NoiseToggles = {
  autoRotate: true,
  wireframe: false,
}

export const useNoiseStore = create<NoiseStoreState>((set) => ({
  params: defaultParams,
  toggles: defaultToggles,
  setParam: (key, value) =>
    set((state) => ({
      params: {
        ...state.params,
        [key]: key === 'seed' ? Math.round(value) : value,
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
      params: defaultParams,
      toggles: defaultToggles,
    })),
  toggleFlag: (flag) =>
    set((state) => ({
      toggles: {
        ...state.toggles,
        [flag]: !state.toggles[flag],
      },
    })),
}))
