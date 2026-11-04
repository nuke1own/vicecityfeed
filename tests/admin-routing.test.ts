import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
test('admin host redirects root to desk and public pages to public host', () => {
 const [root, pages] = config.redirects;
 assert.equal(root.source, '/');
 assert.equal(root.destination, '/admin/');
 for (const rule of config.redirects) assert.deepEqual(rule.has, [{type:'host',value:'admin.vicecityfeed.com'}]);
 const pattern = new RegExp('^/' + pages.source.slice('/:path'.length) + '$');
 for (const path of ['/feed/','/album/','/posts/story/']) assert.equal(pattern.test(path),true,path);
 for (const path of ['/admin/','/admin/write/','/_next/static/app.js','/favicon.ico','/images/logo.png']) assert.equal(pattern.test(path),false,path);
 assert.equal(pages.destination,'https://www.vicecityfeed.com/:path');
});
