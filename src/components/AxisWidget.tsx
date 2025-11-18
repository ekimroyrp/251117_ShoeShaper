import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import { Group, Quaternion, Vector3 } from 'three'

const cameraSpaceOffset = new Vector3(-2.2, -1.8, -6)
const worldOrientation = new Quaternion() // identity to align with world axes

export const AxisWidget = () => {
  const { camera } = useThree()
  const group = useRef<Group>(null)
  const offset = useMemo(() => cameraSpaceOffset.clone(), [])

  useFrame(() => {
    if (!group.current) {
      return
    }
    const worldOffset = offset.clone().applyQuaternion(camera.quaternion).add(camera.position)
    group.current.position.copy(worldOffset)
    group.current.quaternion.copy(worldOrientation)
  })

  return (
    <group ref={group} scale={0.35}>
      {/* X axis */}
      <mesh position={[0.35, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.01, 0.01, 0.7, 8]} />
        <meshBasicMaterial color="#ff4d4d" />
      </mesh>
      <mesh position={[0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.035, 0.12, 12]} />
        <meshBasicMaterial color="#ff4d4d" />
      </mesh>
      <Billboard position={[0.85, 0, 0]} follow>
        <Text
          font="/fonts/ShareTechMono-Regular.ttf"
          fontSize={0.15}
          color="#ff4d4d"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          X
        </Text>
      </Billboard>

      {/* Y axis */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.7, 8]} />
        <meshBasicMaterial color="#5dff81" />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <coneGeometry args={[0.035, 0.12, 12]} />
        <meshBasicMaterial color="#5dff81" />
      </mesh>
      <Billboard position={[0, 0.85, 0]} follow>
        <Text
          font="/fonts/ShareTechMono-Regular.ttf"
          fontSize={0.15}
          color="#5dff81"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          Y
        </Text>
      </Billboard>

      {/* Z axis */}
      <mesh position={[0, 0, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.7, 8]} />
        <meshBasicMaterial color="#4d73ff" />
      </mesh>
      <mesh position={[0, 0, 0.7]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.035, 0.12, 12]} />
        <meshBasicMaterial color="#4d73ff" />
      </mesh>
      <Billboard position={[0, 0, 0.85]} follow>
        <Text
          font="/fonts/ShareTechMono-Regular.ttf"
          fontSize={0.15}
          color="#4d73ff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000000"
        >
          Z
        </Text>
      </Billboard>
    </group>
  )
}
