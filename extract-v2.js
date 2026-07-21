const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'index.html.bak'); // Use backup (pre-split)
const JS_DIR = path.join(__dirname, 'js');
const lines = fs.readFileSync(FILE, 'utf8').split('\n');

// Find section boundaries by matching SECTION comments
// The actual section starts at the /* === line BEFORE the SECTION N: line
const sectionStarts = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/SECTION\s+(\d+):\s+(.*)/);
  if (m) {
    // The section comment block starts 1 line before (the /* === line)
    sectionStarts.push({ num: parseInt(m[1]), title: m[2].trim(), line: i }); // 0-indexed
  }
}

console.log('=== SECTION BOUNDARIES (0-indexed) ===');
sectionStarts.forEach(s => console.log(`  SECTION ${s.num}: line ${s.line} — ${s.title}`));

// For each section, content goes from the /* === line to 1 line before the next /* === line
// For section 12, it goes to the last code line before </script>
const sections = [];
for (let i = 0; i < sectionStarts.length; i++) {
  const start = sectionStarts[i].line; // 0-indexed (the /* === line)
  let end;
  if (i + 1 < sectionStarts.length) {
    end = sectionStarts[i + 1].line - 1; // 0-indexed, line before next section's /*
  } else {
    // Section 12: find the </script> line
    for (let j = lines.length - 1; j >= 0; j--) {
      if (lines[j].trim() === '</script>') {
        end = j - 1; // line before </script>
        break;
      }
    }
  }
  // Trim trailing blank lines
  while (end > start && lines[end].trim() === '') end--;
  
  const content = lines.slice(start, end + 1).join('\n');
  sections.push({
    num: sectionStarts[i].num,
    title: sectionStarts[i].title,
    startLine: start + 1, // 1-indexed for display
    endLine: end + 1,
    content
  });
}

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

// Handle Section 10
const sec10 = sections.find(s => s.num === 10);
const sec10Lines = sec10.content.split('\n');

// Find all top-level declarations (functions, const, var, let)
const funcStarts = [];
for (let i = 0; i < sec10Lines.length; i++) {
  const line = sec10Lines[i];
  const m = line.match(/^\s{0,4}(function |const |var |async function )/);
  if (m) {
    let name = '';
    const fm = line.match(/function\s+(\w+)/);
    const cm = line.match(/const\s+(\w+)/);
    const vm = line.match(/var\s+(\w+)/);
    if (fm) name = fm[1];
    else if (cm) name = cm[1];
    else if (vm) name = vm[1];
    if (name) funcStarts.push({ name, idx: i, type: m[1].trim() });
  }
}

console.log('\n=== SECTION 10 FUNCTION MAP ===');
funcStarts.forEach(f => {
  console.log(`  [${f.idx}] ${f.name} — ${f.type}`);
});

// Find block boundaries
function findBlockEnd(lines, startIdx) {
  let braceCount = 0;
  let foundOpenBrace = false;
  for (let i = startIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') { braceCount++; foundOpenBrace = true; }
      if (ch === '}') braceCount--;
    }
    if (foundOpenBrace && braceCount === 0) return i;
  }
  return lines.length - 1;
}

// Build blocks
const blocks = [];
for (let i = 0; i < funcStarts.length; i++) {
  const func = funcStarts[i];
  const endIdx = findBlockEnd(sec10Lines, func.idx);
  blocks.push({
    name: func.name,
    startIdx: func.idx,
    endIdx,
    content: sec10Lines.slice(func.idx, endIdx + 1).join('\n')
  });
}

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

const coreBlocks = [], adminBlocks = [], repBlocks = [];
const unclassified = [];

blocks.forEach(b => {
  if (CORE.has(b.name)) coreBlocks.push(b);
  else if (ADMIN.has(b.name)) adminBlocks.push(b);
  else if (REP.has(b.name)) repBlocks.push(b);
  else unclassified.push(b);
});

if (unclassified.length > 0) {
  console.log('\n=== UNCLASSIFIED (adding to CORE) ===');
  unclassified.forEach(b => console.log(`  ${b.name}`));
  coreBlocks.push(...unclassified);
}

function assembleFile(header, blocks) {
  return strictLine + header + '\n\n' + blocks.map(b => b.content).join('\n\n') + '\n';
}

// Write 10a
const coreHeader = '/* ================================================================\n   SECTION 10a: PAGE — DASHBOARD (CORE / SHARED)\n   ================================================================ */';
const coreContent = assembleFile(coreHeader, coreBlocks);
fs.writeFileSync(path.join(JS_DIR, '10a-dashboard-core.js'), coreContent, 'utf8');
console.log(`\n  Wrote 10a-dashboard-core.js (${coreContent.split('\n').length} lines)`);

// Write 10b
const adminHeader = '/* ================================================================\n   SECTION 10b: PAGE — DASHBOARD (ADMIN)\n   ================================================================ */';
const adminContent = assembleFile(adminHeader, adminBlocks);
fs.writeFileSync(path.join(JS_DIR, '10b-dashboard-admin.js'), adminContent, 'utf8');
console.log(`  Wrote 10b-dashboard-admin.js (${adminContent.split('\n').length} lines)`);

// Write 10c
const repHeader = '/* ================================================================\n   SECTION 10c: PAGE — DASHBOARD (REP / FOLLOWER)\n   ================================================================ */';
const repContent = assembleFile(repHeader, repBlocks);
fs.writeFileSync(path.join(JS_DIR, '10c-dashboard-rep.js'), repContent, 'utf8');
console.log(`  Wrote 10c-dashboard-rep.js (${repContent.split('\n').length} lines)`);

console.log('\n=== DONE ===');
