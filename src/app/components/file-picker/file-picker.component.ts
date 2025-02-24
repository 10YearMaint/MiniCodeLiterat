import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';

import { MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { MarkdownViewerComponent } from '../markdown-viewer/markdown-viewer.component';

export interface FileNode {
  name: string;
  type: 'file' | 'directory';
  url?: string;
  children?: FileNode[];
  readmeUrl?: string;
}

@Component({
  selector: 'app-file-picker',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    MatTreeModule,
    MatIconModule,
    MatButtonModule,
    MarkdownViewerComponent
  ],
  templateUrl: './file-picker.component.html',
  styleUrls: ['./file-picker.component.css']
})
export class FilePickerComponent implements OnInit {
  treeControl = new NestedTreeControl<FileNode>((node: FileNode) => node.children);
  dataSource = new MatTreeNestedDataSource<FileNode>();

  // selectedFile holds the URL for the markdown viewer.
  selectedFile: string | null = null;
  // selectedNode tracks the currently selected FileNode for highlighting.
  selectedNode: FileNode | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<FileNode[]>('http://localhost:3001/list').subscribe({
      next: (data) => {
        // Process data so subfolder README.md files are “hidden”
        this.dataSource.data = this.hideSubfolderReadmes(data);
      },
      error: (err) => console.error('Failed to load file tree', err)
    });
  }

  hasChild = (_: number, node: FileNode) =>
    !!node.children && node.children.length > 0;

  noChild = (_: number, node: FileNode) =>
    !node.children || node.children.length === 0;

  /**
   * If a directory has a child README.md, remove it from the children array
   * and store its URL in node.readmeUrl so we can open it when clicking on the folder.
   */
  private hideSubfolderReadmes(nodes: FileNode[]): FileNode[] {
    return nodes.map(node => {
      if (node.type === 'directory' && node.children) {
        const readmeIndex = node.children.findIndex(
          child => child.name.toLowerCase() === 'readme.md'
        );
        if (readmeIndex !== -1) {
          node.readmeUrl = node.children[readmeIndex].url;
          node.children.splice(readmeIndex, 1);
        }
        node.children = this.hideSubfolderReadmes(node.children);
      }
      return node;
    });
  }

  // For normal file clicks – set the selected node and file URL.
  onFileClick(node: FileNode) {
    if (node.type === 'file' && node.url) {
      this.selectedNode = node;
      this.selectedFile = node.url;
    }
  }

  // For folder name clicks: toggle expansion and select the folder.
  openDirectoryReadme(node: FileNode) {
    this.treeControl.toggle(node);
    this.selectedNode = node;
    // If a README exists, show it; otherwise you may clear the selection for markdown display.
    if (node.readmeUrl) {
      this.selectedFile = node.readmeUrl;
    } else {
      this.selectedFile = null;
    }
  }
}
