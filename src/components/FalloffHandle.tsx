import { useMemo, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { AdditiveBlending, Plane, Vector3 } from 'three'
import { useNoiseStore } from '../state/useNoiseStore'
import { FLOOR_Y } from '../constants/environment'

const HANDLE_Y = FLOOR_Y + 0.05
const RING_Y = FLOOR_Y + 0.001
const HANDLE_RADIUS = 0.12

export const FalloffHandle = () => {
  const falloffCenterX = useNoiseStore((state) => state.params.falloffCenterX)
  const falloffCenterZ = useNoiseStore((state) => state.params.falloffCenterZ)
  const setFalloffCenter = useNoiseStore((state) => state.setFalloffCenter)
  const setFalloffDragging = useNoiseStore((state) => state.setFalloffDragging)
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), -FLOOR_Y), [])
  const intersection = useMemo(() => new Vector3(), [])
  const activePointer = useRef<number | null>(null)

  const capturePointer = (event: ThreeEvent<PointerEvent>) => {
    const target = event.target as EventTarget & { setPointerCapture?: (pointerId: number) => void } | null
    target?.setPointerCapture?.(event.pointerId)
  }

  const releasePointer = (event: ThreeEvent<PointerEvent>) => {
    const target = event.target as EventTarget & { releasePointerCapture?: (pointerId: number) => void } | null
    target?.releasePointerCapture?.(event.pointerId)
  }

  return (
    <group>
      <mesh
        position={[falloffCenterX, RING_Y, falloffCenterZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation()
          activePointer.current = event.pointerId
          setFalloffDragging(true)
          capturePointer(event)
        }}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => {
          if (activePointer.current !== event.pointerId) {
            return
          }
          event.stopPropagation()
          const hasHit = event.ray.intersectPlane(plane, intersection)
          if (hasHit) {
            setFalloffCenter(intersection.x, intersection.z)
          }
        }}
        onPointerUp={(event: ThreeEvent<PointerEvent>) => {
          if (activePointer.current !== event.pointerId) {
            return
          }
          event.stopPropagation()
          activePointer.current = null
          setFalloffDragging(false)
          releasePointer(event)
        }}
        onPointerMissed={() => {
          activePointer.current = null
          setFalloffDragging(false)
        }}
      >
        <ringGeometry args={[HANDLE_RADIUS * 0.6, HANDLE_RADIUS, 48]} />
        <meshBasicMaterial color="#1cf3ff" opacity={0.55} transparent />
      </mesh>
      <mesh
        position={[falloffCenterX, HANDLE_Y, falloffCenterZ]}
        onPointerDown={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation()
          activePointer.current = event.pointerId
          const hasHit = event.ray.intersectPlane(plane, intersection)
          if (hasHit) {
            setFalloffCenter(intersection.x, intersection.z)
          }
          setFalloffDragging(true)
          capturePointer(event)
        }}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => {
          if (activePointer.current !== event.pointerId) {
            return
          }
          event.stopPropagation()
          const hasHit = event.ray.intersectPlane(plane, intersection)
          if (hasHit) {
            setFalloffCenter(intersection.x, intersection.z)
          }
        }}
        onPointerUp={(event: ThreeEvent<PointerEvent>) => {
          if (activePointer.current !== event.pointerId) {
            return
          }
          event.stopPropagation()
          activePointer.current = null
          setFalloffDragging(false)
          releasePointer(event)
        }}
        onPointerCancel={() => {
          activePointer.current = null
          setFalloffDragging(false)
        }}
      >
        <sphereGeometry args={[HANDLE_RADIUS, 32, 32]} />
        <meshStandardMaterial color="#ff1a1a" emissive="#ff0000" emissiveIntensity={0.75} />
      </mesh>
      <mesh
        position={[falloffCenterX, HANDLE_Y, falloffCenterZ]}
        scale={1.5}
        raycast={() => null}
      >
        <sphereGeometry args={[HANDLE_RADIUS, 32, 32]} />
        <meshBasicMaterial
          color="#ff3b3b"
          transparent
          opacity={0.45}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
