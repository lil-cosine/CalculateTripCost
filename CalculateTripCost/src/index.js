import React from 'react';
import ReactDOM from 'react-dom/client';
import './globals.css';
import App from './Components/App';
import { AuthProvider } from './Components/AuthContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
