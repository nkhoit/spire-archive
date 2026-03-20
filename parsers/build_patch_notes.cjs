'use strict';

const fs = require('fs');
const path = require('path');

const PATCH_DIR = '/tmp/sts2-pck/localization/eng/patch_notes';
const OUTPUT_FILE = path.join(__dirname, '../data/sts2/patch_notes.json');

// Convert BBCode-style tags to HTML
function convertTags(text) {
  return text
    .replace(/\[blue\]/g, '')
    .replace(/\[\/blue\]/g, '')
    .replace(/\[gold\]/g, '')
    .replace(/\[\/gold\]/g, '')
    .replace(/\[red\]/g, '')
    .replace(/\[\/red\]/g, '')
    .replace(/\[b\]/g, '**')
    .replace(/\[\/b\]/g, '**')
    .replace(/\[i\]/g, '*')
    .replace(/\[\/i\]/g, '*')
    .replace(/\[u\]/g, '')
    .replace(/\[\/u\]/g, '')
    .replace(/\[s\]/g, '~~')
    .replace(/\[\/s\]/g, '~~')
    .replace(/\[\/?[a-z_]+\]/gi, ''); // strip any remaining tags
}

const files = fs.readdirSync(PATCH_DIR)
  .filter(f => f.endsWith('.md'))
  .sort()
  .reverse(); // newest first

const patches = [];

for (const file of files) {
  const dateStr = file.replace('.md', '').replace(/_/g, '-');
  const raw = fs.readFileSync(path.join(PATCH_DIR, file), 'utf-8').trim();
  const content = convertTags(raw);

  patches.push({
    date: dateStr,
    content,
  });
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(patches, null, 2));
console.log(`Wrote ${patches.length} patch notes to ${OUTPUT_FILE}`);
