const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { URL } = require('url');
const app = express();

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

app.get('/', (req, res) => res.render('index', { favicon: null, error: null }));

app.post('/fetch-favicon', async (req, res) => {
  let inputUrl = req.body.url;
  let triedHttp = false;
  let finalUrl;

  const tryFetch = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Fetch failed');
    return response;
  };

  const tryWithProtocols = async (url) => {
    if (!/^https?:\/\//i.test(url)) {
      try {
        finalUrl = `https://${url}`;
        return await tryFetch(finalUrl);
      } catch (err) {
        triedHttp = true;
        finalUrl = `http://${url}`;
        return await tryFetch(finalUrl);
      }
    } else {
      finalUrl = url;
      return await tryFetch(finalUrl);
    }
  };

  try {
    const response = await tryWithProtocols(inputUrl);
    const html = await response.text();
    const $ = cheerio.load(html);
    const baseUrl = new URL(finalUrl).origin;

    let favicon = $('link[rel="icon"]').attr('href') ||
                  $('link[rel="shortcut icon"]').attr('href') ||
                  $('link[rel="apple-touch-icon"]').attr('href') ||
                  '/favicon.ico';

    if (!favicon.startsWith('http')) {
      favicon = new URL(favicon, baseUrl).href;
    }

    res.render('index', { favicon, error: null });
  } catch (err) {
    const protocol = triedHttp ? 'http' : 'https';
    console.error(`Failed to fetch favicon from ${protocol}://${inputUrl}:`, err.message);
    res.render('index', { favicon: null, error: 'Could not retrieve favicon.' });
  }
});

app.get('/fetch-favicon', (req, res) => {
  // check if ?url is in query
  if (!req.query.url) {
    return res.redirect('/');
  }
  
  // Update request to post /fetch-favicon
  req.method = 'POST';
  req.body = { url: req.query.url };
  req.headers['content-type'] = 'application/x-www-form-urlencoded';
  req.url = '/fetch-favicon';
  req.originalUrl = '/fetch-favicon';
  req.query = { url: req.query.url };
  req.app.handle(req, res, (err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  });

});

app.listen(3000, () => console.log('Favicon tool running at http://localhost:3000'));