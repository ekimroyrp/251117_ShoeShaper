import { useEffect, useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { createNoise3D, type NoiseFunction3D } from 'simplex-noise'
import seedrandom from 'seedrandom'
import type { NoiseParams, NoiseToggles } from '../state/useNoiseStore'

const simplifyModifier = new SimplifyModifier()

const gatherGeometry = (group: Group) => {
  const geometries: BufferGeometry[] = []
  group.traverse((child) => {
    if ((child as Mesh).isMesh) {
      const mesh = child as Mesh
      const cloned = mesh.geometry.clone()
      geometries.push(cloned)
    }
  })

  if (geometries.length === 0) {
    throw new Error('No geometry found in BaseShoe.obj')
  }

  const merged = mergeGeometries(geometries, false)
  merged.center()
  merged.computeVertexNormals()
  return merged
}

const applyRemesh = (geometry: BufferGeometry, ratio: number) => {
  const remeshed = geometry.clone()
  const originalCount = geometry.attributes.position.count
  const targetCount = Math.max(1500, Math.floor(originalCount * ratio))

  if (targetCount < originalCount) {
    simplifyModifier.modify(remeshed, targetCount)
  }

  remeshed.computeVertexNormals()
  return remeshed
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

  const remeshedGeometry = useMemo(
    () => applyRemesh(baseGeometry, params.remeshRatio),
    [baseGeometry, params.remeshRatio],
  )

  const displacedGeometry = useMemo(() => {
    const geometry = remeshedGeometry.clone()
    const positions = geometry.getAttribute('position') as BufferAttribute
    const normals = geometry.getAttribute('normal') as BufferAttribute
    const simplex = createNoiseGenerator(params.seed)
    const workingNormal = new Vector3()
    const samplePoint = new Vector3()

    for (let i = 0; i < positions.count; i += 1) {
      samplePoint.set(positions.getX(i), positions.getY(i), positions.getZ(i))
      const sample = sampleNoise(simplex, params.noiseType, samplePoint, params)
      workingNormal.set(normals.getX(i), normals.getY(i), normals.getZ(i))
      const offset = sample * params.amplitude
      samplePoint.addScaledVector(workingNormal, offset)
      positions.setXYZ(i, samplePoint.x, samplePoint.y, samplePoint.z)
    }

    positions.needsUpdate = true
    geometry.computeVertexNormals()
    return geometry
  }, [
    remeshedGeometry,
    params.amplitude,
    params.frequency,
    params.noiseType,
    params.remeshRatio,
    params.ridge,
    params.roughness,
    params.seed,
    params.warp,
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
