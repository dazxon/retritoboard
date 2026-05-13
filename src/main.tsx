import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Home from './routes/Home'
import Room from './routes/Room'
import { FeedbackButton } from './components/FeedbackButton'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<Room />} />
      </Routes>
      <FeedbackButton />
    </HashRouter>
  </StrictMode>,
)
