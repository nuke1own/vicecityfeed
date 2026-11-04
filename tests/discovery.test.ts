import test from 'node:test';
import assert from 'node:assert/strict';
import { searchArticleMeta, relatedArticles, filterArticlesByCategory } from '../lib/filters';
import type { ArticleMeta } from '../lib/types';
const story = (slug: string, changes: Partial<ArticleMeta> = {}): ArticleMeta => ({ slug, title: 'Vice City map', excerpt: 'Explore Leonida', category: 'Map & Lore', section: 'map', author: {name: 'Desk', handle: 'desk', role: 'Editor'}, tags: ['map'], publishedAt: '2026-01-01', featured: false, coverAccent: 'cyan', coverScene: 'map', relatedSlugs: [], ...changes });
test('search matches separate terms across fields regardless of order and case', () => {
 const list = [story('map'), story('car', {title: 'New car', excerpt: 'Vehicles', category: 'Vehicles & Guns', tags: []})];
 assert.deepEqual(searchArticleMeta(list, ' DESK leonida ').map(a => a.slug), ['map']);
 assert.equal(searchArticleMeta(list, 'missing').length, 0);
 assert.equal(searchArticleMeta(list, '  ').length, 0);
 assert.equal(filterArticlesByCategory(list, 'vehicles-guns')[0].slug, 'car');
});
test('related stories prioritize curated choices, exclude self, and fill three slots', () => {
 const source = story('source', {relatedSlugs: ['curated', 'missing', 'source']});
 const list = [source, story('other', {category:'Guides', tags: []}), story('match'), story('curated', {category:'Media', tags: []}), story('new', {publishedAt:'2026-02-01'})];
 assert.deepEqual(relatedArticles(source,list).map(a => a.slug), ['curated','new','match']);
 assert.deepEqual(relatedArticles(source,[source]), []);
});
