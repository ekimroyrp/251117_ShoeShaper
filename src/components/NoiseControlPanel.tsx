import { useState } from 'react'
import { CyberSlider } from './CyberSlider'
import {
  noiseAlgorithms,
  resolutionOptions,
  sliderDefinitions,
  useNoiseStore,
} from '../state/useNoiseStore'

export const NoiseControlPanel = () => {
  const {
    params,
    toggles,
    presets,
    setParam,
    setNoiseType,
    randomizeSeed,
    resetParams,
    toggleFlag,
    savePreset,
    loadPreset,
    deletePreset,
  } = useNoiseStore()
  const [presetName, setPresetName] = useState('')

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      return
    }
    savePreset(presetName)
    setPresetName('')
  }

  return (
    <aside className="control-panel">
      <div className="panel-section">
        <label className="panel-label" htmlFor="mesh-resolution">
          RESOLUTION
        </label>
        <div className="select-shell">
          <select
            id="mesh-resolution"
            value={params.resolution}
            onChange={(event) => setParam('resolution', Number(event.target.value))}
          >
            {resolutionOptions.map((level) => (
              <option key={level} value={level}>
                Level {level}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel-section">
        <label className="panel-label" htmlFor="noise-type">
          Noise Mode
        </label>
        <div className="select-shell">
          <select
            id="noise-type"
            value={params.noiseType}
            onChange={(event) => setNoiseType(event.target.value as typeof params.noiseType)}
          >
            {noiseAlgorithms.map((algorithm) => (
              <option key={algorithm} value={algorithm}>
                {algorithm.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel-grid">
        {sliderDefinitions.map(({ key, ...slider }) => (
          <CyberSlider
            key={key}
            {...slider}
            value={params[key]}
            onChange={(value) => setParam(key, value)}
          />
        ))}
      </div>

      <div className="panel-section">
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

      <div className="panel-section toggle-grid">
        <button type="button" onClick={() => toggleFlag('wireframe')}>
          {toggles.wireframe ? 'Hide Wireframe' : 'Show Wireframe'}
        </button>
        <button type="button" onClick={() => toggleFlag('autoRotate')}>
          {toggles.autoRotate ? 'Pause Orbit' : 'Auto Orbit'}
        </button>
      </div>

      <div className="panel-actions">
        <button type="button" onClick={randomizeSeed}>
          Pulse Seed
        </button>
        <button type="button" onClick={resetParams}>
          Reset Controls
        </button>
      </div>
    </aside>
  )
}
