import React from 'react'
import { createRoot } from 'react-dom/client'
import { ContentProvider } from './content.jsx'
import App from './App.jsx'
// Default fonts are self-hosted (no third-party requests). Fonts the client picks in the editor load from Google Fonts.
import '@fontsource/big-shoulders-display/latin-800'
import '@fontsource/big-shoulders-display/latin-900'
import '@fontsource/instrument-serif/latin-400'
import '@fontsource/instrument-serif/latin-400-italic'
import '@fontsource/manrope/latin-400'
import '@fontsource/manrope/latin-500'
import '@fontsource/manrope/latin-600'
import '@fontsource/manrope/latin-700'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <ContentProvider>
    <App />
  </ContentProvider>
)
