import './fonts';
import { createPocketApp } from './app';

try {
  localStorage.removeItem('pocket:palette');
} catch { /* Palette 1 is fixed even when browser storage is unavailable. */ }

void createPocketApp(document);
