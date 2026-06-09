const express = require('express');
const https = require('https');
const http = require('http');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ─── Keyword → URLs database ──────────────────────────────────────────────────
const keywordDatabase = {
  javascript: [
    { url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', title: 'MDN JavaScript Guide' },
    { url: 'https://javascript.info/', title: 'The Modern JavaScript Tutorial' },
    { url: 'https://eloquentjavascript.net/', title: 'Eloquent JavaScript (Book)' },
  ],
  nodejs: [
    { url: 'https://nodejs.org/en/docs/', title: 'Node.js Official Docs' },
    { url: 'https://nodeguide.com/', title: 'Node.js Guide' },
    { url: 'https://www.tutorialspoint.com/nodejs/index.htm', title: 'Node.js Tutorial' },
  ],
  python: [
    { url: 'https://docs.python.org/3/', title: 'Python 3 Official Docs' },
    { url: 'https://realpython.com/', title: 'Real Python Tutorials' },
    { url: 'https://www.learnpython.org/', title: 'Learn Python Interactive' },
  ],
  http: [
    { url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview', title: 'HTTP Overview (MDN)' },
    { url: 'https://http.dev/', title: 'HTTP.dev Reference' },
    { url: 'https://www.rfc-editor.org/rfc/rfc9110', title: 'RFC 9110: HTTP Semantics' },
  ],
  css: [
    { url: 'https://developer.mozilla.org/en-US/docs/Web/CSS', title: 'MDN CSS Reference' },
    { url: 'https://css-tricks.com/', title: 'CSS-Tricks' },
    { url: 'https://www.w3schools.com/css/', title: 'W3Schools CSS Tutorial' },
  ],
  html: [
    { url: 'https://developer.mozilla.org/en-US/docs/Web/HTML', title: 'MDN HTML Reference' },
    { url: 'https://html.spec.whatwg.org/', title: 'WHATWG HTML Living Standard' },
    { url: 'https://www.w3schools.com/html/', title: 'W3Schools HTML Tutorial' },
  ],
  api: [
    { url: 'https://restfulapi.net/', title: 'RESTful API Design Guide' },
    { url: 'https://swagger.io/docs/', title: 'Swagger / OpenAPI Docs' },
    { url: 'https://www.postman.com/api-documentation-tool/', title: 'Postman API Docs' },
  ],
  websocket: [
    { url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API', title: 'WebSockets API (MDN)' },
    { url: 'https://websocket.org/', title: 'WebSocket.org' },
    { url: 'https://socket.io/docs/', title: 'Socket.IO Documentation' },
  ],
  react: [
    { url: 'https://react.dev/', title: 'React Official Docs' },
    { url: 'https://legacy.reactjs.org/docs/getting-started.html', title: 'React Legacy Docs' },
    { url: 'https://reactrouter.com/', title: 'React Router' },
  ],
  git: [
    { url: 'https://git-scm.com/doc', title: 'Git Official Documentation' },
    { url: 'https://docs.github.com/en', title: 'GitHub Docs' },
    { url: 'https://www.atlassian.com/git/tutorials', title: 'Atlassian Git Tutorials' },
  ],
};

// ─── Route: GET /api/keywords ──────────────────────────────────────────────────
app.get('/api/keywords', (req, res) => {
  res.json({ keywords: Object.keys(keywordDatabase) });
});

// ─── Route: POST /api/urls ────────────────────────────────────────────────────
app.post('/api/urls', (req, res) => {
  const { keyword } = req.body;

  if (!keyword || typeof keyword !== 'string') {
    return res.status(400).json({ error: 'Keyword is required' });
  }

  const normalized = keyword.trim().toLowerCase();
  const urls = keywordDatabase[normalized];

  if (!urls) {
    return res.status(404).json({
      error: `No URLs found for keyword "${keyword}"`,
      available: Object.keys(keywordDatabase),
    });
  }

  res.json({ keyword: normalized, urls });
});

// ─── Route: GET /api/fetch ─────────────────────────────────────────────────────
// Streams the content with progress updates via Server-Sent Events
app.get('/api/fetch', (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL query parameter is required' });
  }

  // Validate URL
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are supported' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendEvent = (eventType, data) => {
    res.write(`event: ${eventType}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const transport = parsedUrl.protocol === 'https:' ? https : http;

  const requestOptions = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname + parsedUrl.search,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    method: 'GET',
    headers: {
      'User-Agent': 'WebCrawler/1.0 (Educational Project)',
      'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    timeout: 15000,
  };

  sendEvent('start', { url, timestamp: new Date().toISOString() });

  const request = transport.request(requestOptions, (response) => {
    // Handle redirects
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      sendEvent('redirect', { location: response.headers.location, status: response.statusCode });
      res.end();
      return;
    }

    if (response.statusCode !== 200) {
      sendEvent('error', { message: `Server responded with status ${response.statusCode}`, code: response.statusCode });
      res.end();
      return;
    }

    const contentLength = parseInt(response.headers['content-length'], 10) || null;
    const contentType = response.headers['content-type'] || 'text/html';

    sendEvent('meta', {
      contentType,
      totalSize: contentLength,
      statusCode: response.statusCode,
    });

    let receivedBytes = 0;
    const chunks = [];
    const MAX_SIZE = 512 * 1024; // 512 KB limit

    response.on('data', (chunk) => {
      receivedBytes += chunk.length;
      chunks.push(chunk);

      const progress = contentLength ? Math.round((receivedBytes / contentLength) * 100) : null;

      sendEvent('progress', {
        received: receivedBytes,
        total: contentLength,
        progress,
      });

      // Stop if too large
      if (receivedBytes >= MAX_SIZE) {
        response.destroy();
        const partialContent = Buffer.concat(chunks).toString('utf8', 0, MAX_SIZE);
        sendEvent('complete', {
          content: partialContent,
          size: receivedBytes,
          truncated: true,
          truncatedAt: MAX_SIZE,
        });
        res.end();
      }
    });

    response.on('end', () => {
      if (receivedBytes < MAX_SIZE) {
        const content = Buffer.concat(chunks).toString('utf8');
        sendEvent('complete', {
          content,
          size: receivedBytes,
          truncated: false,
        });
        res.end();
      }
    });

    response.on('error', (err) => {
      sendEvent('error', { message: err.message });
      res.end();
    });
  });

  request.on('timeout', () => {
    request.destroy();
    sendEvent('error', { message: 'Request timed out after 15 seconds' });
    res.end();
  });

  request.on('error', (err) => {
    sendEvent('error', { message: err.message });
    res.end();
  });

  request.end();

  // Clean up when client disconnects
  req.on('close', () => {
    request.destroy();
  });
});

// ─── Serve frontend ────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  🕸  WebCrawler Server`);
  console.log(`  ─────────────────────`);
  console.log(`  Listening on http://localhost:${PORT}`);
  console.log(`  Keywords loaded: ${Object.keys(keywordDatabase).length}\n`);
});
