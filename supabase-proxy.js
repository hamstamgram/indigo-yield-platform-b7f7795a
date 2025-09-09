const http = require('http');
const httpProxy = require('http-proxy-middleware');
const express = require('express');

const app = express();

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, apikey');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Proxy /auth to GoTrue
app.use('/auth', httpProxy.createProxyMiddleware({
  target: 'http://localhost:9999',
  changeOrigin: true,
  pathRewrite: { '^/auth': '' }
}));

// Proxy /rest to PostgREST
app.use('/rest', httpProxy.createProxyMiddleware({
  target: 'http://localhost:54321',
  changeOrigin: true,
  pathRewrite: { '^/rest': '' }
}));

// Default route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Supabase local proxy',
    endpoints: {
      auth: '/auth/v1',
      rest: '/rest/v1'
    }
  });
});

const PORT = 54320;
app.listen(PORT, () => {
  console.log(`Supabase proxy running on http://localhost:${PORT}`);
});
