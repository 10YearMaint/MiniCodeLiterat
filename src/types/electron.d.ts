// global.d.ts (example)
declare global {
  interface Window {
    electron?: {
      openFileDialog: () => Promise<string[]>;
    };
  }
}

// VERY IMPORTANT: Add this line so the file is treated as a module
export {};
