// Supabase configuration
const SUPABASE_URL = 'https://cbspzktlhfxusyksfkvp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNic3B6a3RsaGZ4dXN5a3Nma3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTE4NzcsImV4cCI6MjA5NjMyNzg3N30.TotXJefvwWoqg7O4UFqGqWt2fSVpS9CZsT3LND4ofQ0';

let allData = null;
let activeTab = 'A1';
const STORAGE_KEY = 'deutsch-b2-sessions';

async function fetchFromSupabase() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/resources?select=*&order=level.asc,title.asc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) throw new Error('Supabase fetch failed');
    return await res.json();
  } catch (e) {
    console.warn('Supabase unavailable, falling back to local JSON', e);
    return null;
  }
}

async function loadResources() {
  try {
    // Try Supabase first
    const supabaseData = await fetchFromSupabase();
    if (supabaseData && supabaseData.length > 0) {
      // Group by level
      const levels = [...new Set(supabaseData.map(r => r.level))].sort();
      allData = {
        levels: levels.map(lvl => ({
          id: lvl,
          label: lvl,
          tools: supabaseData.filter(r => r.level === lvl).map(r => ({
            name: r.title,
            description: r.description,
            url: r.url,
            type: r.type,
            category: r.category,
            free: r.is_free,
            tags: r.tags || []
          }))
        })),
        tools: []
      };
    } else {
      // Fallback to local JSON
      const r = await fetch('src/data/resources.json');
      allData = await r.json();
    }
    renderLevel(activeTab);
    renderTools(allData.tools);
  } catch(e) {
    console.error('Error loading resources:', e);
  }
}

function renderLevel(levelId) {
  const container = document.getElementById('levels-container');
  if (!allData) return;
  const level = allData.levels.find(l => l.id === levelId);
  if (!level) return;
  container.innerHTML = '';
  level.tools.forEach(t => {
    const card = document.createElement('div');
    card.className = 'resource-card';
    const typeIcon = t.type === 'video' ? '🎬' : t.type === 'audio' ? '🎧' : t.type === 'app' ? '📱' : t.type === 'book' ? '📚' : t.type === 'exam' ? '📝' : '🌐';
    const freeTag = t.free ? '<span class="tag free">Gratuit</span>' : '<span class="tag paid">Payant</span>';
    card.innerHTML = `
      <div class="card-header">
        <span class="card-icon">${typeIcon}</span>
        <h3>${t.name}</h3>
        ${freeTag}
      </div>
      <p>${t.description || ''}</p>
      <div class="card-tags">${(t.tags||[]).map(tag=>`<span class="tag">${tag}</span>`).join('')}</div>
      ${t.url ? `<a href="${t.url}" target="_blank" rel="noopener" class="btn-link">Acceder &rarr;</a>` : ''}
    `;
    container.appendChild(card);
  });
}

function renderTools(tools) {
  const container = document.getElementById('tools-container');
  if (!tools) return;
  container.innerHTML = '';
  tools.forEach(t => {
    const card = document.createElement('div');
    card.className = 'resource-card';
    card.innerHTML = `<h3>${t.name}</h3><p>${t.description||''}</p>${t.url?`<a href="${t.url}" target="_blank" class="btn-link">Voir &rarr;</a>`:''}` ;
    container.appendChild(card);
  });
}

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.dataset.level;
      renderLevel(activeTab);
    });
  });
}

function getSessions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}

function saveSessions(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

function renderTracker() {
  const sessions = getSessions();
  const log = document.getElementById('tracker-log');
  const stats = document.getElementById('tracker-stats');
  const totalMin = sessions.reduce((a,s) => a + Number(s.minutes), 0);
  const totalH = Math.floor(totalMin/60);
  const restMin = totalMin%60;
  const byLevel = {A1:0,A2:0,B1:0,B2:0};
  sessions.forEach(s => { if(byLevel[s.level]!==undefined) byLevel[s.level]+=Number(s.minutes); });
  if(stats) stats.innerHTML = `<strong>Total: ${totalH}h${restMin}min</strong> | ${Object.entries(byLevel).map(([k,v])=>`${k}: ${Math.floor(v/60)}h${v%60}min`).join(' | ')}`;
  if(log) log.innerHTML = sessions.slice(-10).reverse().map(s => `<div class="session-entry"><span class="session-level">${s.level}</span> ${s.minutes} min - ${s.activity} <small>${s.date}</small></div>`).join('');
}

function initTracker() {
  const addBtn = document.getElementById('track-add');
  if (!addBtn) return;
  addBtn.addEventListener('click', () => {
    const level = document.getElementById('track-level')?.value || 'A1';
    const minutes = document.getElementById('track-minutes')?.value || 30;
    const activity = document.getElementById('track-activity')?.value || 'Etude';
    const sessions = getSessions();
    sessions.push({ level, minutes, activity, date: new Date().toLocaleDateString('fr-FR') });
    saveSessions(sessions);
    renderTracker();
  });
  renderTracker();
}

document.addEventListener('DOMContentLoaded', () => { loadResources(); initTabs(); initTracker(); });
