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
import type { NoiseAlgorithm, NoiseParams, NoiseToggles } from '../state/useNoiseStore'
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

const hashFloat = (x: number, y: number, z: number, seed: number) => {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed * 95.233)
  return (s - Math.floor(s)) || 0
}

const hashVec3 = (x: number, y: number, z: number, seed: number) =>
  new Vector3(
    hashFloat(x, y, z, seed),
    hashFloat(x + 19.19, y - 55.5, z + 3.3, seed + 1),
    hashFloat(x - 11.7, y + 8.33, z - 4.52, seed + 2),
  )

const layeredSimplex = (
  simplex: NoiseFunction3D,
  mode: 'simplex' | 'ridge' | 'warped',
  point: Vector3,
  params: NoiseParams,
) => {
  const layers = 3
  let amplitude = 1
  let frequency = Math.max(0.0001, params.frequency)
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
    if (mode === 'ridge') {
      const ridge = 1 - Math.abs(noiseSample)
      value += Math.pow(ridge, 1.2 + params.ridge) * amplitude
    } else if (mode === 'warped') {
      value += Math.sin(noiseSample * Math.PI) * amplitude
    } else {
      value += noiseSample * amplitude
    }
    frequency *= 1.8
    amplitude *= params.roughness
  }

  return value
}

const worleyNoise = (point: Vector3, params: NoiseParams, seed: number) => {
  const freq = Math.max(0.0001, params.frequency)
  const jitter = Math.max(0, Math.min(1, params.worleyJitter))
  const blend = Math.max(0, Math.min(1, params.worleyBlend))
  const scaled = point.clone().multiplyScalar(freq)
  const base = new Vector3(Math.floor(scaled.x), Math.floor(scaled.y), Math.floor(scaled.z))

  let min1 = Infinity
  let min2 = Infinity

  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        const cell = new Vector3(base.x + dx, base.y + dy, base.z + dz)
        const jitterOffset = hashVec3(cell.x, cell.y, cell.z, seed).subScalar(0.5).multiplyScalar(jitter).addScalar(0.5)
        const featurePoint = new Vector3(cell.x + jitterOffset.x, cell.y + jitterOffset.y, cell.z + jitterOffset.z)
        const diff = featurePoint.sub(scaled)
        const distance = diff.length()
        if (distance < min1) {
          min2 = min1
          min1 = distance
        } else if (distance < min2) {
          min2 = distance
        }
      }
    }
  }

  const cellValue = Math.max(0, 1 - min1)
  const edgeValue = Math.max(0, Math.min(1, min2 - min1))
  const mixValue = cellValue * (1 - blend) + edgeValue * blend
  return mixValue * 2 - 1
}

const curlNoise = (
  simplex: NoiseFunction3D,
  point: Vector3,
  normal: Vector3,
  params: NoiseParams,
) => {
  const scale = Math.max(0.0001, params.frequency * params.curlScale)
  const p = point.clone().multiplyScalar(scale)
  const eps = 0.01

  const noiseVec = (v: Vector3) =>
    new Vector3(
      simplex(v.x, v.y, v.z),
      simplex(v.y + 31.34, v.z + 78.23, v.x + 12.34),
      simplex(v.z + 45.32, v.x + 5.73, v.y + 63.94),
    )

  const v1 = noiseVec(new Vector3(p.x, p.y + eps, p.z))
  const v2 = noiseVec(new Vector3(p.x, p.y - eps, p.z))
  const v3 = noiseVec(new Vector3(p.x, p.y, p.z + eps))
  const v4 = noiseVec(new Vector3(p.x, p.y, p.z - eps))
  const v5 = noiseVec(new Vector3(p.x + eps, p.y, p.z))
  const v6 = noiseVec(new Vector3(p.x - eps, p.y, p.z))

  const curl = new Vector3(
    (v3.y - v4.y - (v1.z - v2.z)) / (2 * eps),
    (v5.z - v6.z - (v3.x - v4.x)) / (2 * eps),
    (v1.x - v2.x - (v5.y - v6.y)) / (2 * eps),
  )

  const magnitude = Math.min(1, curl.length())
  const direction = Math.sign(curl.dot(normal)) || 1
  return magnitude * direction * params.curlStrength
}

const alligatorNoise = (simplex: NoiseFunction3D, point: Vector3, params: NoiseParams) => {
  const freq = Math.max(0.0001, params.frequency)
  const scaled = point.clone().multiplyScalar(freq)
  const base = simplex(scaled.x, scaled.y, scaled.z)
  const ridge = Math.pow(1 - Math.abs(base), 1.2 + params.alligatorPlateau * 2)
  const bite = Math.max(0.1, params.alligatorBite)
  const stripes = Math.sin((scaled.x + scaled.y + scaled.z) * (0.5 + bite)) * 0.5 + 0.5
  const mix = stripes * (1 - params.alligatorPlateau) + ridge * params.alligatorPlateau
  return mix * 2 - 1
}

const sampleNoise = (
  simplex: NoiseFunction3D,
  type: NoiseAlgorithm,
  point: Vector3,
  normal: Vector3,
  params: NoiseParams,
) => {
  switch (type) {
    case 'none':
      return 0
    case 'ridge':
      return layeredSimplex(simplex, 'ridge', point, params)
    case 'warped':
      return layeredSimplex(simplex, 'warped', point, params)
    case 'worley':
      return worleyNoise(point, params, params.seed)
    case 'curl':
      return curlNoise(simplex, point, normal, params)
    case 'alligator':
      return alligatorNoise(simplex, point, params)
    case 'simplex':
    default:
      return layeredSimplex(simplex, 'simplex', point, params)
  }
}

interface ShoeModelProps {
  params: NoiseParams
  toggles: NoiseToggles
}

export const ShoeModel = ({ params, toggles }: ShoeModelProps) => {
  const obj = useLoader(OBJLoader, '/models/BaseShoe.obj')

  const baseGeometry = useMemo(() => {
    const geometry = gatherGeometry(obj)
    geometry.computeBoundingBox()
    const minY = geometry.boundingBox?.min.y ?? 0
    const lift = FLOOR_Y + FLOOR_CLEARANCE - minY
    geometry.translate(0, lift, 0)
    geometry.computeBoundingBox()
    return geometry
  }, [obj])

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
    const noisePoint = new Vector3()
    const clampOutside = Math.max(0, params.clamp ?? 0)
    const clampInside = Math.max(0, params.clampInside ?? 0)
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
      normal.set(normals.getX(i), normals.getY(i), normals.getZ(i)).normalize()
      noisePoint.copy(position)
      const scaleX = Math.max(0.1, params.scaleX ?? 1)
      const scaleY = Math.max(0.1, params.scaleY ?? 1)
      const scaleZ = Math.max(0.1, params.scaleZ ?? 1)
      noisePoint.x = (noisePoint.x + params.offsetX) / scaleX
      noisePoint.y = (noisePoint.y + params.offsetY) / scaleY
      noisePoint.z = (noisePoint.z + params.offsetZ) / scaleZ
      if (params.rotateZ) {
        const angle = (params.rotateZ * Math.PI) / 180
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const rotatedX = noisePoint.x * cos - noisePoint.y * sin
        const rotatedY = noisePoint.x * sin + noisePoint.y * cos
        noisePoint.x = rotatedX
        noisePoint.y = rotatedY
      }
      const sample = sampleNoise(simplex, params.noiseType, noisePoint, normal, params)
      const normalizedDistance =
        invMaxDistance === 0 ? 0 : Math.min(1, falloffDistances[i] * invMaxDistance)
      const falloffWeight = Math.pow(normalizedDistance, falloffExponent)
      const rawOffset = sample * params.amplitude * falloffWeight
      let offset = rawOffset
      if (clampOutside > 0 && rawOffset > clampOutside) {
        offset = clampOutside
      } else if (clampInside > 0 && rawOffset < -clampInside) {
        offset = -clampInside
      }
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

    return weldGeometry(geometry)
  }, [
    params.amplitude,
    params.alligatorBite,
    params.alligatorPlateau,
    params.clamp,
    params.clampInside,
    params.curlScale,
    params.curlStrength,
    params.falloff,
    params.falloffCenterX,
    params.falloffCenterZ,
    params.frequency,
    params.noiseType,
    params.offsetX,
    params.offsetY,
    params.offsetZ,
    params.scaleX,
    params.rotateZ,
    params.scaleY,
    params.scaleZ,
    params.ridge,
    params.roughness,
    params.seed,
    params.warp,
    params.worleyBlend,
    params.worleyJitter,
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
    <group position={[0, 2, 0]}>
      <mesh geometry={displacedGeometry} material={material} castShadow receiveShadow />
    </group>
  )
}
