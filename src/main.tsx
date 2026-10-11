import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import AICompanion from './AICompanion';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <AICompanion />
  </React.StrictMode>
);
