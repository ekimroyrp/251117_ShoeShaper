import './App.css'
import './styles/cyberpunk.css'
import { NoiseControlPanel } from './components/NoiseControlPanel'
import { ShoeCanvas } from './components/ShoeCanvas'

const App = () => (
  <div className="app-shell">
    <ShoeCanvas />
    <NoiseControlPanel />
  </div>
)

export default App
