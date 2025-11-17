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
  Vector2,
  Vector3,
} from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { createNoise3D, type NoiseFunction3D } from 'simplex-noise'
import seedrandom from 'seedrandom'
import type { NoiseParams, NoiseToggles } from '../state/useNoiseStore'
import { FLOOR_CLEARANCE, FLOOR_Y } from '../constants/environment'

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

const subdivideGeometry = (geometry: BufferGeometry, levels: number) => {
  if (levels <= 0) {
    return geometry
  }

  let current = geometry
  const va = new Vector3()
  const vb = new Vector3()
  const vc = new Vector3()
  const vab = new Vector3()
  const vbc = new Vector3()
  const vca = new Vector3()
  const na = new Vector3()
  const nb = new Vector3()
  const nc = new Vector3()
  const nab = new Vector3()
  const nbc = new Vector3()
  const nca = new Vector3()
  const uva = new Vector2()
  const uvb = new Vector2()
  const uvc = new Vector2()
  const uvab = new Vector2()
  const uvbc = new Vector2()
  const uvca = new Vector2()

  const pushVertex = (
    positions: number[],
    normals: number[] | undefined,
    uvs: number[] | undefined,
    vertex: Vector3,
    normal?: Vector3,
    uv?: Vector2,
  ) => {
    positions.push(vertex.x, vertex.y, vertex.z)
    if (normals && normal) {
      normals.push(normal.x, normal.y, normal.z)
    }
    if (uvs && uv) {
      uvs.push(uv.x, uv.y)
    }
  }

  for (let iteration = 0; iteration < levels; iteration += 1) {
    const source = current.toNonIndexed()
    const positionAttr = source.getAttribute('position') as BufferAttribute
    const normalAttr = source.getAttribute('normal') as BufferAttribute | undefined
    const uvAttr = source.getAttribute('uv') as BufferAttribute | undefined
    const nextPositions: number[] = []
    const nextNormals: number[] | undefined = normalAttr ? [] : undefined
    const nextUVs: number[] | undefined = uvAttr ? [] : undefined
    const vertexCount = positionAttr.count

    for (let i = 0; i < vertexCount; i += 3) {
      va.fromBufferAttribute(positionAttr, i)
      vb.fromBufferAttribute(positionAttr, i + 1)
      vc.fromBufferAttribute(positionAttr, i + 2)

      vab.addVectors(va, vb).multiplyScalar(0.5)
      vbc.addVectors(vb, vc).multiplyScalar(0.5)
      vca.addVectors(vc, va).multiplyScalar(0.5)

      if (normalAttr && nextNormals) {
        na.fromBufferAttribute(normalAttr, i)
        nb.fromBufferAttribute(normalAttr, i + 1)
        nc.fromBufferAttribute(normalAttr, i + 2)

        nab.addVectors(na, nb).normalize()
        nbc.addVectors(nb, nc).normalize()
        nca.addVectors(nc, na).normalize()
      }

      if (uvAttr && nextUVs) {
        uva.fromBufferAttribute(uvAttr, i)
        uvb.fromBufferAttribute(uvAttr, i + 1)
        uvc.fromBufferAttribute(uvAttr, i + 2)

        uvab.addVectors(uva, uvb).multiplyScalar(0.5)
        uvbc.addVectors(uvb, uvc).multiplyScalar(0.5)
        uvca.addVectors(uvc, uva).multiplyScalar(0.5)
      }

      const triangles: Array<{
        v1: Vector3
        v2: Vector3
        v3: Vector3
        n1?: Vector3
        n2?: Vector3
        n3?: Vector3
        uv1?: Vector2
        uv2?: Vector2
        uv3?: Vector2
      }> = [
        { v1: va, v2: vab, v3: vca, n1: na, n2: nab, n3: nca, uv1: uva, uv2: uvab, uv3: uvca },
        { v1: vab, v2: vb, v3: vbc, n1: nab, n2: nb, n3: nbc, uv1: uvab, uv2: uvb, uv3: uvbc },
        { v1: vca, v2: vbc, v3: vc, n1: nca, n2: nbc, n3: nc, uv1: uvca, uv2: uvbc, uv3: uvc },
        { v1: vab, v2: vbc, v3: vca, n1: nab, n2: nbc, n3: nca, uv1: uvab, uv2: uvbc, uv3: uvca },
      ]

      for (const tri of triangles) {
        pushVertex(nextPositions, nextNormals, nextUVs, tri.v1, tri.n1, tri.uv1)
        pushVertex(nextPositions, nextNormals, nextUVs, tri.v2, tri.n2, tri.uv2)
        pushVertex(nextPositions, nextNormals, nextUVs, tri.v3, tri.n3, tri.uv3)
      }
    }

    const subdivided = new BufferGeometry()
    subdivided.setAttribute('position', new Float32BufferAttribute(nextPositions, 3))
    if (nextNormals) {
      subdivided.setAttribute('normal', new Float32BufferAttribute(nextNormals, 3))
    }
    if (nextUVs) {
      subdivided.setAttribute('uv', new Float32BufferAttribute(nextUVs, 2))
    }

    current = subdivided
  }

  return current
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

  const sculptGeometry = useMemo(() => {
    if (params.resolution <= 0) {
      return baseGeometry
    }
    const subdivided = subdivideGeometry(baseGeometry.clone(), params.resolution)
    const welded = weldGeometry(subdivided, WELD_TOLERANCE)
    welded.computeVertexNormals()
    return welded
  }, [baseGeometry, params.resolution])

  const displacedGeometry = useMemo(() => {
    const geometry = sculptGeometry.clone()
    const positions = geometry.getAttribute('position') as BufferAttribute
    const normals = geometry.getAttribute('normal') as BufferAttribute
    const displacements = new Float32Array(positions.count * 3)
    const simplex = createNoiseGenerator(params.seed)
    const normal = new Vector3()
    const position = new Vector3()
    const clampLimit = Math.max(0, params.clamp ?? 0)
    const falloffCenter = new Vector3(params.falloffCenterX, FLOOR_Y, params.falloffCenterZ)
    const falloffDistances = new Float32Array(positions.count)
    let maxDistance = 0

    for (let i = 0; i < positions.count; i += 1) {
      position.set(positions.getX(i), positions.getY(i), positions.getZ(i))
      const distance = falloffCenter.distanceTo(position)
      falloffDistances[i] = distance
      if (distance > maxDistance) {
        maxDistance = distance
      }
    }

    const invMaxDistance = maxDistance > 0 ? 1 / maxDistance : 0
    const falloffExponent = 1 + Math.max(0, params.falloff ?? 0)

    for (let i = 0; i < positions.count; i += 1) {
      position.set(positions.getX(i), positions.getY(i), positions.getZ(i))
      const sample = sampleNoise(simplex, params.noiseType, position, params)
      normal.set(normals.getX(i), normals.getY(i), normals.getZ(i)).normalize()
      const normalizedDistance =
        invMaxDistance === 0 ? 0 : Math.min(1, falloffDistances[i] * invMaxDistance)
      const falloffWeight = Math.pow(normalizedDistance, falloffExponent)
      const rawOffset = sample * params.amplitude * falloffWeight
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

    geometry.computeBoundingBox()
    const minY = geometry.boundingBox?.min.y ?? 0
    const lift = FLOOR_Y + FLOOR_CLEARANCE - minY
    if (lift > 0) {
      geometry.translate(0, lift, 0)
      geometry.computeBoundingBox()
    }

    return weldGeometry(geometry)
  }, [
    params.amplitude,
    params.clamp,
    params.falloff,
    params.falloffCenterX,
    params.falloffCenterZ,
    params.frequency,
    params.noiseType,
    params.ridge,
    params.roughness,
    params.seed,
    params.warp,
    sculptGeometry,
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} receiveShadow>
        <planeGeometry args={[24, 24, 1, 1]} />
        <meshStandardMaterial color="#021108" transparent opacity={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.01, 0]}>
        <ringGeometry args={[1.6, 7, 64]} />
        <meshBasicMaterial color="#0aff8a" opacity={0.08} transparent />
      </mesh>
    </group>
  )
}
