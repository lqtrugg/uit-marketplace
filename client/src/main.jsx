import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './App.css';
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function Main() {
  return (
    <React.StrictMode>
      <GoogleOAuthProvider clientId={clientId || ''}>
        <App />
      </GoogleOAuthProvider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <Main />
);
