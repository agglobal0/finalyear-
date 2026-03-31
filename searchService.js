const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

/**
 * Simple DuckDuckGo HTML search scraper to return top results.
 * Returns array of { title, link, snippet }
 */
async function webSearch(query, maxResults = 5) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const html = await res.text();
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const results = [];
  const items = doc.querySelectorAll('.result__body');
  for (let i = 0; i < Math.min(items.length, maxResults); i++) {
    const item = items[i];
    const a = item.querySelector('a.result__a');
    const snippetEl = item.querySelector('.result__snippet');
    const title = a ? a.textContent.trim() : '';
    const link = a ? a.href : '';
    const snippet = snippetEl ? snippetEl.textContent.trim() : '';
    results.push({ title, link, snippet });
  }
  return results;
}

module.exports = { webSearch };
