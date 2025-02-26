const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Adjust this path if your 'book' folder is in a different place:
const baseBook = path.join(__dirname, '..', 'book');
const PORT = 3001;

// Recursively scan the 'book' folder for .md files:
function scanDirTree(dirPath) {
  const nodes = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        type: 'directory',
        children: scanDirTree(fullPath),
      });
    } else if (entry.name.toLowerCase().endsWith('.md')) {
      // Convert absolute path to a relative path (for constructing the file URL)
      const relativePath = path.relative(baseBook, fullPath);

      nodes.push({
        name: entry.name,
        type: 'file',
        url: `http://localhost:${PORT}/${relativePath}`,
      });
    }
  }

  return nodes;
}

// Create the server
const server = http.createServer((req, res) => {
  // Enable basic CORS:
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    // Handle any preflight CORS requests
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse the incoming URL to determine what the user is requesting
  const parsedUrl = url.parse(req.url, true);

  // If the request is to '/list', send back the JSON tree
  if (parsedUrl.pathname === '/list') {
    const tree = scanDirTree(baseBook);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(tree, null, 2));
    return;
  }

  // Otherwise, treat it as a request for a file in the 'book' folder.
  // ----------------------------------------------------------------
  //  Change: sanitize backslashes in case someone uses \ instead of /
  // ----------------------------------------------------------------
  const rawPathname = decodeURIComponent(parsedUrl.pathname);
  const safePathname = rawPathname.replace(/\\/g, '/');
  const filePath = path.join(baseBook, safePathname);

  // Check if the file/directory exists:
  fs.stat(filePath, (err, stats) => {
    if (err) {
      // File not found or other error
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    if (stats.isDirectory()) {
      // If it's a directory, optionally look for an index file or just 403
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('403 Forbidden - Directory');
    } else {
      // It's a file, read and serve it
      fs.readFile(filePath, (readErr, data) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('500 Internal Server Error');
          return;
        }

        // Simple content-type detection (just for .md or fallback):
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'text/plain';
        if (ext === '.md') {
          contentType = 'text/markdown';
        } else if (ext === '.html') {
          contentType = 'text/html';
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    }
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Markdown server running at http://localhost:${PORT}`);
});
