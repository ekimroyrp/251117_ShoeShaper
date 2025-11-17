import { CyberSlider } from './CyberSlider'
import {
  noiseAlgorithms,
  sliderDefinitions,
  useNoiseStore,
} from '../state/useNoiseStore'

export const NoiseControlPanel = () => {
  const { params, toggles, setParam, setNoiseType, randomizeSeed, resetParams, toggleFlag } =
    useNoiseStore()

  return (
    <aside className="control-panel">
      <div className="panel-header">
        <h1>ShoeShaper</h1>
        <p>Cyberpunk noise lab — sculpt the base mesh with displacement fields.</p>
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
