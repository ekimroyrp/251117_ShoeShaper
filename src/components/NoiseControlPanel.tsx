import { useMemo, useState } from 'react'
import { CyberSlider } from './CyberSlider'
import {
  algorithmSliderMap,
  baseSliderKeys,
  type NoiseAlgorithm,
  noiseAlgorithms,
  resolutionOptions,
  sliderDefinitions,
  sliderOrder,
  type SliderParamKey,
  useNoiseStore,
} from '../state/useNoiseStore'
import { SelectField } from './SelectField'

const noiseLabels: Record<NoiseAlgorithm, string> = {
  none: 'NONE',
  simplex: 'SIMPLEX',
  alligator: 'ALLIGATOR',
  reaction: 'REACTION DIFFUSION',
  worley: 'WORLEY',
  warped: 'WARPED',
  curl: 'CURL',
  ridge: 'RIDGE',
}

export const NoiseControlPanel = () => {
  const {
    params,
    toggles,
    presets,
    setParam,
    setNoiseType,
    randomizeSeed,
    requestExport,
    requestScreenshot,
    resetParams,
    toggleFlag,
    savePreset,
    loadPreset,
    deletePreset,
  } = useNoiseStore()
  const [presetName, setPresetName] = useState('')

  const sliderKeySet = useMemo(() => {
    if (params.noiseType === 'none') {
      return new Set<SliderParamKey>()
    }
    return new Set<SliderParamKey>([
      ...baseSliderKeys,
      ...(algorithmSliderMap[params.noiseType] ?? []),
    ])
  }, [params.noiseType])
  const orderedSliderKeys = useMemo(
    () => sliderOrder.filter((key) => sliderKeySet.has(key)),
    [sliderKeySet],
  )

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      return
    }
    savePreset(presetName)
    setPresetName('')
  }

  return (
    <aside className="control-panel">
      <SelectField
        label="RESOLUTION"
        value={params.resolution}
        onSelect={(next) => setParam('resolution', next)}
        options={resolutionOptions.map((level) => ({ label: `Level ${level + 1}`, value: level }))}
      />

      <SelectField
        label="Noise Mode"
        value={params.noiseType}
        onSelect={(next) => setNoiseType(next)}
        options={noiseAlgorithms.map((algorithm) => ({
          label: noiseLabels[algorithm] ?? algorithm.toUpperCase(),
          value: algorithm,
        }))}
      />

      <div className="panel-grid">
        {orderedSliderKeys.map((key) => {
          const slider = sliderDefinitions[key]
          return (
            <CyberSlider
              key={key}
              {...slider}
              value={params[key]}
              onChange={(value) => setParam(key, value)}
            />
          )
        })}
      </div>

      <div className="panel-actions panel-actions--grid">
        <button type="button" onClick={randomizeSeed}>
          Pulse Seed
        </button>
        <button type="button" onClick={resetParams}>
          Reset Controls
        </button>
        <button type="button" onClick={() => toggleFlag('wireframe')}>
          {toggles.wireframe ? 'Hide Wireframe' : 'Show Wireframe'}
        </button>
        <button type="button" onClick={() => toggleFlag('autoRotate')}>
          {toggles.autoRotate ? 'Pause Orbit' : 'Auto Orbit'}
        </button>
        <button type="button" onClick={requestExport}>
          Export Mesh
        </button>
        <button type="button" onClick={requestScreenshot}>
          Take Screenshot
        </button>
      </div>

      <div className="panel-section panel-section--preset">
        <label className="panel-label" htmlFor="preset-name">
          Save Preset
        </label>
        <div className="preset-save">
          <input
            id="preset-name"
            className="preset-input"
            placeholder="Enter preset name"
            value={presetName}
            onChange={(event) => setPresetName(event.target.value)}
          />
          <button type="button" onClick={handleSavePreset}>
            Save
          </button>
        </div>
        <div className="preset-list">
          {presets.length === 0 ? (
            <p className="preset-list__empty">No saved presets yet.</p>
          ) : (
            presets.map((preset) => (
              <div key={preset.id} className="preset-list__item">
                <span>{preset.name}</span>
                <div className="preset-list__actions">
                  <button type="button" onClick={() => loadPreset(preset.id)}>
                    Load
                  </button>
                  <button
                    type="button"
                    className="preset-list__delete"
                    onClick={() => deletePreset(preset.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  )
}
