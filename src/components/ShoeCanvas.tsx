import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls } from '@react-three/drei'
import { ShoeModel } from './ShoeModel'
import { useNoiseStore } from '../state/useNoiseStore'
import { CanvasLoader } from './CanvasLoader'
import { FalloffHandle } from './FalloffHandle'
import { GroundGrid } from './GroundGrid'
import { AxisWidget } from './AxisWidget'

export const ShoeCanvas = () => {
  const params = useNoiseStore((state) => state.params)
  const toggles = useNoiseStore((state) => state.toggles)
  const falloffDragging = useNoiseStore((state) => state.falloffDragging)

  return (
    <section className="canvas-shell">
      <Canvas
        shadows
        camera={{ position: [-48, 18, -48], fov: 35 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <color attach="background" args={['#030805']} />
        <hemisphereLight args={['#aaffcb', '#031107', 0.25]} />
        <directionalLight position={[5, 8, 5]} intensity={2} castShadow shadow-mapSize={[2048, 2048]} />
        <directionalLight position={[-4, -6, -4]} intensity={0.4} />
        <Environment preset="night" />
        <Suspense fallback={<CanvasLoader />}>
          <ShoeModel params={params} toggles={toggles} />
          <FalloffHandle />
          <GroundGrid />
          <AxisWidget />
        </Suspense>
        <OrbitControls autoRotate={toggles.autoRotate} enabled={!falloffDragging} target={[0, 2, 0]} />
      </Canvas>
    </section>
  )
}
