import { createRoot } from 'react-dom/client';
import { ChatApp } from './ChatApp';
import './bootstrap';

const el = document.getElementById('app');
if (el) {
    createRoot(el).render(<ChatApp />);
}
