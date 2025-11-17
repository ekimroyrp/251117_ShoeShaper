import { Html, useProgress } from '@react-three/drei'

export const CanvasLoader = () => {
  const { progress } = useProgress()

  return (
    <Html center>
      <div className="canvas-loader">
        Loading Base Mesh&nbsp;
        <span>{progress.toFixed(0)}%</span>
      </div>
    </Html>
  )
}
