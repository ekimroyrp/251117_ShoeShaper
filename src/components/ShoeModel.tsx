import { useEffect, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { createNoise3D, type NoiseFunction3D } from 'simplex-noise'
import seedrandom from 'seedrandom'
import type { NoiseParams, NoiseToggles } from '../state/useNoiseStore'

const WELD_TOLERANCE = 1e-4

const weldGeometry = (geometry: BufferGeometry, tolerance = WELD_TOLERANCE) => {
  const position = geometry.getAttribute('position') as BufferAttribute
  const sourceIndex = geometry.index ? geometry.index.array : undefined
  const keyFactor = 1 / tolerance
  const positionMap = new Map<string, number>()
  const nextPosition: number[] = []
  const nextIndices: number[] = []

  const getVertexIndex = (i: number) => (sourceIndex ? sourceIndex[i] : i)

  for (let faceIndex = 0; faceIndex < (sourceIndex ? sourceIndex.length : position.count); faceIndex += 1) {
    const idx = getVertexIndex(faceIndex)
    const x = position.getX(idx)
    const y = position.getY(idx)
    const z = position.getZ(idx)
    const key = `${Math.round(x * keyFactor)}_${Math.round(y * keyFactor)}_${Math.round(z * keyFactor)}`
    let mapped = positionMap.get(key)
    if (mapped === undefined) {
      mapped = nextPosition.length / 3
      positionMap.set(key, mapped)
      nextPosition.push(x, y, z)
    }
    nextIndices.push(mapped)
  }

  const result = new BufferGeometry()
  result.setAttribute('position', new Float32BufferAttribute(nextPosition, 3))
  result.setIndex(nextIndices)
  result.computeVertexNormals()
  return result
}

const gatherGeometry = (group: Group) => {
  const geometries: BufferGeometry[] = []
  group.traverse((child) => {
    if ((child as Mesh).isMesh) {
      const mesh = child as Mesh
      const cloned = mesh.geometry.clone()
      cloned.applyMatrix4(mesh.matrixWorld)
      geometries.push(cloned)
    }
  })

  if (geometries.length === 0) {
    throw new Error('No geometry found in BaseShoe.obj')
  }

  const merged = mergeGeometries(geometries, true)
  merged.center()
  return weldGeometry(merged)
}

const createNoiseGenerator = (seed: number): NoiseFunction3D =>
  createNoise3D(seedrandom(String(seed)))

const sampleNoise = (
  simplex: NoiseFunction3D,
  type: string,
  point: Vector3,
  params: { frequency: number; roughness: number; warp: number; ridge: number },
) => {
  const layers = 3
  let amplitude = 1
  let frequency = params.frequency
  let value = 0
  const warpedPoint = point.clone()

  if (params.warp > 0) {
    const warpVector = new Vector3(
      simplex(point.x * 0.5, point.y * 0.5, point.z * 0.5),
      simplex(point.y * 0.5, point.z * 0.5, point.x * 0.5),
      simplex(point.z * 0.5, point.x * 0.5, point.y * 0.5),
    ).multiplyScalar(params.warp)
    warpedPoint.add(warpVector)
  }

  for (let layer = 0; layer < layers; layer += 1) {
    const noiseSample = simplex(
      warpedPoint.x * frequency,
      warpedPoint.y * frequency,
      warpedPoint.z * frequency,
    )
    if (type === 'ridge') {
      const ridge = 1 - Math.abs(noiseSample)
      value += Math.pow(ridge, 1.2 + params.ridge) * amplitude
    } else if (type === 'warped') {
      value += Math.sin(noiseSample * Math.PI) * amplitude
    } else {
      value += noiseSample * amplitude
    }
    frequency *= 1.8
    amplitude *= params.roughness
  }

  return value
}

interface ShoeModelProps {
  params: NoiseParams
  toggles: NoiseToggles
}

export const ShoeModel = ({ params, toggles }: ShoeModelProps) => {
  const obj = useLoader(OBJLoader, '/models/BaseShoe.obj')

  const baseGeometry = useMemo(() => gatherGeometry(obj), [obj])

  const displacedGeometry = useMemo(() => {
    const geometry = baseGeometry.clone()
    const positions = geometry.getAttribute('position') as BufferAttribute
    const normals = geometry.getAttribute('normal') as BufferAttribute
    const displacements = new Float32Array(positions.count * 3)
    const simplex = createNoiseGenerator(params.seed)
    const normal = new Vector3()
    const position = new Vector3()
    const clampLimit = Math.max(0, params.clamp ?? 0)

    for (let i = 0; i < positions.count; i += 1) {
      position.set(positions.getX(i), positions.getY(i), positions.getZ(i))
      const sample = sampleNoise(simplex, params.noiseType, position, params)
      normal.set(normals.getX(i), normals.getY(i), normals.getZ(i)).normalize()
      const rawOffset = sample * params.amplitude
      const offset =
        clampLimit === 0
          ? 0
          : clampLimit > 0 && Math.abs(rawOffset) > clampLimit
            ? Math.sign(rawOffset) * clampLimit
            : rawOffset
      displacements[i * 3] = normal.x * offset
      displacements[i * 3 + 1] = normal.y * offset
      displacements[i * 3 + 2] = normal.z * offset
    }

    for (let i = 0; i < positions.count; i += 1) {
      position.set(positions.getX(i), positions.getY(i), positions.getZ(i))
      position.x += displacements[i * 3]
      position.y += displacements[i * 3 + 1]
      position.z += displacements[i * 3 + 2]
      positions.setXYZ(i, position.x, position.y, position.z)
    }

    positions.needsUpdate = true
    geometry.computeVertexNormals()

    const planeY = -1.15
    const clearance = 0.02
    geometry.computeBoundingBox()
    const minY = geometry.boundingBox?.min.y ?? 0
    const lift = planeY + clearance - minY
    if (lift > 0) {
      geometry.translate(0, lift, 0)
      geometry.computeBoundingBox()
    }

    return weldGeometry(geometry)
  }, [
    params.amplitude,
    params.clamp,
    params.frequency,
    params.noiseType,
    params.ridge,
    params.roughness,
    params.seed,
    params.warp,
    baseGeometry,
  ])

  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color('#d4ffe3'),
        roughness: 0.35,
        metalness: 0.1,
        emissive: new Color('#1b4130').multiplyScalar(0.4),
        wireframe: toggles.wireframe,
      }),
    [toggles.wireframe],
  )

  useEffect(
    () => () => {
      material.dispose()
    },
    [material],
  )

  return (
    <group position={[0, -1.2, 0]}>
      <mesh geometry={displacedGeometry} material={material} castShadow receiveShadow />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.15, 0]}
        receiveShadow
      >
        <planeGeometry args={[24, 24, 1, 1]} />
        <meshStandardMaterial color="#021108" transparent opacity={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.14, 0]}>
        <ringGeometry args={[1.6, 7, 64]} />
        <meshBasicMaterial color="#0aff8a" opacity={0.08} transparent />
      </mesh>
    </group>
  )
}
