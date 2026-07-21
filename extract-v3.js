const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'index.html.bak');
const JS_DIR = path.join(__dirname, 'js');
const lines = fs.readFileSync(FILE, 'utf8').split('\n');

// Find section boundaries
const sectionStarts = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/SECTION\s+(\d+):\s+(.*)/);
  if (m) sectionStarts.push({ num: parseInt(m[1]), title: m[2].trim(), line: i });
}

// Precompute header start (the /* === line) for each section
function findHeaderStart(lineIdx) {
  let h = lineIdx;
  while (h > 0 && !lines[h].includes('/*')) h--;
  return h;
}

const headerStarts = sectionStarts.map(s => findHeaderStart(s.line));

const sections = [];
for (let i = 0; i < sectionStarts.length; i++) {
  const headerStart = headerStarts[i];
  let end;
  if (i + 1 < sectionStarts.length) {
    end = headerStarts[i + 1] - 1;
  } else {
    for (let j = lines.length - 1; j >= 0; j--) {
      if (lines[j].trim() === '</script>') { end = j - 1; break; }
    }
  }
  while (end > headerStart && lines[end].trim() === '') end--;
  sections.push({
    num: sectionStarts[i].num,
    title: sectionStarts[i].title,
    content: lines.slice(headerStart, end + 1).join('\n')
  });
}

const strictLine = "'use strict';\n\n";

// Write simple sections
const fileMap = {
  1: '01-config.js', 2: '02-utils.js', 3: '03-toast.js',
  4: '04-supabase-service.js', 5: '05-auth.js', 6: '06-theme.js',
  7: '07-router.js', 8: '08-icons.js', 9: '09-page-login.js',
  11: '11-page-dev-settings.js', 12: '12-init.js',
};

sections.forEach(s => {
  if (s.num === 10) return;
  const filename = fileMap[s.num];
  if (!filename) return;
  const content = strictLine + s.content.trimEnd() + '\n';
  fs.writeFileSync(path.join(JS_DIR, filename), content, 'utf8');
  console.log(`Wrote ${filename} (${content.split('\n').length} lines)`);
});

// Handle Section 10 - find top-level declarations only
const sec10 = sections.find(s => s.num === 10);
const sec10Lines = sec10.content.split('\n');

// Top-level = exactly 2 spaces of indentation (  function,  const,  var,  async)
const TOP_LEVEL_RE = /^  (function |const |var |async function )/;

const funcStarts = [];
for (let i = 0; i < sec10Lines.length; i++) {
  if (TOP_LEVEL_RE.test(sec10Lines[i])) {
    const line = sec10Lines[i];
    let name = '';
    const fm = line.match(/function\s+(\w+)/);
    const cm = line.match(/const\s+(\w+)/);
    const vm = line.match(/var\s+(\w+)/);
    if (fm) name = fm[1];
    else if (cm) name = cm[1];
    else if (vm) name = vm[1];
    if (name) funcStarts.push({ name, idx: i });
  }
}

console.log(`\nSection 10 top-level declarations: ${funcStarts.length}`);
funcStarts.forEach(f => console.log(`  [${f.idx}] ${f.name}`));

// Find block end by brace matching
function findBlockEnd(lines, startIdx) {
  let braceCount = 0, foundOpen = false;
  for (let i = startIdx; i < lines.length; i++) {
    // Before counting braces, check if next line starts a new top-level decl
    if (i > startIdx && !foundOpen) {
      if (lines[i].match(/^\s{2}(function |const |var |let |async function )/)) {
        return i - 1;
      }
    }
    for (const ch of lines[i]) {
      if (ch === '{') { braceCount++; foundOpen = true; }
      if (ch === '}') braceCount--;
    }
    if (foundOpen && braceCount === 0) return i;
  }
  if (!foundOpen) return startIdx;
  return lines.length - 1;
}

// Build blocks
const blocks = [];
for (let i = 0; i < funcStarts.length; i++) {
  const f = funcStarts[i];
  const endIdx = findBlockEnd(sec10Lines, f.idx);
  blocks.push({
    name: f.name,
    startIdx: f.idx,
    endIdx,
    content: sec10Lines.slice(f.idx, endIdx + 1).join('\n')
  });
}

console.log('\nBlock boundaries:');
blocks.forEach(b => console.log(`  ${b.name.padEnd(30)} [${b.startIdx}-${b.endIdx}] (${b.endIdx - b.startIdx + 1} lines)`));

// Classification
const CORE = new Set([
  'STATUS_COLORS', 'STATUS_TEXT_COLORS', 'HIDE_ACTION_STATUSES', 'FOLLOWUP_STATUSES',
  '_isArchived', '_isEligible',
  '_getFollowupsSent', '_getFollowupsDismissed',
  '_renderDialogOverlay', '_renderDashboardMain', '_showDialog', '_closeDialog',
  '_showEditAccountDialog',
  'D', '_restoreFilters', '_saveFilters',
  '_fetchShipments',
  'renderDashboard',
  '_bindMainEvents',
]);

const ADMIN = new Set([
  '_isDelivered', '_resetUserForm', '_fetchDailyOptions', '_fetchUsers',
  '_handleSaveUser', '_handleDeleteUser', '_handleToggleApproved', '_startEditUser',
  '_renderAdminView', '_renderAdminStats', '_renderAdminUsers',
]);

const REP = new Set([
  '_formatPhoneCall', '_formatPhoneWA', '_isFav', '_toggleFav', '_removeFav',
  '_getFollowerKey', '_normalizeStatus',
  '_checkNotifications', '_updateStatus',
  '_doFollowup', '_dismissFollowup', '_refreshDashboard', '_startPolling',
  '_renderShipmentCard',
  '_renderRepFollowerView',
  '_renderNotifPanel',
  '_bindCardEvents', '_handleCall', '_handleWA', '_showWADialog',
  '_showPostponeDialog', '_showRejectDialog', '_peMode', '_showPriceEditDialog',
  '_buildWAMsg', '_copyDetails',
]);

const coreBlocks = [], adminBlocks = [], repBlocks = [], unclassified = [];

blocks.forEach(b => {
  if (CORE.has(b.name)) coreBlocks.push(b);
  else if (ADMIN.has(b.name)) adminBlocks.push(b);
  else if (REP.has(b.name)) repBlocks.push(b);
  else unclassified.push(b);
});

if (unclassified.length > 0) {
  console.log('\nUNCLASSIFIED (adding to CORE):');
  unclassified.forEach(b => console.log(`  ${b.name}`));
  coreBlocks.push(...unclassified);
}

function assembleFile(header, blocks) {
  return strictLine + header + '\n\n' + blocks.map(b => b.content).join('\n\n') + '\n';
}

const coreHeader = '/* ================================================================\n   SECTION 10a: PAGE — DASHBOARD (CORE / SHARED)\n   ================================================================ */';
const coreContent = assembleFile(coreHeader, coreBlocks);
fs.writeFileSync(path.join(JS_DIR, '10a-dashboard-core.js'), coreContent, 'utf8');
console.log(`\nWrote 10a-dashboard-core.js (${coreContent.split('\n').length} lines)`);

const adminHeader = '/* ================================================================\n   SECTION 10b: PAGE — DASHBOARD (ADMIN)\n   ================================================================ */';
const adminContent = assembleFile(adminHeader, adminBlocks);
fs.writeFileSync(path.join(JS_DIR, '10b-dashboard-admin.js'), adminContent, 'utf8');
console.log(`Wrote 10b-dashboard-admin.js (${adminContent.split('\n').length} lines)`);

const repHeader = '/* ================================================================\n   SECTION 10c: PAGE — DASHBOARD (REP / FOLLOWER)\n   ================================================================ */';
const repContent = assembleFile(repHeader, repBlocks);
fs.writeFileSync(path.join(JS_DIR, '10c-dashboard-rep.js'), repContent, 'utf8');
console.log(`Wrote 10c-dashboard-rep.js (${repContent.split('\n').length} lines)`);
