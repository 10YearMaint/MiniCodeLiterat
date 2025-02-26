import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { marked } from 'marked';
import hljs from 'highlight.js';

// Let TypeScript know these exist globally from our scripts:
declare var mermaid: any;
declare var renderLaTeX: any;

// Configure marked to use highlight.js for code blocks.
marked.setOptions({
  highlight: (code: string, lang: string) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
} as any);

@Component({
  standalone: true,
  selector: 'app-markdown-viewer',
  imports: [FormsModule],
  template: `
    <div class="markdown-body" [innerHTML]="renderedMarkdown"></div>
    <hr />
    <div class="chatbot" style="margin:1em 0; padding:1em; border:1px solid #ccc; background:#fafafa;">
      <p><strong>Chat about this document</strong></p>
      <p>Enter your question below and click "Chat".</p>
      <textarea
        [(ngModel)]="chatInput"
        rows="3"
        style="width:100%;"
        placeholder="Your question..."
      ></textarea>
      <br />
      <button style="margin-top:0.5em;" (click)="startChat()" [disabled]="chatButtonDisabled">
        Chat
      </button>
      <div style="margin-top:0.5em; color:red;">{{ serverStatus }}</div>
      <div style="margin-top:1em; font-family:monospace; white-space:pre-wrap;">
        {{ chatOutput }}
      </div>
    </div>
  `,
  styles: [
    `
    .markdown-body {
      box-sizing: border-box;
      min-width: 200px;
      max-width: 980px;
      margin: 0 auto;
      padding: 1.5em;
      color: #24292e;
      background-color: #ffffff;
      font-size: 16px;
      line-height: 1.5;
      word-wrap: break-word;
      border: 1px solid #ddd;
      border-radius: 6px;
    }
    `
  ],
})
export class MarkdownViewerComponent implements OnChanges {
  @Input() file: string = ''; // e.g. "nested_folder/README.md"

  public renderedMarkdown: SafeHtml = '';

  // Chat-related fields
  public chatInput: string = '';
  public chatOutput: string = '';
  public serverStatus: string = 'Checking server status...';
  public chatButtonDisabled = true;
  private fetchedMarkdownContent: string = '';

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['file'] && this.file) {
      this.loadMarkdown(this.file);
    }
  }

  private async loadMarkdown(file: string) {
    // (1) Ping the chat server (unrelated to mermaid or LaTeX)
    try {
      const pingResponse = await fetch('http://127.0.0.1:8080/ping', { method: 'GET' });
      if (pingResponse.ok) {
        this.chatButtonDisabled = false;
        this.serverStatus = '';
      } else {
        this.chatButtonDisabled = true;
        this.serverStatus = 'Chat server offline. Please start the lila server.';
      }
    } catch (err) {
      this.chatButtonDisabled = true;
      this.serverStatus = 'Chat server offline. Please start the lila server.';
    }

    // (2) Build the Markdown URL
    let mdUrl = file;
    if (!mdUrl.startsWith('http://') && !mdUrl.startsWith('https://')) {
      mdUrl = `http://localhost:3001/${mdUrl}`;
    }

    // (3) Fetch + parse the Markdown
    this.http.get(mdUrl, { responseType: 'text' }).subscribe({
      next: (markdownContent) => {
        // Save the raw Markdown for future chat
        this.fetchedMarkdownContent = markdownContent;

        // Parse to HTML for display
        const html = marked.parse(markdownContent, { async: false }) as string;
        // Sanitize for Angular
        this.renderedMarkdown = this.sanitizer.bypassSecurityTrustHtml(html);

        // (4) Once inserted, do mermaid + LaTeX post-processing
        setTimeout(() => {
          this.renderMermaidBlocks();
          this.renderLatex();
        }, 0);
      },
      error: (err) => {
        this.fetchedMarkdownContent = '';
        this.renderedMarkdown = this.sanitizer.bypassSecurityTrustHtml(
          `<p style="color:red;">Error loading ${file}: ${err.message}</p>`
        );
      },
    });
  }

  /** Replace ```mermaid blocks with <div class="mermaid"> and call mermaid.init() */
  private renderMermaidBlocks() {
    if (typeof mermaid === 'undefined') {
      console.warn('Mermaid library not found.');
      return;
    }
    // 1) Query any <code class="language-mermaid"> blocks
    const mermaidCodeBlocks = document.querySelectorAll('code.language-mermaid');
    mermaidCodeBlocks.forEach((codeBlock) => {
      const code = codeBlock.textContent || '';
      const pre = codeBlock.parentElement; // typically <pre>
      if (!pre) return;

      // Create a <div class="mermaid"> node
      const mermaidDiv = document.createElement('div');
      mermaidDiv.className = 'mermaid';
      mermaidDiv.textContent = code;

      // Replace <pre> with <div>
      pre.parentNode?.replaceChild(mermaidDiv, pre);
    });

    // 2) Render all .mermaid blocks
    mermaid.initialize({ startOnLoad: false });
    mermaid.init(undefined, '.mermaid');
  }

  /** Call the global function from tex-svg.js to render LaTeX math */
  private renderLatex() {
    if (typeof renderLaTeX === 'function') {
      renderLaTeX();
    } else {
      console.warn('renderLaTeX() function not found.');
    }
  }

  /** Chat function */
  public startChat() {
    // We also send 'file' just so the server knows which file was used,
    // but we won't rely on it for fetching the content.
    fetch('http://127.0.0.1:8080/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: this.chatInput,
        file: this.file,
        file_content: this.fetchedMarkdownContent
      }),
    })
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          this.chatOutput = data.response;
        } else {
          this.chatOutput = 'Error: ' + response.statusText;
        }
      })
      .catch((err) => {
        this.chatOutput = 'Error: ' + err;
      });
  }
}
