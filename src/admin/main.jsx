import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AdminApp from './AdminApp.jsx';
import './admin.css';

createRoot(document.getElementById('admin-root')).render(
  <BrowserRouter basename="/admin">
    <AdminApp />
  </BrowserRouter>
);
