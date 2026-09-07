import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PublicBillView from './components/PublicBillView.jsx'
import { FeedbackProvider } from './context/FeedbackContext.jsx'

const billMatch = window.location.pathname.match(/^\/bill\/([^/]+)\/?$/)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FeedbackProvider>
      {billMatch ? <PublicBillView token={billMatch[1]} /> : <App />}
    </FeedbackProvider>
  </StrictMode>,
)

