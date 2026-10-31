import './fonts';
import { createPocketApp } from './app';

try {
  localStorage.removeItem('pocket:palette');
} catch { /* Palette 1 is fixed even when browser storage is unavailable. */ }

void createPocketApp(document).catch((error: unknown) => {
  document.querySelector('.load-reveal')?.remove();
  console.error('Pocket of Stuff could not start.', error);
});
