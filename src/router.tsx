import { createHashRouter } from 'react-router-dom'
import App from './App'
import { CasualGame } from './screens/CasualGame'
import { NewGameSetup } from './screens/NewGameSetup'
import { StatsPage } from './screens/StatsPage'
import { PlayerDetailPage } from './screens/PlayerDetailPage'
import { RosterPage } from './screens/RosterPage'

export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <CasualGame /> },
      { path: 'new', element: <NewGameSetup /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'stats/p/:id', element: <PlayerDetailPage /> },
      { path: 'roster', element: <RosterPage /> },
    ],
  },
])
