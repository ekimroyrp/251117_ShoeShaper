import { useEffect, useMemo } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
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
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { createNoise3D, type NoiseFunction3D } from 'simplex-noise'
import seedrandom from 'seedrandom'
import { useNoiseStore, type NoiseAlgorithm, type NoiseParams, type NoiseToggles } from '../state/useNoiseStore'
import { FLOOR_CLEARANCE, FLOOR_Y } from '../constants/environment'

const WELD_TOLERANCE = 1e-4

interface ReactionDiffusionField {
  size: number
  values: Float32Array
}

const REACTION_FIELD_SIZE = 32

const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const wrapCoordinate = (value: number, size: number) => {
  let wrapped = value % size
  if (wrapped < 0) {
    wrapped += size
  }
  return wrapped
}

const wrapIndex = (value: number, size: number) => {
  let wrapped = value % size
  if (wrapped < 0) {
    wrapped += size
  }
  return Math.floor(wrapped)
}

const rdIndex = (size: number, x: number, y: number, z: number) => (z * size + y) * size + x

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

const generateReactionDiffusionField = (params: NoiseParams): ReactionDiffusionField => {
  const size = REACTION_FIELD_SIZE
  const total = size * size * size
  let u = new Float32Array(total)
  u.fill(1)
  let v = new Float32Array(total)
  let uNext = new Float32Array(total)
  let vNext = new Float32Array(total)
  const rng = seedrandom(`${params.seed}-reaction`)
  const feed = clampValue(params.rdFeed ?? 0.037, 0, 0.1)
  const kill = clampValue(params.rdKill ?? 0.06, 0, 0.1)
  const diffU = clampValue(params.rdDiffusionU ?? 0.16, 0.001, 1)
  const diffV = clampValue(params.rdDiffusionV ?? 0.08, 0.001, 1)
  const iterations = Math.max(1, Math.min(250, Math.round(params.rdIterations ?? 80)))
  const baseRadius = Math.max(1, Math.floor(size * 0.08))
  const seedCount = Math.max(4, Math.floor(size * 0.8))

  for (let s = 0; s < seedCount; s += 1) {
    const cx = Math.floor(rng() * size)
    const cy = Math.floor(rng() * size)
    const cz = Math.floor(rng() * size)
    const radius = baseRadius + Math.floor(rng() * baseRadius)
    const radiusSq = radius * radius
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dz = -radius; dz <= radius; dz += 1) {
          if (dx * dx + dy * dy + dz * dz > radiusSq) {
            continue
          }
          const x = wrapIndex(cx + dx, size)
          const y = wrapIndex(cy + dy, size)
          const z = wrapIndex(cz + dz, size)
          const idx = rdIndex(size, x, y, z)
          u[idx] = 0.4 + rng() * 0.2
          v[idx] = 0.5 + rng() * 0.4
        }
      }
    }
  }

  const laplacian = (arr: Float32Array, x: number, y: number, z: number) => {
    const xm = wrapIndex(x - 1, size)
    const xp = wrapIndex(x + 1, size)
    const ym = wrapIndex(y - 1, size)
    const yp = wrapIndex(y + 1, size)
    const zm = wrapIndex(z - 1, size)
    const zp = wrapIndex(z + 1, size)
    const sum =
      arr[rdIndex(size, xm, y, z)] +
      arr[rdIndex(size, xp, y, z)] +
      arr[rdIndex(size, x, ym, z)] +
      arr[rdIndex(size, x, yp, z)] +
      arr[rdIndex(size, x, y, zm)] +
      arr[rdIndex(size, x, y, zp)]
    const center = arr[rdIndex(size, x, y, z)]
    return sum - center * 6
  }

  for (let iter = 0; iter < iterations; iter += 1) {
    for (let z = 0; z < size; z += 1) {
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const idx = rdIndex(size, x, y, z)
          const uVal = u[idx]
          const vVal = v[idx]
          const uvv = uVal * vVal * vVal
          const duVal = diffU * laplacian(u, x, y, z) - uvv + feed * (1 - uVal)
          const dvVal = diffV * laplacian(v, x, y, z) + uvv - (feed + kill) * vVal
          uNext[idx] = clampValue(uVal + duVal, 0, 1)
          vNext[idx] = clampValue(vVal + dvVal, 0, 1)
        }
      }
    }
    ;[u, uNext] = [uNext, u]
    ;[v, vNext] = [vNext, v]
  }

  const values = v
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i]
    if (value < min) {
      min = value
    }
    if (value > max) {
      max = value
    }
  }
  const range = max - min || 1
  for (let i = 0; i < values.length; i += 1) {
    values[i] = (values[i] - min) / range
  }

  return { size, values }
}

const trilinearSample = (field: ReactionDiffusionField, x: number, y: number, z: number) => {
  const size = field.size
  const values = field.values
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const z0 = Math.floor(z)
  const x1 = (x0 + 1) % size
  const y1 = (y0 + 1) % size
  const z1 = (z0 + 1) % size
  const fx = x - x0
  const fy = y - y0
  const fz = z - z0

  const sample = (ix: number, iy: number, iz: number) => values[rdIndex(size, ix, iy, iz)]

  const c000 = sample(x0, y0, z0)
  const c100 = sample(x1, y0, z0)
  const c010 = sample(x0, y1, z0)
  const c110 = sample(x1, y1, z0)
  const c001 = sample(x0, y0, z1)
  const c101 = sample(x1, y0, z1)
  const c011 = sample(x0, y1, z1)
  const c111 = sample(x1, y1, z1)

  const c00 = c000 * (1 - fx) + c100 * fx
  const c10 = c010 * (1 - fx) + c110 * fx
  const c01 = c001 * (1 - fx) + c101 * fx
  const c11 = c011 * (1 - fx) + c111 * fx

  const c0 = c00 * (1 - fy) + c10 * fy
  const c1 = c01 * (1 - fy) + c11 * fy

  return c0 * (1 - fz) + c1 * fz
}

const reactionDiffusionNoise = (
  field: ReactionDiffusionField | null,
  point: Vector3,
  params: NoiseParams,
) => {
  if (!field) {
    return 0
  }
  const size = field.size
  const frequency = Math.max(0.0001, params.frequency)
  const scaledX = wrapCoordinate(point.x * frequency, size)
  const scaledY = wrapCoordinate(point.y * frequency, size)
  const scaledZ = wrapCoordinate(point.z * frequency, size)
  const value = trilinearSample(field, scaledX, scaledY, scaledZ)
  return value * 2 - 1
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
  reactionField: ReactionDiffusionField | null,
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
    case 'reaction':
      return reactionDiffusionNoise(reactionField, point, params)
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
  const exportCounter = useNoiseStore((state) => state.exportCounter)
  const screenshotCounter = useNoiseStore((state) => state.screenshotCounter)
  const { gl, scene, camera } = useThree()
  const setScreenshotActive = useNoiseStore((state) => state.setScreenshotActive)

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

  const reactionField = useMemo(() => {
    if (params.noiseType !== 'reaction') {
      return null
    }
    return generateReactionDiffusionField(params)
  }, [
    params.noiseType,
    params.rdFeed,
    params.rdKill,
    params.rdDiffusionU,
    params.rdDiffusionV,
    params.rdIterations,
    params.seed,
  ])

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
    const falloffCenter = new Vector3(
      params.falloffCenterX,
      params.falloffCenterY ?? FLOOR_Y,
      params.falloffCenterZ,
    )
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
      noisePoint.x /= scaleX
      noisePoint.y /= scaleY
      noisePoint.z /= scaleZ
      if (params.rotateX) {
        const angle = (params.rotateX * Math.PI) / 180
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const rotatedY = noisePoint.y * cos - noisePoint.z * sin
        const rotatedZ = noisePoint.y * sin + noisePoint.z * cos
        noisePoint.y = rotatedY
        noisePoint.z = rotatedZ
      }
      if (params.rotateY) {
        const angle = (params.rotateY * Math.PI) / 180
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const rotatedX = noisePoint.x * cos + noisePoint.z * sin
        const rotatedZ = -noisePoint.x * sin + noisePoint.z * cos
        noisePoint.x = rotatedX
        noisePoint.z = rotatedZ
      }
      if (params.rotateZ) {
        const angle = (params.rotateZ * Math.PI) / 180
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        const rotatedX = noisePoint.x * cos - noisePoint.y * sin
        const rotatedY = noisePoint.x * sin + noisePoint.y * cos
        noisePoint.x = rotatedX
        noisePoint.y = rotatedY
      }
      noisePoint.x += params.offsetX
      noisePoint.y += params.offsetY
      noisePoint.z += params.offsetZ
      const sample = sampleNoise(
        simplex,
        params.noiseType,
        noisePoint,
        normal,
        params,
        reactionField,
      )
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
    if (params.smoothing > 0) {
      const smoothing = Math.min(1, Math.max(0, params.smoothing))
      const originalPositions = positions.array.slice(0) as Float32Array
      const adjacency: Array<Set<number>> = Array.from({ length: positions.count }, () => new Set())
      const buildAdjacency = (a: number, b: number) => {
        adjacency[a].add(b)
        adjacency[b].add(a)
      }
      if (geometry.getIndex()) {
        const index = geometry.getIndex() as BufferAttribute
        for (let i = 0; i < index.count; i += 3) {
          const a = index.getX(i)
          const b = index.getX(i + 1)
          const c = index.getX(i + 2)
          buildAdjacency(a, b)
          buildAdjacency(b, c)
          buildAdjacency(c, a)
        }
      } else {
        for (let i = 0; i < positions.count; i += 3) {
          buildAdjacency(i, i + 1)
          buildAdjacency(i + 1, i + 2)
          buildAdjacency(i + 2, i)
        }
      }
      for (let i = 0; i < positions.count; i += 1) {
        const neighbors = adjacency[i]
        if (neighbors.size === 0) {
          continue
        }
        let avgX = 0
        let avgY = 0
        let avgZ = 0
        neighbors.forEach((neighbor) => {
          avgX += originalPositions[neighbor * 3]
          avgY += originalPositions[neighbor * 3 + 1]
          avgZ += originalPositions[neighbor * 3 + 2]
        })
        const inv = 1 / neighbors.size
        avgX *= inv
        avgY *= inv
        avgZ *= inv
        const origX = originalPositions[i * 3]
        const origY = originalPositions[i * 3 + 1]
        const origZ = originalPositions[i * 3 + 2]
        positions.setXYZ(
          i,
          origX + (avgX - origX) * smoothing,
          origY + (avgY - origY) * smoothing,
          origZ + (avgZ - origZ) * smoothing,
        )
      }
    }

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
    params.falloffCenterY,
    params.falloffCenterZ,
    params.frequency,
    params.noiseType,
    params.offsetX,
    params.offsetY,
    params.offsetZ,
    params.rotateX,
    params.rotateY,
    params.rotateZ,
    params.scaleX,
    params.scaleY,
    params.scaleZ,
    params.ridge,
    params.rdDiffusionU,
    params.rdDiffusionV,
    params.rdFeed,
    params.rdIterations,
    params.rdKill,
    params.roughness,
    params.seed,
    params.warp,
    params.worleyBlend,
    params.worleyJitter,
    params.smoothing,
    reactionField,
    sculptGeometry,
  ])

  useEffect(() => {
    if (exportCounter === 0) {
      return
    }
    const exporter = new OBJExporter()
    const mesh = new Mesh(displacedGeometry.clone())
    const result = exporter.parse(mesh)
    const blob = new Blob([result], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `shoeshaper-mesh-${exportCounter}.obj`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [exportCounter])

  useEffect(() => {
    if (screenshotCounter === 0) {
      return
    }
    setScreenshotActive(true)
    requestAnimationFrame(() => {
      gl.render(scene, camera)
      gl.domElement.toBlob((blob) => {
        setScreenshotActive(false)
        if (!blob) {
          return
        }
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `shoeshaper-screenshot-${screenshotCounter}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, 'image/png')
    })
  }, [camera, gl, scene, screenshotCounter, setScreenshotActive])

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
      <mesh geometry={displacedGeometry} material={material} castShadow receiveShadow={false} />
    </group>
  )
}
