import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Gracefully catch benign WebSocket disconnect/HMR rejections in preview
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event?.reason?.message || String(event?.reason || '');
    if (msg.includes('WebSocket') || msg.includes('transport') || msg.includes('vite')) {
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
