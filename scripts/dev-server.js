const express = require('express');
const path = require('path');

// load env from .env if present
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8081;

app.use(express.json());

// mount the serverless api handlers
const postsIndex = require('../api/posts/index');
const postById = require('../api/posts/[id]');
const adminHandler = require('../api/admin/index');
const tagsHandler = require('../api/tags/index');
const catsHandler = require('../api/categories/index');

app.get('/api/posts', (req, res) => postsIndex(req, res));
app.post('/api/posts', (req, res) => postsIndex(req, res));
app.post('/api/admin/login', (req, res) => { req.url = '/login'; adminHandler(req, res); });
app.post('/api/admin/register', (req, res) => { req.url = '/register'; adminHandler(req, res); });
app.get('/api/tags', (req, res) => tagsHandler(req, res));
app.post('/api/tags', (req, res) => tagsHandler(req, res));
app.get('/api/categories', (req, res) => catsHandler(req, res));
app.post('/api/categories', (req, res) => catsHandler(req, res));
app.get('/api/authors', (req, res) => require('../api/authors/index')(req, res));
app.post('/api/authors', (req, res) => require('../api/authors/index')(req, res));
app.get('/api/posts/:id', (req, res) => {
  // rewrite url for handler
  req.url = `/api/posts/${req.params.id}`;
  postById(req, res);
});
app.put('/api/posts/:id', (req, res) => {
  req.url = `/api/posts/${req.params.id}`;
  postById(req, res);
});
app.delete('/api/posts/:id', (req, res) => {
  req.url = `/api/posts/${req.params.id}`;
  postById(req, res);
});

// serve static files from dist/public
const staticDir = path.resolve(__dirname, '..', 'dist');
app.use(express.static(staticDir));
// also serve raw files from `public/` for dev convenience (admin.html, privacy pages)
const publicDir = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicDir));

app.listen(port, () => {
  console.log(`Dev server listening on http://localhost:${port}`);
});
