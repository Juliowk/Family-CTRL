import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { aquecerServidor } from './api/cliente';
import { App } from './App';
import './styles/global.css';

// Começa a acordar o servidor do Heroku enquanto o usuário ainda está lendo a tela
aquecerServidor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
