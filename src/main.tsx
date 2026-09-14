import { createRoot } from 'react-dom/client';
import './styles.css';
import { AuthProvider } from './lib/auth';
import App from './App';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
