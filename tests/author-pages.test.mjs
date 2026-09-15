import test from 'node:test';
import assert from 'node:assert/strict';
import { authorPage, contributorPage, detailPage, notFoundPage } from '../scripts/site-template.mjs';

const item = { package_id: 'owner/tool', names: { 'zh-Hans': '工具', en: 'Tool' },
  summaries: { 'zh-Hans': '介绍', en: 'Description' }, kind: 'widget',
  version: '1.0.0', icon_path: 'packages/owner/tool/icon.png' };

test('author pages preserve nested assets, package links and language routes', () => {
  for (const lang of ['zh', 'en']) {
    const root = lang === 'zh' ? '../../' : '../../../';
    const html = authorPage({ lang, namespace: 'owner', packages: [item], css: '', js: '' });
    assert.ok(html.includes(`src="${root}assets/${item.icon_path}"`));
    assert.ok(html.includes(`href="${root}${lang === 'en' ? 'en/' : ''}packages/owner/tool/"`));
    assert.ok(html.includes(`href="${root}en/authors/owner/"`));
    assert.ok(html.includes(`href="${root}authors/owner/"`));
    assert.ok(html.includes('https://github.com/owner'));
    assert.doesNotMatch(html, /data-author-first-package|data-author-verified/);
  }
});

test('author labels escape content and empty pages remain usable', () => {
  const html = authorPage({ lang: 'zh', namespace: 'owner',
    packages: [{ ...item, names: { 'zh-Hans': '<script>bad</script>' } }], css: '', js: '' });
  assert.match(html, /&lt;script&gt;bad&lt;\/script&gt;/);
  const empty = authorPage({ lang: 'en', namespace: 'owner', packages: [], css: '', js: '' });
  assert.match(empty, /No published packages/);
});

test('404 has a truthful message and depth-independent return links', () => {
  const html = notFoundPage({ css: '' });
  assert.match(html, /页面不存在/);
  assert.match(html, /name="robots" content="noindex"/);
  assert.match(html, /href="https:\/\/glzlaohuai.github.io\/notchany-registry\/"/);
  assert.doesNotMatch(html, /class="hero-band"|__NOTCHANY_STORE__|href="\.\./);
});

test('contributor pages retain same-origin API configuration and language routes', () => {
  for (const lang of ['zh', 'en']) {
    const html = contributorPage({ lang, packages: [item], histories: {}, marketAPIBase: '/', css: '', js: '' });
    assert.match(html, /"market_api":"\/"/);
    assert.match(html, /id="profile-name"/);
    assert.match(html, /en\/contributors\//);
    assert.match(html, /id="profile-manage"[^>]+hidden/);
  }
});

test('package authors and release identities link to distinct namespace and numeric pages', () => {
  const html = detailPage({ lang: 'zh', item, packages: [item], marketAPIBase: '/', css: '', js: '',
    history: { releases: [], contributors: [{ github_user_id: '12345', login: 'renamed-owner' }] } });
  assert.match(html, /href="\.\.\/\.\.\/\.\.\/authors\/owner\/"/);
  assert.match(html, /contributors\/\?id=12345/);
  assert.match(html, /data-market-api="\/"/);
});
