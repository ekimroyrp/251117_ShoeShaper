import { useMemo, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import { AdditiveBlending, Plane, Vector3 } from 'three'
import { useNoiseStore } from '../state/useNoiseStore'

const HANDLE_RADIUS = 0.24
const LABEL_OFFSET = -1
const ARROW_OFFSET = 1
const HEIGHT_DRAG_SCALE = 0.03

export const FalloffHandle = () => {
  const noiseType = useNoiseStore((state) => state.params.noiseType)
  const falloffCenterX = useNoiseStore((state) => state.params.falloffCenterX)
  const falloffCenterY = useNoiseStore((state) => state.params.falloffCenterY)
  const falloffCenterZ = useNoiseStore((state) => state.params.falloffCenterZ)
  const screenshotActive = useNoiseStore((state) => state.screenshotActive)
  const setFalloffCenter = useNoiseStore((state) => state.setFalloffCenter)
  const setFalloffHeight = useNoiseStore((state) => state.setFalloffHeight)
  const setFalloffDragging = useNoiseStore((state) => state.setFalloffDragging)
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), -falloffCenterY), [falloffCenterY])
  const intersection = useMemo(() => new Vector3(), [])
  const planarPointer = useRef<number | null>(null)
  const heightPointer = useRef<{ id: number; startY: number; baseHeight: number } | null>(null)

  const capturePointer = (event: ThreeEvent<PointerEvent>) => {
    const target = event.target as EventTarget & { setPointerCapture?: (pointerId: number) => void } | null
    target?.setPointerCapture?.(event.pointerId)
  }

  const releasePointer = (event: ThreeEvent<PointerEvent>) => {
    const target = event.target as EventTarget & { releasePointerCapture?: (pointerId: number) => void } | null
    target?.releasePointerCapture?.(event.pointerId)
  }

  if (noiseType === 'none' || screenshotActive) {
    return null
  }

  const handleY = falloffCenterY
  const ringY = falloffCenterY - 0.01
  const labelY = handleY + LABEL_OFFSET
  const arrowY = handleY + ARROW_OFFSET

  const beginPlanarDrag = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    planarPointer.current = event.pointerId
    setFalloffDragging(true)
    capturePointer(event)
  }

  const endPlanarDrag = (event: ThreeEvent<PointerEvent>) => {
    if (planarPointer.current !== event.pointerId) {
      return
    }
    event.stopPropagation()
    planarPointer.current = null
    setFalloffDragging(false)
    releasePointer(event)
  }

  const beginHeightDrag = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    heightPointer.current = {
      id: event.pointerId,
      startY: event.clientY,
      baseHeight: falloffCenterY,
    }
    setFalloffDragging(true)
    capturePointer(event)
  }

  const endHeightDrag = (event?: ThreeEvent<PointerEvent>) => {
    if (heightPointer.current && (!event || heightPointer.current.id === event.pointerId)) {
      if (event) {
        event.stopPropagation()
        releasePointer(event)
      }
      heightPointer.current = null
      setFalloffDragging(false)
    }
  }

  return (
    <group>
      <mesh
        position={[falloffCenterX, ringY, falloffCenterZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={beginPlanarDrag}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => {
          if (planarPointer.current !== event.pointerId) {
            return
          }
          event.stopPropagation()
          const hasHit = event.ray.intersectPlane(plane, intersection)
          if (hasHit) {
            setFalloffCenter(intersection.x, intersection.z)
          }
        }}
        onPointerUp={endPlanarDrag}
        onPointerMissed={() => {
          planarPointer.current = null
          setFalloffDragging(false)
        }}
      >
        <ringGeometry args={[HANDLE_RADIUS * 0.6, HANDLE_RADIUS, 48]} />
        <meshBasicMaterial color="#1cf3ff" opacity={0.55} transparent />
      </mesh>
      <mesh
        position={[falloffCenterX, handleY, falloffCenterZ]}
        onPointerDown={(event: ThreeEvent<PointerEvent>) => {
          beginPlanarDrag(event)
          const hasHit = event.ray.intersectPlane(plane, intersection)
          if (hasHit) {
            setFalloffCenter(intersection.x, intersection.z)
          }
        }}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => {
          if (planarPointer.current !== event.pointerId) {
            return
          }
          event.stopPropagation()
          const hasHit = event.ray.intersectPlane(plane, intersection)
          if (hasHit) {
            setFalloffCenter(intersection.x, intersection.z)
          }
        }}
        onPointerUp={endPlanarDrag}
        onPointerCancel={endPlanarDrag}
      >
        <sphereGeometry args={[HANDLE_RADIUS, 32, 32]} />
        <meshStandardMaterial color="#ff1a1a" emissive="#ff0000" emissiveIntensity={0.75} />
      </mesh>
      <mesh position={[falloffCenterX, handleY, falloffCenterZ]} scale={1.5} raycast={() => null}>
        <sphereGeometry args={[HANDLE_RADIUS, 32, 32]} />
        <meshBasicMaterial
          color="#ff3b3b"
          transparent
          opacity={0.45}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <Billboard position={[falloffCenterX, labelY, falloffCenterZ]} follow>
        <Text
          font="/fonts/ShareTechMono-Regular.ttf"
          fontSize={0.4}
          color="#ff3b3b"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          FALLOFF POINT
        </Text>
      </Billboard>
      <group
        position={[falloffCenterX, arrowY, falloffCenterZ]}
        onPointerDown={beginHeightDrag}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => {
          if (heightPointer.current?.id !== event.pointerId) {
            return
          }
          event.stopPropagation()
          const deltaPx = heightPointer.current.startY - event.clientY
          const targetHeight =
            heightPointer.current.baseHeight + deltaPx * HEIGHT_DRAG_SCALE
          setFalloffHeight(targetHeight)
        }}
        onPointerUp={endHeightDrag}
        onPointerCancel={() => endHeightDrag()}
      >
        <mesh>
          <cylinderGeometry args={[0.06, 0.06, 0.8, 16]} />
          <meshStandardMaterial color="#ff4d4d" emissive="#ff4d4d" emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, 0.55, 0]}>
          <coneGeometry args={[0.12, 0.27, 16]} />
          <meshStandardMaterial color="#ff4d4d" emissive="#ff4d4d" emissiveIntensity={0.6} />
        </mesh>
      </group>
    </group>
  )
}
