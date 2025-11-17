import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls, StatsGl } from '@react-three/drei'
import { ShoeModel } from './ShoeModel'
import { CanvasLoader } from './CanvasLoader'
import { useNoiseStore } from '../state/useNoiseStore'

export const ShoeCanvas = () => {
  const autoRotate = useNoiseStore((state) => state.toggles.autoRotate)

  return (
    <section className="canvas-shell">
      <Canvas shadows camera={{ position: [0, 0.8, 6], fov: 32 }}>
        <color attach="background" args={['#030805']} />
        <fog attach="fog" args={['#030805', 12, 48]} />
        <hemisphereLight args={['#aaffcb', '#031107', 0.25]} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={2}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-4, -6, -4]} intensity={0.4} />
        <Environment preset="night" />
        <Suspense fallback={<CanvasLoader />}>
          <ShoeModel />
        </Suspense>
        <StatsGl className="canvas-stats" />
        <OrbitControls
          enablePan={false}
          autoRotate={autoRotate}
          autoRotateSpeed={0.45}
          minPolarAngle={Math.PI * 0.25}
          maxPolarAngle={Math.PI * 0.65}
        />
      </Canvas>
    </section>
  )
}
