import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import DocumentationPage from './pages/DocumentationPage.jsx';
import './index.css';

const path = window.location.pathname.replace(/\/$/, '') || '/';
const isDocumentation =
  path === '/documentation' || path === '/documenation';

createRoot(document.getElementById('root')).render(
  <StrictMode>{isDocumentation ? <DocumentationPage /> : <App />}</StrictMode>,
);
