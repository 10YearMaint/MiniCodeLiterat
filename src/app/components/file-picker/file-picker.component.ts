import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { MarkdownViewerComponent } from '../markdown-viewer/markdown-viewer.component';

@Component({
  selector: 'app-file-picker',
  standalone: true,
  imports: [CommonModule, HttpClientModule, MarkdownViewerComponent],
  templateUrl: './file-picker.component.html',
  styleUrls: ['./file-picker.component.css'],
})
export class FilePickerComponent implements OnInit {
  mdFiles: string[] = [];
  selectedFile: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<string[]>('http://localhost:3001/list').subscribe({
      next: (files) => {
        console.log('Received md files:', files);
        this.mdFiles = files;
      },
      error: (err) => console.error('Failed to load md files', err),
    });
  }

  onFileSelected(event: Event) {
    const selectElem = event.target as HTMLSelectElement;
    const file = selectElem.value;

    // Build full URL pointing to the local server
    const fullUrl = `http://localhost:3001/${file}`;
    this.selectedFile = fullUrl;
  }
}
