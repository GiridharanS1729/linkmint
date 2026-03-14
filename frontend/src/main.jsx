import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { AuthProvider } from './hooks/useAuth';
import { SiteConfigProvider } from './hooks/useSiteConfig';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SiteConfigProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </SiteConfigProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
