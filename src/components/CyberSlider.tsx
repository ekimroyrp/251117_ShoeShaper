import type { SliderDefinition } from '../state/useNoiseStore'

interface CyberSliderProps extends SliderDefinition {
  value: number
  onChange: (value: number) => void
}

const SEGMENTS = 18

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const formatValue = (value: number, precision = 2) =>
  value.toFixed(Math.max(0, precision))

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const heatColor = (t: number) => {
  const clamped = clamp01(t)
  const palette = [
    [47, 255, 127],
    [255, 241, 99],
    [255, 54, 54],
  ]
  const half = clamped < 0.5
  const local = half ? clamped / 0.5 : (clamped - 0.5) / 0.5
  const start = half ? palette[0] : palette[1]
  const end = half ? palette[1] : palette[2]
  const channel = (index: number) => lerp(start[index], end[index], local).toFixed(0)
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`
}

export const CyberSlider = ({
  label,
  value,
  min,
  max,
  step,
  precision = 2,
  onChange,
}: CyberSliderProps) => {
  const ratio = clamp01((value - min) / (max - min))
  const filled = Math.round(ratio * SEGMENTS)

  return (
    <label className="cyber-slider">
      <div className="cyber-slider__header">
        <span>{label}</span>
        <span className="cyber-slider__value">{formatValue(value, precision)}</span>
      </div>
      <div className="cyber-slider__body">
        <div className="cyber-slider__track">
          {Array.from({ length: SEGMENTS }, (_, index) => {
            const dashColor = heatColor(index / (SEGMENTS - 1))
            const isFilled = index < filled
            return (
              <span
                key={index}
                className={`cyber-slider__dash ${isFilled ? 'cyber-slider__dash--filled' : ''}`}
                style={{
                  backgroundColor: dashColor,
                  opacity: isFilled ? 1 : 0.22,
                  boxShadow: isFilled ? `0 0 10px ${dashColor}` : 'inset 0 0 6px rgba(0,0,0,0.4)',
                }}
              />
            )
          })}
        </div>
        <input
          className="cyber-slider__input"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={(event) => onChange(Number(event.currentTarget.value))}
        />
      </div>
    </label>
  )
}
