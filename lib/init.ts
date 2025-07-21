import { scheduleCleanup } from './slack-cleanup';

let initialized = false;

export function initializeServer() {
  if (initialized) {
    return;
  }
  
  // Only run on server side
  if (typeof window === 'undefined') {
    console.log('Initializing server-side cleanup scheduling...');
    scheduleCleanup();
    initialized = true;
  }
}

// Auto-initialize when this module is imported
initializeServer(); 