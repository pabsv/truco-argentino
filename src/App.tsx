import { Outlet } from 'react-router-dom'
import { useWakeLock } from './hooks/useWakeLock'
import { TabBar } from './components/layout/TabBar'

export default function App() {
  useWakeLock()
  return (
    <div className="h-dvh flex flex-col bg-green-800 text-white overflow-hidden">
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}
