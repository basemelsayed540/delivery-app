const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'index.html');
const JS_DIR = path.join(__dirname, 'js');
const lines = fs.readFileSync(FILE, 'utf8').split('\n');

// Find section boundaries by matching SECTION comments
function findSection(name) {
  const pattern = new RegExp('SECTION\\s+\\d+:\\s+' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      return i + 1; // 1-indexed
    }
  }
  return null;
}

// Find all SECTION headers
const sectionStarts = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/SECTION\s+(\d+):\s+(.*)/);
  if (m) {
    sectionStarts.push({ num: parseInt(m[1]), title: m[2].trim(), line: i + 1 });
  }
}

console.log('=== SECTION BOUNDARIES ===');
sectionStarts.forEach(s => console.log(`  SECTION ${s.num}: line ${s.line} — ${s.title}`));

// For each section, the content is from its start line to (next section start - 1)
// Section 12 goes to the closing </script>
function getSectionLines(startLine, endLine) {
  // Include blank lines at boundaries for readability
  return lines.slice(startLine - 1, endLine).join('\n');
}

// Build section ranges
const sections = [];
for (let i = 0; i < sectionStarts.length; i++) {
  const start = sectionStarts[i].line;
  const end = (i + 1 < sectionStarts.length) ? sectionStarts[i + 1].line - 1 : lines.length;
  sections.push({
    num: sectionStarts[i].num,
    title: sectionStarts[i].title,
    startLine: start,
    endLine: end,
    content: getSectionLines(start, end)
  });
}

// Print ranges
console.log('\n=== SECTION RANGES ===');
sections.forEach(s => {
  const contentLines = s.content.split('\n').length;
  console.log(`  ${s.num}: lines ${s.startLine}-${s.endLine} (${contentLines} lines) — ${s.title}`);
});

// Write simple sections (1-9, 11, 12)
const fileMap = {
  1: '01-config.js',
  2: '02-utils.js',
  3: '03-toast.js',
  4: '04-supabase-service.js',
  5: '05-auth.js',
  6: '06-theme.js',
  7: '07-router.js',
  8: '08-icons.js',
  9: '09-page-login.js',
  11: '11-page-dev-settings.js',
  12: '12-init.js',
};

const strictLine = "'use strict';\n\n";

sections.forEach(s => {
  if (s.num === 10) return; // Handle separately
  const filename = fileMap[s.num];
  if (!filename) return;
  const content = strictLine + s.content.trimEnd() + '\n';
  fs.writeFileSync(path.join(JS_DIR, filename), content, 'utf8');
  console.log(`  Wrote ${filename} (${content.split('\n').length} lines)`);
});

// Handle Section 10 split - read the full section
const sec10 = sections.find(s => s.num === 10);
const sec10Lines = sec10.content.split('\n');

// Find all function starts in section 10
console.log('\n=== SECTION 10 FUNCTION MAP ===');
const funcStarts = [];
for (let i = 0; i < sec10Lines.length; i++) {
  const m = sec10Lines[i].match(/^  (function |const |var |let |async function |var _peMode)/);
  if (m) {
    // Get function/variable name
    const line = sec10Lines[i];
    let name = '';
    const fm = line.match(/function\s+(\w+)/);
    const cm = line.match(/const\s+(\w+)/);
    const vm = line.match(/var\s+(\w+)/);
    if (fm) name = fm[1];
    else if (cm) name = cm[1];
    else if (vm) name = vm[1];
    funcStarts.push({ name, line: i + 1, type: m[1].trim() });
    console.log(`  Line ${i + 1}: ${name || '(anonymous)'} — ${m[1].trim()}`);
  }
}

// Manual classification based on audit
const CORE_FUNCTIONS = [
  'STATUS_COLORS', 'STATUS_TEXT_COLORS', 'HIDE_ACTION_STATUSES', 'FOLLOWUP_STATUSES',
  '_isArchived', '_isEligible',
  '_getFollowupsSent', '_getFollowupsDismissed',
  '_renderDialogOverlay', '_renderDashboardMain', '_showDialog', '_closeDialog',
  '_showEditAccountDialog',
  'D', '_restoreFilters', '_saveFilters',
  '_fetchShipments',
  'renderDashboard',
  '_bindMainEvents',
];

const ADMIN_FUNCTIONS = [
  '_isDelivered', '_resetUserForm', '_fetchDailyOptions', '_fetchUsers',
  '_handleSaveUser', '_handleDeleteUser', '_handleToggleApproved', '_startEditUser',
  '_renderAdminView', '_renderAdminStats', '_renderAdminUsers',
];

const REP_FUNCTIONS = [
  '_formatPhoneCall', '_formatPhoneWA', '_isFav', '_toggleFav', '_removeFav',
  '_getFollowerKey', '_normalizeStatus',
  '_checkNotifications', '_updateStatus',
  '_doFollowup', '_dismissFollowup', '_refreshDashboard', '_startPolling',
  '_renderShipmentCard',
  '_renderRepFollowerView',
  '_renderNotifPanel',
  '_bindCardEvents', '_handleCall', '_handleWA', '_showWADialog',
  '_showPostponeDialog', '_showRejectDialog', '_peMode', '_showPriceEditDialog',
];

console.log('\n=== CLASSIFICATION ===');
console.log(`  CORE: ${CORE_FUNCTIONS.length} items`);
console.log(`  ADMIN: ${ADMIN_FUNCTIONS.length} items`);
console.log(`  REP: ${REP_FUNCTIONS.length} items`);

// Now we need to find the exact line ranges for each function block in sec10Lines
// Each function block starts at its function line and ends at the line before the next function/variable
function findBlockEnd(lines, startIdx) {
  // Find the end of a function/variable block by counting braces
  let braceCount = 0;
  let foundOpenBrace = false;
  for (let i = startIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') { braceCount++; foundOpenBrace = true; }
      if (ch === '}') braceCount--;
    }
    if (foundOpenBrace && braceCount === 0) {
      return i;
    }
    // For const/var without braces (simple assignments)
    if (!foundOpenBrace && i > startIdx) {
      const nextLine = lines[i];
      if (nextLine.match(/^  (function |const |var |let |async function )/)) {
        return i - 1;
      }
    }
  }
  return lines.length - 1;
}

// Build block map: each block has a start line, end line, and name
const blocks = [];
for (let i = 0; i < funcStarts.length; i++) {
  const func = funcStarts[i];
  const startIdx = func.line - 1; // 0-indexed in sec10Lines
  const endIdx = findBlockEnd(sec10Lines, startIdx);
  blocks.push({
    name: func.name,
    startLine: func.line,
    endLine: endIdx + 1, // back to 1-indexed within section
    startIdx,
    endIdx,
    content: sec10Lines.slice(startIdx, endIdx + 1).join('\n')
  });
}

// Also capture the section comment header (first 4 lines of sec10)
const sec10Header = sec10Lines.slice(0, 4).join('\n');

console.log('\n=== SECTION 10 BLOCKS ===');
blocks.forEach(b => {
  const lines = b.endLine - b.startLine + 1;
  console.log(`  ${b.name.padEnd(30)} lines ${b.startLine}-${b.endLine} (${lines} lines)`);
});

// Now assemble the three files
function assembleFile(header, blocks) {
  return strictLine + header + '\n\n' + blocks.map(b => b.content).join('\n\n') + '\n';
}

// Core blocks
const coreBlocks = blocks.filter(b => CORE_FUNCTIONS.includes(b.name));
const adminBlocks = blocks.filter(b => ADMIN_FUNCTIONS.includes(b.name));
const repBlocks = blocks.filter(b => REP_FUNCTIONS.includes(b.name));

// Check for unclassified blocks
const allClassified = [...CORE_FUNCTIONS, ...ADMIN_FUNCTIONS, ...REP_FUNCTIONS];
const unclassified = blocks.filter(b => !allClassified.includes(b.name));
if (unclassified.length > 0) {
  console.log('\n=== UNCLASSIFIED BLOCKS (adding to CORE) ===');
  unclassified.forEach(b => console.log(`  ${b.name} (lines ${b.startLine}-${b.endLine})`));
  coreBlocks.push(...unclassified);
}

// Write 10a-dashboard-core.js
const coreHeader = '/* ================================================================\n   SECTION 10a: PAGE — DASHBOARD (CORE / SHARED)\n   ================================================================ */';
fs.writeFileSync(path.join(JS_DIR, '10a-dashboard-core.js'), assembleFile(coreHeader, coreBlocks), 'utf8');
console.log(`\n  Wrote 10a-dashboard-core.js (${assembleFile(coreHeader, coreBlocks).split('\n').length} lines)`);

// Write 10b-dashboard-admin.js
const adminHeader = '/* ================================================================\n   SECTION 10b: PAGE — DASHBOARD (ADMIN)\n   ================================================================ */';
fs.writeFileSync(path.join(JS_DIR, '10b-dashboard-admin.js'), assembleFile(adminHeader, adminBlocks), 'utf8');
console.log(`  Wrote 10b-dashboard-admin.js (${assembleFile(adminHeader, adminBlocks).split('\n').length} lines)`);

// Write 10c-dashboard-rep.js
const repHeader = '/* ================================================================\n   SECTION 10c: PAGE — DASHBOARD (REP / FOLLOWER)\n   ================================================================ */';
fs.writeFileSync(path.join(JS_DIR, '10c-dashboard-rep.js'), assembleFile(repHeader, repBlocks), 'utf8');
console.log(`  Wrote 10c-dashboard-rep.js (${assembleFile(repHeader, repBlocks).split('\n').length} lines)`);

// Now build the new index.html
// Replace the <script>...</script> block with individual script tags
const preScriptLines = lines.slice(0, 68); // Lines 1-68 (everything before <script>)
const postScriptLine = lines.slice(2358); // Lines 2359+ (</script>, </body>, </html>)

// Build new index.html
const scriptTags = [
  '  <script src="js/01-config.js"></script>',
  '  <script src="js/02-utils.js"></script>',
  '  <script src="js/03-toast.js"></script>',
  '  <script src="js/04-supabase-service.js"></script>',
  '  <script src="js/05-auth.js"></script>',
  '  <script src="js/06-theme.js"></script>',
  '  <script src="js/07-router.js"></script>',
  '  <script src="js/08-icons.js"></script>',
  '  <script src="js/09-page-login.js"></script>',
  '  <script src="js/10a-dashboard-core.js"></script>',
  '  <script src="js/10b-dashboard-admin.js"></script>',
  '  <script src="js/10c-dashboard-rep.js"></script>',
  '  <script src="js/11-page-dev-settings.js"></script>',
  '  <script src="js/12-init.js"></script>',
];

const newIndex = preScriptLines.join('\n') + '\n\n' + scriptTags.join('\n') + '\n\n' + postScriptLine.join('\n');
fs.writeFileSync(FILE, newIndex, 'utf8');
console.log(`\n  Wrote new index.html (${newIndex.split('\n').length} lines)`);

// Verify
console.log('\n=== VERIFICATION ===');
const newLines = fs.readFileSync(FILE, 'utf8').split('\n');
const scriptSrcTags = newLines.filter(l => l.includes('<script src="js/'));
console.log(`  Script tags in index.html: ${scriptSrcTags.length}`);
scriptSrcTags.forEach(t => console.log(`    ${t.trim()}`));

// Check that all JS files exist
const jsFiles = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js')).sort();
console.log(`\n  JS files in js/: ${jsFiles.length}`);
jsFiles.forEach(f => {
  const content = fs.readFileSync(path.join(JS_DIR, f), 'utf8');
  const lineCount = content.split('\n').length;
  const hasStrict = content.includes("'use strict'");
  console.log(`    ${f}: ${lineCount} lines, strict=${hasStrict}`);
});
