const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

// Path to your "book" directory:
const baseBook = path.join(__dirname, '..', 'book');

// 1) Serve your "book" folder as static files
app.use('/', express.static(baseBook));

// 2) Recursively scan the "book" folder for .md files
function scanDirTree(dirPath) {
  const nodes = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        type: 'directory',
        children: scanDirTree(fullPath)
      });
    } else if (entry.name.toLowerCase().endsWith('.md')) {
      const relativePath = path.relative(baseBook, fullPath);
      nodes.push({
        name: entry.name,
        type: 'file',
        url: `http://localhost:3001/${relativePath}`
      });
    }
  }

  return nodes;
}

// 3) Define an endpoint that returns the folder tree as JSON
app.get('/list', (req, res) => {
  const tree = scanDirTree(baseBook);
  res.json(tree);
});

// 4) Start the server on port 3001
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Markdown server running at http://localhost:${PORT}`);
});
