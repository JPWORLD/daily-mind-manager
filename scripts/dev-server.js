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

app.get('/api/posts', (req, res) => postsIndex(req, res));
app.post('/api/posts', (req, res) => postsIndex(req, res));
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

app.listen(port, () => {
  console.log(`Dev server listening on http://localhost:${port}`);
});
