import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles/main.scss';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.jsx';
import { applyColorMode, getInitialColorMode } from './hooks/useColorMode.js';

// Set the theme before the first render so the page never flashes the wrong colors.
applyColorMode(getInitialColorMode());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
