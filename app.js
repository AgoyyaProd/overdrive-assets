// ─── CONFIG ────────────────────────────────────────────────────────────────
const SID = '1SgnXorS23IvBM2dbie_QOc756wnOTjqCvx3U2ensfi4';
// The old PUB_KEY pointed at a "File > Share > Publish to web" link for the
// previous sheet; that link now 404s on its own (the sheet it published moved
// on), which is harmless here since gv() below just falls through to the
// second, SID-based URL - the one that actually matters, and the one that's
// confirmed working against the new sheet. Left blank until/unless the new
// sheet is published to web too and this gets a real key of its own.
const PUB_KEY = '';
const TWITCH_CH = 'overdrive_tm';
// ─── TEAM LOGOS (Drive file IDs) ───────────────────────────────────────────
const LOGOS = {
  'big':           'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/BIG.svg',
  'all_gamers':    'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/AllGamers.svg',
  'pacb':          'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/PACB.svg',
  'geng_x_weibo':  'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/GenG_Weibo.svg',
  'fut':           'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/FUT_Esport.svg',
  'navi':          'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/Navi.svg',
  'cook':          'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/COOK.svg',
  's8ul':          'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/S8UL.svg',
  'orgless':       'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/Orgless.svg',
  'vp_x_neon':     'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/Virtus_Pro.svg',
  'shift':         'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/SHIFT.svg',
  'tempobros':     'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/TempoBros_short.svg',
  'bs_plus':       'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/BS%2B.svg',
  'ragnarok':      'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/Ragnarok.svg',
  'team_heretics': 'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/Team_Heretics.svg',
  'loading':       'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/Loading.svg',
  'va_bene':       'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/VaBene.svg',
  'evolupegg':     'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/EvolupeGG.svg',
  'halcyon':       'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/Halcyon.svg',
  'piwo':          'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/Piwo.svg',
  'rex_regum_qeon':'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/RRQ.svg',
  'aurora_skuf':   'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/Aurora.svg',
  'brothers':      'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/Brothers.svg',
  'unc_racing':    'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_teams/UNC_Racing.svg',
};



// ─── STATE ─────────────────────────────────────────────────────────────────
const S = {
  cfg:{ pd:600, pm:60 },
  splits:[], act:'spring2026', configActiveSplit:'spring2026',
  teams:{}, d1:[], d2:[], sched:[], res:[], art:[], vods:[], rank:[], rankDiv:'all', over:[], overYear:'', seasonYear:'', defaultLogo:'',
  homeSched:[], homeD1:[], homeD2:[],
  schedAllRows:[], schedSplit:'all', schedMode:'all', schedRegion:'EMEA', schedOQ:'',
  page:'home',
  homeUpDiv:'1', homeReDiv:'1', homeStDiv:'1', stdDiv:'1', leaguesDiv:'1',
  divTab:'1', regTab:'EMEA', vodSp:null, tdiv:'all',
};
let pollT = null;
let schIdx = 0;

// ─── GViz FETCH (fetch + regex – works with public sheets) ──────────────────
async function gv(name) {
  const enc = encodeURIComponent(name);
  const urls = [
    'https://docs.google.com/spreadsheets/d/e/' + PUB_KEY + '/gviz/tq?tqx=out:json&headers=1&sheet=' + enc,
    'https://docs.google.com/spreadsheets/d/' + SID    + '/gviz/tq?tqx=out:json&headers=1&sheet=' + enc,
  ];
  for (let i = 0; i < urls.length; i++) {
    try {
      const res = await fetch(urls[i]);
      if (!res.ok) { console.warn('[GViz] HTTP', res.status, 'trying next:', name); continue; }
      const text = await res.text();
      // GViz wraps response: google.visualization.Query.setResponse({...});
      const m = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+?)\);?\s*$/);
      if (!m) { console.warn('[GViz] Bad response format, trying next:', name); continue; }
      const data = JSON.parse(m[1]);
      if (data?.status === 'error') { console.warn('[GViz] Sheet error:', name, data?.errors?.[0]?.message); continue; }
      const table = data?.table;
      if (!table) { console.warn('[GViz] No table in response:', name); continue; }
      // Detect Config fallback: GViz returns first sheet when tab name not found
      const cols = (table.cols||[]).map(c2=>(c2.label||c2.id||'').toLowerCase());
      const isConfigFallback = cols.length <= 3 && cols.some(c2=>c2.includes('site_name')||c2.includes('key_site'));
      if (isConfigFallback) { console.warn('[GViz] Config fallback detected for tab:', name, '(tab not found in sheet)'); continue; }
      return table;
    } catch(e) {
      console.warn('[GViz] Error (url', i+1, '):', name, e.message);
    }
  }
  console.error('[GViz] All URLs failed:', name);
  return null;
}

function cv(row, i) {
  const cell = row?.c?.[i];
  // Google Sheets/GViz infers a whole column's type from its cell FORMAT, not just
  // its content. If score_a/score_b are formatted as "Number" (the sheet's default
  // for a column that's mostly 0/1/2/3...), GViz silently returns the entire cell
  // as null - not even a formatted-text fallback - for any row where that cell
  // holds "W"/"FF" instead of a number. There's no way to recover that value from
  // here since the API never sends it; the fix is on the sheet side, formatting
  // those columns as Format > Number > Plain text so GViz stops coercing them.
  if (!cell) return null;
  const v = cell.v;
  // GViz returns dates as "Date(2026,3,10)" – month is 0-indexed
  if (typeof v === 'string' && v.startsWith('Date(')) {
    const m = v.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (m) {
      const day=+m[3], mo=+m[2]+1, yr=+m[1];
      return (day<10?'0':'')+day+'/'+(mo<10?'0':'')+mo+'/'+yr;
    }
  }
  return v ?? cell.f ?? null;
}
function t2o(table) {
  if (!table?.rows) return [];
  const h = table.cols.map(c => (c.label||c.id).toLowerCase().replace(/[\s-]/g,'_').replace(/[^a-z0-9_]/g,''));
  return table.rows.filter(r => r.c?.some(c => c?.v != null)).map(r => {
    const o = {}; h.forEach((k, i) => { o[k] = cv(r, i); }); return o;
  });
}

// ─── LOADERS ───────────────────────────────────────────────────────────────
// The 2026-09 sheet migration dropped the old Config/Splits tabs - there's no
// more explicit "active_split" setting anywhere, so the active split is derived
// from the data instead: whichever split value appears on the LAST row of
// WEBSITE_MATCHES, the sheet's own convention for "the split being played now"
// (its rows are entered in play order, so the latest split is always last).
async function lActiveSplitFromMatches() {
  const t = await gv('WEBSITE_MATCHES');
  if (!t) return;
  const rows = t2o(t).filter(r => r.split != null && String(r.split).trim() !== '');
  if (!rows.length) return;
  const last = rows[rows.length - 1];
  S.act = String(last.split).trim();
  S.configActiveSplit = S.act;
  if (last.season) S.seasonYear = String(last.season).trim();
}
// S.splits (for the split-switcher dropdown) is now populated as a side effect
// of parsing WEBSITE_STANDINGS (see loadWebsiteStandings) - there's no separate
// Splits tab anymore, so this just wires that result in and sets the default
// VODs split, mirroring what lSplits() used to do.
async function lSplits() {
  const { splits } = await loadWebsiteStandings();
  S.splits = splits;
  if (!S.vodSp) S.vodSp = S.act;
}
async function lTeams() {
  // "data_teams" replaced the old separate Teams + Team_History tabs (2026-09
  // sheet migration): one row per team, current roster only. Its own column
  // names differ from the site's internal field names, so they're remapped
  // here rather than everywhere they're read: entity_id -> team_id, team_tag
  // -> team_short, player1_name/player2_name -> player1/player2 (the names
  // recentForm()/teamsWithSamePlayers() match rosters on), substitute*_name
  // -> sub1/sub2. previous_team_name is carried through as-is; there's no
  // more per-split Team_History lineage, so it's the one signal left for a
  // rename (teamNoteBadge() only shows a note when teamFor()/Team_History
  // sets team._note, which this alone doesn't - see lTeamHistory below).
  const t = await gv('data_teams');
  S.teams = {};
  if (t) {
    t2o(t).forEach(r => {
      const teamId = r.entity_id || r.team_id;
      if (!teamId) return;
      // Drive view links (/file/d/.../view) are NOT image URLs – use our thumbnail LOGOS instead
      // Priority: 1) logo_url from sheet if it's a valid HTTP URL
      //           2) LOGOS constant (Drive/embedded fallback)
      const rawLogo = String(r.logo_url || '');
      const isFullUrl = rawLogo.startsWith('http');
      const logo = (isFullUrl ? rawLogo : '') || LOGOS[teamId] || '';
      S.teams[teamId] = {
        ...r,
        team_id: teamId,
        logo_url: logo,
        team_name: dn(r.team_name),
        team_short: dn(r.team_tag || r.team_short || ''),
        player1: r.player1_name || r.player1 || '',
        player2: r.player2_name || r.player2 || '',
        sub1: r.substitute1_name || r.sub1 || '',
        sub2: r.substitute2_name || r.sub2 || '',
        // teamFor() passes this straight through to teamNoteBadge() as-is when
        // there's no Team_History override for the split (there never is now -
        // see lTeamHistory below), so this is the note the "i" badge shows.
        _note: r.previous_team_name ? `Formerly ${dn(r.previous_team_name)}` : '',
      };
    });
  }
  // The site shows exactly the teams registered in the Teams tab - nothing else.
  // A previous fallback here injected a phantom team_id for every entry in the
  // hardcoded LOGOS map that wasn't already in the sheet (and force-overwrote
  // the logo for ones that were), which is exactly how stale, since-renamed
  // team_ids like geng_x_weibo or aurora_skuf kept showing up as their own
  // separate cards on the Teams page long after the sheet moved on from them.
  // LOGOS itself is still used above as a per-team logo fallback, which is fine -
  // it just never gets to invent a team that isn't in the sheet.
  // "no_logo" is a data-only row in the Teams tab that supplies the default fallback logo
  // for teams not registered there (e.g. Open Qualifier participants). It must NEVER be
  // shown as an actual team anywhere on the site, so pull its logo out and delete the row.
  const noLogoId = Object.keys(S.teams).find(id => id.toLowerCase() === 'no_logo');
  S.defaultLogo = (noLogoId && S.teams[noLogoId]?.logo_url) || '';
  if (noLogoId) delete S.teams[noLogoId];
}
// A team's name, logo, and roster can change between splits (renames, rebrands,
// roster moves) — editing the Teams tab in place would rewrite that identity
// retroactively across every past result too. Team_History used to hold one row
// per team_id + split_id with whatever was true THAT split, letting every stat
// that reads teamFor(id, splitId) show a team exactly as it was at the time.
// The 2026-09 sheet migration dropped this tab in favour of a single
// previous_team_name field on data_teams (see lTeams) - there's no more
// per-split lineage, just "current" and "one step back". gv() below simply
// fails to find the tab and returns null, so this is now a no-op that leaves
// S.teamHistory empty; teamFor() already falls back to the plain Teams-tab
// record whenever it finds no history for a team, which is every team now.
async function lTeamHistory() {
  const t = await gv('Team_History');
  S.teamHistory = {};
  if (!t) return;
  const bySplitOrder = {};
  t2o(t).forEach(r => {
    if (!r.team_id || !r.split_id) return;
    if (!S.teamHistory[r.team_id]) S.teamHistory[r.team_id] = {};
    const rawLogo = String(r.logo_url || '');
    S.teamHistory[r.team_id][r.split_id] = {
      team_name: r.display_name ? dn(r.display_name) : '',
      team_short: r.display_short ? dn(r.display_short) : '',
      logo_url: rawLogo.startsWith('http') ? rawLogo : '',
      player1: r.player1 || '', player2: r.player2 || '',
      sub1: r.sub1 || '', sub2: r.sub2 || '',
      note: r.note || '',
      predecessor_id: r.predecessor_id ? String(r.predecessor_id).trim().toLowerCase() : '',
    };
  });
}
// Walks a team's chain of predecessors (Airwalkers replaced Orgless, which might
// itself have replaced something earlier) via Team_History's predecessor_id, so
// stats that should read as one continuous history - Overdrive Record, biggest
// streak, title count, previous splits - can be computed across every team_id
// that ever was this same lineage, not just whichever one is current. A cap of 10
// hops and a seen-set both guard against a note accidentally pointing in a circle.
function teamLineage(teamId) {
  const chain = [teamId];
  const seen = new Set([String(teamId||'').toLowerCase()]);
  let current = teamId;
  for (let i = 0; i < 10; i++) {
    const bySplit = S.teamHistory?.[current];
    if (!bySplit) break;
    const pred = Object.values(bySplit).map(h => h.predecessor_id).find(Boolean);
    if (!pred || seen.has(pred)) break;
    chain.push(pred);
    seen.add(pred);
    current = pred;
  }
  return chain;
}
// Resolves how a team should appear for one specific split: history override for
// that split first, then the base Teams-tab record for whatever fields the
// override left blank, then the split immediately before it (a rename recorded
// once should keep applying forward until the next change), so ongoing splits
// don't need a repeated identical row every season. Pass a raw id string or an
// already-looked-up team object; unregistered names pass through unchanged.
function teamFor(teamOrId, splitId) {
  if (!teamOrId) return teamOrId;
  const key = typeof teamOrId === 'string' ? teamOrId : teamOrId.team_id;
  if (!key) return teamOrId;
  const base = S.teams[key] || S.teams[(key || '').toLowerCase()] || (typeof teamOrId === 'object' ? teamOrId : null);
  const bySplit = S.teamHistory?.[key];
  if (!bySplit || !splitId) return base || teamOrId;
  // Walk splits at or before the requested one, most recent first, so a change
  // made in an earlier split keeps applying until a later split overrides it
  // again - without needing a duplicate row every season nothing changed.
  const order = (S.splits || []).map(s => s.split_id);
  const idx = order.indexOf(splitId);
  const candidates = idx === -1 ? [splitId] : order.slice(0, idx + 1).reverse();
  let hist = null;
  for (const sid of candidates) { if (bySplit[sid]) { hist = bySplit[sid]; break; } }
  if (!hist) return base || teamOrId;
  return {
    ...(base || { team_id: key }),
    team_name: hist.team_name || base?.team_name || key,
    team_short: hist.team_short || base?.team_short || '',
    logo_url: hist.logo_url || base?.logo_url || '',
    player1: hist.player1 || base?.player1 || '',
    player2: hist.player2 || base?.player2 || '',
    sub1: hist.sub1 || base?.sub1 || '',
    sub2: hist.sub2 || base?.sub2 || '',
    _note: hist.note || '',
  };
}
// Small "i" badge rendered next to a team's name when teamFor() found a note for
// that split; click toggles a fixed-position popover with the note text. Fixed
// positioning (computed from the badge's own rect) rather than a parent-relative
// popover, since this gets used inside dozens of differently-structured
// containers across the site and can't assume a positioned ancestor.
function teamNoteBadge(team) {
  if (!team?._note) return '';
  const safe = String(team._note).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<span class="tnote" onmouseenter="showTeamNote(this)" onmouseleave="hideTeamNote(this)" onclick="event.stopPropagation();toggleTeamNote(this)" data-note="${safe}">i</span>`;
}
function positionNotePop(el) {
  const pop = document.createElement('div');
  pop.className = 'tnote-pop';
  pop.textContent = el.dataset.note;
  document.body.appendChild(pop);
  pop._forEl = el;
  const r = el.getBoundingClientRect();
  const w = Math.min(280, window.innerWidth - 24);
  pop.style.width = w + 'px';
  pop.style.left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12)) + 'px';
  pop.style.top = (r.bottom + 6) + 'px';
  return pop;
}
// Hover is the primary trigger (mouse users see it just by pointing at the badge,
// no click needed); tap-to-toggle stays as a fallback since touch devices don't
// fire hover events reliably, so it's the only way a phone/tablet user gets there.
function showTeamNote(el) {
  if (el._notePop) return;
  const existing = document.querySelector('.tnote-pop');
  if (existing) existing.remove();
  el._notePop = positionNotePop(el);
}
function hideTeamNote(el) {
  if (el._notePop) { el._notePop.remove(); el._notePop = null; }
}
function toggleTeamNote(el) {
  if (el._notePop) return; // hover already opened it - a click on top shouldn't immediately close it
  const existing = document.querySelector('.tnote-pop');
  if (existing) existing.remove();
  const pop = positionNotePop(el);
  el._notePop = pop;
  setTimeout(() => document.addEventListener('click', function close(e) {
    if (!pop.contains(e.target) && e.target !== el) { pop.remove(); if (el._notePop === pop) el._notePop = null; document.removeEventListener('click', close); }
  }), 0);
}
function isOpenDivision(div) {
  const d = (div||'').toString().trim();
  return !d || d.toLowerCase() === 'open';
}
function divLabel(div) {
  const d = (div||'').toString().trim();
  if (!d || d.toLowerCase() === 'open') return 'Open';
  return 'Division ' + d;
}
// Label for a match's "division" column (values like "Div 1", "Div 2", "Promo", or "Open")
function matchDivLabel(div) {
  const d = (div||'').toString().trim();
  if (!d) return '';
  if (/^div\s*1$/i.test(d) || d === '1') return 'DIVISION 1';
  if (/^div\s*2$/i.test(d) || d === '2') return 'DIVISION 2';
  if (d.toLowerCase() === 'open') return 'OPEN';
  return d.toUpperCase();
}
// Same as matchDivLabel, but for Open Qualifier matches also appends which OQ it is
// (region + round, e.g. "APAC 1") taken straight from the match_id column.
function matchDivLabelFull(m) {
  const base = matchDivLabel(m.division);
  const isOQ = (m.division||'').toString().trim().toLowerCase() === 'open qualifier';
  return (isOQ && m.match_id) ? `${base} - ${m.match_id}` : base;
}
// Human label for a schedule "period" value (regular_season, promotion, playoffs, ...)
function periodLabel(p) {
  const s = (p||'').toString().trim().toLowerCase();
  if (!s || s === 'regular_season') return 'Regular Season';
  const known = {playoffs:'Playoffs', promotion:'Promotion', relegation:'Relegation', playin:'Barrage', 'play-in':'Barrage', 'play_in':'Barrage', barrage:'Barrage', barrages:'Barrage'};
  return known[s] || s.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
}
// The Schedule_Results sheet no longer has a dedicated "period" column: the match's
// "division" cell now carries that meaning instead:
//   "Div 1" / "Div 2"            -> regular season
//   anything containing "playoff" (e.g. "Div 1 Playoffs", "Div 2 Playoffs") -> playoffs (merged, regardless of division)
//   "Promo" / "Promotion"        -> promotion
//   "Barrage"                    -> barrage
function derivePeriodFromDivision(divisionRaw) {
  const d = (divisionRaw||'').toString().trim().toLowerCase();
  if (!d) return 'regular_season';
  if (d.includes('playoff')) return 'playoffs';
  if (d.includes('promo')) return 'promotion';
  if (d.includes('barrage')) return 'barrage';
  return 'regular_season';
}
// Turns a rank number into an ordinal string: 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 11 -> "11th"...
function ordinal(n) {
  const num = +n;
  if (isNaN(num)) return '';
  const v = num % 100;
  const suffixes = {1:'st', 2:'nd', 3:'rd'};
  return num + (suffixes[(v-20)%10] || suffixes[v] || 'th');
}
// Barrage (Div 1 / Div 2 promotion-relegation decider) and Promotion (Div 2 / Open decider)
// matches don't have a fixed W/L meaning – the outcome depends on which side of the ladder
// the team started from. startDiv is '1' / '2' / 'open' (the team's division for that split).
function periodOutcomeLabel(period, startDiv, win) {
  const per = (period||'').toString().trim().toLowerCase();
  const div = (startDiv||'').toString().trim().toLowerCase();
  const isBarrage = ['playin','play-in','play_in','barrage','barrages'].includes(per);
  const isPromotion = per === 'promotion';
  if (isBarrage) {
    if (div === '2') return win ? 'Promoted to Division 1' : 'Maintained in Division 2';
    if (div === '1') return win ? 'Maintained in Division 1' : 'Relegated to Division 2';
  }
  if (isPromotion) {
    if (div === '2') return win ? 'Maintained in Division 2' : 'Relegated to Open';
    if (div === 'open') return win ? 'Promoted to Division 2' : 'Maintained in Open';
  }
  // Unexpected/unresolved division (e.g. a team we couldn't match to a division): never
  // silently return nothing, always fall back to a plain result so an arrow still shows.
  if (isBarrage || isPromotion) return win ? 'Won' : 'Lost';
  return null;
}
// Automatic movements at season's end, without a barrage: last of Division 1 goes down,
// first of Division 2 goes up. divisionSize is the number of ranked teams in that
// division, used to identify last place.
function autoPromoRelegLabel(division, rank, divisionSize) {
  const div = (division||'').toString().trim();
  const r = +rank;
  if (isNaN(r)) return null;
  if (div === '1' && divisionSize && r === divisionSize) return 'Relegated';
  if (div === '2' && r === 1) return 'Promoted';
  return null;
}
// barrage/promotion outcomes get contextual text, standings-flagged champions get "Champion",
// anything else just falls back to its raw record (or a deduced bracket placement, see below).
function buildExtraSplitRows(buckets, startDiv, isChamp, playoffPlacement) {
  const otherPeriods = Object.keys(buckets).filter(p => p !== 'regular_season');
  const rows = otherPeriods.map(p => {
    const b = buckets[p];
    const win = b.w > b.l;
    const outcome = periodOutcomeLabel(p, startDiv, win);
    let value = outcome || `${b.w}-${b.l}`;
    if (p === 'playoffs') {
      if (isChamp) value = 'Champion';
      else if (playoffPlacement) value = playoffPlacement;
    }
    return { label: periodLabel(p), value };
  });
  if (isChamp && !otherPeriods.includes('playoffs')) rows.push({ label: 'Playoffs', value: 'Champion' });
  return rows;
}
// Which bracket a "Div 1 Playoffs" / "Div 2 Playoffs" match belongs to: Div1 and Div2
// playoffs are separate brackets, so they must be reconstructed independently.
function playoffBracketKey(divisionRaw) {
  const d = (divisionRaw||'').toString().trim().toLowerCase();
  if (!d.includes('playoff')) return null;
  if (d.includes('2')) return 'div2';
  if (d.includes('1')) return 'div1';
  return 'playoffs';
}
// Deduces final placements in a double-elimination bracket from match results alone.
// The last match by date/time is the Grand Final (no bracket reset, matching this league's
// format). Returns null unless every other participant has 2 losses, or if the deduced
// champion contradicts the Standings "Champ" flag, so callers fall back to a W-L record.
function computePlayoffPlacements(matches, knownChampionId) {
  const done = matches.filter(m => (m.status||'').toString().trim().toLowerCase() === 'done'
    && m.score_a != null && m.score_b != null && m.score_a !== '' && m.score_b !== '');
  if (!done.length) return null;

  const ts = m => {
    const d = pd(m.date);
    if (!d) return null;
    const t = String(m.time_cest||'').match(/(\d{1,2}):(\d{2})/);
    const hh = t ? +t[1] : 0, mm = t ? +t[2] : 0;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm).getTime();
  };
  const sorted = [...done].sort((a,b) => {
    const ta = ts(a), tb = ts(b);
    if (ta != null && tb != null && ta !== tb) return ta - tb;
    return String(a.match_id||'').localeCompare(String(b.match_id||''));
  });

  const losses = {};
  const everSeen = new Set();
  const eliminated = []; // { team_id, idx, timeKey }
  sorted.forEach((m, idx) => {
    everSeen.add(m.team_a_id); everSeen.add(m.team_b_id);
    const scoreA = +m.score_a, scoreB = +m.score_b;
    if (isNaN(scoreA) || isNaN(scoreB) || scoreA === scoreB) return;
    const loser = scoreA > scoreB ? m.team_b_id : m.team_a_id;
    losses[loser] = (losses[loser]||0) + 1;
    if (losses[loser] === 2) eliminated.push({ team_id: loser, idx, timeKey: ts(m) ?? idx });
  });

  const lastMatch = sorted[sorted.length - 1];
  const lastScoreA = +lastMatch.score_a, lastScoreB = +lastMatch.score_b;
  if (isNaN(lastScoreA) || isNaN(lastScoreB) || lastScoreA === lastScoreB) return null;
  const champion = lastScoreA > lastScoreB ? lastMatch.team_a_id : lastMatch.team_b_id;
  const runnerUp = lastScoreA > lastScoreB ? lastMatch.team_b_id : lastMatch.team_a_id;

  // Every other participant must already be eliminated (2 losses), or the bracket isn't over yet.
  const others = [...everSeen].filter(id => id !== champion && id !== runnerUp);
  if (!others.every(id => (losses[id]||0) >= 2)) return null;
  if (knownChampionId && knownChampionId !== champion) return null;

  const placements = {};
  placements[champion] = '1st';
  placements[runnerUp] = '2nd';

  const rest = eliminated.filter(e => e.team_id !== runnerUp)
    .sort((a,b) => b.timeKey - a.timeKey || b.idx - a.idx);
  let place = 3, i = 0;
  while (i < rest.length) {
    const group = [rest[i]];
    let j = i + 1;
    while (j < rest.length && rest[j].timeKey === rest[i].timeKey) { group.push(rest[j]); j++; }
    const label = group.length > 1 ? `${ordinal(place)}-${ordinal(place+group.length-1)}` : ordinal(place);
    group.forEach(g => { if (!(g.team_id in placements)) placements[g.team_id] = label; });
    place += group.length;
    i = j;
  }
  return placements;
}
function pd(s) {
  if (!s) return null;
  const str = s + '';
  const gv = str.match(/Date\((\d+),(\d+),(\d+)\)/);
  if (gv) return new Date(+gv[1], +gv[2], +gv[3]);
  const parts = str.split(/[.\/]/);
  if (parts.length === 3 && parts[2].length === 4) return new Date(+parts[2], +parts[1]-1, +parts[0]);
  return null;
}
// WEBSITE_MATCHES (2026-09 sheet migration) replaced the old per-split
// Schedule_Results-style tabs with a single unified tab covering every match:
// Division 1/2 regular season+playoffs, Promotion, Barrage, Open Qualifier and
// (once it returns) Continentals - all distinguished only by the free-text
// "event" column (e.g. "Division 1", "Division 1 Playoffs", "Open Qualifier 1
// Oceasia"). classifyEvent() turns that text into the same legacy
// "division"/"match_id" shape the rest of the site already expects, so none of
// the downstream rendering code (mc(), oqGroups(), continentalsMatches(), ...)
// needed to change.
function classifyEvent(eventRaw) {
  const e = String(eventRaw || '').trim();
  const el = e.toLowerCase();
  if (!e) return { division: '', matchId: '' };
  const divMatch = el.match(/division\s*(\d)/);
  if (divMatch) {
    const n = divMatch[1];
    return { division: el.includes('playoff') ? `Div ${n} Playoffs` : `Div ${n}`, matchId: '' };
  }
  if (el.includes('promo')) return { division: 'Promo', matchId: '' };
  if (el.includes('barrage')) return { division: 'Barrage', matchId: '' };
  const oqMatch = e.match(/open qualifier\s*(\d+)?\s*(.*)/i);
  if (oqMatch && (oqMatch[1] || oqMatch[2])) {
    const round = (oqMatch[1] || '').trim();
    const region = (oqMatch[2] || '').trim();
    const matchId = [region, round].filter(Boolean).join(' ').trim().toUpperCase() || e.toUpperCase();
    return { division: 'Open Qualifier', matchId };
  }
  const ctMatch = e.match(/continentals\s*(.*)/i);
  if (ctMatch) {
    const rest = (ctMatch[1] || '').trim();
    return { division: 'Continentals', matchId: rest || e };
  }
  // Unrecognized event text: pass it through as-is rather than silently dropping the row.
  return { division: e, matchId: '' };
}
// Maps one WEBSITE_MATCHES row (t2o-normalized keys: teama_id/teamb_id/
// teama_score/teamb_score/time/event/trackN_name/trackN_a_score/trackN_b_score/...)
// onto the legacy field names the rest of the codebase already reads
// (team_a_id/team_b_id/score_a/score_b/time_cest/division/match_id/trackN_a/trackN_b).
function normalizeMatchRow(r) {
  const { division, matchId } = classifyEvent(r.event);
  const out = {
    ...r,
    team_a_id: r.teama_id || r.team_a_id || '',
    team_b_id: r.teamb_id || r.team_b_id || '',
    team_a_name: r.teama_name || r.team_a_name || '',
    team_b_name: r.teamb_name || r.team_b_name || '',
    score_a: r.teama_score != null ? r.teama_score : r.score_a,
    score_b: r.teamb_score != null ? r.teamb_score : r.score_b,
    time_cest: r.time || r.time_cest || '',
    division,
    match_id: matchId,
    split: r.split != null ? String(r.split).trim() : r.split,
  };
  for (let i = 1; i <= 5; i++) {
    if (out[`track${i}_a_score`] != null) out[`track${i}_a`] = out[`track${i}_a_score`];
    if (out[`track${i}_b_score`] != null) out[`track${i}_b`] = out[`track${i}_b_score`];
  }
  return out;
}
let _wmCache = null; // flat array of every normalized match row, every split
async function loadWebsiteMatches() {
  if (_wmCache) return _wmCache;
  const t = await gv('WEBSITE_MATCHES');
  if (!t) { _wmCache = []; return []; }
  _wmCache = t2o(t).filter(r => r.teama_id && r.teamb_id).map(normalizeMatchRow);
  return _wmCache;
}

// Builds {sched, res} for a split without touching S.sched/S.res, so callers such as the
// Home page can read one split independently of what lSched() last loaded.
function enrichScheduleRows(rows) {
  return rows.map(r => ({
    ...r,
    status: (()=>{ const s=(r.status||'').trim().toLowerCase(); const map={'done':'DONE','completed':'DONE','complete':'DONE','live':'LIVE','confirmed':'confirmed','scheduled':'confirmed','check':'CHECK','pending':'pending','cancelled':'cancelled','canceled':'cancelled'}; return map[s]||s; })(),
    dO: pd(r.date),
    A: S.teams[(r.team_a_id||'').toLowerCase()] || S.teams[r.team_a_id] || {team_name:r.team_a_id, logo_url:S.defaultLogo},
    B: S.teams[(r.team_b_id||'').toLowerCase()] || S.teams[r.team_b_id] || {team_name:r.team_b_id, logo_url:S.defaultLogo}
  })).sort((a, b) => (a.dO||new Date(0)) - (b.dO||new Date(0)));
}
async function buildScheduleForSplit(sp) {
  const allRows = await loadWebsiteMatches();
  if (!allRows.length) return { sched: [], res: [] };
  const hasSplitCol = allRows.some(r => r.split);
  const strictScoped = hasSplitCol ? allRows.filter(r => !r.split || String(r.split) === String(sp)) : allRows;
  const scopedRows = strictScoped.length ? strictScoped : allRows;
  const sched = enrichScheduleRows(scopedRows);
  const res = scopedRows.filter(r => r.score_a != null || r.score_b != null).map(r => ({...r}));
  return { sched, res };
}
async function lSched(sp) {
  const { sched, res } = await buildScheduleForSplit(sp);
  S.sched = sched; S.res = res;
}
// WEBSITE_STANDINGS (2026-09 sheet migration) replaced the old one-tab-per-split
// layout (Standings_Spring2026, Standings_Fall2026, ...) with a single tab that
// stacks every split vertically instead: a "season | split | event" metadata row
// (numeric split id, e.g. 1 or 2) announces a block, immediately followed by a
// real header row ("division | rank | team_id | ...") repeated once per division,
// side by side (Div 1's columns, a blank spacer column, then Div 2's columns) -
// and Div 2's block is one column narrower (no playoffs_rank) than Div 1's, so
// column positions can't be assumed fixed even between the two halves of the same
// row. gv()'s headers=1 treats only the sheet's very first physical row as a
// header (the literal "selectors/season/split/event" line), which isn't useful
// here - so this walks t.rows directly, finding each metadata row and each
// header row by their own cell content instead of relying on t.cols.
let _standingsCache = null; // { bySplit: { '1': {d1,d2}, ... }, splits: [{split_id,label}] }
async function loadWebsiteStandings() {
  if (_standingsCache) return _standingsCache;
  const t = await gv('WEBSITE_STANDINGS');
  const bySplit = {};
  const splitsSeen = [];
  if (t) {
    const rows = t.rows || [];
    const nCols = Math.max((t.cols || []).length, 30);
    let currentSplitId = null;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const c0 = cv(r, 0), c1 = cv(r, 1);
      // Metadata row: "2026 | 1 | Division 1 | ..." - a year-sized number in col A
      // and a small split number in col B. The very next row carries the same
      // split as a text label ("spring"/"fall" in col B) used only for display.
      if (c0 != null && c0 !== '' && !isNaN(+c0) && +c0 > 1900 && c1 != null && c1 !== '' && !isNaN(+c1)) {
        currentSplitId = String(c1).trim();
        const labelText = String(cv(rows[i + 1], 1) || '').trim();
        if (currentSplitId && !splitsSeen.some(s => s.split_id === currentSplitId)) {
          splitsSeen.push({ split_id: currentSplitId, label: labelText ? (labelText[0].toUpperCase() + labelText.slice(1) + ' ' + c0) : ('Split ' + currentSplitId) });
        }
        continue;
      }
      if (String(c0 ?? '').trim().toLowerCase() !== 'division') continue;
      // Header row: one "division" cell per division block sharing this row -
      // typically two (Div 1, Div 2), but this doesn't assume exactly two.
      const starts = [];
      for (let ci = 0; ci < nCols; ci++) {
        if (String(cv(r, ci) ?? '').trim().toLowerCase() === 'division') starts.push(ci);
      }
      starts.forEach((startCol, si) => {
        const endCol = si + 1 < starts.length ? starts[si + 1] : nCols;
        const map = {};
        for (let ci = startCol; ci < endCol; ci++) {
          const label = String(cv(r, ci) ?? '').trim().toLowerCase();
          if (label) map[label] = ci;
        }
        if (map['team_id'] == null) return;
        let j = i + 1;
        const built = [];
        let divCellRaw = '';
        while (j < rows.length) {
          const teamId = cv(rows[j], map['team_id']);
          if (teamId == null || teamId === '') break;
          if (!divCellRaw) divCellRaw = String(cv(rows[j], map['division']) ?? '').trim();
          built.push(en({
            rank: cv(rows[j], map['rank']),
            team_id: String(teamId).toLowerCase(),
            matches_p: cv(rows[j], map['matches']),
            matches_w: cv(rows[j], map['wins']),
            matches_l: cv(rows[j], map['losses']),
            tracks_w: cv(rows[j], map['track_wins']),
            tracks_l: cv(rows[j], map['track_losses']),
            track_diff: cv(rows[j], map['track_delta']),
            points: cv(rows[j], map['points']),
            // Div 2's block has no playoffs_rank column at all (not just blank
            // data) in the current sheet, so this is left null rather than 0
            // when the label was never found in this block's header slice.
            playoffs_rank: map['playoffs_rank'] != null ? cv(rows[j], map['playoffs_rank']) : null,
            overdrive_points: cv(rows[j], map['overdrive_points']),
            // The old sheet had an explicit "Champ: X" column read straight into
            // this flag; the new one doesn't, so per the site's own convention,
            // playoffs_rank 1 stands in for it everywhere .champion is read
            // (this table's own gold-row styling, and the career title-count /
            // "Overdrive Record" aggregation on a team's profile modal).
            champion: String((map['playoffs_rank'] != null ? cv(rows[j], map['playoffs_rank']) : '') ?? '').trim() === '1',
          }));
          j++;
        }
        built.sort((a, b) => +a.rank - +b.rank);
        const divNum = /2/.test(divCellRaw) ? '2' : '1';
        if (!bySplit[currentSplitId]) bySplit[currentSplitId] = { d1: [], d2: [] };
        if (divNum === '2') bySplit[currentSplitId].d2 = built; else bySplit[currentSplitId].d1 = built;
      });
    }
  }
  _standingsCache = { bySplit, splits: splitsSeen };
  return _standingsCache;
}
// Builds {d1, d2} for a split without touching S.d1/S.d2, so callers such as the Home
// page can read one split independently of what lStand() last loaded.
async function buildStandingsForSplit(sp) {
  const { bySplit } = await loadWebsiteStandings();
  return bySplit[sp] || { d1: [], d2: [] };
}
async function lStand(sp) {
  const { d1, d2 } = await buildStandingsForSplit(sp);
  S.d1 = d1; S.d2 = d2;
}
async function lRes(sp) {
  // Results are loaded by lSched() from the combined tab – this is a no-op
  // S.res is already populated with scored matches
}
// Home page ("Upcoming/Recent matches" + "Standings" preview) must always reflect the
// league's true active split (Config's active_split), completely independent of whatever
// split the Standings/Leagues page selector is currently showing.
async function loadHomeSplitData() {
  const sp = S.configActiveSplit || S.act;
  try {
    const { sched } = await buildScheduleForSplit(sp);
    S.homeSched = sched;
  } catch(e) { console.warn('[Home] schedule load failed:', e); }
  try {
    const { d1, d2 } = await buildStandingsForSplit(sp);
    S.homeD1 = d1; S.homeD2 = d2;
  } catch(e) { console.warn('[Home] standings load failed:', e); }
}
// Schedule page: every match, from every split, combined: lets the page show the
// "global" view by default and filter client-side (by split/division/region) without
// extra fetches, since fetchAllScheduleRows() already caches the full combined tab.
async function loadScheduleAllSplits() {
  try {
    const rows = await fetchAllScheduleRows();
    S.schedAllRows = enrichScheduleRows(rows);
  } catch(e) { console.warn('[Sched-All] load failed:', e); }
}
// Power Ranking is a cross-division table keyed by display name rather than team_id,
// so each row is matched back to a team record to recover its logo. Unmatched rows
// (open-circuit teams with no entry in the Teams tab) still render, without a logo.
// Shared by lRank()/lOver(): both aggregate points/scores from a sheet where a
// row's team_id can be an id that no longer exists in the Teams tab at all - not
// just renamed in place, but fully succeeded by a new team_id (Team_History's
// predecessor_id), like geng_x_weibo being succeeded by weibo_x_fut. A plain
// index of the Teams tab's own team_id/team_name/team_short can't resolve that
// old id, so every predecessor_id (and the historical name/short recorded
// alongside it) gets indexed too, pointing at the team that carries it forward.
function buildTeamNameIndex() {
  const norm = s => String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
  const byName = {};
  Object.values(S.teams).forEach(tm => {
    if (tm.team_name)  byName[norm(tm.team_name)]  = tm;
    if (tm.team_short) byName[norm(tm.team_short)] = tm;
    if (tm.team_id)    byName[norm(tm.team_id)]    = tm;
  });
  Object.entries(S.teamHistory || {}).forEach(([tid, bySplit]) => {
    const tm = S.teams[tid];
    if (!tm) return;
    Object.values(bySplit).forEach(h => {
      // predecessor_id is an explicit, authoritative "this old id/name now means
      // me" declaration - it always wins, even overriding that old id's own entry
      // if it's still separately registered in the Teams tab (kept there for its
      // own historical record, which doesn't mean OVPTS or scores still logged
      // under the old id should keep pointing at it instead of its successor).
      if (h.predecessor_id) byName[norm(h.predecessor_id)] = tm;
      if (h.team_name && !byName[norm(h.team_name)]) byName[norm(h.team_name)] = tm;
      if (h.team_short && !byName[norm(h.team_short)]) byName[norm(h.team_short)] = tm;
    });
  });
  return { byName, norm };
}
async function lRank() {
  const t = await gv('POWER RANKING');
  if (!t) { S.rank = []; console.warn('[Rank] No data from GViz'); return; }
  const { byName, norm } = buildTeamNameIndex();
  S.rank = t.rows
    .filter(r => r.c?.some(c => c?.v != null))
    .map(r => {
      const name = String(cv(r,1)||'').trim();
      const rk = cv(r,0);
      if (!name || rk == null || isNaN(+rk)) return null;
      const base = byName[norm(name)] || null;
      // Same resolution as Overpoints: teamFor() so a rename recorded in
      // Team_History for the active split is reflected here too, instead of the
      // literal (possibly stale) text sitting in the POWER RANKING sheet's own
      // team_id column.
      const resolved = base ? teamFor(base, S.configActiveSplit || S.act) : null;
      const team = resolved && typeof resolved === 'object' ? resolved : base;
      return {
        rank: +rk,
        team_name: team?.team_name || dn(name),
        team,
        division: String(cv(r,2)||'').trim(),
        score: +cv(r,3) || 0,
        win: +cv(r,4) || 0,
        lose: +cv(r,5) || 0,
        played: +cv(r,6) || 0
      };
    })
    .filter(Boolean)
    .sort((a,b) => a.rank - b.rank);
}
// Overpoints are spread across several blocks of each standings tab: the Div 1 and
// Div 2 tables each end with an OVPTS column, and three further Continentals blocks
// (AMERICAS / EMEA / APAC) list region points. Column positions differ between tabs,
// so every block is located from its header labels and the totals summed per team.
//
// Totals cover one season only: the splits of a single year (spring + fall) add up,
// and the count restarts when the next season begins. The Power Ranking is career-wide
// and deliberately not filtered this way.
function splitYear(sp) {
  const m = String(sp?.split_id || '').match(/(20\d{2})/) || String(sp?.label || '').match(/(20\d{2})/);
  return m ? m[1] : null;
}
function currentSeasonYear() {
  // Prefer the year of the active split, since it is what the league is actually
  // playing; fall back to Config's season_year, then to today's year.
  const active = (S.splits || []).find(s => s.split_id === (S.configActiveSplit || S.act));
  return splitYear(active) || S.seasonYear || String(new Date().getFullYear());
}
async function lOver(forYear) {
  const { byName, norm } = buildTeamNameIndex();

  const year = forYear || S.overYear || currentSeasonYear();
  S.overYear = year;

  const totals = {};   // normalised name -> { name, pts, sources[] }
  const seen = new Set();   // guards against a row being read by two detection paths
  const add = (rawName, pts, source, rowIdx) => {
    const name = String(rawName||'').trim();
    const p = +pts;
    if (!name || !isFinite(p) || p === 0) return;
    const key = norm(name);
    if (!key) return;
    // The divisional mapping and the region scan can both land on the same cell, so
    // an identical team/points pair from the same row is only counted once.
    const dedupe = `${source}|${rowIdx}|${key}|${p}`;
    if (seen.has(dedupe)) return;
    seen.add(dedupe);
    if (!totals[key]) totals[key] = { team_name: dn(name), pts: 0, sources: [] };
    totals[key].pts += p;
    if (!totals[key].sources.includes(source)) totals[key].sources.push(source);
  };

  // Pairs each OVPTS column with the nearest team_id column to its left. Matched
  // loosely (startsWith) rather than by exact equality, since Sheets silently
  // renames repeated header labels in the same row ("team_id" → "team_id_1",
  // "team_id2"...) to keep them unique - three side-by-side region blocks sharing
  // one header row is exactly that case, and an exact match would only ever catch
  // the first block's untouched original label.
  const pairFrom = labelList => {
    const teamCols = [], ovCols = [];
    labelList.forEach((l, i) => {
      if (l === 'team_id' || l.startsWith('team_id')) teamCols.push(i);
      if (l === 'ovpts' || l.startsWith('ovpts'))      ovCols.push(i);
    });
    return ovCols.map(ov => ({ ov, team: [...teamCols].reverse().find(c => c < ov) }))
                 .filter(p => p.team != null);
  };
  const REGIONS = ['americas', 'emea', 'apac', 'ncsa'];

  // Scans one GViz table for OVPTS, wherever it lives in the tab. A tab can carry:
  //   1. header-labelled team_id/ovpts columns (divisional blocks, or a Continentals
  //      tab that has real headers of its own);
  //   2. an in-data header row announcing team_id/ovpts further down the sheet;
  //   3. bare region rows (division | rank | team_id | OVPTS) with no header at all.
  // All three are checked for every tab so Continentals data is picked up regardless
  // of which tab (or block within a tab) it currently lives in.
  const scanTabForOvpts = (t, source) => {
    if (!t) return;
    const labels = (t.cols || []).map(c => String(c?.label || '').trim().toLowerCase());
    const rows = t.rows.filter(r => r.c?.some(c => c?.v != null));
    const headerMapping = pairFrom(labels);
    let embedded = null;   // mapping picked up from an in-data header row, if any

    rows.forEach((r, ri) => {
      const cells = (r.c || []).map(c => String(c?.v ?? '').trim().toLowerCase());
      if (cells.some(v => v === 'team_id' || v.startsWith('team_id')) && cells.some(v => v === 'ovpts' || v.startsWith('ovpts'))) {
        embedded = pairFrom(cells); return;
      }

      headerMapping.forEach(p => add(cv(r, p.team), cv(r, p.ov), source, ri));
      if (embedded) embedded.forEach(p => add(cv(r, p.team), cv(r, p.ov), source, ri));

      // Fallback for region rows no header row announced. A tab can have several
      // region blocks side by side on the SAME row (AMERICAS | ... | EMEA | ... |
      // APAC | ...), so every region match in the row is walked in turn - not just
      // the first - each one reading the next text cell as the team name and the
      // next number after that as the points (layout: division | rank | team_id |
      // OVPTS), stopping before the following region label so one block's scan
      // never reads into its neighbour's columns.
      cells.forEach((v, regionAt) => {
        if (!REGIONS.includes(v)) return;
        let team = null, pts = null;
        for (let i = regionAt + 1; i < cells.length; i++) {
          if (REGIONS.includes(cells[i])) break; // ran into the next region block
          const raw = cv(r, i);
          if (raw == null || String(raw).trim() === '') continue;
          if (team == null) {
            if (isNaN(+raw)) team = raw;        // skip the rank number, take the name
            continue;
          }
          if (!isNaN(+raw)) { pts = +raw; break; }
        }
        if (team != null && pts != null) add(team, pts, source, ri);
      });
    });
  };

  // Only this season's splits count towards the total.
  const seasonSplits = (S.splits || []).filter(sp => splitYear(sp) === year);
  for (const sp of seasonSplits) {
    const standingsTabName = sp.standings_tab || 'Standings_Spring2026';
    scanTabForOvpts(await gv(standingsTabName), sp.split_id);

    // Continentals now live in their own tab (e.g. "Continentals_Spring2026"), named
    // by swapping the "Standing(s)" prefix of the standings tab for "Continentals".
    // A tab can also declare it explicitly via a 'continentals_tab' column in Splits.
    const continentalsTabName = sp.continentals_tab
      || standingsTabName.replace(/^Standings?/i, 'Continentals');
    if (continentalsTabName && continentalsTabName !== standingsTabName) {
      scanTabForOvpts(await gv(continentalsTabName), sp.split_id);
    }
  }

  S.over = Object.values(totals)
    .map(o => {
      const base = byName[norm(o.team_name)] || null;
      // Overpoints is a cumulative, current-moment ranking (not tied to one split
      // the way Standings is), so the name shown is whatever the team is called
      // right now - resolved through teamFor() so a Team_History override for the
      // active split (a rename recorded there, not necessarily written back into
      // the Teams tab itself) is respected, instead of just reading team_name off
      // the raw Teams-tab row directly.
      const resolved = base ? teamFor(base, S.configActiveSplit || S.act) : null;
      const team = resolved && typeof resolved === 'object' ? resolved : base;
      return { ...o, team, team_name: team?.team_name || o.team_name };
    })
    .sort((a, b) => b.pts - a.pts || a.team_name.localeCompare(b.team_name))
    .map((o, i) => ({ ...o, rank: i + 1 }));
}
// URL-safe id derived from an article's title: lowercase, accents stripped,
// anything that isn't a letter/number collapsed to a single hyphen.
function slugify(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'article';
}
async function lArt() {
  const t = await gv('Articles');
  if (!t) { S.art = []; console.warn('[Art] No data from GViz'); return; }
  const raw = t2o(t);
  S.art = raw.filter(r => r.status?.toLowerCase() === 'published' && r.title).map(a => {
    // Thumbnail: handle Drive file IDs, filenames, or full URLs
    let thumb = a.thumbnail_url || '';
    if (thumb && !thumb.startsWith('http')) {
      const knownThumbs = {
        'BRACKET.png': '1lzfGB3JtoEGJeH2vWMJhRdvlrn8F67BJ',
        'BRACKET_NOBG-01.png': '1VP6AnDdf0zQcfBfVDuRPuhSOQnp1Ztjb'
      };
      const fid = knownThumbs[thumb];
      const isDriveId = /^[a-zA-Z0-9_-]{25,}$/.test(thumb);
      if (fid) thumb = `https://drive.google.com/uc?export=view&id=${fid}`;
      else if (isDriveId) thumb = `https://drive.google.com/uc?export=view&id=${thumb}`;
      else thumb = '';
    }
    // Auto YouTube thumbnail: if no thumb but content_url is YouTube, use YT thumbnail
    if (!thumb && a.category?.toLowerCase() === 'video') {
      const ytThumb = ytth(a.content_url);
      if (ytThumb) thumb = ytThumb;
    }
    // Content URL: normalize to /pub URL for fetching
    let contentUrl = a.content_url || '';
    let pubUrl = '';
    let exportUrl = '';
    if (contentUrl.includes('docs.google.com/document')) {
      if (contentUrl.includes('/d/e/')) {
        // Already a published URL → strip query params, ensure /pub
        pubUrl = contentUrl.split('?')[0];
        if (!pubUrl.endsWith('/pub')) pubUrl = pubUrl.replace(/\/$/, '') + '/pub';
      } else {
        // Edit URL → extract doc ID → build /pub URL + a direct /export URL (often has fresher public image links)
        const m = contentUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
        if (m) {
          pubUrl = `https://docs.google.com/document/d/${m[1]}/pub`;
          exportUrl = `https://docs.google.com/document/d/${m[1]}/export?format=html`;
        }
      }
    }
    // The excerpt shown on article cards: the sheet's own "description" column is
    // the real source (written by hand for every article) - a.description was
    // being parsed correctly by t2o() but never actually used here, so it fell
    // through to the content_url-based fallback below, which is empty for every
    // article that uses a real content_url link (i.e. nearly all of them).
    const excerpt = a.description || (!contentUrl.startsWith('http') ? contentUrl.slice(0, 220) : '');
    // A stable, URL-safe id for this article, derived from its title, so a shared
    // link points back to this specific article instead of every article
    // collapsing onto the same bare #article/article route (S.artIdx alone, with
    // nothing encoded in the URL, was the reason every share link looked identical).
    const slug = slugify(a.title || '');
    return { ...a, thumbnail_url: thumb, pub_url: pubUrl, export_url: exportUrl, content_url: contentUrl, excerpt, slug };
  });
  // Sort most recent first
  const parseArtDate = (raw) => {
    if (!raw) return 0;
    const p = String(raw).replace(/\./g,'/').split('/');
    if (p.length===3) {
      const d=+p[0], m=+p[1]-1, y=+p[2];
      if (!isNaN(d)&&!isNaN(m)&&!isNaN(y)) return new Date(y,m,d).getTime();
    }
    const t = new Date(raw).getTime();
    return isNaN(t) ? 0 : t;
  };
  S.art.sort((a,b) => parseArtDate(b.date) - parseArtDate(a.date));
  // Two articles with the same title would otherwise generate the same slug and
  // collide on the same URL - the second (and any later) occurrence gets a -2,
  // -3... suffix so every article still has its own resolvable link.
  const seenSlugs = {};
  S.art.forEach(a => {
    const base = a.slug || 'article';
    seenSlugs[base] = (seenSlugs[base] || 0) + 1;
    if (seenSlugs[base] > 1) a.slug = `${base}-${seenSlugs[base]}`;
  });
  // Prefetch excerpts for all articles in background
  S.art.forEach(async (a, i) => {
    if (a.excerpt || !a.pub_url) return;
    try {
      const result = await fetchDocContent(a.pub_url, a.export_url);
      if (result?.excerpt) {
        S.art[i] = { ...S.art[i], excerpt: result.excerpt };
        // Refresh whichever article grid is currently on screen - the home page's
        // mini preview, or the full News/Articles listing page itself. Only the
        // home refresh existed before, so an excerpt fetched while a visitor was
        // on the News page itself never actually appeared until a full reload.
        const nc = document.querySelector('.home-news-cards');
        if (nc) nc.innerHTML = S.art.slice(0,3).map((a,i)=>artCard(a,i)).join('');
        const al = document.querySelector('.al');
        if (al) al.innerHTML = S.art.map((a,i)=>artCard(a,i)).join('');
      }
    } catch(e) {}
  });
}
async function lVod() { S.vods = []; } // VODs tab removed
function en(r) { const id=r.team_id; const team=S.teams[id]||S.teams[(id||'').toLowerCase()]||S.teams[(id||'').toUpperCase()]||{team_name:id||'?',logo_url:S.defaultLogo}; return {...r, team}; }

// ─── HELPERS ───────────────────────────────────────────────────────────────
function ytth(u) { const m = u?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/\s]+)/); return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null; }
function getRes(mid) {
  // Try S.res (populated from combined tab)
  return S.res.find(r => r.match_id === mid);
}
// Normalises a team id for comparison: the standings tabs are lowercased on read,
// but schedule rows are used verbatim, so an id typed with different casing or a
// stray space would silently drop that match from the team's record. `b` can also
// be an array of ids (a team's full lineage through renames - see teamLineage()),
// in which case a match against any one of them counts.
const sameTeamId = (a, b) => {
  const av = String(a||'').trim().toLowerCase();
  if (Array.isArray(b)) return b.some(id => String(id||'').trim().toLowerCase() === av);
  return av === String(b||'').trim().toLowerCase();
};
function teamMatchHistory(teamId, allRows) {
  const done = allRows.filter(m => (sameTeamId(m.team_a_id, teamId) || sameTeamId(m.team_b_id, teamId))
    && (m.status||'').toString().trim().toLowerCase() === 'done'
    && m.score_a != null && m.score_b != null && m.score_a !== '' && m.score_b !== '');
  const ts = m => {
    const d = pd(m.date);
    if (!d) return 0;
    const t = String(m.time_cest||'').match(/(\d{1,2}):(\d{2})/);
    const hh = t ? +t[1] : 0, mm = t ? +t[2] : 0;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm).getTime();
  };
  return done.sort((a,b) => ts(a) - ts(b) || String(a.match_id||'').localeCompare(String(b.match_id||'')));
}
// Career record (all splits combined): the "Overdrive Record" stat.
function computeCareerRecord(teamId, allRows) {
  let w = 0, l = 0;
  teamMatchHistory(teamId, allRows).forEach(m => {
    const isA = sameTeamId(m.team_a_id, teamId);
    const my = +(isA ? m.score_a : m.score_b), opp = +(isA ? m.score_b : m.score_a);
    if (isNaN(my) || isNaN(opp)) return;
    if (my > opp) w++; else if (my < opp) l++;
  });
  return { w, l };
}
// Longest run of consecutive wins across the team's whole history: "Biggest Winning Streak".
function computeBiggestStreak(teamId, allRows) {
  let best = 0, cur = 0;
  teamMatchHistory(teamId, allRows).forEach(m => {
    const isA = sameTeamId(m.team_a_id, teamId);
    const my = +(isA ? m.score_a : m.score_b), opp = +(isA ? m.score_b : m.score_a);
    if (isNaN(my) || isNaN(opp)) return;
    if (my > opp) { cur++; best = Math.max(best, cur); } else if (my < opp) { cur = 0; }
  });
  return best;
}
// Groups a team's completed matches by schedule "period" (regular_season, playoffs, promotion, ...)
function computeTeamRecordByPeriod(teamId, sched) {
  const list = sched || S.sched;
  const buckets = {};
  let totalW = 0, totalL = 0;
  list.forEach(m => {
    if (!sameTeamId(m.team_a_id, teamId) && !sameTeamId(m.team_b_id, teamId)) return;
    if ((m.status||'').toUpperCase() !== 'DONE') return;
    const r = getRes(m.match_id);
    if (!r || r.score_a == null || r.score_b == null || r.score_a === '' || r.score_b === '') return;
    const isA = sameTeamId(m.team_a_id, teamId);
    const myScore = +(isA ? r.score_a : r.score_b);
    const oppScore = +(isA ? r.score_b : r.score_a);
    if (isNaN(myScore) || isNaN(oppScore)) return;
    const per = derivePeriodFromDivision(m.division);
    if (!buckets[per]) buckets[per] = { w:0, l:0 };
    if (myScore > oppScore) { buckets[per].w++; totalW++; }
    else if (myScore < oppScore) { buckets[per].l++; totalL++; }
  });
  return { total: { w:totalW, l:totalL }, buckets };
}
// Fetch standings for an arbitrary split WITHOUT touching the active S.d1/S.d2
async function fetchSplitStandings(splitId) {
  const split = S.splits.find(x => x.split_id === splitId);
  const tab = split?.standings_tab || 'Standings_Spring2026';
  const t = await gv(tab);
  if (!t) return { d1: [], d2: [] };
  const allRows = t.rows.filter(r => r.c?.some(c => c?.v != null));

  // Column positions differ between standings tabs: some carry extra Champ/OVPTS
  // columns in the Div 1 block, which shifts the Div 2 block right. Locate both
  // blocks from the header labels rather than assuming fixed indices.
  const labels = (t.cols || []).map(c => String(c?.label || '').trim().toLowerCase());
  const rankCols = [], teamCols = [], champCols = [];
  labels.forEach((l, i) => {
    if (l === 'rank') rankCols.push(i);
    if (l === 'team_id') teamCols.push(i);
    if (l === 'champ') champCols.push(i);
  });
  // Fall back to the historical layout if the headers cannot be read.
  const d1Rank = rankCols[0] ?? 1, d1Team = teamCols[0] ?? 2;
  const d2Rank = rankCols[1] ?? 12, d2Team = teamCols[1] ?? 13;
  const d1Champ = champCols[0] ?? 10, d2Champ = champCols[1] ?? 21;

  const isRank = (r, c) => { const v = cv(r, c); return v != null && !isNaN(+v) && +v > 0; };
  const build = (rankCol, teamCol, champCol) => allRows
    .filter(r => isRank(r, rankCol))
    .map(r => ({
      rank: cv(r, rankCol),
      team_id: (cv(r, teamCol) || '').toLowerCase(),
      champion: String(cv(r, champCol) || '').trim().toLowerCase() === 'x'
    }))
    .filter(r => r.team_id);

  return { d1: build(d1Rank, d1Team, d1Champ), d2: build(d2Rank, d2Team, d2Champ) };
}
// Schedule_Results is a single tab shared across all splits (a "split" column tags each row).
// Fetch it once (reusing whatever is already cached) and keep every row, regardless of split.
let _allSchedCache = null;
async function fetchAllScheduleRows() {
  if (_allSchedCache) return _allSchedCache;
  _allSchedCache = await loadWebsiteMatches();
  return _allSchedCache;
}
// Groups a team's completed matches (in one specific split) by period: works for any split,
// past or present, since all rows live in the same combined tab.
function computeSplitPeriodRecord(teamId, splitId, allRows) {
  const buckets = {};
  allRows.forEach(m => {
    if (splitId && m.split && m.split !== splitId) return;
    if (!sameTeamId(m.team_a_id, teamId) && !sameTeamId(m.team_b_id, teamId)) return;
    if ((m.status||'').toString().trim().toLowerCase() !== 'done') return;
    if (m.score_a == null || m.score_b == null || m.score_a === '' || m.score_b === '') return;
    const isA = sameTeamId(m.team_a_id, teamId);
    const myScore = +(isA ? m.score_a : m.score_b);
    const oppScore = +(isA ? m.score_b : m.score_a);
    if (isNaN(myScore) || isNaN(oppScore)) return;
    const per = derivePeriodFromDivision(m.division);
    if (!buckets[per]) buckets[per] = { w:0, l:0 };
    if (myScore > oppScore) buckets[per].w++; else if (myScore < oppScore) buckets[per].l++;
  });
  return buckets;
}
// A team that never appears in Division 1/2 standings for a split (Open
// Qualifier / Continentals-only participants, who make up most of the roster
// there) previously showed nothing at all for that split - not because there
// was no data, just because this lookup only ever checked the Division tabs.
// Walks all three regions' Open Qualifier groups, then Continentals Swiss/
// Playoffs, for a split-scoped match against any id in the team's lineage.
function findOqContinentalsResult(lineage, splitId) {
  const lineageNorm = lineage.map(ctKey);
  const isOurTeam = raw => lineageNorm.includes(ctKey(raw));

  for (const region of OQ_REGIONS) {
    const groups = oqGroups(region.key, splitId);
    for (const g of groups) {
      if (!g.matches.some(m => isOurTeam(m.team_a_id) || isOurTeam(m.team_b_id))) continue;
      let w = 0, l = 0;
      g.matches.forEach(m => {
        const r = parseMatchResult(m.score_a, m.score_b);
        if (!r.hasResult) return;
        const isA = isOurTeam(m.team_a_id);
        if (!isA && !isOurTeam(m.team_b_id)) return;
        if (isA ? r.aWon : !r.aWon) w++; else l++;
      });
      const qualified = g.winnerId && isOurTeam(g.winnerId);
      const outcome = qualified ? 'Qualified to Continentals' : ((w + l) ? 'Eliminated' : 'In progress');
      return { altKind: 'oq', altLabel: `${region.label} Open Qualifier ${g.roundNum}`, altRecord: `${w}-${l}`, altOutcome: outcome };
    }

    const swiss = swissData(region.key, splitId);
    const teamRow = swiss.teams.find(t => isOurTeam(t.name));
    if (teamRow) {
      const playoffs = playoffsBracket(region.key, splitId);
      // Up&Downs qualification, not a "champion" title: EMEA sends its top 2
      // (Grand Final winner and runner-up), APAC and NCSA/AMERICAS send only the
      // Grand Final winner. Everyone else goes back through the Open Qualifier.
      const upDownsSlots = region.key === 'EMEA' ? 2 : 1;
      let outcome = null;
      if (playoffs.gf && (isOurTeam(playoffs.gf.team_a_id) || isOurTeam(playoffs.gf.team_b_id))) {
        const won = playoffs.gf.hasScore && (isOurTeam(playoffs.gf.team_a_id) ? playoffs.gf.aWon : !playoffs.gf.aWon);
        const placement = won ? 1 : 2;
        outcome = placement <= upDownsSlots ? 'Qualified to Up&Downs' : 'Did not qualify to Up&Downs';
      } else {
        const inPlayoffs = [...Object.values(playoffs.ubRounds || {}), ...Object.values(playoffs.lbRounds || {})]
          .some(ms => ms.some(m => isOurTeam(m.team_a_id) || isOurTeam(m.team_b_id)));
        outcome = inPlayoffs ? 'Did not qualify to Up&Downs' : null;
      }
      return { altKind: 'continentals', altLabel: `${region.label} Continentals - Swiss Stage`, altRecord: `${teamRow.wins}-${teamRow.losses}`, altRank: teamRow.rank, altOutcome: outcome };
    }
  }
  return null;
}
async function openTeamModal(teamId) {
  const t = S.teams[teamId];
  if (!t) return;
  const divLbl = divLabel(t.division);
  const playersLine = [t.player1, t.player2].filter(Boolean).join(' & ');
  // Career stats (Overdrive Record, streak, titles) and Previous Splits only mean
  // something once a team has actually played in Division 1/2 - an Open Qualifier
  // entrant has no division history for these numbers to summarise, so the whole
  // block is skipped rather than showing zeroes for a team that hasn't played yet.
  const showHistory = !isOpenDivision(t.division);

  document.getElementById('modal-content').innerHTML = `
<div class="team-modal">
<div class="mo-hd">
  <div class="mo-bc">${divLbl}<span>-</span>${t.team_name||teamId}</div>
  <button class="mo-close" onclick="closeModal()">Close</button>
</div>
<div style="padding:28px 28px 0">
  <div style="display:flex;flex-direction:column;align-items:center;gap:14px">
    ${tlogo(t, 84)}
    <div style="text-align:center;min-width:0">
      <div class="mo-tname">${t.team_name||teamId}</div>
      <div class="mo-players" style="margin-top:6px">${divLbl}</div>
      ${playersLine ? `<div class="mo-players" style="margin-top:4px;opacity:.75">${playersLine}</div>` : ''}
    </div>
  </div>
</div>
${showHistory ? `<div id="team-current-split" style="display:flex;flex-wrap:wrap;margin-top:26px"><div class="empty" style="padding:16px 0;width:100%;text-align:center"><p>Loading…</p></div></div>
<div class="mo-section">
  <div class="mo-sh">Previous Splits</div>
  <div id="team-history-list" class="mo-maps"><div class="empty" style="padding:16px 0"><p>Loading…</p></div></div>
</div>` : ''}
</div>`;
  document.getElementById('modal-ov').classList.add('open');
  if (!showHistory) return;

  // Always the league's true active split (from Config), never the split the Standings/
  // Leagues page selector might currently be showing: Team stats must stay independent
  // from whatever the user is browsing elsewhere on the site.
  const curSplitId = S.configActiveSplit || S.act;
  const curEl = document.getElementById('team-current-split');
  const histEl = document.getElementById('team-history-list');

  try {
    const allSchedRows = await fetchAllScheduleRows();
    // Every team_id this one has ever been, through renames/roster takeovers
    // recorded in Team_History (predecessor_id) - stats below are computed across
    // all of them so a rename reads as one continuous history, not a reset to zero.
    const lineage = teamLineage(teamId);

    // Same lookup for every split (the active one and any previous ones) so the numbers
    // are computed identically and never depend on global UI state elsewhere.
    async function teamSplitData(splitId) {
      const { d1, d2 } = await fetchSplitStandings(splitId);
      const inD1 = d1.find(r => lineage.includes(r.team_id));
      const inD2 = d2.find(r => lineage.includes(r.team_id));
      const row = inD1 || inD2;
      if (!row) {
        // Not on either Division standings for this split - check whether this
        // was an Open Qualifier / Continentals-only split before giving up on it.
        const alt = findOqContinentalsResult(lineage, splitId);
        if (alt) return { rank: null, champion: false, startDiv: null, div: null, d1Size: d1.length, d2Size: d2.length, buckets: {}, placement: null, historicalTeamId: null, ...alt };
      }
      const startDiv = inD1 ? '1' : (inD2 ? '2' : 'open');
      const buckets = computeSplitPeriodRecord(lineage, splitId, allSchedRows);
      const bracketKey = startDiv === '1' ? 'div1' : (startDiv === '2' ? 'div2' : null);
      let placement = null;
      if (bracketKey) {
        const bracketMatches = allSchedRows.filter(m => (!m.split || m.split === splitId) && playoffBracketKey(m.division) === bracketKey);
        const champRow = (inD1 ? d1 : d2).find(r => r.champion);
        const placements = computePlayoffPlacements(bracketMatches, champRow?.team_id || null);
        // Keyed by whichever lineage member's team_id actually played that split's
        // bracket (row.team_id), not necessarily today's teamId.
        if (placements) placement = placements[row?.team_id] || null;
      }
      return { rank: row?.rank, champion: !!row?.champion, startDiv, div: inD1?'1':(inD2?'2':null), d1Size:d1.length, d2Size:d2.length, buckets, placement, historicalTeamId: row?.team_id || null };
    }

    const cur = await teamSplitData(curSplitId);

    // Career-wide stats (all splits combined): matches the reference layout:
    // Overdrive Record, Biggest Winning Streak, Overdrive Title (count of "Champ" splits).
    const record = computeCareerRecord(lineage, allSchedRows);
    const streak = computeBiggestStreak(lineage, allSchedRows);

    const others = S.splits.filter(s => s.split_id !== curSplitId);
    const otherResults = await Promise.all(others.map(async s => ({ label: s.label || s.split_id, splitId: s.split_id, ...(await teamSplitData(s.split_id)) })));
    const titleCount = (cur.champion ? 1 : 0) + otherResults.filter(r => r.champion).length;

    curEl.innerHTML = [
      { label: 'Overdrive Record', value: `${record.w}-${record.l}` },
      { label: 'Biggest Winning Streak', value: `${streak}` },
      { label: 'Overdrive Title', value: `${titleCount}` }
    ].map(c => `<div style="flex:1;min-width:0;text-align:center;padding:20px 14px">
      <div class="mo-center-sub">${c.label}</div>
      <div style="margin-top:8px;font-family:var(--ft);font-weight:900;font-size:28px;color:var(--txt)">${c.value}</div>
    </div>`).join('');

    if (!others.length) { histEl.innerHTML = '<div class="empty" style="padding:12px 0"><p>No previous splits</p></div>'; return; }

    const results = otherResults;
    const found = results.filter(r => r.rank || r.altKind);
    histEl.innerHTML = found.length ? found.map(r => {
      // Open Qualifier / Continentals-only participation has no Division rank or
      // W-L "regular season" bucket to draw from, so it renders as its own simpler
      // row (round/stage reached, record, outcome) instead of forcing it into the
      // Division-standings shape the rest of this card assumes.
      if (r.altKind) {
        return `
      <div class="mo-map" style="flex-direction:column;align-items:stretch;gap:10px;padding:18px 20px">
        <div class="mo-map-name">${r.label} <span style="color:var(--muted);font-weight:500;font-size:11px">- ${r.altLabel}</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-family:var(--ft);font-size:13px;color:var(--muted)">
          <span>${r.altKind === 'oq' ? 'Open Qualifier' : 'Swiss Stage'}</span>
          <span style="color:var(--txt);font-weight:700">${r.altRecord}${r.altRank ? ` - ${ordinal(r.altRank)}` : ''}</span>
        </div>
        ${r.altOutcome ? `<div style="display:flex;justify-content:space-between;align-items:center;font-family:var(--ft);font-size:13px;color:var(--muted)"><span>Result</span><span style="color:var(--acc);font-weight:700">${r.altOutcome}</span></div>` : ''}
      </div>`;
      }
      const reg = r.buckets['regular_season'] || { w:0, l:0 };
      const extra = buildExtraSplitRows(r.buckets, r.startDiv, r.champion, r.placement);
      const divSize = r.div === '1' ? r.d1Size : (r.div === '2' ? r.d2Size : null);
      const autoLabel2 = autoPromoRelegLabel(r.div, r.rank, divSize);
      const extraHtml = extra.map(x => `
        <div style="display:flex;justify-content:space-between;align-items:center;font-family:var(--ft);font-size:13px;color:var(--muted)">
          <span>${x.label}</span>
          <span style="color:var(--acc);font-weight:700">${x.value}</span>
        </div>`).join('');
      // The team may have played this split under a different name/roster (a
      // predecessor in the lineage) - teamFor() resolves what it was actually
      // called then, same lookup the Standings note badge uses, so a rename
      // reads as "Spring 2026 - Division 1 - Orgless" rather than silently
      // relabelling that season with the current name.
      const histTeam = r.historicalTeamId ? teamFor(r.historicalTeamId, r.splitId) : null;
      const wasRenamed = histTeam && typeof histTeam === 'object' && sameTeamId(histTeam.team_id, teamId) === false;
      const histPlayers = wasRenamed ? [histTeam.player1, histTeam.player2].filter(Boolean).join(' & ') : '';
      return `
      <div class="mo-map" style="flex-direction:column;align-items:stretch;gap:10px;padding:18px 20px">
        <div class="mo-map-name">${r.label}${r.div ? ` <span style="color:var(--muted);font-weight:500;font-size:11px">- ${divLabel(r.div)}</span>` : ''}${wasRenamed ? ` <span style="color:var(--muted);font-weight:500;font-size:11px">- ${histTeam.team_name}${histPlayers ? ` (${histPlayers})` : ''}</span>` : ''}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-family:var(--ft);font-size:13px;color:var(--muted)">
          <span>Regular Season</span>
          <span style="color:var(--txt);font-weight:700">${reg.w}-${reg.l}${r.rank ? ` - ${ordinal(r.rank)}` : ''}${autoLabel2 ? ` - ${autoLabel2}` : ''}</span>
        </div>
        ${extraHtml}
      </div>`;
    }).join('') : '<div class="empty" style="padding:12px 0"><p>No ranking data found</p></div>';
  } catch(e) {
    curEl.innerHTML = '<div class="empty" style="padding:16px 0;width:100%;text-align:center"><p>Could not load stats</p></div>';
    histEl.innerHTML = '<div class="empty" style="padding:12px 0"><p>Could not load previous splits</p></div>';
  }
}
// Empty placeholder: same sized wrapper as a real logo, but nothing drawn inside
// it. Used whenever no logo can be resolved at all - no letter, no circle, just
// blank space that keeps the row's layout intact.
function tph(letter, sz=80, cls='') {
  const style = cls ? '' : `width:${sz}px;height:${sz}px;`;
  return `<div class="tp${cls?' '+cls:''}" style="${style}"></div>`;
}
// Renders the default OverDrive mark in the same sized/classed wrapper tlogo()
// uses for a real logo - the shared fallback for a team with no logo_url, or
// whose logo_url 404s. A second onerror on this <img> falls back to a blank
// placeholder only as a last resort, in case S.defaultLogo is itself missing
// or broken (so the layout never breaks, even if literally nothing can render).
function tlogoImg(url, sz, cls, letter) {
  const style = cls ? 'flex-shrink:0' : `width:${sz}px;height:${sz}px;flex-shrink:0`;
  const safeLetter = (letter||'?').replace(/'/g,"\\'");
  return `<div${cls?` class="${cls}"`:''} style="${style}"><img src="${url}" style="width:100%;height:100%;object-fit:contain" onerror="this.parentElement.outerHTML=tph('${safeLetter}',${sz},'${cls}')" alt=""></div>`;
}
function tlogoFallback(img, sz, cls, letter) {
  const wrap = img.parentElement;
  if (wrap) wrap.outerHTML = S.defaultLogo ? tlogoImg(S.defaultLogo, sz, cls, letter) : tph(letter, sz, cls);
}
function tlogo(team, sz=80, cls='') {
  const letter = (team?.team_name||'?')[0];
  if (!team?.logo_url) return S.defaultLogo ? tlogoImg(S.defaultLogo, sz, cls, letter) : tph(letter, sz, cls);
  const safeLetter = letter.replace(/'/g,"\\'");
  const style = cls ? 'flex-shrink:0' : `width:${sz}px;height:${sz}px;flex-shrink:0`;
  return `<div${cls?` class="${cls}"`:''} style="${style}"><img src="${team.logo_url}" style="width:100%;height:100%;object-fit:contain" onerror="tlogoFallback(this,${sz},'${cls}','${safeLetter}')" alt=""></div>`;
}
function sb(st) {
  const key = (st||'').toLowerCase().trim();
  const m = {
    'done':      ['sb-done','Done'],
    'live':      ['sb-live','● Live'],
    'confirmed': ['sb-up','Upcoming'],
    'check':     ['sb-tbd','TBD'],
    'pending':   ['sb-can','Pending'],
    'cancelled': ['sb-can','Cancelled'],
  };
  const [cls, lbl] = m[key] || ['sb-tbd', st||'TBD'];
  return `<span class="sb ${cls}">${lbl}</span>`;
}

function mcStatusLabel(st) {
  const key=(st||'').toLowerCase().trim();
  const map={done:'FINISHED', live:'LIVE', confirmed:'UPCOMING', check:'UPCOMING', pending:'UPCOMING', cancelled:'CANCELLED'};
  return map[key] || 'UPCOMING';
}
function mcDateLabel(m) {
  if (!m.dO || isNaN(m.dO)) return (m.date||'-').toString().toUpperCase();
  const t=new Date(); t.setHours(0,0,0,0);
  const n=new Date(m.dO); n.setHours(0,0,0,0);
  if (n.getTime()===t.getTime()) return "TODAY";
  const jours=['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
  const mois=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
  return `${jours[m.dO.getDay()]} ${m.dO.getDate()} ${mois[m.dO.getMonth()]}`;
}
function mcDivLabel(m) {
  return matchDivLabelFull(m);
}
// Unified match card: upcoming (time) and result (score) share the same layout
function mc(m) {
  const s=(m.status||'').toUpperCase();
  const isDone = s==='DONE'||s==='LIVE';
  let center;
  if (isDone) {
    const sa = (m.score_a != null && m.score_a !== '') ? m.score_a : '?';
    const scB = (m.score_b != null && m.score_b !== '') ? m.score_b : '?';
    center = `${sa}<span style="color:var(--muted);margin:0 10px">–</span>${scB}`;
  } else {
    center = m.time_cest || '-:--';
  }
  return `<div class="mc-card" onclick="openMatchModal('${matchKey(m).replace(/'/g,"\\'")}')">
<div class="mc-hd">
  <span>${mcDateLabel(m)}</span>
  <span class="mc-hd-right"><span>${mcDivLabel(m)}</span><span>${splitLabelFor(m.split)}</span><span>${mcStatusLabel(m.status)}</span></span>
</div>
<div class="mc-body">
  <div class="mc-team">${tlogo(m.A,75,'mc-logo')}<span class="mc-tname">${dn(m.A?.team_name||m.team_a_id||'?')}</span></div>
  <div class="mc-center">
    <div class="mc-center-main">${center}</div>
    <div class="mc-center-sub">Match details</div>
  </div>
  <div class="mc-team right"><span class="mc-tname">${dn(m.B?.team_name||m.team_b_id||'?')}</span>${tlogo(m.B,75,'mc-logo')}</div>
</div>
</div>`;
}
// Open Qualifier regions: the sheet uses "NCSA" as the match_id prefix, but this is
// labeled "AMERICAS" in the UI.
const OQ_REGIONS = [
  { key:'EMEA', label:'EMEA', prefix:'EMEA' },
  { key:'APAC', label:'Oceasia', prefix:'OCEASIA' }, // sheet renamed this region "Oceasia" (was "APAC"); internal key kept as-is
  { key:'AMERICAS', label:'AMERICAS', prefix:'NCSA' },
];
// Groups a region's Open Qualifier rows by match_id (e.g. all "APAC 1" rows are one
// bracket's games, not one match each - unlike Div 1/2 where match_id is per-match).
// The winner of each bracket is read off the LAST game in that group, per row order
// as loaded from the sheet: there's no reliable per-row time to sort by (OQ rows
// share one date with no kickoff time), so sheet order is the only ordering signal,
// same as how a human reading the sheet top-to-bottom would find the final result.
function oqGroups(regionKey, splitId) {
  const region = OQ_REGIONS.find(r => r.key === regionKey);
  if (!region) return [];
  const sp = splitId || S.act;
  const rows = (S.schedAllRows || []).filter(m =>
    m.split === sp &&
    schedCatMatches(m, 'oq') &&
    String(m.match_id || '').trim().toUpperCase().startsWith(region.prefix.toUpperCase() + ' ')
  );
  const byId = {};
  rows.forEach(m => {
    const id = String(m.match_id).trim();
    (byId[id] = byId[id] || []).push(m);
  });
  const hasScore = m => parseMatchResult(m?.score_a, m?.score_b).hasResult;
  return Object.keys(byId)
    .sort((a, b) => {
      const na = +((a.match(/(\d+)\s*$/) || [])[1] || 0);
      const nb = +((b.match(/(\d+)\s*$/) || [])[1] || 0);
      return na - nb;
    })
    .map(id => {
      const matches = byId[id];
      const played = matches.filter(hasScore);
      const last = played.length ? played[played.length - 1] : null;
      const lastResult = last ? parseMatchResult(last.score_a, last.score_b) : null;
      const winnerId = lastResult ? (lastResult.aWon ? last.team_a_id : last.team_b_id) : null;
      // Open Qualifier entrants are often not in the Teams roster at all (they're
      // qualifier-only participants, not registered league teams), so team_a_id/
      // team_b_id here can be a plain display name ("Loading Pink") rather than a
      // normalized slug. Falling back to null when the id isn't a known team_id
      // was wrongly treated as "no winner yet" even when the match had a real,
      // valid score - this builds a minimal stand-in so the card still renders
      // (with a letter-placeholder logo) instead of reporting "in progress".
      const winnerTeam = winnerId
        ? (S.teams[winnerId] || S.teams[(winnerId || '').toLowerCase()] || { team_id: winnerId, team_name: dn(winnerId), logo_url: S.defaultLogo })
        : null;
      const roundNum = +((id.match(/(\d+)\s*$/) || [])[1] || 0);
      return { id, region: region.key, regionLabel: region.label, roundNum, matches, winnerId, winnerTeam };
    });
}
function oqCard(group) {
  if (!group.winnerTeam) {
    return `<div class="oq-card oq-card-pending">
  <div class="oq-round">${group.regionLabel} Open Qualifier ${group.roundNum}</div>
  <div class="oq-status oq-status-pending">In progress</div>
</div>`;
  }
  const logo = `<div class="oq-logo-box">${tlogo(group.winnerTeam, 90)}</div>`;
  return `<div class="oq-card" onclick="openOQModal('${group.region}','${group.id.replace(/'/g, "\\'")}')">
  ${logo}
  <div class="oq-name">${group.winnerTeam.team_name}</div>
  <div class="oq-round">${group.regionLabel} Open Qualifier ${group.roundNum}</div>
  <div class="oq-status">Qualified to Continentals</div>
</div>`;
}

// ━━━ CONTINENTALS: SWISS STAGE + PLAYOFFS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Both stages share one quirk: match_id is the same literal string ("EMEA Swiss",
// "EMEA Playoffs"...) for every game in that stage - there's no round/bracket-
// position column at all. Both are reconstructed purely from row order + running
// per-team counters, on the same trust-the-sheet-order basis the Open Qualifier
// code already relies on.
function continentalsMatches(regionKey, stage, splitId) {
  const region = OQ_REGIONS.find(r => r.key === regionKey);
  if (!region) return [];
  const sp = splitId || S.act;
  const wantId = `${region.prefix} ${stage}`.trim().toLowerCase();
  return (S.schedAllRows || []).filter(m =>
    m.split === sp &&
    String(m.division || '').trim().toLowerCase() === 'continentals' &&
    String(m.match_id || '').trim().toLowerCase() === wantId
  );
}
// Team names on Continentals rows are free text (same as Open Qualifier), and not
// always consistently cased in the sheet (e.g. "Eline Express" vs "eLine Express"
// for what's almost certainly the same team) - grouping by a lowercased key avoids
// splitting one team's record across two rows over a capitalization slip. The
// first-seen casing is kept for display.
function ctKey(name) { return String(name || '').trim().toLowerCase(); }
// Displayed team names never show a raw underscore - team_id-style values used
// as a display fallback ("unc_racing", "geng_x_weibo") or literal sheet text
// with an underscore ("Different_Poles") both read as a normal space instead.
function dn(s) { return String(s || '').replace(/_/g, ' '); }
// Open Qualifier / Continentals rows share one match_id across every game in the
// same bracket (all of "EMEA 1"'s matches carry that exact match_id), unlike Div
// 1/2 rows where match_id is unique per game - so looking a match up by match_id
// alone always resolves to whichever one happens to be first, regardless of which
// card was actually clicked. This composite key adds the two teams and the
// kickoff date/time, which together are effectively guaranteed unique per game.
function matchKey(m) {
  return [m?.match_id, m?.team_a_id, m?.team_b_id, m?.date, m?.time_cest].join('|');
}
// Some rows record a forfeit as "W" for the winning side and "FF" for the side
// that didn't play, instead of a real game score. That still counts as a match
// win/loss for records and brackets, but contributes zero games to the game
// differential - a 3-0 record made of two real 2-0s and one forfeit should read
// as +4 GD, not +6, since no games were actually played in the forfeited match.
function parseMatchResult(scoreARaw, scoreBRaw) {
  const aRaw = String(scoreARaw ?? '').trim().toUpperCase();
  const bRaw = String(scoreBRaw ?? '').trim().toUpperCase();
  if ((aRaw === 'W' && bRaw === 'FF') || (bRaw === 'W' && aRaw === 'FF')) {
    return { hasResult: true, aWon: aRaw === 'W', sa: 0, sb: 0, forfeit: true };
  }
  const sa = +scoreARaw, sb = +scoreBRaw;
  if (scoreARaw === '' || scoreARaw == null || scoreBRaw === '' || scoreBRaw == null || isNaN(sa) || isNaN(sb)) {
    return { hasResult: false, aWon: null, sa: 0, sb: 0, forfeit: false };
  }
  return { hasResult: true, aWon: sa > sb, sa, sb, forfeit: false };
}

// Swiss stage: standings (rank/matches/games/GD) plus each team's per-round result,
// for the Round 1..N columns. Round number comes from the kickoff time (date+time)
// shared by every match in that round, e.g. all Round 1 games at 13:00, Round 2 at
// 13:45, etc. - a per-team match-count inference was tried first, but that drifts
// out of alignment whenever a team's win comes from a forfeit against another team
// that has itself played a different number of prior matches, silently shifting
// later results into the wrong Round column (or leaving the "true" round empty).
// Kickoff time doesn't have that failure mode: it's the same literal value for
// every match actually scheduled together, independent of who forfeited what.
// Swiss stage: standings (rank/matches/games/GD) plus each team's per-round result,
// for the Round 1..N columns. Round number is inferred by counting, per team, how
// many Swiss matches they've already played as rows are scanned in the sheet's own
// order - two teams paired in a match are necessarily both entering the same round.
function swissData(regionKey, splitId) {
  const matches = continentalsMatches(regionKey, 'Swiss', splitId);
  const teams = {};
  const roundCounter = {};
  let maxRound = 0;
  const getTeam = raw => {
    const key = ctKey(raw);
    if (!teams[key]) { teams[key] = { key, name: raw, wins: 0, losses: 0, gf: 0, ga: 0, rounds: {} }; roundCounter[key] = 0; }
    return teams[key];
  };
  matches.forEach(m => {
    const a = getTeam(m.team_a_id), b = getTeam(m.team_b_id);
    const r = parseMatchResult(m.score_a, m.score_b);
    if (!r.hasResult) return; // unplayed row - skip, doesn't consume a round slot
    const round = Math.max(roundCounter[a.key], roundCounter[b.key]) + 1;
    roundCounter[a.key] = round; roundCounter[b.key] = round;
    maxRound = Math.max(maxRound, round);
    maxRound = Math.max(maxRound, round);
    a.gf += r.sa; a.ga += r.sb; b.gf += r.sb; b.ga += r.sa;
    if (r.aWon) { a.wins++; b.losses++; } else { b.wins++; a.losses++; }
    const aLabel = r.forfeit ? (r.aWon ? 'W' : 'FF') : r.sa;
    const bLabel = r.forfeit ? (r.aWon ? 'FF' : 'W') : r.sb;
    // matchKey is carried along so a round cell can open the same match-detail
    // modal the Schedule page uses, rather than a Swiss-specific one.
    a.rounds[round] = { opponent: b.name, opponentTeam: S.teams[b.key] || S.teams[b.name] || null, score: aLabel, oppScore: bLabel, win: r.aWon, matchKey: matchKey(m) };
    b.rounds[round] = { opponent: a.name, opponentTeam: S.teams[a.key] || S.teams[a.name] || null, score: bLabel, oppScore: aLabel, win: !r.aWon, matchKey: matchKey(m) };
  });
  const list = Object.values(teams).map(t => ({ ...t, gd: t.gf - t.ga }));
  // Wins first; then fewer losses (an undefeated 3-0 record should always outrank
  // a 3-1 one even if the 3-1 team's game differential happens to be higher - teams
  // can be tied on wins while having played a different number of total rounds,
  // since not everyone is guaranteed the same round count mid-Swiss-stage); game
  // differential only settles it when both wins and losses are equal.
  list.sort((x, y) => y.wins - x.wins || x.losses - y.losses || y.gd - x.gd || y.gf - x.gf || x.name.localeCompare(y.name));
  // Every team gets its own place in the order (1, 2, 3, 4...) - no shared/joint
  // ranks, even when two teams have an identical record; the sort above already
  // gives a deterministic order for ties via game differential and then name.
  list.forEach((t, i) => { t.rank = i + 1; });
  return { teams: list, maxRound };
}

// Playoffs: a double-elimination bracket with no explicit round/position column
// either. Reconstructed by tracking cumulative losses per team as matches are
// scanned in order: while both participants still have zero losses, the match is
// Upper Bracket; once either side already has one loss, it's Lower Bracket. The
// very last row is always the Grand Final, per how these rows get entered.
// Within each bracket, the round number is likewise inferred by counting each
// team's prior matches in that specific bracket (UB or LB) - same technique as
// the Swiss round numbers, kept separate per bracket.
function playoffsBracket(regionKey, splitId) {
  const matches = continentalsMatches(regionKey, 'Playoffs', splitId);
  const lossCount = {}, ubCount = {}, lbCount = {};
  const ensure = key => {
    if (lossCount[key] == null) { lossCount[key] = 0; ubCount[key] = 0; lbCount[key] = 0; }
  };
  const processed = matches.map((m, idx) => {
    const aKey = ctKey(m.team_a_id), bKey = ctKey(m.team_b_id);
    ensure(aKey); ensure(bKey);
    const isLast = idx === matches.length - 1;
    const bothZero = lossCount[aKey] === 0 && lossCount[bKey] === 0;
    const bracket = isLast ? 'GF' : (bothZero ? 'UB' : 'LB');
    let round = 1;
    if (bracket === 'UB') { round = Math.max(ubCount[aKey], ubCount[bKey]) + 1; ubCount[aKey] = round; ubCount[bKey] = round; }
    else if (bracket === 'LB') { round = Math.max(lbCount[aKey], lbCount[bKey]) + 1; lbCount[aKey] = round; lbCount[bKey] = round; }
    const r = parseMatchResult(m.score_a, m.score_b);
    if (r.hasResult) { if (r.aWon) lossCount[bKey]++; else lossCount[aKey]++; }
    const teamA = S.teams[aKey] || { team_name: dn(m.team_a_id), logo_url: S.defaultLogo };
    const teamB = S.teams[bKey] || { team_name: dn(m.team_b_id), logo_url: S.defaultLogo };
    const scoreALabel = r.forfeit ? (r.aWon ? 'W' : 'FF') : m.score_a;
    const scoreBLabel = r.forfeit ? (r.aWon ? 'FF' : 'W') : m.score_b;
    return { ...m, bracket, round, hasScore: r.hasResult, aWon: r.aWon, teamA, teamB, scoreALabel, scoreBLabel };
  });
  const ubRounds = {}, lbRounds = {};
  processed.forEach(m => {
    if (m.bracket === 'UB') (ubRounds[m.round] = ubRounds[m.round] || []).push(m);
    else if (m.bracket === 'LB') (lbRounds[m.round] = lbRounds[m.round] || []).push(m);
  });
  const gf = processed.find(m => m.bracket === 'GF') || null;
  return { ubRounds, lbRounds, gf, hasMatches: matches.length > 0 };
}
function bracketRoundName(roundsFromFinal) {
  if (roundsFromFinal <= 0) return 'Final';
  if (roundsFromFinal === 1) return 'Semifinals';
  if (roundsFromFinal === 2) return 'Quarterfinals';
  return `Round ${roundsFromFinal + 1}`;
}
function schedCatMatches(m, mode) {
  const d = String(m.division||'').toLowerCase().trim();
  // Matches "Div 1", "Division 1", "Div1", "Div 1 Playoffs", "Division 1 Playoffs"…
  // but not "Div 10" or anything else that merely starts with the same digit.
  if (mode === '1') return /^div(ision)?\s*1\b/.test(d) || d === '1' || d === 'barrage';
  if (mode === '2') return /^div(ision)?\s*2\b/.test(d) || d === '2' || d === 'promo' || d === 'promotion';
  if (mode === 'oq') return d === 'open qualifier';
  return true; // 'all'
}
// Which OQ round numbers actually exist (in the current split/region scope): generated
// from match_id values like "EMEA 1", "EMEA 2"… rather than always assuming a fixed 8.
function schedOQRounds(regionKey, base) {
  const region = OQ_REGIONS.find(r => r.key === regionKey);
  if (!region) return [];
  const re = new RegExp('^' + region.prefix + '\\s+(\\d+)$', 'i');
  const rounds = new Set();
  base.forEach(m => {
    const mt = String(m.match_id||'').trim().match(re);
    if (mt) rounds.add(+mt[1]);
  });
  return [...rounds].sort((a,b) => a-b);
}
function schedFilteredMatches() {
  let ms = S.schedAllRows;
  if (S.schedSplit !== 'all') ms = ms.filter(m => m.split === S.schedSplit);
  ms = ms.filter(m => schedCatMatches(m, S.schedMode));
  if (S.schedMode === 'oq' && S.schedRegion) {
    const region = OQ_REGIONS.find(r => r.key === S.schedRegion);
    if (region) {
      ms = ms.filter(m => String(m.match_id||'').trim().toUpperCase().startsWith(region.prefix.toUpperCase()+' '));
      if (S.schedOQ) ms = ms.filter(m => String(m.match_id||'').trim() === `${region.prefix} ${S.schedOQ}`);
    }
  }
  return ms;
}
function setSchedSplit(sp) { S.schedSplit = sp; S.schedOQ = ''; renderInPlace(); }
// Encodes the schedule's current filter (mode + OQ region) into a URL sub-path,
// so a shared schedule link reopens on the same filter instead of always
// resetting to "All".
function schedSubPath() {
  if (S.schedMode === 'oq') return S.schedRegion ? `oq-${S.schedRegion.toLowerCase()}` : 'oq';
  if (S.schedMode === '1' || S.schedMode === '2') return `div-${S.schedMode}`;
  return '';
}
function setSchedMode(mode) { S.schedMode = mode; S.schedOQ = ''; S.page = 'schedule'; renderInPlace(); syncPath('schedule', schedSubPath()); }
function setSchedRegion(r) { S.schedRegion = r; S.schedOQ = ''; S.page = 'schedule'; renderInPlace(); syncPath('schedule', schedSubPath()); }
function setSchedOQ(n) { S.schedOQ = n; renderInPlace(); }
function splitLabelFor(splitId) {
  return S.splits.find(s => s.split_id === splitId)?.label || splitId || '';
}
// Date grouping: only dates that actually have matches (empty days are skipped)
function schedGroups() {
  const map = {};
  schedFilteredMatches().forEach(m => {
    if (!m.dO || isNaN(m.dO)) return;
    const k = m.dO.toDateString();
    if (!map[k]) map[k] = { dO: m.dO, matches: [] };
    map[k].matches.push(m);
  });
  const today = new Date(); today.setHours(0,0,0,0);
  const todayKey = today.toDateString();
  if (!map[todayKey]) map[todayKey] = { dO: today, matches: [] };
  return Object.values(map).sort((a,b) => a.dO - b.dO);
}
function schedGroupLabel(d) {
  const t = new Date(); t.setHours(0,0,0,0);
  const n = new Date(d); n.setHours(0,0,0,0);
  if (n.getTime() === t.getTime()) return "Today";
  const jours=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const mois=['jan.','feb.','mar.','apr.','may','jun.','jul.','aug.','sep.','oct.','nov.','dec.'];
  return `${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]}`;
}
function schedAnchorIdx(groups) {
  const t = new Date(); t.setHours(0,0,0,0);
  const i = groups.findIndex(g => g.dO.getTime() >= t.getTime());
  return i === -1 ? Math.max(0, groups.length-1) : i;
}
function todayMatch() {
  const n = new Date();
  return S.sched.some(m => { if (!m.dO||isNaN(m.dO)) return false; const d=m.dO; return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth()&&d.getDate()===n.getDate()&&((()=>{const _s=(m.status||'').toUpperCase();return _s==='CONFIRMED'||_s==='LIVE';})()); });
}
// Lists the seasons (years) that have splits, newest first, for the Overpoints selector.
function seasonYears() {
  const years = [...new Set((S.splits || []).map(splitYear).filter(Boolean))];
  return years.sort((a, b) => b.localeCompare(a));
}
function seasonSel(val, fn) {
  const years = seasonYears();
  if (years.length < 2) return '';   // nothing to choose between
  const uid = 'ssy' + Math.random().toString(36).slice(2,9);
  const items = years.map(y => `<div class="ss-opt${y===val?' on':''}" onclick="event.stopPropagation();${fn}('${y}');closeAllSs()">Season ${y}</div>`).join('');
  return `<div class="ss-cust" id="${uid}">
  <button type="button" class="ss" onclick="event.stopPropagation();toggleSs('${uid}')">Season ${val}</button>
  <div class="ss-menu">${items}</div>
</div>`;
}
function splitSel(val, fn) {
  if (!S.splits.length) return '';
  const current = S.splits.find(s => s.split_id === val);
  const label = current?.label || current?.split_id || val;
  const uid = 'ssd' + Math.random().toString(36).slice(2,9);
  const items = S.splits.map(s => `<div class="ss-opt${s.split_id===val?' on':''}" onclick="event.stopPropagation();${fn}('${s.split_id}');closeAllSs()">${s.label||s.split_id}</div>`).join('');
  return `<div class="ss-cust" id="${uid}">
  <button type="button" class="ss" onclick="event.stopPropagation();toggleSs('${uid}')">${label}</button>
  <div class="ss-menu">${items}</div>
</div>`;
}
// Same widget as splitSel(), but with an extra "All Splits" option prepended: used on
// the Schedule page, whose default view spans every split combined.
function splitSelWithAll(val, fn) {
  if (!S.splits.length) return '';
  const label = val === 'all' ? 'All Splits' : (S.splits.find(s => s.split_id === val)?.label || val);
  const uid = 'ssd' + Math.random().toString(36).slice(2,9);
  const allOpt = `<div class="ss-opt${val==='all'?' on':''}" onclick="event.stopPropagation();${fn}('all');closeAllSs()">All Splits</div>`;
  const items = S.splits.map(s => `<div class="ss-opt${s.split_id===val?' on':''}" onclick="event.stopPropagation();${fn}('${s.split_id}');closeAllSs()">${s.label||s.split_id}</div>`).join('');
  return `<div class="ss-cust" id="${uid}">
  <button type="button" class="ss" onclick="event.stopPropagation();toggleSs('${uid}')">${label}</button>
  <div class="ss-menu">${allOpt}${items}</div>
</div>`;
}
function toggleSs(id) {
  const el = document.getElementById(id);
  const isOpen = el?.classList.contains('open');
  closeAllSs();
  if (el && !isOpen) el.classList.add('open');
}
function closeAllSs() {
  document.querySelectorAll('.ss-cust.open').forEach(el => el.classList.remove('open'));
}
document.addEventListener('click', closeAllSs);
// Searches across every split (S.schedAllRows), not just the one currently active
// on the home page (S.homeSched) - a live match is time-sensitive enough that it
// shouldn't go invisible on the homepage just because it's tagged under a
// different split than Config's active_split (e.g. entered under last season's
// split by habit, or the config not yet flipped to the new one). Falls back to
// S.homeSched if the all-splits data hasn't loaded yet.
function liveMatch() {
  const all = S.schedAllRows?.length ? S.schedAllRows : S.homeSched;
  return all.find(m => (m.status||'').toUpperCase() === 'LIVE');
}

// ─── STANDINGS TABLE ───────────────────────────────────────────────────────
// One-time "swipe for more" hint shown under a horizontally-scrollable table on
// mobile, removed the first time the user actually scrolls it (see initStWrapHints).
function stWrapHint() {
  return `<div class="st-wrap-hint"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5l-5 7 5 7M16 5l5 7-5 7"/></svg>Swipe for more stats</div>`;
}
// Joins row HTML strings with a real spacer <tr> between each pair (none before
// the first, none after the last) instead of relying on border-spacing, so the
// header sits flush against the first row on every browser - see the .stt-spacer
// CSS comment for why border-spacing's usual thead/tbody fix doesn't hold up.
function stRowGap(rowsArr, colspan) {
  return rowsArr.join(`<tr class="stt-spacer"><td colspan="${colspan}"></td></tr>`);
}
function stTab(rows, div) {
  if (!rows?.length) return `<div class="empty"><h3>Data not available</h3><p>Add the data in the Standings_Spring2026 tab of the Google Sheet.</p></div>`;
  const n = rows.length;
  function zone(rank, isChampion) {
    if (isChampion) return 'champ';
    const r = +rank;
    if (div==1) { if(r<=4)return'pl'; if(r<=8)return''; if(r===9)return'br'; return'rl'; }
    else { if(r===1)return'pl'; if(r===2)return'br'; if(r<=6)return''; return'rl'; }
  }
  const trs = rows.map(r => {
    const z = zone(r.rank, r.champion);
    const diff = r.track_diff!=null ? (+r.track_diff>0?'+':'')+r.track_diff : '-';
    // Resolved against the split this table is showing, so a rename/logo/roster
    // change recorded in Team_History only ever affects the splits it actually
    // applies to - older splits keep showing the team as it was at the time.
    const team = teamFor(r.team || r.team_id, S.act);
    const logo = `<div class="tlogo-box">${tlogo(team, 90)}</div>`;
    const teamName = `${team?.team_name||r.team_id||'?'}`;
    return `<tr class="${z}"><td class="rank-cell"><span class="rn">${r.rank}</span></td><td class="team-cell"><div class="tc">${logo}<span class="st-tname">${teamName}</span>${teamNoteBadge(team)}</div></td><td>${r.matches_p||0}</td><td>${r.matches_w||0}</td><td>${r.matches_l||0}</td><td>${r.tracks_w||0}</td><td>${r.tracks_l||0}</td><td>${diff}</td><td class="pts">${r.points||0}</td></tr>`;
  });
  const trsJoined = stRowGap(trs, 9);
  return `<div class="st-wrap"><table class="stt"><thead><tr><th>Rank</th><th>Team</th><th><span class="th-tip" data-tip="Match Played">P</span></th><th><span class="th-tip" data-tip="Match Win">W</span></th><th><span class="th-tip" data-tip="Match Loss">L</span></th><th><span class="th-tip" data-tip="Map Win">MW</span></th><th><span class="th-tip" data-tip="Map Loss">ML</span></th><th><span class="th-tip" data-tip="Difference +/-">DIFF</span></th><th><span class="th-tip" data-tip="Points">PTS</span></th></tr></thead><tbody>${trsJoined}</tbody></table></div>${stWrapHint()}`;
}
function legend(div) {
  if (div==1) return `<div class="leg"><div class="li"><div class="ld3 ld-champ"></div><span>Split Champion</span></div><div class="li"><div class="ld3 ld-pl"></div><span>Playoffs qualified</span></div><div class="li"><div class="ld3 ld-br"></div><span>Play-in qualified</span></div><div class="li"><div class="ld3 ld-rl"></div><span>Relegated to Div 2</span></div></div>`;
  return `<div class="leg"><div class="li"><div class="ld3 ld-pl"></div><span>Promoted to Div 1</span></div><div class="li"><div class="ld3 ld-br"></div><span>Play-in qualified</span></div><div class="li"><div class="ld3 ld-rl"></div><span>Up & Down</span></div></div>`;
}
// Barrage (Div 1 ↔ Div 2) / Promotion (Div 2 ↔ Open) results section for the Standings pages.
// Shows each decider match with the per-team promoted/relegated/maintained outcome, computed
// from which division the team started in (via the currently-loaded S.d1/S.d2 for this split).
function promoRelChevron(dir) {
  const color = dir === 'up' ? 'var(--acc)' : dir === 'down' ? '#fff' : 'var(--muted)';
  const path = dir === 'up' ? 'M4 16l8-9 8 9' : dir === 'down' ? 'M4 8l8 9 8-9' : 'M4 12h16';
  return `<svg class="prel-chevron" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter"><path d="${path}"/></svg>`;
}
function promoRelOutcomeColor(outcome) {
  return outcome ? 'var(--acc)' : 'var(--muted)';
}
function promoRelSection(title, periodKey) {
  // Only ever show a result for a match explicitly tagged with this period AND belonging
  // to the split currently shown on this page: never one that leaked in from another split.
  const matches = S.sched.filter(m => derivePeriodFromDivision(m.division) === periodKey && m.split === S.act);
  const heading = `<div class="dt-md" style="font-family:var(--ft);margin:52px 0 20px">${title.toUpperCase()}</div>`;
  if (!matches.length) {
    return `${heading}<div class="empty"><p>No ${title.toLowerCase()} matches recorded for this split yet.</p></div>`;
  }
  const rankOf = teamId => {
    const id = (teamId||'').toString().trim().toLowerCase();
    const r1 = S.d1.find(r => (r.team_id||'').toLowerCase() === id);
    if (r1) return { rank: r1.rank, div: '1' };
    const r2 = S.d2.find(r => (r.team_id||'').toLowerCase() === id);
    if (r2) return { rank: r2.rank, div: '2' };
    return null;
  };
  // For a team not found in either division's standings (an Open/Continentals team), try
  // to figure out which region they qualified through, from their Open Qualifier matches.
  // Names can differ a lot between sheets ("Aurora X SKUF" vs "aurora_skuf"), so compare by
  // significant word overlap rather than exact/substring equality.
  const regionOfTeam = (teamId, teamName, teamShort) => {
    // Generic words that shouldn't count as a "match" on their own (too common across orgs)
    const STOP = new Set(['team','gaming','esports','squad','clan','crew','x','the']);
    const words = s => (s||'').toString().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(w => w && !STOP.has(w));
    const candidates = [words(teamId), words(teamName), words(teamShort)].filter(w => w.length);
    // A team may have been renamed since qualifying (e.g. "SKUF Gaming" -> "aurora_skuf"), so a
    // single shared distinctive word (not just an exact full-name match) counts as the same team.
    const sameTeam = other => {
      const ow = words(other);
      if (!ow.length) return false;
      return candidates.some(c => c.some(w => ow.includes(w)));
    };
    const base = S.schedAllRows && S.schedAllRows.length ? S.schedAllRows : S.sched;
    const match = base.find(mm => schedCatMatches(mm, 'oq') && (sameTeam(mm.team_a_id) || sameTeam(mm.team_b_id)));
    if (!match) return null;
    const mid = String(match.match_id||'').trim().toUpperCase();
    const region = OQ_REGIONS.find(rg => mid.startsWith(rg.prefix.toUpperCase()+' '));
    return region ? region.label : null;
  };
  const rows = matches.map(m => {
    const scoreA = +m.score_a, scoreB = +m.score_b;
    const hasScore = !isNaN(scoreA) && !isNaN(scoreB) && m.score_a != null && m.score_a !== '';
    const aWin = hasScore && scoreA > scoreB;
    const aRank = rankOf(m.team_a_id), bRank = rankOf(m.team_b_id);
    const aOutcome = hasScore ? periodOutcomeLabel(periodKey, aRank ? aRank.div : 'open', aWin) : null;
    const bOutcome = hasScore ? periodOutcomeLabel(periodKey, bRank ? bRank.div : 'open', !aWin) : null;
    // The arrow reflects who actually won this decider, not just whether their division
    // label literally changed: the winner always points up, the loser always points down
    // (e.g. a team that "Maintained" its division by winning still gets an up arrow).
    const dirOf = win => !hasScore ? 'flat' : (win ? 'up' : 'down');
    const placement = (r, team, id) => {
      if (r) return `${ordinal(r.rank)} in Div ${r.div}`;
      const region = regionOfTeam(id, team?.team_name, team?.team_short);
      return region ? `Continentals - ${region}` : 'Continentals';
    };
    // Grid rows: logo / name / placement / outcome: identical row heights across both
    // teams (via CSS Grid), so everything lines up vertically regardless of content length.
    return `<div class="mo-map prel-card" onclick="openMatchModal('${matchKey(m).replace(/'/g,"\\'")}')">
      <div class="prel-grid">
        <div class="prel-logo prel-logo-a">${tlogo(m.A,68,'prel-tlogo')}</div>
        <div class="prel-logo prel-logo-b">${tlogo(m.B,68,'prel-tlogo')}</div>
        <div class="prel-arrows">${promoRelChevron(dirOf(aWin))}${promoRelChevron(dirOf(!aWin))}</div>
        <div class="mo-tname prel-name prel-name-a">${dn(m.A?.team_name||m.team_a_id||'?')}</div>
        <div class="mo-tname prel-name prel-name-b">${dn(m.B?.team_name||m.team_b_id||'?')}</div>
        <div class="mo-players prel-plc prel-plc-a">${placement(aRank, m.A, m.team_a_id)}</div>
        <div class="mo-players prel-plc prel-plc-b">${placement(bRank, m.B, m.team_b_id)}</div>
        <div class="prel-outcome prel-outcome-a" style="color:${promoRelOutcomeColor(aOutcome)}">${aOutcome||''}</div>
        <div class="prel-outcome prel-outcome-b" style="color:${promoRelOutcomeColor(bOutcome)}">${bOutcome||''}</div>
      </div>
    </div>`;
  }).join('');
  return `${heading}<div class="mo-maps">${rows}</div>`;
}

// ─── TWITCH SECTION ────────────────────────────────────────────────────────
function twitchSection() {
  const live = liveMatch();
  const matchLabel = live
    ? `${live.A?.team_name||live.team_a_id||'-'} – ${live.B?.team_name||live.team_b_id||'-'}`
    : 'No matches live';

  const proto = window.location.protocol;
  const hostname = window.location.hostname;
  const isLocal = !hostname || hostname === '' || proto === 'file:';

  // Build embed URL (add localhost as secondary parent for dev convenience)
  const parents = isLocal
    ? 'parent=localhost'
    : `parent=${hostname}${hostname !== 'localhost' ? '&parent=localhost' : ''}`;
  const embedSrc = `https://player.twitch.tv/?channel=${TWITCH_CH}&${parents}&autoplay=false`;

  const embedHtml = isLocal
    ? `<div class="live-embed-ratio"><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:40px;text-align:center">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="#9146FF"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
        <div style="font-family:var(--ft);font-weight:900;font-size:20px;text-transform:uppercase">OVERDRIVE LIVE</div>
        <div style="font-family:var(--ft);font-size:13px;font-weight:300;color:var(--muted);max-width:340px;line-height:1.7">The Twitch embed requires a web server.<br>Locally, use the link below.</div>
        <a href="https://www.twitch.tv/${TWITCH_CH}" target="_blank" style="display:inline-flex;align-items:center;gap:9px;padding:11px 22px;border-radius:10px;background:#9146FF;color:#fff;font-family:var(--ft);font-weight:700;font-size:13px;letter-spacing:.07em;text-transform:uppercase">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
          Watch on Twitch
        </a>
      </div></div>`
    : `<div class="live-embed-ratio"><iframe src="${embedSrc}" allowfullscreen></iframe></div>`;

  return `<div class="pg" style="padding-top:var(--block-gap)">

<div class="dt-md" style="font-family:var(--ft);margin-bottom:24px">MATCHES</div>
<div class="live-embed-wrap">
  ${embedHtml}
  <div class="live-bar">
    <div class="live-dot-r"></div>
    <span>LIVE MATCH: <em>${matchLabel.toUpperCase()}</em></span>
  </div>
</div>
</div>`;
}

// ─── PAGES ─────────────────────────────────────────────────────────────────

// ─── HOME MATCH CARD ───────────────────────────────────────────────────────
function pgHome() {
  const live = liveMatch();
  // Safety net: fall back to the generic (already-loaded) data if the home-specific
  // split fetch hasn't resolved yet or came back empty for any reason.
  const homeSchedSafe = S.homeSched.length ? S.homeSched : S.sched;
  const homeD1Safe = S.homeD1.length ? S.homeD1 : S.d1;
  const homeD2Safe = S.homeD2.length ? S.homeD2 : S.d2;
  const rows = S.homeStDiv==='1' ? homeD1Safe : homeD2Safe;

  // About
  const about = `<div class="ab-wrap">
<div>

<h1 class="ab-h1">A PREMIUM<br><em>2V2</em> SCENE</h1>
<p class="ab-p">OverDrive is a Trackmania event project driven by recognized community members. The ambition is to build a competitive scene that matters for everyone involved: players, organizations, and fans.</p>
<p class="ab-p">The 2v2 format is at the heart of this vision, building on World Tour 2025 momentum with clearer, more strategic, and more impactful gameplay in decisive moments.</p>
<div class="ab-btns">
<a href="https://www.youtube.com/@overdrivetm/videos" target="_blank" class="btn-w">Watch on YouTube</a>
<button class="btn-d" onclick="go('howtoplay')">Play Yourself</button>
</div>
</div>
<div class="ab-vid" id="yt-wrapper">
<div class="live-embed-ratio" style="background:#000">
  <iframe id="yt-player"
    src="https://www.youtube.com/embed/VvAXoYVUpWE?autoplay=1&loop=1&playlist=VvAXoYVUpWE&mute=1&controls=0&rel=0&modestbranding=1&showinfo=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}"
    allow="autoplay; fullscreen"
    allowfullscreen
    style="position:absolute;inset:0;width:100%;height:100%;border:none;display:block">
  </iframe>
  <!-- Custom sound button -->
  <button id="yt-sound" onclick="ytToggleSound()" title="Toggle sound" style="
    position:absolute;bottom:14px;right:14px;z-index:10;
    background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.2);
    color:#fff;border-radius:50%;width:40px;height:40px;
    display:flex;align-items:center;justify-content:center;
    cursor:pointer;backdrop-filter:blur(6px);transition:background .15s;font-size:16px">
    🔇
  </button>
</div>
</div>
</div>`;

  // Live / Twitch
  const liveSection = twitchSection();

  // Upcoming matches – still has its own division toggle
  function homeMatches(div, status) {
    const ms = homeSchedSafe.filter(m => { const d = String(m.division||''); return d===div || d.includes(div); });
    if (status === 'upcoming') {
      const rows3 = ms.filter(m => m.status==='confirmed'||m.status==='pending'||m.status==='CHECK').slice(0,3);
      return rows3.length ? rows3.map(m => mc(m)).join('') : '<div class="empty" style="padding:12px 0"><p>No upcoming matches</p></div>';
    }
    const rows3 = [...ms].filter(m => m.status==='DONE').reverse().slice(0,3);
    return rows3.length ? rows3.map(m => mc(m)).join('') : '<div class="empty" style="padding:12px 0"><p>No results</p></div>';
  }
  const upcomingSection = `<div class="pg" style="padding-top:var(--block-gap)">
<div class="sh"><div class="dt-md" style="font-family:var(--ft)">UPCOMING MATCHES</div><span class="sa" onclick="go('schedule')">See all <span class="sa-arr"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 6l6 6-6 6z"/></svg></span></span></div>
<div class="dtog">
<button class="dtb${S.homeUpDiv==='1'?' on':''}" onclick="setHomeUpDiv('1')">Division 1</button>
<button class="dtb${S.homeUpDiv==='2'?' on':''}" onclick="setHomeUpDiv('2')">Division 2</button>
</div>
${homeMatches(S.homeUpDiv,'upcoming')}
</div>`;

  // Recent matches – no division toggle, just the last 3 completed matches overall
  const recentOverall = [...homeSchedSafe].filter(m => m.status==='DONE').reverse().slice(0,3);
  const recentMatchesHtml = recentOverall.length ? recentOverall.map(m => mc(m)).join('') : '<div class="empty" style="padding:12px 0"><p>No results</p></div>';
  const recentSection = `<div class="pg" style="padding-top:var(--block-gap)">
<div class="sh"><div class="dt-md" style="font-family:var(--ft)">RECENT MATCHES</div><span class="sa" onclick="go('schedule')">See all <span class="sa-arr"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 6l6 6-6 6z"/></svg></span></span></div>
${recentMatchesHtml}
</div>`;

  // Standings
  const standSection = `<div class="pg" style="padding-top:var(--block-gap)">
<div class="sh"><div class="dt-md" style="font-family:var(--ft)">STANDINGS</div><span class="sa" onclick="go('standings')">Full standings <span class="sa-arr"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 6l6 6-6 6z"/></svg></span></span></div>
<div class="dtog">
<button class="dtb${S.homeStDiv==='1'?' on':''}" onclick="setHSD('1')">Division 1</button>
<button class="dtb${S.homeStDiv==='2'?' on':''}" onclick="setHSD('2')">Division 2</button>
</div>
${stTab(rows, S.homeStDiv)}
${legend(S.homeStDiv)}
</div>`;

  // News – always visible above sponsors
  const newsCards = S.art.slice(0,3).map((a,i)=>artCard(a,i)).join('');
  const newsSection = `<div class="pg" style="padding-top:var(--block-gap)">
<div class="sh"><div><div class="dt-md" style="font-family:var(--ft)">NEWS</div></div><span class="sa" onclick="go('news')">All articles <span class="sa-arr"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 6l6 6-6 6z"/></svg></span></span></div>
<div class="home-news-cards al">${newsCards || ''}</div>
</div>`;

  return about + liveSection + upcomingSection + recentSection + standSection + newsSection;
}

// ━━━ CONTINENTALS RENDERING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function swissTable(regionKey) {
  const { teams, maxRound } = swissData(regionKey);
  if (!teams.length) {
    return `<div class="empty"><h3>No Swiss stage data yet</h3><p>Results will appear here once matches are played.</p></div>`;
  }
  const roundHeaders = Array.from({ length: maxRound }, (_, i) => `<th>Round ${i + 1}</th>`).join('');
  const totalCols = 5 + maxRound;
  // Top half of the Swiss field advances to Playoffs, bottom half is eliminated -
  // rounded up, so an odd team count favours qualifying (e.g. 15 teams → top 8 go
  // through). A full-width divider row marks that cutoff directly in the table, and
  // each half also gets its own <tbody> so a green/red side bar can mark the whole
  // group in one continuous strip rather than row by row.
  const qualifyCount = Math.ceil(teams.length / 2);
  const hasCut = qualifyCount < teams.length;
  // groupCls/isFirst/isLast drive the side bar: only the first and last row of a
  // group get rounded corners, so consecutive rows read as one unbroken strip.
  // Qualified (green) bars the left edge via the rank cell; eliminated (red) bars
  // the right edge via the last round cell instead, so the two groups read as
  // bracketing the table from opposite sides rather than stacking on one edge.
  const rowHtml = (t, groupCls, isFirst, isLast) => {
    const teamObj = S.teams[t.key] || { team_name: dn(t.name), logo_url: S.defaultLogo };
    const logo = tlogo(teamObj, 28, 'swiss-team-logo');
    const lastBarCls = groupCls === 'e'
      ? ['swiss-bar-e-anchor', isFirst ? 'swiss-bar-e-first' : '', isLast ? 'swiss-bar-e-last' : ''].filter(Boolean).join(' ')
      : '';
    const roundCells = Array.from({ length: maxRound }, (_, i) => {
      const isLastCol = i === maxRound - 1;
      const cellCls = ['swiss-rd', isLastCol ? lastBarCls : ''].filter(Boolean).join(' ');
      const r = t.rounds[i + 1];
      if (!r) return `<td class="${cellCls}"></td>`;
      const oppTeam = S.teams[ctKey(r.opponent)] || { team_name: dn(r.opponent), logo_url: S.defaultLogo };
      const oppLogo = tlogo(oppTeam, 20, 'swiss-rd-logo');
      // Hover tip reuses the same attr(data-tip) tooltip mechanism as the Standings
      // column headers (.th-tip); the click opens the same match-detail modal the
      // Schedule page uses, keyed the same way (team pair + date/time), so a Swiss
      // result and its Schedule listing both open the identical modal.
      const tip = `${dn(t.name)} ${r.score}:${r.oppScore} ${dn(r.opponent)}`.replace(/"/g, '&quot;');
      const onclick = r.matchKey ? ` onclick="openMatchModal('${r.matchKey.replace(/'/g, "\\'")}')"` : '';
      return `<td class="${cellCls}"><div class="swiss-rd-cell swiss-rd-tip ${r.win ? 'win' : 'loss'}" data-tip="${tip}"${onclick}>${oppLogo}<div class="swiss-rd-score">${r.score}:${r.oppScore}</div></div></td>`;
    }).join('');
    const gdCls = t.gd > 0 ? 'gd-pos' : t.gd < 0 ? 'gd-neg' : '';
    // No rounds at all (maxRound === 0) is an edge case with no round columns to
    // anchor the right-side bar to - fall back to the GD cell so it never just
    // silently disappears.
    const gdBarCls = (groupCls === 'e' && maxRound === 0) ? ' ' + lastBarCls : '';
    const rankCls = groupCls === 'q'
      ? ['swiss-rank', 'swiss-bar-q', isFirst ? 'swiss-bar-first' : '', isLast ? 'swiss-bar-last' : ''].filter(Boolean).join(' ')
      : 'swiss-rank';
    return `<tr>
<td class="${rankCls}">${t.rank}.</td>
<td class="swiss-team"><div class="swiss-team-inner">${logo}<span>${t.name}</span></div></td>
<td>${t.wins}-${t.losses}</td>
<td>${t.gf}-${t.ga}</td>
<td class="${gdCls}${gdBarCls}">${t.gd > 0 ? '+' : ''}${t.gd}</td>
${roundCells}
</tr>`;
  };
  const qualifiedRows = teams.slice(0, qualifyCount)
    .map((t, i) => rowHtml(t, 'q', i === 0, i === qualifyCount - 1)).join('');
  const eliminatedTeams = teams.slice(qualifyCount);
  const eliminatedRows = eliminatedTeams
    .map((t, i) => rowHtml(t, 'e', i === 0, i === eliminatedTeams.length - 1)).join('');
  // Labelled on the side that's about to start (eliminated) so it reads correctly
  // whichever team's row it's adjacent to, rather than ambiguously between two.
  const dividerRow = hasCut
    ? `<tbody><tr class="swiss-cut"><td colspan="${totalCols}"><span class="swiss-cut-q"><svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M12 4l8 14H4z"/></svg>Qualified for Playoffs</span><span class="swiss-cut-e">Eliminated from Continentals<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M12 20L4 6h16z"/></svg></span></td></tr></tbody>`
    : '';
  return `<div class="st-wrap swiss-wrap"><table class="swiss-tbl"><thead><tr>
<th>#</th><th>Team</th><th>Matches</th><th>Games</th><th>GD</th>${roundHeaders}
</tr></thead>
<tbody>${qualifiedRows}</tbody>
${dividerRow}
${hasCut ? `<tbody>${eliminatedRows}</tbody>` : ''}
</table></div>${stWrapHint()}`;
}

function playoffsBracketHtml(regionKey) {
  const { ubRounds, lbRounds, gf, hasMatches } = playoffsBracket(regionKey);
  if (!hasMatches) {
    return `<div class="empty"><h3>No Playoffs data yet</h3><p>The bracket will appear here once matches are played.</p></div>`;
  }
  const matchCard = (m, extraCls) => {
    const aWon = m.hasScore && m.aWon;
    const bWon = m.hasScore && !m.aWon;
    const scoreA = m.hasScore ? m.scoreALabel : '–';
    const scoreB = m.hasScore ? m.scoreBLabel : '–';
    return `<div class="bkt-match${extraCls ? ' ' + extraCls : ''}">
  <div class="bkt-team${aWon ? ' win' : ''}">${tlogo(m.teamA, 22, 'bkt-logo')}<span class="bkt-tname">${m.teamA.team_name}</span><span class="bkt-score">${scoreA}</span></div>
  <div class="bkt-team${bWon ? ' win' : ''}">${tlogo(m.teamB, 22, 'bkt-logo')}<span class="bkt-tname">${m.teamB.team_name}</span><span class="bkt-score">${scoreB}</span></div>
</div>`;
  };
  // Round names go by position relative to the final round, not by how many
  // matches are in a round - a lower-bracket round can have just 1 match long
  // before the actual LB Final, and match-count alone would mislabel it "Final".
  // Connector lines are only drawn between a round and the next when that round's
  // match count is exactly double the next one's (the normal single-elim case):
  // pairs of matches get wrapped together so the connecting line can span from the
  // midpoint of the first match to the midpoint of the second using percentages
  // (no pixel math, so it stays correct regardless of card height). An irregular
  // round - a bye folded the bracket down unevenly - just renders plain cards
  // instead of drawing a connector that would point at the wrong match.
  const colsFor = (rounds, prefix) => {
    const roundNums = Object.keys(rounds).map(Number).sort((a, b) => a - b);
    const total = roundNums.length;
    return roundNums.map((rn, idx) => {
      const ms = rounds[rn];
      const fromFinal = total - 1 - idx;
      const nextCount = idx < roundNums.length - 1 ? rounds[roundNums[idx + 1]].length : (gf ? 1 : 0);
      const canPair = nextCount > 0 && ms.length === nextCount * 2;
      const label = (prefix ? prefix + ' ' : '') + bracketRoundName(fromFinal);
      let inner;
      if (canPair) {
        const pairs = [];
        for (let i = 0; i < ms.length; i += 2) pairs.push(ms.slice(i, i + 2));
        inner = pairs.map(pair => `<div class="bkt-pair">${pair.map(m => matchCard(m)).join('')}</div>`).join('');
      } else {
        inner = ms.map(m => matchCard(m)).join('');
      }
      return `<div class="bkt-col${canPair ? ' bkt-col-connect' : ''}"><div class="bkt-col-hd">${label}</div><div class="bkt-col-matches">${inner}</div></div>`;
    }).join('');
  };
  const ubHtml = colsFor(ubRounds, '');
  const lbHtml = colsFor(lbRounds, 'LB');
  const gfHtml = gf
    ? `<div class="bkt-col bkt-gf-col"><div class="bkt-col-hd">Grand Final</div><div class="bkt-col-matches">${matchCard(gf, 'bkt-match-gf')}</div></div>`
    : '';
  return `<div class="bkt-wrap">
${ubHtml ? `<div class="bkt-section"><div class="bkt-section-title">Upper Bracket</div><div class="bkt-row">${ubHtml}${gfHtml}</div></div>` : ''}
${lbHtml ? `<div class="bkt-section"><div class="bkt-section-title">Lower Bracket</div><div class="bkt-row">${lbHtml}</div></div>` : ''}
</div>`;
}

function pgLeagues() {
  const region = S.regTab || 'EMEA';
  const regionDef = OQ_REGIONS.find(r => r.key === region) || OQ_REGIONS[0];
  const tabHtml = OQ_REGIONS.map(r => `<button class="dtb${region===r.key?' on':''}" onclick="setReg('${r.key}')">${r.label}</button>`).join('');

  const groups = oqGroups(region);
  const oqSection = groups.length
    ? `<div class="oq-grid">${groups.map(oqCard).join('')}</div>`
    : `<div class="empty"><h3>No qualifiers yet</h3><p>Open Qualifier results for ${regionDef.label} will appear here once matches are played.</p></div>`;

  return `<div class="pg">
<div class="dt">REGIONALS</div>
<div class="tb-bar lg-ctrl-row">
  <div class="dt-md" style="font-family:var(--ft);margin:0">OPEN QUALIFIER</div>
  <span class="ss-pill">${splitSel(S.act,'changeSplit')}</span>
</div>
<div class="dtog">${tabHtml}</div>

${oqSection}

<div class="dt-md" style="font-family:var(--ft);margin:52px 0 20px">CONTINENTALS</div>
<div class="ct-sh">Swiss Stage</div>
${swissTable(region)}
<div class="ct-sh" style="margin-top:36px">Playoffs</div>
${playoffsBracketHtml(region)}
</div>`;
}

function pgStandings() {
  const div = S.stdDiv || '1';
  const rows = div==='1' ? S.d1 : S.d2;
  const extraSection = div==='1' ? promoRelSection('Barrage', 'barrage') : promoRelSection('Promotion', 'promotion');
  return `<div class="pg">
<div class="dt">STANDINGS</div>
<div class="tb-bar lg-ctrl-row">
  <div class="dt-md" style="font-family:var(--ft);margin:0">DIVISION <span style="color:var(--acc)">${div}</span></div>
  <span class="ss-pill">${splitSel(S.act,'changeSplit')}</span>
</div>

${stTab(rows,+div)}
${legend(+div)}
${extraSection}
</div>`;
}

function pgSchedule() {
  const groups = schedGroups();
  // Picking a specific OQ bracket should jump straight to the day its matches were
  // actually played, not to today - schedAnchorIdx() prefers today-or-later, but
  // Open Qualifier rounds are already in the past, and today's (empty) group is
  // always present as a fallback, so the plain anchor logic would just land there
  // instead of on the real match day.
  if (S.schedMode === 'oq' && S.schedOQ) {
    const withMatches = groups.findIndex(g => g.matches.length > 0);
    schIdx = withMatches !== -1 ? withMatches : schedAnchorIdx(groups);
  } else {
    schIdx = schedAnchorIdx(groups);
  }
  const groupsHtml = groups.map((g,i) => {
    const body = g.matches.length
      ? g.matches.map(mc).join('')
      : `<div class="empty" style="margin:0"><h3>No match today</h3><p>Check back soon</p></div>`;
    return `<div class="date-group" id="sch-g-${i}"><div class="date-hd${schedGroupLabel(g.dO)==="Today"?' today':''}">${schedGroupLabel(g.dO)}</div>${body}</div>`;
  }).join('') + `<div aria-hidden="true" style="height:900px"></div>`;

  const splitScoped = S.schedSplit === 'all' ? S.schedAllRows : S.schedAllRows.filter(m => m.split === S.schedSplit);
  const regionScoped = S.schedRegion ? splitScoped.filter(m => schedCatMatches(m, 'oq')) : [];
  const oqRounds = S.schedRegion ? schedOQRounds(S.schedRegion, regionScoped) : [];

  const filterBar = `<div class="tb-bar lg-ctrl-row">
  <div class="dtog">
    <button class="dtb${S.schedMode==='all'?' on':''}" onclick="setSchedMode('all')">All</button>
    <button class="dtb${S.schedMode==='1'?' on':''}" onclick="setSchedMode('1')">Division 1</button>
    <button class="dtb${S.schedMode==='2'?' on':''}" onclick="setSchedMode('2')">Division 2</button>
    <button class="dtb${S.schedMode==='oq'?' on':''}" onclick="setSchedMode('oq')">Open Qualifier</button>
  </div>
  <span class="ss-pill">${splitSelWithAll(S.schedSplit, 'setSchedSplit')}</span>
</div>
${S.schedMode==='oq' ? `<div class="dtog" style="margin-top:10px">
  ${OQ_REGIONS.map(r => `<button class="dtb${S.schedRegion===r.key?' on':''}" onclick="setSchedRegion('${r.key}')">${r.label}</button>`).join('')}
</div>` : ''}
${(S.schedMode==='oq' && S.schedRegion && oqRounds.length) ? `<div class="dtog" style="margin-top:10px">
  ${oqRounds.map(n => `<button class="dtb${String(S.schedOQ)===String(n)?' on':''}" onclick="setSchedOQ('${n}')">OQ ${n}</button>`).join('')}
</div>` : ''}`;

  return `<div class="pg">
<div class="dt">SCHEDULE</div>
${filterBar}
<div class="sch-nav">
  <div class="sch-nav-ctrl">
    <button class="sch-arr" onclick="schedNav(-1)" aria-label="Previous day"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button>
    <button class="sch-today" id="sch-today-btn" onclick="schedNav(0)">Today</button>
    <button class="sch-arr" onclick="schedNav(1)" aria-label="Next day"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>
  </div>
</div>
<div class="sch-list" id="sch-list" onscroll="schedOnScroll()">
${groupsHtml}
</div>
</div>`;
}
let _schAutoScrolling = false;
function schedScrollTo(idx, smooth) {
  const list = document.getElementById('sch-list');
  const el = document.getElementById('sch-g-'+idx);
  if (!list || !el) return;
  const delta = el.getBoundingClientRect().top - list.getBoundingClientRect().top;
  _schAutoScrolling = true;
  list.scrollTo({ top: list.scrollTop + delta, behavior: smooth ? 'smooth' : 'auto' });
  clearTimeout(_schAutoScrollT);
  _schAutoScrollT = setTimeout(() => { _schAutoScrolling = false; }, smooth ? 500 : 120);
}
let _schAutoScrollT = null;
function schedUpdateBtn(g) {
  const btn = document.getElementById('sch-today-btn');
  if (btn && g) btn.textContent = schedGroupLabel(g.dO);
}
function schedNav(delta) {
  const groups = schedGroups();
  if (!groups.length) return;
  schIdx = delta===0 ? schedAnchorIdx(groups) : Math.min(Math.max(schIdx+delta,0), groups.length-1);
  schedScrollTo(schIdx, true);
  schedUpdateBtn(groups[schIdx]);
}
let _schScrollT = null;
function schedOnScroll() {
  clearTimeout(_schScrollT);
  _schScrollT = setTimeout(() => {
    if (_schAutoScrolling) return; // don't let our own auto-scroll clobber schIdx mid-flight
    const list = document.getElementById('sch-list');
    if (!list) return;
    const groups = schedGroups();
    const listTop = list.getBoundingClientRect().top;
    let idx = 0;
    document.querySelectorAll('#sch-list .date-group').forEach((g,i) => {
      if (g.getBoundingClientRect().top - listTop <= 48) idx = i;
    });
    schIdx = idx;
    schedUpdateBtn(groups[idx]);
  }, 60);
}
// ─── DATE FORMATTER ─────────────────────────────────────────────────────────
function fmtArtDate(raw) {
  if (!raw) return '';
  const mois=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const p = String(raw).replace(/\./g,'/').split('/');
  if (p.length===3) {
    const d=+p[0], m=+p[1]-1, y=+p[2];
    if (!isNaN(d)&&!isNaN(m)&&!isNaN(y)) return d+' '+(mois[m]||p[1])+' '+y;
  }
  return raw;
}
function catBadge(cat) {
  const k = (cat||'news').toLowerCase();
  const cls = {recap:'cat-recap',interview:'cat-interview',preview:'cat-preview',news:'cat-news',announcement:'cat-announcement'}[k] || 'cat-news';
  return `<span class="ac-cat ${cls}" style="padding:2px 8px;font-size:10px;margin-left:-8px">${(cat||'NEWS').toUpperCase()}</span>`;
}
function artCard(a, i=0) {
  const isVideo = (a.category||'').toLowerCase() === 'video';
  const ytUrl = isVideo ? (a.content_url || a.pub_url || '#') : null;
  const imgEl = a.thumbnail_url
    ? `<img class="ac-img" src="${a.thumbnail_url}" alt="" onerror="this.style.display='none'">`
    : `<div class="ac-iph"></div>`;
  // Video: overlay play button on thumbnail
  const playOverlay = isVideo ? `<div class="ac-play"><div class="ac-play-btn"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="margin-left:2px"><path d="M6 4l14 8-14 8V4z"/></svg></div></div>` : '';
  const thumb = isVideo
    ? `<a class="ac-img-wrap" href="${ytUrl}" target="_blank" onclick="event.stopPropagation()">${imgEl}${playOverlay}</a>`
    : `<div class="ac-img-wrap">${imgEl}${playOverlay}</div>`;
  const metaHtml = isVideo
    ? `<span>${fmtArtDate(a.date)}</span><span style="margin-left:auto">${a.author||''}</span>`
    : `<span>${(a.category||'').toUpperCase()}</span><span>${a.author||''}</span><span>${fmtArtDate(a.date)}</span>`;
  return `<div class="ac" style="cursor:pointer" onclick="S.artIdx=${i};go('article','${a.slug}')">
${thumb}
<div class="ac-b">
  <div class="ac-meta">${metaHtml}</div>
  <div class="ac-ti">${a.title}</div>
  <div class="ac-ex">${a.excerpt||''}</div>
  ${!isVideo ? `<span class="ac-btn">Read article <span class="sa-arr"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 6l6 6-6 6z"/></svg></span></span>` : ''}
</div></div>`;
}
function pgNews() {
  if (!S.art.length) return `<div class="pg"><div class="dt">NEWS</div><div class="empty"><h3>No articles yet</h3></div></div>`;
  return `<div class="pg"><div class="dt">NEWS</div>
<div class="al">${S.art.map((a,i)=>artCard(a,i)).join('')}</div></div>`;
}

function pgArticles() {
  if (!S.art.length) return `<div class="pg"><div class="dt">ARTICLES</div><div class="empty"><h3>No articles yet</h3></div></div>`;
  return `<div class="pg"><div class="dt">ARTICLES</div><div class="al">${S.art.map((a,i)=>artCard(a,i)).join('')}</div></div>`;
}

// Fetch & clean Google Doc published HTML
function docImgFallback(img) {
  const step = img.dataset.fallbackStep || '0';
  const original = img.dataset.originalSrc || img.src;
  if (!img.dataset.originalSrc) img.dataset.originalSrc = original;
  if (step === '0') {
    // Retry through a public image proxy (bypasses Google's CORP restriction on some links)
    img.dataset.fallbackStep = '1';
    img.src = 'https://images.weserv.nl/?url=' + encodeURIComponent(original.replace(/^https?:\/\//, ''));
    console.warn('[Doc image] direct load failed, retrying via proxy:', original);
  } else {
    console.warn('[Doc image] proxy retry also failed, giving up:', original);
    img.style.display = 'none';
  }
}
async function fetchDocContent(pubUrl, exportUrl) {
  try {
    const url = exportUrl || pubUrl;
    let res, html;
    try {
      res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      html = await res.text();
    } catch (e) {
      // If the export URL failed and we have a pub URL fallback, retry with it
      if (exportUrl && pubUrl && url !== pubUrl) {
        res = await fetch(pubUrl);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        html = await res.text();
      } else {
        throw e;
      }
    }
    const parser = new DOMParser();
    const dom = parser.parseFromString(html, 'text/html');

    // Google Docs published/exported HTML: content is in #contents (pub) or body (export)
    const root = dom.querySelector('#contents') || dom.body;

    // Remove clutter
    root.querySelectorAll('script,style,header,footer,nav,.gb_,#docs-chrome').forEach(e=>e.remove());

    // Save images before stripping (preserve src, alt)
    root.querySelectorAll('img').forEach(img => {
      // Resolve relative URLs against the Google Doc base URL
      const base = url;
      let src = img.getAttribute('src') || img.getAttribute('data-src') || '';
      if (src && !src.startsWith('http')) {
        try { src = new URL(src, base).href; } catch(e) {}
      }
      const alt = img.getAttribute('alt') || '';
      // Remove all attrs then restore only what we need
      const attrNames = Array.from(img.attributes).map(a => a.name);
      attrNames.forEach(n => img.removeAttribute(n));
      if (src) img.setAttribute('src', src);
      if (alt) img.setAttribute('alt', alt);
      img.setAttribute('loading', 'lazy');
      img.setAttribute('onerror', "docImgFallback(this)");
    });

    // Strip clutter from all elements
    root.querySelectorAll('*').forEach(el => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'img') return; // already handled above
      el.removeAttribute('class');
      el.removeAttribute('id');
      el.removeAttribute('style');
      el.removeAttribute('dir');
      el.removeAttribute('data-id');
      // Unwrap empty spans
      if (tag === 'span' && !el.querySelector('img,b,i,strong,em')) {
        el.replaceWith(...el.childNodes);
      }
    });

    // Remove Google's table-of-contents and metadata divs at top
    root.querySelectorAll('div:empty, hr').forEach(e => e.remove());

    // Extract content
    let content = root.innerHTML
      .replace(/ (class|id|style|dir|jsname|jsshadow|data-[^=]*)="[^"]*"/gi, '')
      .replace(/ {2,}/g, ' ')
      .replace(/<p>\s*(&nbsp;|\s)*<\/p>/gi, '')
      .replace(/<h[1-6]>\s*<\/h[1-6]>/gi, '')
      .trim();

    // Extract first paragraph as excerpt
    const firstP = root.querySelector('p');
    const excerpt = firstP ? firstP.textContent.replace(/\s+/g,' ').slice(0, 220).trim() : '';

    return { content, excerpt };
  } catch(e) {
    console.warn('[Doc] Failed to fetch doc:', e.message);
    return null;
  }
}


function pgArticle() {
  const a = S.art[S.artIdx ?? 0] || S.art[0];
  if (!a) return `<div class="pg"><div class="empty">Article not found</div></div>`;
  const heroImg = a.thumbnail_url ? `<img class="art-hero" src="${a.thumbnail_url}" alt="">` : '';
  // Use pre-built pub URL from lArt()
  const pubUrl = a.pub_url || '';
  // Trigger async content load after render
  if (pubUrl) {
    setTimeout(async () => {
      const el = document.getElementById('art-body');
      if (!el) return;
      el.innerHTML = '<div class="art-loading">Loading…</div>';
      const result = await fetchDocContent(pubUrl, a.export_url);
      if (result?.content) {
        el.innerHTML = `<div class="art-content">${result.content}</div>`;
      } else {
        el.innerHTML = `<div style="text-align:center;padding:40px 0">
          <p style="color:var(--muted);font-size:13px;margin-bottom:16px">Unable to load content.</p>
          <a class="art-extlink" href="${a.content_url}" target="_blank">📄 Open article ↗</a>
        </div>`;
      }
    }, 0);
  }
  return `<div class="pg"><div class="art-pg">
<div class="art-back" onclick="go('news')">← Back to articles</div>
${heroImg}
<div class="art-hdr">
  <div class="art-hdr-meta">${catBadge(a.category)}<span>${a.author||''}</span><span>${fmtArtDate(a.date)}</span></div>
  <div class="art-hdr-title">${a.title}</div>
</div>
<div class="art-divider"></div>
<div id="art-body">${pubUrl ? '<div class="art-loading">Loading…</div>' : '<div class="empty">Content unavailable</div>'}</div>
</div></div>`;
}

function pgVODs() {
  let vs = S.vods;
  if (S.vodSp) vs = vs.filter(v => v.split_id === S.vodSp);
  const cards = vs.map(v => {
    const th = v.thumbnail_url || ytth(v.youtube_url);
    const ta = S.teams[v.team_a_id]?.team_name || v.team_a_id || '';
    const tb = S.teams[v.team_b_id]?.team_name || v.team_b_id || '';
    return `<a class="vc" href="${v.youtube_url||'#'}" target="_blank">
<div class="vth">${th?`<img src="${th}" alt="">`:''}
<div class="vplay"><svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" style="margin-left:3px"><path d="M6 4l14 8-14 8V4z"/></svg></div></div>
<div class="vi"><div class="v-tms">${ta&&tb?`${ta} vs ${tb}`:'Match VOD'}</div>
<div class="v-meta">${v.division||''} - ${v.date||''}</div></div></a>`;
  }).join('');
  return `<div class="pg"><div class="dt">REPLAYS</div>
<div class="tb-bar">${splitSel(S.vodSp||S.act,'setVodSp')}</div>
${vs.length ? `<div class="vg">${cards}</div>` : `<div class="empty"><h3>No VODs</h3><p>Videos will appear here after matches.</p></div>`}
</div>`;
}

function pgTeams() {
  // Open-division teams (no registered division yet - Open Qualifier entrants)
  // don't get their own tab or cards here: they show up plenty of other places
  // (Schedule, Continentals brackets, Standings note badges) once they matter to
  // a Division. This page is specifically the Division 1 / Division 2 roster.
  let ts = Object.values(S.teams).filter(t => !isOpenDivision(t.division));
  if (S.tdiv !== 'all') ts = ts.filter(t => String(t.division) === S.tdiv);
  const cards = ts.map(t => {
    const pl = [t.player1, t.player2].filter(Boolean).join(' / ');
    const subs = [t.sub1, t.sub2].filter(Boolean);
    return `<div class="tc-c" onclick="openTeamModal('${t.team_id}')" style="cursor:pointer">
<div style="position:relative;width:68px;height:68px">${t.logo_url ? `<img src="${t.logo_url}" style="width:100%;height:100%;object-fit:contain" onerror="this.parentElement.innerHTML='<div class=&quot;tc-lph&quot;>${(t.team_name||'?')[0]}</div>'" alt="">` : `<div class="tc-lph">${(t.team_name||'?')[0]}</div>`}</div>
<div class="tc-n">${t.team_name||'?'}</div>
<div class="tc-d">${divLabel(t.division)}</div>
<div class="tc-pl">${pl?`<strong>${pl}</strong>`:''} ${subs.length?`<br><span style="font-size:11px;opacity:.5">Sub: ${subs.join(', ')}</span>`:''}</div>
</div>`;
  }).join('');
  return `<div class="pg"><div class="dt">TEAMS</div>
<div class="tb-bar">
<button class="fb3${S.tdiv==='all'?' on':''}" onclick="setTDiv('all')">All</button>
<button class="fb3${S.tdiv==='1'?' on':''}" onclick="setTDiv('1')">Division 1</button>
<button class="fb3${S.tdiv==='2'?' on':''}" onclick="setTDiv('2')">Division 2</button>
</div>
${ts.length ? `<div class="tg">${cards}</div>` : `<div class="empty"><h3>No teams</h3></div>`}
</div>`;
}

function pgRanking() {
  const rows = S.rank || [];
  if (!rows.length) {
    return `<div class="pg"><div class="dt">POWER RANKING</div>
<div class="empty"><h3>Data not available</h3><p>Add the data in the POWER RANKING tab of the Google Sheet.</p></div>
</div>`;
  }
  const divFilter = S.rankDiv || 'all';
  // Fixed display order rather than order of appearance in the sheet, so the
  // filters read the same way every time regardless of who currently tops the table.
  const ORDER = ['Div 1', 'Div 2', 'Open'];
  const divsPresent = [...new Set(rows.map(r => r.division).filter(Boolean))]
    .sort((a, b) => {
      const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });
  const shown = divFilter === 'all' ? rows : rows.filter(r => r.division === divFilter);
  const btns = ['all', ...divsPresent].map(d => {
    const label = d === 'all' ? 'All Div' : d;
    return `<button class="dtb${divFilter===d?' on':''}" onclick="setRankDiv('${d.replace(/'/g,"\\'")}')">${label}</button>`;
  }).join('');

  const trs = shown.map(r => {
    // Teams absent from the Teams tab (open-circuit entrants) fall back to the
    // shared "no_logo" mark, the same default the schedule uses.
    const teamForLogo = r.team || { team_name: r.team_name, logo_url: S.defaultLogo };
    const logo = `<div class="tlogo-box">${tlogo(teamForLogo, 90)}</div>`;
    const clickable = r.team ? ` style="cursor:pointer" onclick="openTeamModal('${r.team.team_id}')"` : '';
    return `<tr${clickable}>
<td class="rank-cell"><span class="rn">${r.rank}</span></td>
<td class="team-cell"><div class="tc">${logo}<span class="st-tname">${r.team_name}</span>${teamNoteBadge(r.team)}</div></td>
<td>${r.division||'-'}</td>
<td>${r.played}</td>
<td>${r.win}</td>
<td>${r.lose}</td>
<td class="pts">${r.score}</td>
</tr>`;
  });
  const trsJoined = stRowGap(trs, 7);

  // Only the top ten are shown at rest; the rest of the table scrolls.
  const scrollCls = shown.length > 10 ? ' st-scroll' : '';

  return `<div class="pg">
<div class="dt">POWER RANKING</div>
<div class="dtog">${btns}</div>
<div class="st-wrap${scrollCls}"><table class="stt"><thead><tr>
<th>Rank</th><th>Team</th><th>Division</th>
<th><span class="th-tip" data-tip="Match Played">P</span></th>
<th><span class="th-tip" data-tip="Match Win">W</span></th>
<th><span class="th-tip" data-tip="Match Loss">L</span></th>
<th><span class="th-tip" data-tip="Power Ranking Score">SCORE</span></th>
</tr></thead><tbody>${trsJoined}</tbody></table></div>${stWrapHint()}
${rankExplainer()}
</div>`;
}
function setRankDiv(d) { S.rankDiv = d; renderInPlace(); }
// Switching season reloads the totals for that year, since Overpoints do not carry over.
async function setOverYear(y) {
  if (S.overYear === y) return;
  S.overYear = y;
  renderInPlace();
  await lOver(y);
  renderInPlace();
}

// Overpoints: a single cross-region table of accumulated OVPTS. The top 4 qualify
// directly for the playoffs, places 5 to 32 for the wildcards, so both bands are
// tinted the same way the standings mark their qualification zones.
const OVER_PLAYOFF_CUT  = 4;
const OVER_WILDCARD_CUT = 32;
function pgOverpoints() {
  const rows = S.over || [];
  if (!rows.length) {
    const yr0 = S.overYear || currentSeasonYear();
    return `<div class="pg">
<div class="sh"><div class="dt" style="margin-bottom:0">OVERPOINTS</div>${seasonSel(yr0, 'setOverYear')}</div>
<div class="empty"><h3>Data not available</h3><p>No Overpoints recorded for season ${yr0} yet.</p></div>
</div>`;
  }
  const trs = rows.map(r => {
    const zone = r.rank <= OVER_PLAYOFF_CUT ? 'ov-po'
               : r.rank <= OVER_WILDCARD_CUT ? 'ov-wc' : '';
    // Overpoints has no single split of its own (it's a cumulative total), so the
    // note badge - like the name fix above - resolves against whichever split is
    // currently active, the closest thing this page has to "right now".
    const resolvedTeam = r.team ? teamFor(r.team, S.configActiveSplit || S.act) : null;
    const teamForLogo = resolvedTeam || { team_name: r.team_name, logo_url: S.defaultLogo };
    const logo = `<div class="tlogo-box">${tlogo(teamForLogo, 90)}</div>`;
    const clickable = r.team ? ` style="cursor:pointer" onclick="openTeamModal('${r.team.team_id}')"` : '';
    return `<tr class="${zone}"${clickable}>
<td class="rank-cell"><span class="rn">${r.rank}</span></td>
<td class="team-cell"><div class="tc">${logo}<span class="st-tname">${r.team_name}</span>${teamNoteBadge(resolvedTeam)}</div></td>
<td class="pts">${r.pts}</td>
</tr>`;
  });

  const trsJoined = stRowGap(trs, 3);
  const scrollCls = rows.length > 10 ? ' st-scroll' : '';
  const yr = S.overYear || currentSeasonYear();
  return `<div class="pg">
<div class="sh"><div class="dt" style="margin-bottom:0">OVERPOINTS</div>${seasonSel(yr, 'setOverYear')}</div>
<div class="st-wrap${scrollCls}"><table class="stt"><thead><tr>
<th>Rank</th><th>Team</th>
<th><span class="th-tip" data-tip="Overdrive Points">OVPTS</span></th>
</tr></thead><tbody>${trsJoined}</tbody></table></div>${stWrapHint()}
<div class="lgd">
  <span class="lgd-i"><span class="lgd-c" style="background:#FFD84A"></span>Playoffs qualified</span>
  <span class="lgd-i"><span class="lgd-c" style="background:#FFE9A0"></span>Wildcard qualified</span>
</div>
${overExplainer()}
</div>`;
}
// Mirrors the Power Ranking explainer's structure (numbered sections, card grid)
// so the two pages read as one consistent system instead of Overpoints looking
// like an afterthought next to Power Ranking's fuller breakdown.
function overExplainer() {
  const sec = (i, t) => `<div class="pr-sec"><span class="pr-sec-i">${i}</span><span class="pr-sec-t">${t}</span></div>`;
  return `<div class="pr-exp">
<div class="dt-md" style="font-family:var(--ft);margin-bottom:14px">HOW IT WORKS</div>
<p class="pr-intro">One running total for the season, built from everything a team plays: division results and Continentals placements both add to the same score. It decides who's in the finals field, and who has to fight through the wildcard round to get there.</p>

<div class="pr-block">
${sec('01', 'Where the points come from')}
<div class="pr-cards">
<div class="pr-card"><div class="pr-card-n">Division</div><div class="pr-card-l">Where a team finishes in Div 1 or Div 2</div></div>
<div class="pr-card"><div class="pr-card-n">Continentals</div><div class="pr-card-l">Placement in the regional Swiss + Playoffs stage</div></div>
</div>
<p class="pr-note">Both splits of the season count: points from Spring and Fall are added together, not just the most recent one.</p>
</div>

<div class="pr-block" style="margin-bottom:0">
${sec('02', 'Who qualifies')}
<div class="pr-cards" style="max-width:520px">
<div class="pr-card"><div class="pr-card-n">1-4</div><div class="pr-card-l">Direct to playoffs</div></div>
<div class="pr-card"><div class="pr-card-n">5-32</div><div class="pr-card-l">Wildcard slot</div></div>
</div>
<p class="pr-note">Ranked 1st to 4th overall: straight into the playoffs field. 5th to 32nd: one more round to fight through first. Totals reset when the next season starts.</p>
</div>
</div>`;
}

function rankExplainer() {
  const bases = [
    { n: '1,000', l: 'Division 1' },
    { n: '700',   l: 'Division 2' },
    { n: '400',   l: 'OQ / Continentals' }
  ];
  const mults = [
    { l: 'Playoffs / Promotion', v: 1.75 },
    { l: 'Barrage',              v: 1.50 },
    { l: 'Division 1',           v: 1.00 },
    { l: 'Division 2',           v: 0.75 },
    { l: 'Continentals',         v: 0.30 },
    { l: 'Open Qualifier',       v: 0.10 }
  ];
  const floors = [
    { n: '750', l: 'Division 1 floor' },
    { n: '450', l: 'Division 2 floor' }
  ];
  const sec = (i, t) => `<div class="pr-sec"><span class="pr-sec-i">${i}</span><span class="pr-sec-t">${t}</span></div>`;
  const card = c => `<div class="pr-card"><div class="pr-card-n">${c.n}</div><div class="pr-card-l">${c.l}</div></div>`;
  const maxV = Math.max(...mults.map(m => m.v));

  return `<div class="pr-exp">
<div class="dt-md" style="font-family:var(--ft);margin-bottom:14px">HOW IT WORKS</div>
<p class="pr-intro">One ranking for every team, across every division.</p>

<div class="pr-block">
${sec('01', 'Starting score')}
<div class="pr-cards">${bases.map(card).join('')}</div>
</div>

<div class="pr-block">
${sec('02', 'What moves it')}
<p class="pr-note" style="margin-top:0">Wins add points, losses take them away - more for beating a stronger team, more for a clean scoreline. How much of that counts depends on the stage:</p>
<div class="pr-mult">${mults.map(m => `<div class="pr-m">
  <span class="pr-m-l">${m.l}</span>
  <span class="pr-m-bar"><span class="pr-m-fill" style="width:${(m.v/maxV*100).toFixed(0)}%"></span></span>
  <span class="pr-m-v">x${m.v.toFixed(2)}</span>
</div>`).join('')}</div>
</div>

<div class="pr-block" style="margin-bottom:0">
${sec('03', 'The floor')}
<div class="pr-cards" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr));max-width:400px">${floors.map(card).join('')}</div>
<p class="pr-note">No Division 1 team can fall below Division 2 on results alone.</p>
</div>
</div>`;
}

// Brand kit. Two genuinely different file-naming shapes here, not one pattern
// reused twice: OverDrive's own mark comes in 5 colour variants per type
// (Overdrive_Logo_Black, Overdrive_Logomark_alt_White...), while each region's
// mark has no colour variants at all, just one file per type - and even the
// "alt" type is named differently between the two ("Logomark_alt" for OverDrive
// vs "Logo_alt" for regions). Kept as explicit per-group data rather than one
// shared variants list, since forcing them into the same shape is what caused
// the first version of this page to guess wrong.
const MEDIA_ASSET_BASE = 'https://raw.githubusercontent.com/AgoyyaProd/overdrive-assets/main/logos_overdrive';
const MEDIA_COLORS = ['Black', 'Red', 'Yellow', 'White', 'Grey'];
const OVERDRIVE_TYPES = [
  { key: 'Logo',          label: 'Logo' },
  { key: 'Logomark',      label: 'Logomark' },
  { key: 'Logomark_alt',  label: 'Logomark Alt' },
  { key: 'Logotype',      label: 'Logotype' },
];
const REGION_TYPES = [
  { key: 'Logo',      label: 'Logo' },
  { key: 'Logo_Alt',  label: 'Logo Alt' },
  { key: 'Logomark',  label: 'Logomark' },
  { key: 'Logotype',  label: 'Logotype' },
];
const MEDIA_REGIONS = [
  { key: 'EMEA', label: 'EMEA' },
  { key: 'APAC', label: 'APAC' },
  { key: 'AMERICAS', label: 'AMERICAS' },
];
function mediaCard(filename, label) {
  const url = `${MEDIA_ASSET_BASE}/${filename}.svg`;
  // download triggers the browser's own save flow when the browser honours it for
  // a cross-origin file; target="_blank" is what happens when it doesn't - opening
  // the file in a new tab rather than navigating away from the site either way.
  return `<div class="mk-card">
  <div class="mk-preview"><img src="${url}" alt="${label}" loading="lazy"></div>
  <div class="mk-label">${label}</div>
  <a class="mk-dl" href="${url}" download="${filename}.svg" target="_blank" rel="noopener" aria-label="Download ${label}">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v13m0 0l-5-5m5 5l5-5M4 21h16"/></svg>
    <span>Download</span>
  </a>
</div>`;
}
// Two-level accordion: a top section (OverDrive / Regionals) opens to reveal its
// sub-items (a type, or a region), each of which opens on its own to reveal the
// actual logo grid - collapsed by default, rather than 32 cards all on screen
// at once.
function mkChevron() {
  return `<svg class="mk-acc-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;
}
function mkAccItem(label, bodyHtml, sub) {
  return `<div class="mk-acc${sub ? ' mk-acc-sub' : ''}">
  <button type="button" class="mk-acc-h" onclick="toggleMkAcc(this)"><span>${label}</span>${mkChevron()}</button>
  <div class="mk-acc-body"><div class="mk-acc-inner">${bodyHtml}</div></div>
</div>`;
}
function toggleMkAcc(btn) {
  btn.closest('.mk-acc').classList.toggle('open');
}
function pgMedia() {
  const overdriveBody = OVERDRIVE_TYPES.map(t => mkAccItem(
    t.label,
    `<div class="mk-grid mk-grid-5">${MEDIA_COLORS.map(c => mediaCard(`Overdrive_${t.key}_${c}`, `${t.label} (${c})`)).join('')}</div>`,
    true
  )).join('');
  const regionalBody = MEDIA_REGIONS.map(r => mkAccItem(
    r.label,
    `<div class="mk-grid">${REGION_TYPES.map(t => mediaCard(`Overdrive_${t.key}_${r.key}`, t.label)).join('')}</div>`,
    true
  )).join('');
  return `<div class="pg">
<div class="dt">MEDIA KIT</div>
<p class="htp-p">OverDrive's own marks and each region's, ready to use. Open a section, then a type, to see the files, and hover (or tap) any logo to download it.</p>
<div class="mk-acc-list">
${mkAccItem('OVERDRIVE', overdriveBody, false)}
${mkAccItem('REGIONALS', regionalBody, false)}
</div>
</div>`;
}
function pgHowToPlay() {
  return `<div class="pg">
<div class="dt">PLAY YOURSELF</div>
<p class="htp-p">Here's how the OverDrive competitive ladder actually works, from your first Open Qualifier match to the top of Division 1.</p>

<div class="htp-sec first">DIVISION 1 & DIVISION 2</div>
<p class="htp-p">The core league is split into two divisions. Division 1 is the top tier: the best 2v2 duos in OverDrive, playing every split for the title and a direct playoffs spot. Division 2 sits just below it. It's a genuine path up, not a consolation bracket, with real stakes of its own every split.</p>

<div class="htp-sec">BARRAGE</div>
<p class="htp-p">Divisions aren't fixed. At the end of each split, the bottom of Division 1 and the top of Division 2 meet in the Barrage, a direct promotion/relegation series. Win it as a Division 2 side and you're up. Lose it as a Division 1 side and you're down. It's the mechanism that keeps both divisions honest.</p>

<div class="htp-sec">OPEN QUALIFIER</div>
<p class="htp-p">Division 1, Division 2 and the Barrage are for teams already inside the league. The Open Qualifier is how everyone else gets in, open to any duo, no invite needed. It runs across three regions: EMEA, Oceasia and NCSA, each playing through 8 qualifier steps, two per weekend, over four weekends. Every step is its own bracket. Show up, win your matches, and you're through.</p>
<p class="htp-p">What "through" means depends on the region. In Oceasia and NCSA, the winner of each qualifier step earns their spot at Continentals: one team, straight through. EMEA sends two. Both finalists of each EMEA qualifier step, the winner and the runner-up, advance to Continentals, not just the champion.</p>

<div class="htp-sec">CONTINENTALS</div>
<p class="htp-p">Continentals is the final phase for each region, where every team that came through the Open Qualifier meets again for a shot at the main league. It plays out in two stages: a Swiss stage first, where records decide who's still in contention, then Playoffs among the best of that stage.</p>
<p class="htp-p">The Playoffs decide who earns an Up & Downs spot: 2 from EMEA, 1 from Oceasia, and 1 from AMERICAS.</p>

<div class="htp-sec">UP & DOWNS</div>
<p class="htp-p">Up & Downs is the last step in. The teams that earned their spot through Continentals face the bottom 4 teams of Division 2 in a direct promotion series, for a place in the main OverDrive league itself.</p>

<div class="htp-sec">RULEBOOK</div>
<p class="htp-p">Every format, tiebreaker and match rule in full detail, in one document.</p>
<div class="ab-btns" style="margin-top:6px">
<a href="https://drive.google.com/file/d/1StuLv7mapA_tmHORaEJl3TwfVgNY0qxl/view?usp=sharing" target="_blank" class="btn-d">Read the Rulebook (v1.5)</a>
</div>

<div class="htp-sec">GET IN</div>
<p class="htp-p">Registrations for the current Open Qualifier split are open now.</p>
<div class="ab-btns" style="margin-top:6px">
<a href="https://trackmania.events/events/overdrive-split-2" target="_blank" class="btn-w">Register for the Open Qualifier</a>
<a href="https://discord.gg/tZV3Mu3Thb" target="_blank" class="btn-d">Join the Discord</a>
</div>
</div>`;
}
function pgAbout() {
  return `<div class="pg">
<div class="abh-text" style="max-width:640px">
<div class="dt">BUILT FOR<br>THE <em>LONG GAME</em></div>
<p class="ab-p">A Trackmania event project driven by well-known figures from the community: a competitive scene built for the people who live it, players, organizations, and fans.</p>
<p class="ab-p">Not chasing the instant hit: a strong identity, clean production, a story built to last.</p>
<div class="abh-cta">
<a href="https://www.youtube.com/@overdrivetm/videos" target="_blank" class="btn-w">Watch on YouTube</a>
<a href="https://www.twitch.tv/${TWITCH_CH}" target="_blank" class="abh-sub">Follow on Twitch <span>&#8594;</span></a>
</div>
</div>

<div class="legal-sec first" style="margin-top:56px">THE PROJECT</div>
<p class="ab-p">Where many formats chase the instant hit, OverDrive is built for the long game: a strong identity, clean production, stakes that make sense, and a story that develops over time.</p>
<p class="ab-p">The choice of 2v2 is central to that: it builds on the momentum of the 2025 World Tour and answers a real need for a scene built around this format, one that puts synergy, strategy, and two-player decisive moments back in the spotlight.</p>
<p class="ab-p">The end goal is a recurring event that showcases duos, gives organizations real visibility, and gives the top level a coherent framework instead of a string of one-off events.</p>

<div class="legal-sec">MISSION & VALUES</div>
<p class="ab-p">Concretely, OverDrive's mission is to put players first: clear, stable rules, solid playing conditions, a calendar built for competition, and active listening to feedback to improve every season.</p>
<p class="ab-p">The project also aims to structure a clear progression and make the top level attainable, with an understandable scene, real stages and real opportunities, without sacrificing competitive standards.</p>
<p class="ab-p">On the league side, the idea is to build a lasting framework for players and organizations alike: consistency, stakes that matter, visibility that's actively built, and an overall coherence across branding, broadcast, and communication.</p>
<p class="ab-p">The values behind all of it are simple: a player-first approach, a demand for quality, respect for the community, transparency, and one strong conviction, aim for premium while keeping the scene open, clear, and fair.</p>

<div class="legal-sec">MEDIA KIT</div>
<p class="ab-p">Logos for OverDrive and every region, ready to download.</p>
<div class="ab-btns" style="margin-top:6px"><button class="btn-d" onclick="go('media')">View Media Kit</button></div>
</div>`;
}

// ─── FOOTER LEGAL PAGES (draft content: see notice on each page) ──────────
function pgContact() {
  return `<div class="pg">
<div class="dt" style="text-align:center">CONTACT</div>
<p class="ab-p" style="text-align:center;max-width:520px;margin-left:auto;margin-right:auto">Got a question about the league, a partnership idea, or want to join the project? Send us a message below and we'll get back to you as soon as we can.</p>
<form class="cf" onsubmit="return submitContactForm(event)">
  <div class="cf-row">
    <div class="cf-field"><label for="cf-name">Name</label><input id="cf-name" name="name" type="text" required></div>
    <div class="cf-field"><label for="cf-email">Email</label><input id="cf-email" name="email" type="email" required></div>
  </div>
  <div class="cf-field"><label for="cf-subject">Subject</label><input id="cf-subject" name="subject" type="text" required></div>
  <div class="cf-field"><label for="cf-message">Message</label><textarea id="cf-message" name="message" rows="6" required></textarea></div>
  <button type="submit" class="btn-w">Send message</button>
  <p class="cf-status"></p>
</form>
</div>`;
}
function pgLegal() {
  return `<div class="pg">
<div class="dt">LEGAL NOTICE</div>
<div class="legal-sec first">1. SITE PUBLISHER</div>
<p class="ab-p">Trading name: <b>OVERDRIVE ESPORT</b><br>
Operator: Pierre LONGREE<br>
SIREN: 103 005 161<br>
Head office SIRET: 103 005 161 00015<br>
Address: 6 B, chemin de la Fontaine Jablee, 59145 Berlaimont, France<br>
Email: <a href="mailto:contact@overdrivegg.com" style="color:var(--acc)">contact@overdrivegg.com</a></p>
<div class="legal-sec">2. PUBLICATION DIRECTOR</div>
<p class="ab-p">Pierre LONGREE.</p>
<div class="legal-sec">3. HOSTING</div>
<p class="ab-p">IONOS SE, Elgendorfer Straße 57, 56410 Montabaur, Germany.</p>
<div class="legal-sec">4. INTELLECTUAL PROPERTY</div>
<p class="ab-p">Unless stated otherwise, all content on this site, including text, graphic elements, logos, photographs, videos, interfaces and design elements, is protected under applicable intellectual property laws.<br>
Any reproduction, representation, adaptation or use, in whole or in part, without prior authorization from the relevant rights holder, may constitute infringement.</p>
<div class="legal-sec">5. LIABILITY</div>
<p class="ab-p">OVERDRIVE ESPORT strives to keep the information on this site accurate and up to date. However, no guarantee is given as to the completeness, accuracy or continuous availability of its content. The publisher cannot be held liable for damages resulting from use of the site, subject to any mandatory legal provisions that apply.</p>
<div class="legal-sec">6. EXTERNAL LINKS</div>
<p class="ab-p">The site may contain links to third-party services or websites. OVERDRIVE ESPORT has no control over these resources and cannot be held responsible for their content or practices.</p>
<div class="legal-sec">7. PERSONAL DATA</div>
<p class="ab-p">The collection and processing of personal data is described in the <a href="#" onclick="event.preventDefault();go('privacy')" style="color:var(--acc)">Privacy Policy</a>.</p>
<div class="legal-sec">8. GOVERNING LAW</div>
<p class="ab-p">This site is governed by French law, subject to any mandatory rules applicable to the user based on their situation.</p>
<p class="ab-p" style="margin-top:24px;color:var(--dim)">Last updated: August 25, 2026.</p>
</div>`;
}
function pgPrivacy() {
  return `<div class="pg">
<div class="dt">PRIVACY</div>
<p class="ab-p">This policy explains how OVERDRIVE ESPORT processes personal data that may be collected through its website. It is designed to reflect how the site actually operates: only processing that is genuinely carried out is kept here.</p>
<div class="legal-sec first">1. DATA CONTROLLER</div>
<p class="ab-p">Pierre LONGREE, OVERDRIVE ESPORT<br>
SIREN: 103 005 161<br>
6 B, chemin de la Fontaine Jablee, 59145 Berlaimont, France<br>
<a href="mailto:contact@overdrivegg.com" style="color:var(--acc)">contact@overdrivegg.com</a></p>
<div class="legal-sec">2. PERSONAL DATA COLLECTED</div>
<p class="ab-p">The OVERDRIVE ESPORT site does not offer account creation, a member area, or a login system. It is therefore not intended to collect personal data linked to a user account.<br>
As of now, the only personal data directly collected by OVERDRIVE ESPORT is what a visitor chooses to submit through the contact form, namely their name, email address and message content, along with any other information they choose to include.</p>
<p class="ab-p">Form fields are limited to the information necessary to handle the request. OVERDRIVE ESPORT applies a data minimization principle.</p>
<div class="legal-sec">3. PURPOSES AND LEGAL BASES</div>
<p class="ab-p">Responding to requests sent via the contact form.<br>
Legal basis: OVERDRIVE ESPORT's legitimate interest in responding to inquiries received and, where the request concerns the preparation of a possible contractual relationship, pre-contractual measures.</p>
<p class="ab-p">Complying with legal obligations and protecting OVERDRIVE ESPORT's rights.<br>
Legal basis: compliance with a legal obligation or legitimate interest, depending on the processing concerned.</p>
<div class="legal-sec">4. MANDATORY OR OPTIONAL FIELDS</div>
<p class="ab-p">Fields required to process a request are marked as mandatory where applicable. If the requested information is not provided, OVERDRIVE ESPORT may be unable to respond to the request or provide the service concerned.</p>
<div class="legal-sec">5. RECIPIENTS</div>
<p class="ab-p">Messages submitted via the contact form are accessible to OVERDRIVE ESPORT in order to process the request. They may also be processed by technical service providers involved in operating, hosting or transmitting communications for the site, to the extent necessary for their services.</p>
<div class="legal-sec">6. RETENTION PERIOD</div>
<p class="ab-p">Data submitted via the contact form is kept for as long as necessary to process and follow up on the request. It is then deleted or, where retention is necessary to comply with a legal obligation or to defend OVERDRIVE ESPORT's rights, kept for the period required by that obligation or need.</p>
<div class="legal-sec">7. COOKIES AND TRACKERS</div>
<p class="ab-p">As of the last update of this policy, the OVERDRIVE ESPORT site does not use cookies or trackers for audience measurement, advertising, profiling or browsing tracking purposes. No cookie consent banner is therefore in place for these uses.<br>
If new cookies or trackers are added to the site in the future, this policy will be updated and, where required by law, a consent mechanism will be put in place before they are set or read.</p>
<div class="legal-sec">8. TRANSFERS OUTSIDE THE EUROPEAN UNION</div>
<p class="ab-p">OVERDRIVE ESPORT does not organize any specific transfer of personal data outside the European Union or the European Economic Area as part of the contact form. This information will be updated if the providers or services used by the site change and result in such a transfer.</p>
<div class="legal-sec">9. YOUR RIGHTS</div>
<p class="ab-p">Under applicable regulations, you may request access to your data, its correction or deletion, restriction of processing, object to certain processing, and, where the right to data portability applies, obtain the data concerned in a suitable format.<br>
To exercise your rights, you can write to: <a href="mailto:contact@overdrivegg.com" style="color:var(--acc)">contact@overdrivegg.com</a>. Proof of identity may be requested where necessary to prevent disclosure to an unauthorized person.<br>
You also have the right to lodge a complaint with the CNIL (Commission nationale de l'informatique et des libertés), the French data protection authority.</p>
<div class="legal-sec">10. SECURITY</div>
<p class="ab-p">OVERDRIVE ESPORT implements reasonable technical and organizational measures designed to protect personal data against loss, unauthorized access, disclosure, alteration or destruction.</p>
<div class="legal-sec">11. UPDATES</div>
<p class="ab-p">This policy may be amended to reflect changes to the site, its processing activities, or applicable regulations.</p>
<p class="ab-p" style="margin-top:24px;color:var(--dim)">Last updated: August 25, 2026.</p>
</div>`;
}

// ─── ROUTER ────────────────────────────────────────────────────────────────
const PAGES = {
  home: pgHome, leagues: pgLeagues, standings: pgStandings,
  schedule: pgSchedule, news: pgNews, articles: pgArticles, article: pgArticle, vods: pgVODs,
  teams: pgTeams, ranking: pgRanking, overpoints: pgOverpoints, about: pgAbout, howtoplay: pgHowToPlay, media: pgMedia,
  contact: pgContact, legal: pgLegal, privacy: pgPrivacy,
};
// Map page → parent nav item
const NAV_PARENT = {home:'home',leagues:'leagues',standings:'leagues',teams:'leagues',ranking:'leagues',overpoints:'leagues',schedule:'schedule',news:'news',articles:'news',article:'news',vods:'news',about:'about',howtoplay:'home',media:'about',contact:'about',legal:'about',privacy:'about'};

// renderInPlace – updates content WITHOUT scrolling (toggles, filters…)
// Marks a scrollable table wrapper as "already scrolled" (hiding the edge fade and
// swipe hint) once the user has actually moved it, and skips the hint entirely when
// the table already fits without scrolling. Re-run after every render, since the
// wrappers are fresh DOM nodes each time.
function initStWrapHints() {
  document.querySelectorAll('.st-wrap').forEach(w => {
    const hint = w.nextElementSibling;
    if (w.scrollWidth <= w.clientWidth + 2) {
      w.classList.add('st-scrolled');
      if (hint && hint.classList.contains('st-wrap-hint')) hint.classList.add('hide');
      return;
    }
    w.addEventListener('scroll', () => {
      if (w.scrollLeft > 4) {
        w.classList.add('st-scrolled');
        if (hint && hint.classList.contains('st-wrap-hint')) hint.classList.add('hide');
      }
    }, { passive: true });
  });
}
function renderInPlace() {
  const parent = NAV_PARENT[S.page] || S.page;
  document.querySelectorAll('.nlk').forEach(el => el.classList.toggle('on', el.dataset.p === parent));
  const fn = PAGES[S.page] || pgHome;
  document.getElementById('app').innerHTML = fn();
  initStWrapHints();
  if (S.page === 'home') { _ytReady = false; _ytPlayer = null; _ytMuted = true; setTimeout(initYTPlayer, 150); }
  if (S.page === 'schedule') {
    const schTargetIdx = schIdx;
    requestAnimationFrame(() => { schedScrollTo(schTargetIdx, false); });
    // Webfont swap-in and logo images loading after the initial paint can shift card
    // heights just enough to throw off the scroll anchor (cropping the date header while
    // still showing that day's matches). Re-snap once things have actually settled.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => schedScrollTo(schTargetIdx, false));
    setTimeout(() => schedScrollTo(schTargetIdx, false), 350);
  }
}

// go – navigation entre pages (scroll en haut)
// Power Ranking is being reworked and isn't ready to show - go() is the single
// entry point every navigation path funnels through (menu clicks, direct
// go('ranking') calls, and pageFromHash() below for a typed/bookmarked URL), so
// redirecting here closes off all of them at once rather than just hiding the
// menu links and leaving the page itself still reachable.
// ─── PAGE ↔ FILE MAPPING ───────────────────────────────────────────────────
// Every navigable (page, sub) combination maps to a real, physically-existing
// HTML file. This is what lets a direct load or a refresh on any of them work
// natively on any static host - no server-side rewrite rule required, since
// the file the browser asks for genuinely exists. Internal clicks still update
// this instantly via JS (through go(), unchanged from before) and just push the
// matching filename into the URL afterwards, so a subsequent refresh lands back
// on the same real file.
const PAGE_FILE_MAP = {
  'home|': 'index.html',
  'standings|1': 'standings-div1.html', 'standings|2': 'standings-div2.html',
  'leagues|EMEA': 'leagues-emea.html', 'leagues|APAC': 'leagues-apac.html', 'leagues|AMERICAS': 'leagues-americas.html',
  'teams|': 'teams.html',
  'overpoints|': 'overpoints.html',
  'schedule|': 'schedule.html',
  'schedule|div-1': 'schedule-div1.html', 'schedule|div-2': 'schedule-div2.html',
  'schedule|oq': 'schedule-oq.html',
  'schedule|oq-emea': 'schedule-oq-emea.html', 'schedule|oq-apac': 'schedule-oq-apac.html', 'schedule|oq-americas': 'schedule-oq-americas.html',
  'news|': 'news.html', 'articles|': 'articles.html',
  'article|': 'article.html', // slug travels as ?slug=... (see pageFromPath) - a real
                               // file per article isn't possible, since articles are
                               // added through the sheet at any time with no build/
                               // deploy step to generate a matching static file for one.
  'vods|': 'vods.html',
  'about|': 'about.html',
  'howtoplay|': 'howtoplay.html',
  'media|': 'media.html',
  'contact|': 'contact.html', 'legal|': 'legal.html', 'privacy|': 'privacy.html',
};
const FILE_PAGE_MAP = Object.fromEntries(
  Object.entries(PAGE_FILE_MAP).map(([k, file]) => {
    const [page, sub] = k.split('|');
    return [file, { page, sub }];
  })
);
function go(page, sub) {
  if (page === 'ranking') page = 'leagues';
  S.page = page;
  renderInPlace();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  syncPath(page, sub);
}

// ─── MOBILE NAV ────────────────────────────────────────────────────────────
function toggleMobileNav() {
  const opening = !document.getElementById('mnav').classList.contains('open');
  if (opening) openMobileNav(); else closeMobileNav();
}
function openMobileNav() {
  document.getElementById('nav-burger').classList.add('open');
  document.getElementById('nav-burger').setAttribute('aria-expanded', 'true');
  document.getElementById('mnav').classList.add('open');
  document.getElementById('mnav-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeMobileNav() {
  document.getElementById('nav-burger').classList.remove('open');
  document.getElementById('nav-burger').setAttribute('aria-expanded', 'false');
  document.getElementById('mnav').classList.remove('open');
  document.getElementById('mnav-backdrop').classList.remove('open');
  document.body.style.overflow = '';
  document.querySelectorAll('.mnav-item.open').forEach(i => i.classList.remove('open'));
  document.querySelectorAll('.mnav-sub2.open').forEach(s => s.classList.remove('open'));
}
// Only one top-level section (Leagues) open at a time, mirroring the desktop dropdown.
function mnavToggleItem(el) {
  const item = el.closest('.mnav-item');
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.mnav-item.open').forEach(i => { if (i !== item) i.classList.remove('open'); });
  item.classList.toggle('open', !wasOpen);
}
// Nested submenu (Standings / Ranking) inside Leagues – same one-at-a-time rule.
function mnavToggleSub(el) {
  const sub = el.nextElementSibling;
  const wasOpen = sub.classList.contains('open');
  document.querySelectorAll('.mnav-sub2.open').forEach(s => { if (s !== sub) s.classList.remove('open'); });
  sub.classList.toggle('open', !wasOpen);
}
function mnavGo(page) { closeMobileNav(); go(page); }
function mnavGoStd(d) { closeMobileNav(); goStandingsDiv(d); }
window.addEventListener('resize', () => { if (window.innerWidth > 900) closeMobileNav(); });

// ─── PATH ROUTING ──────────────────────────────────────────────────────────
// Reflects the current page in the URL as a real path (e.g. yoursite.com/schedule)
// instead of a #hash, using the History API - so pages can be bookmarked/shared
// directly and the browser's back/forward buttons work as expected. BASE_PATH is
// computed from wherever the page actually loaded rather than hardcoded, so this
// keeps working unchanged whether the site sits at a GitHub Pages project path
// (/overdrive-assets/) or later moves to a custom domain's root (/).
// Naively trusting location.pathname to be "the base" only works when the page
// happens to load at the true root - which .htaccess's SPA fallback breaks the
// moment someone loads a deep link directly (e.g. /standings/1 serves index.html
// via a server-side rewrite, but the browser's address bar - and therefore
// location.pathname - still reads /standings/1, not /). Instead, find the first
// path segment that's a real page key and treat everything before it as the
// base - correctly resolving to "/" for a domain root deploy (IONOS) or
// "/overdrive-assets/" for a GitHub Pages project deploy, regardless of which
// page the visitor happened to land on directly.
// Simple now that every route is its own real file directly in one folder (no more
// path segments to walk for sub-state) - BASE_PATH is just "everything up to and
// including the last /" in the current URL, which works unchanged whether that's
// a domain root or a GitHub Pages project subfolder.
const BASE_PATH = (() => {
  const p = location.pathname;
  return p.slice(0, p.lastIndexOf('/') + 1);
})();
const PAGE_TITLES = {
  home:'OverDrive - Event Organizer', leagues:'Standings – OverDrive - Event Organizer', standings:'Standings – OverDrive - Event Organizer',
  schedule:'Schedule – OverDrive - Event Organizer', news:'News – OverDrive - Event Organizer', articles:'News – OverDrive - Event Organizer',
  article:'News – OverDrive - Event Organizer', vods:'VODs – OverDrive - Event Organizer',
  teams:'Teams – OverDrive - Event Organizer', ranking:'Power Ranking – OverDrive - Event Organizer', overpoints:'Overpoints – OverDrive - Event Organizer', about:'About – OverDrive - Event Organizer',
  howtoplay:'Play Yourself – OverDrive - Event Organizer',
  media:'Media Kit – OverDrive - Event Organizer',
  contact:'Contact – OverDrive - Event Organizer', legal:'Legal Notice – OverDrive - Event Organizer', privacy:'Privacy – OverDrive - Event Organizer',
};
// Reads {page, sub} off the current URL's real filename (falling back to 'home'
// for an unrecognised one) rather than parsing path segments. Article slugs travel
// as ?slug=... since there's no real per-article file to read a path segment from;
// if S.art hasn't loaded yet (a fresh load straight into an article link), the
// slug is stashed on S.pendingArticleSlug and resolved once lArt() finishes, in
// init() below.
function pageFromPath() {
  let p = location.pathname;
  if (p.startsWith(BASE_PATH)) p = p.slice(BASE_PATH.length);
  const file = p || 'index.html';
  const entry = FILE_PAGE_MAP[file] || { page: 'home', sub: '' };
  if (entry.page === 'article') {
    const slug = new URLSearchParams(location.search).get('slug') || '';
    if (slug) {
      const idx = (S.art || []).findIndex(a => a.slug === slug);
      if (idx >= 0) S.artIdx = idx; else S.pendingArticleSlug = slug;
    }
  }
  if (entry.page === 'standings' && entry.sub) S.stdDiv = entry.sub;
  if (entry.page === 'leagues' && entry.sub) S.regTab = entry.sub;
  if (entry.page === 'schedule' && entry.sub) {
    if (entry.sub === 'oq') { S.schedMode = 'oq'; S.schedRegion = ''; }
    else if (entry.sub.startsWith('oq-')) {
      const region = OQ_REGIONS.find(r => r.key.toLowerCase() === entry.sub.slice(3));
      S.schedMode = 'oq'; S.schedRegion = region ? region.key : '';
    }
    else if (entry.sub === 'div-1' || entry.sub === 'div-2') S.schedMode = entry.sub.slice(4);
  }
  return entry;
}
// pushState() never fires its own popstate event (unlike setting location.hash,
// which fires hashchange even for programmatic changes) - so there's no "echo" of
// go()'s own navigation to filter out here the way the old hash router needed to.
// Every popstate is a genuine back/forward and should always be processed.
function syncPath(page, sub) {
  document.title = PAGE_TITLES[page] || 'OverDrive - Event Organizer';
  const file = PAGE_FILE_MAP[`${page}|${sub || ''}`] || PAGE_FILE_MAP[`${page}|`] || 'index.html';
  const search = (page === 'article' && sub) ? `?slug=${encodeURIComponent(sub)}` : '';
  const desired = BASE_PATH + file;
  if (location.pathname !== desired || location.search !== search) {
    history.pushState({ page, sub }, '', desired + search);
  }
}
window.addEventListener('popstate', () => {
  closeMobileNav();
  const { page: p } = pageFromPath();
  if (p === S.page) return;
  S.page = p;
  renderInPlace();
  window.scrollTo({ top: 0 });
  document.title = PAGE_TITLES[p] || 'OverDrive - Event Organizer';
});

function render() {
  document.title = PAGE_TITLES[S.page] || 'OverDrive - Event Organizer';
  const hasData = S.sched.length || S.d1.length || S.d2.length || Object.keys(S.teams).length;
  if (!hasData) {
    const warn = '<div style="background:rgba(255,106,0,.1);border:1px solid rgba(255,106,0,.3);padding:16px 20px;margin:0 0 20px;font-size:13px;color:var(--muted)"><strong style="color:var(--acc)">⚠ Data not loaded</strong> – Open console (F12) to see GViz errors.</div>';
    const fn = PAGES[S.page] || pgHome;
    document.getElementById('app').innerHTML = '<div class="pg">' + warn + fn() + '</div>';
  } else {
    renderInPlace();
  }
}

// ─── CONTROLS ──────────────────────────────────────────────────────────────
function setHomeUpDiv(d) { S.homeUpDiv = d; renderInPlace(); }
function setHSD(d) { S.homeStDiv = d; renderInPlace(); }
// Tab switches inside a page (division, region) update the URL in place via
// syncPath() rather than the full go() - go() also scrolls to top, which would
// be a jarring jump for what's really just changing a filter, not navigating
// to a new page.
function goStandingsDiv(d) { S.stdDiv = d; S.page = 'standings'; renderInPlace(); syncPath('standings', d); }
function setVodSp(id) { S.vodSp = id; renderInPlace(); }
function setTDiv(d) { S.tdiv = d; renderInPlace(); }
function setReg(r) { S.regTab = r; S.page = 'leagues'; renderInPlace(); syncPath('leagues', r.toLowerCase()); }
async function changeSplit(sp) {
  S.act = sp;
  document.getElementById('app').innerHTML = '<div class="ldg"><div class="sp"></div><span class="ldg-l">Loading…</span></div>';
  await Promise.all([lSched(sp), lStand(sp), lRes(sp)]);
  render();
}

// ─── POLLING ───────────────────────────────────────────────────────────────
async function refresh() {
  _allSchedCache = null; // force a fresh combined-tab fetch this cycle (see loadScheduleAllSplits)
  _wmCache = null; // and re-fetch WEBSITE_MATCHES itself (see loadWebsiteMatches)
  _standingsCache = null; // force a fresh WEBSITE_STANDINGS fetch this cycle (see loadWebsiteStandings)
  await Promise.all([lSched(S.act), lStand(S.act), lRes(S.act), lArt(), lVod(), lRank(), lOver(), loadHomeSplitData(), loadScheduleAllSplits()]);
  render(); poll();
}
function poll() { if (pollT) clearTimeout(pollT); pollT = setTimeout(refresh, (todayMatch()?S.cfg.pm:S.cfg.pd)*1000); }

// Modal logo helpers – avoid nested template literals
function mlogo(team) {
  const letter = (team?.team_name||'?')[0];
  if (!team?.logo_url) return `<div class="mo-lph">${letter}</div>`;
  const safeLetter = letter.replace(/'/g,"\\'");
  return `<div style="position:relative;width:75px;height:75px"><img src="${team.logo_url}" style="width:100%;height:100%;object-fit:contain" onerror="this.parentElement.innerHTML='<div class=&quot;mo-lph&quot;>'+'${safeLetter}'+'</div>'" alt=""></div>`;
}
function mlogoSm(team) {
  const letter = (team?.team_name||'?')[0];
  const ph = `<div style="width:26px;height:26px;flex-shrink:0"></div>`;
  if (!team?.logo_url) return ph;
  return `<div style="position:relative;width:26px;height:26px;flex-shrink:0">${ph}<img src="${team.logo_url}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain" onerror="this.style.display='none'" alt=""></div>`;
}

// ─── MODAL ─────────────────────────────────────────────────────────────────
function openMatchModal(matchId) {
  // S.sched only ever holds the currently active split (loaded via lSched(S.act)),
  // but the Schedule page's own day-by-day list is built from S.schedAllRows -
  // every split combined. A match from an older, no-longer-active split (e.g.
  // browsing Spring 2026 while Fall 2026 is the active split) renders fine there,
  // but was never findable here, so clicking it silently did nothing. S.schedAllRows
  // is checked first since it's the more complete source when it's loaded.
  const fromAll = (S.schedAllRows || []).find(x => matchKey(x) === matchId);
  const fromMain = fromAll || S.sched.find(x => matchKey(x) === matchId);
  const m = fromMain || S.homeSched.find(x => matchKey(x) === matchId);
  if (!m) return;
  // Whichever array the match actually came from: keeps "recent form" consistent with
  // the same split, instead of assuming S.res (which tracks whatever S.act currently is).
  const matchSource = fromAll ? S.schedAllRows : (fromMain ? S.sched : S.homeSched);
  const isDone = m.status === 'DONE';
  const isLive = (m.status||''). toUpperCase() === 'LIVE';

  const sa = m.score_a ?? '', sb2 = m.score_b ?? '';
  const hasScore = (isDone||isLive) && sa!=='' && sb2!=='';
  const scoreHtml = hasScore
    ? `<div class="mo-sc">${sa} <span style="color:var(--muted);font-weight:300">-</span> ${sb2}</div>`
    : `<div class="mo-ti">${m.time_cest||'-:--'}</div>`;

  const logoA = mlogo(m.A);
  const logoB = mlogo(m.B);

  const teamA = S.teams[m.team_a_id];
  const teamB = S.teams[m.team_b_id];
  const playersA = [teamA?.player1, teamA?.player2].filter(Boolean).join(' & ');
  const playersB = [teamB?.player1, teamB?.player2].filter(Boolean).join(' & ');

  // Recent form (last 3 matches for each team)
  // Matches by roster, not by an explicit Team_History predecessor_id link: any
  // other team_id whose two registered players are exactly this team's two
  // players (order doesn't matter) is treated as the same team for "recent form"
  // purposes - covers a rename/rebrand that keeps the same duo (e.g. GrassBoyz
  // formerly Team Heretics) without needing that link set up in the sheet first.
  function teamsWithSamePlayers(teamId) {
    const t = S.teams[teamId];
    const p1 = (t?.player1||'').trim().toLowerCase();
    const p2 = (t?.player2||'').trim().toLowerCase();
    if (!p1 || !p2) return [teamId];
    const mySet = [p1, p2].sort().join('|');
    const matches = Object.values(S.teams)
      .filter(other => {
        const op1 = (other.player1||'').trim().toLowerCase();
        const op2 = (other.player2||'').trim().toLowerCase();
        return op1 && op2 && [op1, op2].sort().join('|') === mySet;
      })
      .map(other => other.team_id);
    return [...new Set([teamId, ...matches])];
  }
  function recentForm(teamId, excludeMatchId) {
    const ids = teamsWithSamePlayers(teamId);
    return matchSource
      .filter(rx => rx.match_id !== excludeMatchId && (ids.includes(rx.team_a_id) || ids.includes(rx.team_b_id)) && rx.score_a != null && rx.score_b != null && rx.score_a !== '' && rx.score_b !== '')
      .slice(-3).reverse()
      .map(rx => {
        const isA = ids.includes(rx.team_a_id);
        const opponent = S.teams[isA ? rx.team_b_id : rx.team_a_id]?.team_name || (isA ? rx.team_b_id : rx.team_a_id);
        const scoreA = rx.score_a ?? '?', scoreB = rx.score_b ?? '?';
        const myScore = isA ? scoreA : scoreB, oppScore = isA ? scoreB : scoreA;
        const won = +myScore > +oppScore;
        const div = rx.division || '';
        return `<div class="mo-result">
  <div><div class="mo-res-meta">${div}</div><div class="mo-res-vs">vs ${opponent}</div></div>
  <div class="mo-res-right">
    <span class="mo-res-score">${myScore} - ${oppScore}</span>
    <span class="mo-res-badge ${won?'win-b':'loss-b'}">${won?'Win':'Loss'}</span>
  </div>
</div>`;
      }).join('') || '<div style="color:var(--dim);font-size:12px;padding:8px 0">No recent matches</div>';
  }

  // Map details
  let detailSection = '';
  if (isDone && m) {
    const maps = [];
    for (let i = 1; i <= 5; i++) {
      const ta = m[`track${i}_a`], tb = m[`track${i}_b`];
      if (ta != null && tb != null && ta !== '') {
        const mapName = m[`track${i}`] || m[`track${i}_name`] || m[`track${i}_map`] || m[`track${i}map`] || m[`map${i}_name`] || m[`map${i}`] || `Track ${i}`;
        maps.push({num:i, name:mapName, scoreA:ta, scoreB:tb});
      }
    }
    if (maps.length) {
      const mapsHtml = maps.map(mp => {
        const aWon = +mp.scoreA > +mp.scoreB;
        const scoreHtml2 = `<span style="color:${aWon?'var(--txt)':'var(--muted)'}">${mp.scoreA}</span> <span style="color:var(--dim)">-</span> <span style="color:${!aWon?'var(--txt)':'var(--muted)'}">${mp.scoreB}</span>`;
        return `<div class="mo-map">
  <div class="mo-map-name">${mp.name}</div>
  <div class="mo-map-score">${scoreHtml2}</div>
</div>`;
      }).join('');
      detailSection = `<div class="mo-section">
<div class="mo-sh">Map details</div>
<div class="mo-maps">${mapsHtml}</div>
</div>`;
    }
  } else if (!isDone) {
    const formHtml = `<div class="mo-section">
<div class="mo-sh">Recent form</div>
<div class="mo-form">
<div class="mo-form-col">
  <div class="mo-form-hd">${mlogoSm(m.A)}<div><div class="mo-form-tname">${m.A?.team_name||'?'}</div><div class="mo-form-sub">Recent results</div></div></div>
  ${recentForm(m.team_a_id, matchId)}
</div>
<div class="mo-form-col">
  <div class="mo-form-hd">${mlogoSm(m.B)}<div><div class="mo-form-tname">${m.B?.team_name||'?'}</div><div class="mo-form-sub">Recent results</div></div></div>
  ${recentForm(m.team_b_id, matchId)}
</div>
</div>
</div>`;
    detailSection = formHtml;
  }

  const splitLabel = (S.splits.find(s => s.split_id === m.split)?.label) || m.split || (S.splits.find(s => s.split_id === S.act)?.label) || S.act || 'OverDrive 2026';
  document.getElementById('modal-content').innerHTML = `
<div class="mo-hd">
  <div class="mo-bc">${matchDivLabelFull(m)||'-'}<span>-</span>${isDone?'Finished':isLive?'Live':'Upcoming'}<span>-</span>${splitLabel}</div>
  <button class="mo-close" onclick="closeModal()">Close</button>
</div>
<div class="mo-main">
  <div class="mo-team">
    ${logoA}
    <div class="mo-tname">${dn(m.A?.team_name||m.team_a_id||'?')}</div>
    ${playersA?`<div class="mo-players">Players - ${playersA}</div>`:''}
  </div>
  <div class="mo-center">
    ${scoreHtml}
  </div>
  <div class="mo-team">
    ${logoB}
    <div class="mo-tname">${dn(m.B?.team_name||m.team_b_id||'?')}</div>
    ${playersB?`<div class="mo-players">Players - ${playersB}</div>`:''}
  </div>
</div>
${detailSection}`;
  document.getElementById('modal-ov').classList.add('open');
  document.body.style.overflow = 'hidden';
}

// Shows every game played within one Open Qualifier bracket (e.g. all "APAC 1"
// rows), with the qualified team called out at the top - the click-through from
// an oq-card.
function openOQModal(regionKey, groupId) {
  const groups = oqGroups(regionKey);
  const group = groups.find(g => g.id === groupId);
  if (!group) return;

  const rows = group.matches.map(m => {
    const teamA = S.teams[m.team_a_id] || S.teams[(m.team_a_id||'').toLowerCase()] || { team_name: dn(m.team_a_id) || '?' };
    const teamB = S.teams[m.team_b_id] || S.teams[(m.team_b_id||'').toLowerCase()] || { team_name: dn(m.team_b_id) || '?' };
    const r = parseMatchResult(m.score_a, m.score_b);
    const aWon = r.hasResult && r.aWon;
    const bWon = r.hasResult && !r.aWon;
    const labelA = r.forfeit ? (r.aWon ? 'W' : 'FF') : m.score_a;
    const labelB = r.forfeit ? (r.aWon ? 'FF' : 'W') : m.score_b;
    const scoreHtml = r.hasResult
      ? `<span style="color:${aWon?'var(--txt)':'var(--muted)'}">${labelA}</span> <span style="color:var(--dim)">-</span> <span style="color:${bWon?'var(--txt)':'var(--muted)'}">${labelB}</span>`
      : `<span style="color:var(--muted)">${m.time_cest||'-:--'}</span>`;
    return `<div class="mo-map oqm-row">
  <div class="mo-map-name" style="color:${aWon?'var(--txt)':'var(--muted)'}">${teamA.team_name}</div>
  <div class="mo-map-score">${scoreHtml}</div>
  <div class="mo-map-name" style="color:${bWon?'var(--txt)':'var(--muted)'}">${teamB.team_name}</div>
</div>`;
  }).join('');

  const winnerLine = group.winnerTeam
    ? `<div class="mo-bc" style="margin-top:8px">Qualified to Continentals: <span style="color:var(--acc)">${group.winnerTeam.team_name}</span></div>`
    : `<div class="mo-bc" style="margin-top:8px">In progress</div>`;

  document.getElementById('modal-content').innerHTML = `
<div class="mo-hd">
  <div class="mo-bc">${group.regionLabel} - Open Qualifier ${group.roundNum}</div>
  <button class="mo-close" onclick="closeModal()">Close</button>
</div>
<div class="mo-section" style="padding-top:20px">
${winnerLine}
<div class="mo-sh" style="margin-top:18px">Matches</div>
<div class="mo-maps">${rows || '<div style="color:var(--dim);font-size:12px;padding:8px 0">No matches recorded yet</div>'}</div>
</div>`;
  document.getElementById('modal-ov').classList.add('open');
  document.body.style.overflow = 'hidden';
}
// Static site, no backend: a real "sends without opening the visitor's mail app"
// submit needs somewhere to POST to, so this goes through Web3Forms (a free
// form-relay service - no account/dashboard needed, just an access key emailed
// to you after entering your address at https://web3forms.com/).
//
// ⚠️ REQUIRED SETUP: replace WEB3FORMS_ACCESS_KEY below with your real key
// before this will actually deliver anything - it's a placeholder right now.
const WEB3FORMS_ACCESS_KEY = 'PASTE_YOUR_WEB3FORMS_ACCESS_KEY_HERE';
async function submitContactForm(e) {
  e.preventDefault();
  const f = e.target;
  const btn = f.querySelector('button[type=submit]');
  const status = f.querySelector('.cf-status');
  status.textContent = '';
  status.className = 'cf-status';
  btn.disabled = true;
  btn.textContent = 'Sending…';
  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: `[OverDrive contact] ${f.subject.value.trim()}`,
        name: f.name.value.trim(),
        email: f.email.value.trim(),
        message: f.message.value.trim(),
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Send failed');
    f.reset();
    status.textContent = "Message sent - thanks, we'll get back to you soon.";
    status.classList.add('ok');
  } catch (err) {
    status.textContent = "Couldn't send your message. Please try again in a moment.";
    status.classList.add('err');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send message';
  }
  return false;
}
function closeModal() {
  document.getElementById('modal-ov').classList.remove('open');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ─── INIT ──────────────────────────────────────────────────────────────────
// ─── NAV DROPDOWNS ─────────────────────────────────────────────────────────
// Driven by JS rather than CSS :hover, which closes the menu the instant the pointer
// leaves the element and makes the submenu hard to reach. Open/close is explicit state
// with a close delay, so imperfect pointer paths still work.
const DD_CLOSE_DELAY = 2000;  // ms the menu stays open after the pointer leaves it
const DD_SUB_DELAY   = 400;   // ms before a nested submenu collapses
const DD_OPEN_DELAY  = 60;    // ms before opening, avoids flicker when passing over

function initNavDropdowns() {
  document.querySelectorAll('.nav-item').forEach(item => {
    const dd = item.querySelector('.dd');
    if (!dd) return;                       // plain nav links have no dropdown
    let closeTimer = null, openTimer = null;

    const closeAll = () => {
      item.classList.remove('open');
      item.querySelectorAll('.ddi-sub.open').forEach(s => s.classList.remove('open'));
    };
    const open = () => {
      clearTimeout(closeTimer); clearTimeout(openTimer);
      document.querySelectorAll('.nav-item.open').forEach(o => {
        if (o !== item) { o.classList.remove('open'); o.querySelectorAll('.ddi-sub.open').forEach(s => s.classList.remove('open')); }
      });
      item.classList.add('open');
    };
    const scheduleOpen = () => { clearTimeout(closeTimer); clearTimeout(openTimer); openTimer = setTimeout(open, DD_OPEN_DELAY); };

    item.addEventListener('mouseenter', scheduleOpen);

    // "Inside" is decided by geometry rather than element boundaries: a hidden .dd
    // has pointer-events:none and can never receive mouseenter. Tracking coordinates
    // also covers the gap between the button and the panel.
    const PAD = 14;
    const within = (r, x, y) => x >= r.left-PAD && x <= r.right+PAD && y >= r.top-PAD && y <= r.bottom+PAD;
    document.addEventListener('mousemove', e => {
      const overItem = within(item.getBoundingClientRect(), e.clientX, e.clientY);
      const isOpen = item.classList.contains('open');
      // Only checked once the panel is actually open (and thus actually visible):
      // .dd keeps a measurable box even while hidden (needed so a closed menu can
      // still be reopened by moving onto that box's own trigger), but that hidden
      // box's geometry isn't guaranteed to be small or anywhere near the nav - on
      // a long page it can end up overlapping content far down the screen, opening
      // the menu just from moving the mouse near, say, a button on the Schedule
      // page. Gating on isOpen keeps the coordinate check meaningful only while
      // there's a real, visible panel for the mouse to be "inside" of.
      const overDD = isOpen && within(dd.getBoundingClientRect(), e.clientX, e.clientY);
      let overSub = false;
      item.querySelectorAll('.ddi-sub').forEach(sub => {
        const sm = sub.querySelector('.dd-sub');
        if (sub.classList.contains('open') && sm && within(sm.getBoundingClientRect(), e.clientX, e.clientY)) overSub = true;
      });

      if (overItem || overDD || overSub) {
        if (!item.classList.contains('open')) scheduleOpen();
        else if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
      } else if (item.classList.contains('open')) {
        if (!closeTimer) closeTimer = setTimeout(() => { closeAll(); closeTimer = null; }, DD_CLOSE_DELAY);
      }

      // Nested submenus follow the same geometric rule, but also stay open as long
      // as the mouse is anywhere in the outer Leagues panel - not just tightly
      // within their own row+panel - since crossing toward Teams/Overpoints below
      // it (still clearly "inside the Leagues dropdown") was enough to start the
      // close countdown and made the submenu feel like it retracted immediately.
      if (item.classList.contains('open')) {
        item.querySelectorAll('.ddi-sub').forEach(sub => {
          const sm = sub.querySelector('.dd-sub');
          if (!sm) return;
          // Measured against the row, not the container: an open container includes
          // its expanded panel, whose box would overlap the row of the next submenu
          // down and keep the wrong one open.
          const rowEl = sub.querySelector('.ddi-sub-row') || sub;
          const overRow = within(rowEl.getBoundingClientRect(), e.clientX, e.clientY);
          const overPanel = sub.classList.contains('open') && within(sm.getBoundingClientRect(), e.clientX, e.clientY);
          const overParentDD = within(dd.getBoundingClientRect(), e.clientX, e.clientY);
          if (overRow || overPanel || overParentDD) { clearTimeout(sub._t); sub._t = null; sub.classList.add('open'); }
          else if (sub.classList.contains('open') && !sub._t) {
            sub._t = setTimeout(() => { sub.classList.remove('open'); sub._t = null; }, DD_SUB_DELAY);
          }
        });
      }
    });

    // Clicking a destination should dismiss the menu straight away. Delegated from
    // the nav item so it survives re-renders, and using capture so it still fires
    // for submenu entries that call stopPropagation.
    item.addEventListener('click', () => {
      clearTimeout(closeTimer); clearTimeout(openTimer); closeAll();
    }, true);
    const label = item.querySelector('.nlk');
    if (label) label.addEventListener('focus', open);
  });

  // Close everything on outside click or Escape.
  document.addEventListener('click', e => {
    if (!e.target.closest('.nav-item')) {
      document.querySelectorAll('.nav-item.open,.ddi-sub.open').forEach(o => o.classList.remove('open'));
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.nav-item.open,.ddi-sub.open').forEach(o => o.classList.remove('open'));
  });
}
initNavDropdowns();

async function init() {
  // Direct/shared links (e.g. /schedule or /article/some-slug) should open straight
  // on that page. S.art isn't loaded yet at this point, so an article route whose
  // slug can't be resolved immediately is stashed on S.pendingArticleSlug and
  // resolved below, right after lArt() finishes.
  S.page = pageFromPath().page;
  // Detect file:// protocol – GViz fetch() is blocked by browser security
  if (location.protocol === 'file:') {
    document.getElementById('app').innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:24px;padding:40px;text-align:center">
        <div style="font-size:48px">⚠️</div>
        <div style="font-family:'Area Extended',sans-serif;font-size:28px;color:#FF6A00">Local server required</div>
        <div style="color:#aaa;max-width:520px;line-height:1.7;font-size:15px">
          The browser blocks requests to Google Sheets from a local file (<code style="color:#FF6A00">file://</code>).<br><br>
          Start a local server in the file's folder:
        </div>
        <div style="background:#111;border:1px solid #333;padding:16px 28px;font-family:monospace;font-size:16px;color:#4ade80;letter-spacing:.5px">
          python3 -m http.server 8080
        </div>
        <div style="color:#aaa;font-size:14px">
          Then open: <a href="http://localhost:8080/overdrive.html" style="color:#FF6A00">http://localhost:8080/overdrive.html</a>
        </div>
      </div>`;
    return;
  }
  document.getElementById('app').innerHTML = '<div class="ldg"><div class="sp"></div><span class="ldg-l">Loading…</span></div>';

  // Safety timeout – render anyway after 8s
  const safetyTimer = setTimeout(() => {
    console.warn('Timeout: rendering with available data');
    render(); poll();
  }, 8000);

  try {
    await lActiveSplitFromMatches();
    await lSplits();
    await lTeams();
    await lTeamHistory();
    await Promise.all([lSched(S.act), lStand(S.act), lRes(S.act), lArt(), lVod(), lRank(), lOver(), loadHomeSplitData(), loadScheduleAllSplits()]);
    // Now that S.art is loaded, resolve a pending /article/<slug> route from the
    // initial URL that couldn't be matched before the articles existed.
    if (S.pendingArticleSlug) {
      const idx = S.art.findIndex(a => a.slug === S.pendingArticleSlug);
      if (idx >= 0) S.artIdx = idx;
      S.pendingArticleSlug = null;
    }
  } catch(e) {
    console.error('Init error:', e);
  } finally {
    clearTimeout(safetyTimer);
    render(); poll();
  }
}
init();

// ─── YOUTUBE PLAYER ────────────────────────────────────────────────────────
var _ytPlayer = null, _ytMuted = true, _ytReady = false;

function initYTPlayer() {
  const el = document.getElementById('yt-player');
  if (!el) return;
  if (!window.YT || !window.YT.Player) {
    // API not loaded yet – load it
    if (!document.getElementById('yt-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
    // onYouTubeIframeAPIReady will call initYTPlayer again
    return;
  }
  _ytPlayer = new YT.Player('yt-player', {
    events: {
      onReady: function(e) {
        _ytReady = true;
        e.target.mute();
        e.target.playVideo();
      }
    }
  });
}

window.onYouTubeIframeAPIReady = function() { initYTPlayer(); };

window.ytToggleSound = function() {
  if (!_ytReady || !_ytPlayer) return;
  if (_ytMuted) {
    _ytPlayer.unMute();
    _ytPlayer.setVolume(100);
    const btn = document.getElementById('yt-sound');
    if (btn) btn.textContent = '🔊';
  } else {
    _ytPlayer.mute();
    const btn = document.getElementById('yt-sound');
    if (btn) btn.textContent = '🔇';
  }
  _ytMuted = !_ytMuted;
};
