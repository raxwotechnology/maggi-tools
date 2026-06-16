import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PublicBillView from './components/PublicBillView.jsx'

const billMatch = window.location.pathname.match(/^\/bill\/([^/]+)\/?$/)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {billMatch ? <PublicBillView token={billMatch[1]} /> : <App />}
  </StrictMode>,
)
