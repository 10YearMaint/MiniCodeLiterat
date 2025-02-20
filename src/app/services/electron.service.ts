import { Injectable } from '@angular/core';

declare global {
  interface Window {
    electron?: {
      openFileDialog: () => Promise<string[]>;
    };
  }
}

@Injectable({ providedIn: 'root' })
export class ElectronService {
  async openFilePicker(): Promise<string[]> {
    if (window.electron) {
      return window.electron.openFileDialog();
    }
    return [];
  }
}
