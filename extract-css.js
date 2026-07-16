const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, 'index.html');
const lines = fs.readFileSync(FILE, 'utf8').split('\n');

// Find <style> and </style> tags
let styleStart = -1, styleEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<style>') && styleStart === -1) styleStart = i;
  if (lines[i].includes('</style>')) styleEnd = i;
}

if (styleStart === -1 || styleEnd === -1) {
  console.log('Style tags not found');
  process.exit(1);
}

console.log('Style block: lines', styleStart+1, '-', styleEnd+1);

// Extract CSS content (between <style> and </style>)
const cssContent = lines.slice(styleStart + 1, styleEnd).join('\n').trim();
console.log('CSS content lines:', cssContent.split('\n').length);

// Write to css/app.css
const cssFile = path.join(__dirname, 'css', 'app.css');
fs.writeFileSync(cssFile, cssContent + '\n', 'utf8');
console.log('Wrote css/app.css');

// Update index.html: replace <style>...</style> with <link>
const newLines = [...lines];
const linkTag = '  <link rel="stylesheet" href="css/app.css">';
newLines.splice(styleStart, styleEnd - styleStart + 1, linkTag);
fs.writeFileSync(FILE, newLines.join('\n'), 'utf8');
console.log('Updated index.html:', newLines.length, 'lines');
