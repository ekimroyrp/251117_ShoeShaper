import { Grid } from '@react-three/drei'
import { FLOOR_Y } from '../constants/environment'

export const GroundGrid = () => (
  <Grid
    position={[0, FLOOR_Y + 0.001, 0]}
    rotation={[0, 0, 0]}
    args={[200, 200]}
    sectionSize={5}
    sectionThickness={1.2}
    cellSize={1}
    cellThickness={0.6}
    cellColor="#8b9095"
    sectionColor="#5e6368"
    fadeDistance={140}
    fadeStrength={1.2}
    infiniteGrid
  />
)
