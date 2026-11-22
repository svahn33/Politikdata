'use strict';

/* Politikdata: descriptive facts, editorially sourced issue summaries and optional vote feed.
   No party recommendation, score, political targeting or user tracking. */
const store = { parties: [], issues: [], elections: {}, parliament: {} };
const state = {
  route: 'oversikt', routeArg: '', selected: ['C','KD'], comparison: 'issues',
  compareTopic: 'new-nuclear', topicSearch: '', topicCategory: 'Alla',
  voteSearch: '', voteParty: 'Alla', voteSession: 'Alla', voteDecision: 'Alla', voteLimit: 40,
  historyMetric: 'share', profile: 'C', landingSearch: ''
};
const MAIN = document.querySelector('#main');
const NAV = ['oversikt','jamfor','sakfragor','riksdagen','historik','partier','metodik'];
const fmt = n => new Intl.NumberFormat('sv-SE', {maximumFractionDigits:2, minimumFractionDigits: 0}).format(n);
const pct = n => new Intl.NumberFormat('sv-SE', {minimumFractionDigits:2, maximumFractionDigits:2}).format(n)+' %';
const diff = n => (n>0?'+':'') + new Intl.NumberFormat('sv-SE', {minimumFractionDigits:2, maximumFractionDigits:2}).format(n);
const esc = v => String(v??'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const ext = u => {try{const x=new URL(u); return x.protocol==='https:' ? esc(x.href):'#';}catch{return '#';}};
const partyById = id => store.parties.find(p=>p.id===id);
const topicById = id => store.issues.find(t=>t.id===id);
const dot = p => `<span class="color-dot" style="background:${esc(p.color)}" aria-hidden="true"></span>`;
const partyBadge = p => `<span class="party-badge" data-id="${esc(p.id)}" style="--party-color:${esc(p.color)}">${esc(p.id)}</span>`;
const updatedInfo = () => `<div class="data-line"><span>Källa: <a class="linkish" href="${ext(store.elections.source['2026'])}" target="_blank" rel="noopener noreferrer">Valmyndigheten, slutligt riksdagsval 2026 ↗</a></span><span>Uppgifter granskade: ${esc(store.partiesMeta?.updated||'2026-11-22')}</span></div>`;
const issueCoverage = t => Object.keys(t.positions||{}).length;
const selectedParties = () => store.parties.filter(p=>state.selected.includes(p.id));
const arrow = '↗';
const routeLink = (id, label) => `<a href="#${esc(id)}" class="clever-link">${label} <span aria-hidden="true">→</span></a>`;
const srcLinks = (sources=[]) => sources.map(s=>`<a href="${ext(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label || s.publisher || 'Primärkälla')} ${arrow}</a>`).join('');
const note = (content,subtle=false) => `<div class="note-row${subtle?' subtle-note':''}"><span class="note-icon" aria-hidden="true">ⓘ</span><div>${content}</div></div>`;
const pageIntro = (eyebrow,title,description) => `<div class="page-head"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>`;
const deltaClass = n=>n>0?'pos':n<0?'neg':'zero';
function routeTo(path) { location.hash=path; }
function syncNav(){document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===state.route));}

async function loadData(){
  const paths=['parties.json','issues.json','elections.json','riksdag.json'];
  const results=await Promise.all(paths.map(async p=>{
    const response=await fetch('./data/'+p+'?v=1', {cache:'no-cache'});
    if(!response.ok) throw new Error(`${p}: HTTP ${response.status}`);
    return response.json();
  }));
  store.parties=results[0].parties;
  store.partiesMeta=results[0];
  store.issues=results[1].issues;
  store.issuesMeta=results[1];
  store.elections=results[2];
  store.parliament=results[3];
  document.querySelector('#footer-date').textContent=`Valstatistik kontrollerad ${results[2].updated}.`;
}
function headerState(){
  const bits=(location.hash.replace(/^#/,'')||'oversikt').split('/');
  state.route=NAV.includes(bits[0])?bits[0]:'oversikt';
  state.routeArg=bits.slice(1).join('/');
  if(state.route==='partier' && partyById(state.routeArg)) state.profile=state.routeArg;
  if(state.route==='sakfragor' && topicById(state.routeArg)) state.compareTopic=state.routeArg;
  if(state.route==='jamfor' && topicById(state.routeArg)) {state.compareTopic=state.routeArg;state.comparison='issues';}
  if(state.route==='jamfor' && state.routeArg==='val') state.comparison='election';
  syncNav();
}
function render(){
  headerState();
  const views={oversikt:renderOverview,jamfor:renderCompare,sakfragor:renderTopics,riksdagen:renderParliament,historik:renderHistory,partier:renderParties,metodik:renderMethod};
  MAIN.innerHTML=views[state.route]();
  document.title=({oversikt:'Översikt',jamfor:'Jämför partier',sakfragor:'Sakfrågor',riksdagen:'Riksdagen',historik:'Historik',partier:'Partier',metodik:'Källor och metodik'}[state.route]||'Översikt')+' – Politikdata';
  MAIN.querySelectorAll('a[target="_blank"]').forEach(a=>{a.rel='noopener noreferrer';});
}
function renderOverview(){
  const counts=store.parties.length;
  const sources=store.issues.reduce((a,t)=>a+issueCoverage(t),0);
  const width=n=>Math.min(100,n/35*100);
  const top=`<section class="hero">
    <div><div class="eyebrow">Svensk politik · Oberoende faktaunderlag</div><h1>Förstå politiken.<br><span style="color:#56799f">Granska källan.</span></h1>
    <p>Jämför vad partierna säger, utforska valresultat och följ riksdagens arbete. Samma frågor för alla partier – med dokumenterade källor och öppna redovisningsprinciper.</p>
    <div class="hero-actions"><a href="#jamfor" class="btn primary">Jämför partier <span aria-hidden="true">→</span></a><a href="#sakfragor" class="btn">Utforska sakfrågor <span aria-hidden="true">↗</span></a></div>
    <p class="footnote">Ett första publicerbart projekt. Kartlagda ståndpunkter visas endast när en primärkälla finns.</p></div>
    <div class="hero-side"><div class="hero-board"><div class="hero-board-top"><strong>Riksdagsvalet 2026</strong><span class="pill green">Slutligt resultat</span></div>
       <div class="bars">${store.parties.map(p=>`<div class="mini-bar-row"><span>${esc(p.id)}</span><div class="mini-bar-track"><div class="mini-bar-fill" style="width:${width(p.elections['2026'].share)}%;background:${esc(p.color)}"></div></div><span style="text-align:right">${pct(p.elections['2026'].share)}</span></div>`).join('')}</div>
       <div class="data-line" style="margin-top:12px"><span>Partier i bokstavsordning</span><span>Källa: Valmyndigheten</span></div></div></div>
  </section>`;
  const cards=`<div class="stats-row"><div class="stat-card"><div class="label">Mandat i riksdagen</div><div class="value">349</div><div class="label">Totalt antal platser</div></div>
    <div class="stat-card"><div class="label">Partier med mandat</div><div class="value">${counts}</div><div class="label">Riksdagsvalet 2026</div></div>
    <div class="stat-card"><div class="label">Valdeltagande</div><div class="value">84,9<span style="font-size:17px"> %</span></div><div class="label">Riksdagsvalet 2026</div></div>
    <div class="stat-card"><div class="label">Källbelagda ståndpunkter</div><div class="value">${sources}</div><div class="label">I den första redaktionella databasen</div></div></div>`;
  const tiles=[['⚖','Jämför partier','Välj partier och sakfrågor. Se fakta och källor sida vid sida.','jamfor'],['▤','Sakfrågor','Gå från en bred politikfråga till konkreta ståndpunkter.','sakfragor'],['▦','Riksdagen','Följ dokument och voteringar från officiella register.','riksdagen'],['↗','Historik','Jämför valresultat och öppna partiprogramarkiv.','historik'],['◉','Partier','Utforska samma fakta och mätpunkter per parti.','partier'],['◇','Källor & metodik','Se vilka uppgifter som ingår och varifrån de kommer.','metodik']];
  return `<div class="page-wrap">${top}${cards}<section><div class="section-title"><div><div class="eyebrow" style="margin-bottom:6px">Utforska plattformen</div><h2>En samlad bild av politiken</h2><p>Fakta, dokument och statistik – separerade från tolkningar.</p></div>${routeLink('metodik','Så arbetar vi')}</div>
    <div class="tiles">${tiles.map(([icon,title,desc,to])=>`<a class="tile panel" href="#${to}"><span class="tile-symbol" aria-hidden="true">${icon}</span><span class="tile-arrow" aria-hidden="true">↗</span><span class="tile-title">${title}</span><span class="tile-desc">${desc}</span></a>`).join('')}</div></section>
    <section class="section-space"><div class="section-title"><div><div class="eyebrow" style="margin-bottom:6px">Verifierad exempelanalys</div><h2>Ny kärnkraft i Sverige</h2><p>Åtta partiers egna formuleringar, sammanfattade med direkta källor.</p></div>${routeLink('sakfragor/new-nuclear','Visa sakfrågan')}</div>
       <div class="panel panel-pad"><div style="display:flex;flex-wrap:wrap;gap:9px;margin-bottom:17px">${store.parties.map(p=>`${partyBadge(p)}`).join('')}</div><p class="small muted">Partiernas olika utgångspunkter visas som källbelagda beskrivningar, inte som ett ja/nej-betyg. Se vilken källa varje beskrivning grundas på.</p><div class="hero-actions"><a class="btn primary small-btn" href="#jamfor/new-nuclear">Öppna jämförelse →</a><a class="btn small-btn" href="#sakfragor/new-nuclear">Läs om sakfrågan ↗</a></div></div>
    </section>${updatedInfo()}</div>`;
}
function partyPicker(){
 return `<div class="filter-title">Välj partier <span class="muted micro" style="font-weight:500">(2–4 samtidigt)</span></div>
  <div class="party-picker">${store.parties.map(p=>`<button type="button" class="party-chip ${state.selected.includes(p.id)?'active':''}" data-action="toggle-party" data-value="${p.id}" aria-pressed="${state.selected.includes(p.id)}">${dot(p)} ${esc(p.name)} ${state.selected.includes(p.id)?'✓':''}</button>`).join('')}</div>`;
}
function issueCardPosition(p,t){
  const entry=t.positions[p.id];
  const content=entry ? `<span class="pill green">Källbelagd ståndpunkt</span><p class="stance">${esc(entry.summary)}</p><div class="source-block"><div class="caps" style="margin-bottom:6px">Primärkälla</div>${srcLinks(entry.sources)}<div class="footnote">Källan kontrollerad: ${esc(entry.reviewed_on)}<br>Partiets egen beskrivning; ingen bedömning av dess effekter.</div></div>`:
    `<span class="pill orange">Ännu inte kartlagd</span><p class="stance muted">Ingen redaktionellt verifierad uppgift är inlagd för den här frågan.</p><div class="source-block footnote">Detta betyder <strong>inte</strong> att partiet saknar en ståndpunkt.</div>`;
  return `<article class="panel compare-card"><div class="compare-card-header">${dot(p)}<h3>${esc(p.name)}</h3></div><div class="compare-body">${content}</div></article>`;
}
function electionCompareCard(p){
  const now=p.elections['2026']; const before=p.elections['2022']; const delta=now.share-before.share;
  return `<article class="panel compare-card"><div class="compare-card-header">${dot(p)}<h3>${esc(p.name)}</h3></div><div class="compare-body" style="gap:15px">
     <div><div class="caps">Andel röster 2026</div><div class="big-number">${pct(now.share)}</div></div>
     <div class="split-figures"><div><div class="figure-label">Mandat 2026</div><h3>${now.seats}</h3></div><div><div class="figure-label">Jämfört med 2022</div><div class="delta ${deltaClass(delta)}">${diff(delta)} p.e.</div></div></div>
     <div class="source-block"><div class="caps">Val 2022</div><p class="small muted">${pct(before.share)} · ${before.seats} mandat</p><a href="${ext(store.elections.source['2026'])}" target="_blank" rel="noopener noreferrer">Valmyndigheten ↗</a></div>
  </div></article>`;
}
function renderCompare(){
  const t=topicById(state.compareTopic)||store.issues[0];
  const selected=selectedParties();
  const col=`cols-${selected.length}`;
  return `<div class="page-wrap">${pageIntro('Jämförelse','Jämför partier','Välj 2–4 partier och jämför samma uppgifter sida vid sida. Politiska ståndpunkter visas bara när de har spårbara primärkällor.')}
    <div class="panel filter-shell">${partyPicker()}</div>
    <div class="segmented" role="group" aria-label="Jämförelsetyp"><button data-action="compare-mode" data-value="issues" class="${state.comparison==='issues'?'active':''}" aria-pressed="${state.comparison==='issues'}">Sakfrågor</button><button data-action="compare-mode" data-value="election" class="${state.comparison==='election'?'active':''}" aria-pressed="${state.comparison==='election'}">Valresultat</button></div>
    ${state.comparison==='issues'?`<div class="panel filter-shell topic-select"><div class="form-grid"><label class="form-group"><span class="form-label">Välj sakfråga</span><select class="select" data-field="compare-topic">${store.issues.map(v=>`<option value="${esc(v.id)}" ${v.id===t.id?'selected':''}>${esc(v.category)} · ${esc(v.title)}</option>`).join('')}</select></label><div class="form-group"><span class="form-label">Källstatus</span><div class="note-row subtle-note" style="padding:11px 12px">${issueCoverage(t)} av ${store.parties.length} partier har en verifierad sammanfattning för frågan.</div></div></div></div>
       <div class="section-title"><div><h2>${esc(t.title)}</h2><p>${esc(t.question)}</p></div><a href="#sakfragor/${esc(t.id)}" class="clever-link">Frågedetaljer →</a></div>
       <div class="compare-grid ${col}">${selected.map(p=>issueCardPosition(p,t)).join('')}</div><div style="margin-top:17px">${note(`<strong>Viktig skillnad:</strong> En sammanfattning av ett partis officiella linje är inte detsamma som ett riksdagsbeslut. Frånvaro av redaktionell information får inte tolkas som avsaknad av en ståndpunkt.`)}</div>`:
       `<div class="section-title"><div><h2>Slutligt riksdagsval 2026</h2><p>Andel giltiga röster, antal mandat och skillnad mot 2022.</p></div><a href="#historik" class="clever-link">Historiska resultat →</a></div><div class="compare-grid ${col}">${selected.map(electionCompareCard).join('')}</div>${updatedInfo()}`}
  </div>`;
}
function renderTopics(){
  const focus=topicById(state.routeArg);
  if(focus){
   return `<div class="page-wrap"><div class="breadcrumb"><a href="#sakfragor">Sakfrågor</a><span>/</span><span>${esc(focus.category)}</span></div>
     ${pageIntro(esc(focus.category),esc(focus.title),esc(focus.question))}
     <div class="panel panel-pad" style="margin-bottom:20px"><span class="pill blue">${issueCoverage(focus)} av ${store.parties.length} källbelagda</span><p class="small muted" style="margin-top:13px">Avgränsning: ${esc(focus.scope)}</p></div>
     <div class="section-title"><div><h2>Partiernas officiella uppgifter</h2><p>Redovisade i bokstavsordning. Ingen poängsättning eller rekommendation.</p></div><a class="btn primary small-btn" href="#jamfor/${esc(focus.id)}">Jämför utvalda partier →</a></div>
     <div class="compare-grid">${store.parties.map(p=>issueCardPosition(p,focus)).join('')}</div><div style="margin-top:18px">${note('<strong>Metod:</strong> Formuleringarna är korta redaktionella sammanfattningar av partiernas egna uppgifter. De beskriver inte nödvändigtvis vad som går att besluta i en enskild votering.')}</div></div>`;
  }
  const categories=['Alla',...new Set(store.issues.map(t=>t.category))];
  const q=state.topicSearch.toLocaleLowerCase('sv-SE').trim();
  const visible=store.issues.filter(t=>(state.topicCategory==='Alla'||state.topicCategory===t.category)&&`${t.title} ${t.question} ${t.category}`.toLocaleLowerCase('sv-SE').includes(q));
  return `<div class="page-wrap">${pageIntro('Sakfrågor','En fråga i taget','Jämför samma konkret formulerade fråga för alla partier. Om uppgifterna inte är verifierade markeras de som ännu inte kartlagda.')}
    <div class="panel filter-shell"><div class="form-grid"><label class="form-group"><span class="form-label">Sök bland sakfrågor</span><div class="search-box"><input class="search-input" data-field="topic-search" value="${esc(state.topicSearch)}" placeholder="T.ex. kärnkraft, skola, skatt" autocomplete="off"></div></label><label class="form-group"><span class="form-label">Politikområde</span><select class="select" data-field="topic-category">${categories.map(c=>`<option ${state.topicCategory===c?'selected':''}>${esc(c)}</option>`).join('')}</select></label></div></div>
    <div class="section-title"><div><h2>${visible.length} sakfrågor</h2><p>${store.issues.filter(t=>issueCoverage(t)===store.parties.length).length} fullt kartlagd${store.issues.filter(t=>issueCoverage(t)===store.parties.length).length===1?'':'a'} · Övriga fylls på efter verifiering.</p></div></div>
    ${visible.length?`<div class="issue-list">${visible.map(t=>`<a class="panel issue-card" href="#sakfragor/${esc(t.id)}"><div><div class="top-line"><span class="pill">${esc(t.category)}</span><span class="micro muted">${issueCoverage(t)} av 8 källbelagda</span></div><h3>${esc(t.title)}</h3><p>${esc(t.question)}</p></div><span class="arrow">↗</span></a>`).join('')}</div>`:`<div class="empty-state"><div class="empty-icon">⌕</div><h3>Inga träffar</h3><p>Prova ett annat sökord eller välj Alla politikområden.</p><button class="btn" data-action="clear-topic-search">Rensa filter</button></div>`}
    <div style="margin-top:20px">${note('<strong>Transparens:</strong> Ett tomt källfält betyder inte att partiet saknar politik i frågan. Sakfrågebiblioteket är en växande, redaktionellt granskad databas.',true)}</div></div>`;
}
function voteDesignation(v){
  return [v.session, v.document].filter(Boolean).join(':');
}
const voteDecisions = {
    committee_approved: 'Kammaren biföll utskottets förslag',
    alternative_approved: 'Kammaren biföll ett motförslag'
};
function voteResult(v){
  const decision = voteDecisions[v.decision] || 'Beslut för den här voteringen saknas';
  const totals = v.totals || {};
  const yes = totals.Ja || 0;
  const no = totals.Nej || 0;
  const yesShare = yes + no ? 100 * yes / (yes + no) : 0;
  return `<div class="vote-result" style="margin:12px 0">
    <p class="semibold">${decision}</p>
    ${v.totals ? `<p class="small muted">Ja ${fmt(yes)} · Nej ${fmt(no)} · Avstod ${fmt(totals.Avstår || 0)} · Frånvarande ${fmt(totals.Frånvarande || 0)}</p>
      ${yes + no ? `<div aria-hidden="true" style="display:flex;height:10px;border-radius:5px;overflow:hidden;margin-top:5px">
        <span style="width:${yesShare}%;background:#267457"></span>
        <span style="flex:1;background:#a4474e"></span>
      </div><p class="micro muted">Stapeln visar fördelningen mellan ja och nej.</p>` : ''}` : ''}
  </div>`;
}
function summarizeVote(v, partyFilter='Alla'){
  const designation=voteDesignation(v);
  const title=esc(v.title || (`Betänkande ${v.document||'utan beteckning'}`));
  const documentUrl=ext(v.document_url);
  const pointTitle=v.point_title ? ` – ${esc(v.point_title)}` : '';
  return `<article class="panel vote-item"><div class="vote-item-top"><span class="pill blue">${esc(designation || 'Riksmöte')}</span><span class="micro muted">${esc(v.date||'Datum ej angivet')}</span></div>
    <h3>${documentUrl==='#' ? title : `<a href="${documentUrl}" class="linkish" target="_blank" rel="noopener noreferrer">${title} <span aria-hidden="true">↗</span></a>`}</h3>
    <p class="micro muted">Förslagspunkt ${esc(v.point||'okänd')}${pointTitle} · Protokollförd omröstning, inte en klassificerad partiståndpunkt.</p>
    ${voteResult(v)}
    ${votePartyTable(v, partyFilter)}
    <div style="margin-top:13px;display:flex;flex-wrap:wrap;gap:8px 18px">
      <a href="#riksdagen/votering/${encodeURIComponent(v.id)}" class="clever-link">Direktlänk till voteringen</a>
      ${v.session && v.document ? `<a href="#riksdagen/betankande/${encodeURIComponent(voteDesignation(v))}" class="clever-link">Voteringar i samma betänkande</a>` : ''}
      <a href="${ext(v.source_url)}" class="clever-link" target="_blank" rel="noopener noreferrer">Öppna officiellt voteringsunderlag ↗</a>
    </div></article>`;
}
function votePartyTable(v, partyFilter){
  const rows=store.parties.filter(p=>(partyFilter==='Alla'||p.id===partyFilter)&&v.party_votes?.[p.id]).map(p=>{
    const counts=v.party_votes[p.id];
    const color=/^#[0-9a-f]{6}$/i.test(p.color) ? p.color : '#64748b';
    return `<tr><th scope="row"><span style="display:inline-grid;place-items:center;width:32px;height:32px;border-radius:50%;background:${color};color:#fff;font-size:11px;letter-spacing:0;text-shadow:0 1px 2px #000">${esc(p.id)}</span></th>${['Ja','Nej','Avstår','Frånvarande'].map(key=>`<td>${fmt(counts[key]||0)}</td>`).join('')}</tr>`;
  }).join('');
  return `<details style="margin-top:12px"><summary class="semibold" style="cursor:pointer">Visa röster per parti</summary>
    <div class="table-scroll"><table class="data-table" aria-label="Röster per parti">
      <thead><tr><th scope="col">Parti</th><th scope="col">Ja</th><th scope="col">Nej</th><th scope="col">Avstod</th><th scope="col">Frånvarande</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div></details>`;
}
function renderVoteRoute(votes){
  const [kind,key]=state.routeArg.split('/');
  const byVote=kind==='votering';
  const matching=votes.filter(v=>encodeURIComponent(byVote ? v.id : voteDesignation(v))===key);
  const heading=byVote ? 'Votering' : 'Voteringar i betänkandet';
  return `<div class="page-wrap"><div class="breadcrumb"><a href="#riksdagen">← Alla voteringar</a></div>
    ${pageIntro('Riksdagen',heading,matching.length ? esc(voteDesignation(matching[0])) : '')}
    <div class="vote-list">${matching.length ? matching.map(v=>summarizeVote(v)).join('') : '<p class="empty-message">Ingen matchande votering finns i Politikdatas arkiv.</p>'}</div></div>`;

}
function renderParliament(){
  const db=store.parliament;
  const votes=db.votes||[];
  if (/^(votering|betankande)\//.test(state.routeArg)) return renderVoteRoute(votes);
  const sessions=['Alla',...new Set(votes.map(v=>v.session).filter(Boolean))];
  const q=state.voteSearch.toLocaleLowerCase('sv-SE').trim();
  const filtered=votes.filter(v=>(state.voteSession==='Alla'||v.session===state.voteSession)&&
    (state.voteParty==='Alla'||v.party_votes?.[state.voteParty])&&
    (state.voteDecision==='Alla'||(v.decision||'unknown')===state.voteDecision)&&
    (`${v.title??''} ${voteDesignation(v)} ${v.point_title??''} ${v.point??''} ${v.date??''}`.toLocaleLowerCase('sv-SE').includes(q)));
  return `<div class="page-wrap">${pageIntro('Riksdagen','Vad hände i riksdagen?','Här skiljer vi på förslag, beslut och enskilda ledamöters röster. När voteringsdata har synkroniserats från Riksdagen visas faktiska röster och länkar till originalunderlaget.')}
    ${note('<strong>Att läsa voteringar:</strong> ”Ja” avser den aktuella förslagspunkten – inte nödvändigtvis ett generellt stöd för politikområdet. Partiernas medlemmar kan också rösta olika. ”Frånvarande” är inte en nej-röst.')}
    <div class="stats-row" style="margin-top:20px;margin-bottom:22px;grid-template-columns:repeat(3,1fr)"><div class="stat-card"><div class="label">Lokalt synkade voteringar</div><div class="value">${fmt(votes.length)}</div><div class="label">Ingår i webbplatsens datafil</div></div><div class="stat-card"><div class="label">Senaste datasynk</div><div class="value" style="font-size:20px;margin:15px 0">${esc(db.updated||'Ej körd')}</div><div class="label">Automatiseras via GitHub Actions</div></div><div class="stat-card"><div class="label">Aktuell datasession</div><div class="value" style="font-size:20px;margin:15px 0">${esc(db.session||'Ej hämtad')}</div><div class="label">Data från Sveriges riksdag</div></div></div>
    ${votes.length?`<div class="panel filter-shell"><div class="vote-filters"><label class="form-group"><span class="form-label">Riksmöte</span><select class="select" data-field="vote-session">${sessions.map(s=>`<option value="${esc(s)}" ${state.voteSession===s?'selected':''}>${esc(s)}</option>`).join('')}</select></label><label class="form-group"><span class="form-label">Parti</span><select class="select" data-field="vote-party"><option>Alla</option>${store.parties.map(p=>`<option ${state.voteParty===p.id?'selected':''}>${p.id}</option>`).join('')}</select></label><label class="form-group"><span class="form-label">Sök bland dokument</span><div class="search-box"><input class="search-input" data-field="vote-search" placeholder="Titel, beteckning, datum …" value="${esc(state.voteSearch)}"></div></label></div>
    <label class="form-group" style="max-width:340px"><span class="form-label">Utfall</span><select class="select" data-field="vote-decision">
      ${Object.entries({Alla:'Alla', ...voteDecisions, unknown:'Beslut saknas'}).map(([value,label])=>`<option value="${value}" ${state.voteDecision===value?'selected':''}>${label}</option>`).join('')}
    </select></label></div><div class="section-title"><div><h2>${filtered.length} matchande voteringar</h2></div></div><div class="vote-list">${filtered.length?filtered.slice(0,state.voteLimit).map(v=>summarizeVote(v,state.voteParty)).join(''):`<div class="empty-message">Inga voteringar matchade filtret.</div>`}</div>${filtered.length>state.voteLimit?'<button class="btn" style="margin-top:14px" data-action="more-votes">Visa fler voteringar</button>':''}`:
     `<div class="empty-state"><div class="empty-icon">▦</div><h3>Voteringsdata inväntas</h3><p>Webbplatsen innehåller ännu ingen importerad votering. Det visas därför inga exempelröster som skulle kunna misstolkas som faktiska beslut. Starta arbetsflödet ”Synka riksdagsdata” i GitHub Actions efter publicering.</p>
     <a class="btn primary" href="https://data.riksdagen.se/voteringlista/" target="_blank" rel="noopener noreferrer">Se verkliga voteringar hos Riksdagen ↗</a></div>`}
    <div style="margin-top:24px" class="panel panel-pad"><h3>Originaldokument och motioner</h3><p class="small muted" style="margin:9px 0 16px">För fullständiga motioner, utskottsbetänkanden och propositioner kan du tills vidare söka direkt i Riksdagens officiella dokumentregister.</p><a class="btn" href="https://www.riksdagen.se/sv/dokument-och-lagar/" target="_blank" rel="noopener noreferrer">Öppna Riksdagens dokument ↗</a></div></div>`;
}
function renderHistory(){
  const metric=state.historyMetric;
  const max=metric==='share'?35:120;
  const unit=metric==='share'?'%':'mandat';
  const get=(p,y)=>metric==='share'?p.elections[y].share:p.elections[y].seats;
  const line=(p)=>`<div class="paired-row"><div style="display:flex;align-items:center;gap:8px">${dot(p)}<strong>${esc(p.name)}</strong></div><div class="paired-tracks"><div class="bar-track"><div class="bar-fill" style="width:${get(p,'2022')/max*100}%;background:#c4ccd6"></div></div><div class="bar-track"><div class="bar-fill" style="width:${get(p,'2026')/max*100}%;background:${esc(p.color)}"></div></div></div><div style="text-align:right;font-size:11px"><div class="muted">${metric==='share'?pct(get(p,'2022')):get(p,'2022')}</div><strong>${metric==='share'?pct(get(p,'2026')):get(p,'2026')}</strong></div></div>`;
  return `<div class="page-wrap">${pageIntro('Historik','Vad har förändrats?','Jämför två verifierade valresultat. Politiska sakståndpunkter kommer att få tidslinjer när historiska dokument har lagts in och kontrollerats.')}
    <div class="section-title"><div><h2>Riksdagsvalen 2022 och 2026</h2><p>Slutliga resultat enligt Valmyndigheten. Partierna listas i bokstavsordning.</p></div></div>
    <div class="segmented" role="group" aria-label="Välj mått"><button data-action="history-metric" data-value="share" class="${metric==='share'?'active':''}" aria-pressed="${metric==='share'}">Röstandel (%)</button><button data-action="history-metric" data-value="seats" class="${metric==='seats'?'active':''}" aria-pressed="${metric==='seats'}">Mandat</button></div>
    <div class="panel history-chart"><div class="chart-legend"><span><span class="legend-dot" style="background:#c4ccd6"></span> 2022</span><span><span class="legend-dot" style="background:#5a89b5"></span> 2026 (respektive partifärg)</span><span>${unit}</span></div>
     ${store.parties.map(line).join('')}${updatedInfo()}</div>
    <div class="section-space"><div class="section-title"><div><h2>Förändring mellan valen</h2><p>Procentenheter avser skillnaden i röstandel, inte relativ procentuell förändring.</p></div></div>
     <div class="panel table-scroll"><table class="data-table"><thead><tr><th>Parti</th><th>2022</th><th>2026</th><th>Skillnad (p.e.)</th><th>Mandat 2022 → 2026</th></tr></thead><tbody>${store.parties.map(p=>{const a=p.elections['2022'],b=p.elections['2026'];const d=b.share-a.share;return `<tr><td>${dot(p)} <strong>${esc(p.name)}</strong></td><td>${pct(a.share)}</td><td>${pct(b.share)}</td><td><span class="delta ${deltaClass(d)}">${diff(d)}</span></td><td>${a.seats} → ${b.seats}</td></tr>`}).join('')}</tbody></table></div></div>
    <div class="section-space"><div class="section-title"><div><h2>Historiska partiprogram</h2><p>Utforska originaldokument från olika tidsperioder.</p></div></div><div class="panel panel-pad"><div class="eyebrow" style="margin-bottom:10px">Forskningsunderlag</div><h3>Svenska partiprogram och valmanifest</h3><p class="small muted" style="margin-top:9px;max-width:800px">Svensk nationell datatjänst samlar svenska partiprogram och valmanifest från 1897 och framåt. Det är en lämplig källa för framtida tidsserier över partiernas formuleringar. Plattformen anger inte att en hållning ändrats utan dokumentstöd från båda tidpunkterna.</p><div class="hero-actions"><a href="https://snd.se/sv/vivill" class="btn primary small-btn" target="_blank" rel="noopener noreferrer">Öppna dokumentarkivet ↗</a><a href="#metodik" class="btn small-btn">Läs om historisk metodik →</a></div></div></div></div>`;
}
// Official party symbols published on the Riksdag's party overview.
const partySymbolIds = {
  C: 'ca407754a11711f1872a4a05b6e98f05',
  KD: '3a6d980ac31d11f1938a0264793f1452',
  L: '30966c26a10d11f1b3fc6e26682a384a',
  MP: 'bbb5f0a6a11711f1872a4a05b6e98f05',
  M: '7eb7ce24a10111f1872a4a05b6e98f05',
  S: '288af204a12611f1872a4a05b6e98f05',
  SD: '2795e324a11511f1a8a64a3727721460',
  V: 'e066a36c7c6111f19721ba57d652d633'
};
function renderParties(){
 const focus=state.routeArg && partyById(state.routeArg);
 if(focus){
  const p=focus; const now=p.elections['2026']; const past=p.elections['2022']; const dp=now.share-past.share;
  const mapped=store.issues.filter(t=>t.positions?.[p.id]);
  return `<div class="page-wrap"><div class="breadcrumb"><a href="#partier">Partier</a><span>/</span><span>${esc(p.name)}</span></div>
    <div class="party-details"><aside class="panel party-sidebar"><div class="party-avatar" style="--party-color:${p.color}">${p.id}</div><h2>${esc(p.name)}</h2><p class="small muted">Riksdagsparti 2026–2030</p>
      <dl><dt>Röstandel 2026</dt><dd>${pct(now.share)}</dd><dt>Mandat 2026</dt><dd>${now.seats}</dd><dt>Röstandel 2022</dt><dd>${pct(past.share)}</dd><dt>Skillnad i röstandel</dt><dd class="delta ${deltaClass(dp)}">${diff(dp)} p.e.</dd></dl>
      <a class="btn small-btn" style="white-space:normal" href="${ext(p.website)}" target="_blank" rel="noopener noreferrer">Officiell webbplats ↗</a><p class="footnote">Valdata: Valmyndighetens slutliga riksdagsresultat.</p></aside>
      <div class="panel party-detail-main"><div class="section-title"><div><h2>Dokumenterad politik</h2><p>Endast frågor där källbelagt underlag har lagts in.</p></div></div>
         ${mapped.length?mapped.map(t=>`<div class="party-issue-row"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><h3>${esc(t.title)}</h3><a class="clever-link" href="#sakfragor/${esc(t.id)}">Alla partier →</a></div><p>${esc(t.positions[p.id].summary)}</p><div class="micro" style="margin-top:7px">${srcLinks(t.positions[p.id].sources)}</div></div>`).join(''):`<div class="empty-message">Inga redaktionellt verifierade ståndpunkter inlagda ännu. Det säger inget om partiets faktiska politik.</div>`}
        <div style="margin-top:19px">${note('Den här sidan återger inte åsikter från andra partier om partiet. Siffror och partiets egna ståndpunkter har olika källor och visas därför separat.',true)}</div>
      </div></div><div class="hero-actions" style="margin-top:21px"><a class="btn primary" href="#jamfor">Jämför partier →</a><a class="btn" href="#partier">Alla partier →</a></div>${updatedInfo()}</div>`;
 }
 return `<div class="page-wrap">${pageIntro('Partier','Sveriges riksdagspartier','De åtta partier som fick mandat vid riksdagsvalet 2026. Varje profilsida använder samma struktur och har länkar till partiets egna källor.')}
   <div class="party-list">${store.parties.map(p=>`
     <a class="panel party-card" href="#partier/${esc(p.id)}"
        style="background:${esc(p.color)};align-items:center;justify-content:center;text-align:center;padding:22px 10px">
       <span style="display:grid;place-items:center;width:76px;height:76px;background:#fff;border-radius:50%;overflow:hidden">
         <img src="https://media.riksdagen.se/images/${partySymbolIds[p.id]}" alt="" width="54" height="54" referrerpolicy="no-referrer" style="object-fit:contain">
       </span>
       <h3 style="color:#fff;overflow-wrap:anywhere">${esc(p.name)}</h3>
     </a>`).join('')}</div></div>`;
}
function renderMethod(){
 const sources=[
   ['Valmyndigheten','Slutliga valresultat, antal mandat och valdeltagande.','https://www.val.se/valresultat-och-statistik/riksdags--region--och-kommunval/valresultat-2026?view=final'],
   ['Sveriges riksdag','Omröstningar, propositioner, motioner och utskottsbetänkanden.','https://www.riksdagen.se/sv/dokument-och-lagar/riksdagens-oppna-data/'],
   ['Svensk nationell datatjänst','Historiska partiprogram och valmanifest.','https://snd.se/sv/vivill'],
   ['SCB','Officiell statistik, inklusive partisympatiundersökningar.','https://www.scb.se/hitta-statistik/statistik-efter-amne/demokrati/partisympatier/partisympatiundersokningen-psu/'],
 ];
 return `<div class="page-wrap">${pageIntro('Transparens','Källor och metodik','På den här sidan redovisas hur underlaget väljs, bearbetas och visas. Metoden ska gå att granska utan att behöva lita på webbplatsens slutsatser.')}
   <div class="method-grid"><div class="panel method-card"><h3>01. Likvärdig behandling</h3><p>Alla åtta riksdagspartier visas i bokstavsordning med samma fält, frågeställningar och källkrav. Varken urval eller design innehåller en rekommendation eller ett kvalitetsbetyg.</p></div>
    <div class="panel method-card"><h3>02. En uppgift kräver en källa</h3><p>Politikbeskrivningar publiceras endast med länk till ett partiprogram, valmanifest eller en officiell partikälla. Varje redaktionellt sammanfattad uppgift får datum för kontroll och källtyp.</p></div>
    <div class="panel method-card"><h3>03. Sägande är inte röstning</h3><p>Ett partiprogram, en motion och ett registrerat röstningsresultat är tre olika saker. Voteringens ”ja” eller ”nej” avser alltid en specifik förslagspunkt, inte partiets hela politik.</p></div>
    <div class="panel method-card"><h3>04. Låt luckor vara synliga</h3><p>Om underlag saknas visas ”ännu inte kartlagd”. Tomma uppgifter räknas aldrig som ett nej eller som att partiet saknar en ståndpunkt. AI-genererade sammanfattningar ska inte publiceras utan källkontroll.</p></div>
    <div class="panel method-card"><h3>05. Tydligt tidsperspektiv</h3><p>Slutliga valresultat visas för valåren 2022 och 2026. Ett partis politik kan förändras, därför visas källkontrolldatum och äldre dokument ska ha tydlig årtalsangivelse.</p></div>
    <div class="panel method-card"><h3>06. Öppen rättelseprincip</h3><p>Fel ska kunna rättas genom att den underliggande uppgiften och dess källa uppdateras. Redaktionsfilerna är separerade från automatiskt importerade voteringsdata och kan versionshanteras i Git.</p></div></div>
   <section class="section-space"><div class="section-title"><div><h2>Officiella datakällor</h2><p>Öppna dokument och registrerade uppgifter i första hand.</p></div></div>
     <div class="source-grid">${sources.map(([name,desc,url])=>`<div class="panel source-card"><h3>${name}</h3><p>${desc}</p><a href="${ext(url)}" class="clever-link" target="_blank" rel="noopener noreferrer">Till datakällan ↗</a></div>`).join('')}</div>
     <div class="panel source-card" style="margin-top:12px"><h3>Partiernas officiella webbplatser</h3><p>För aktuella redaktionella ståndpunkter används i första hand respektive partis egna faktasidor. Varje uppgift har en separat källa direkt på jämförelsesidan.</p><div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:11px">${store.parties.map(p=>`<a class="btn small-btn" href="${ext(p.website)}" target="_blank" rel="noopener noreferrer">${p.id} ↗</a>`).join('')}</div></div>
   </section>
   <section class="section-space"><div class="section-title"><div><h2>Datastatus i denna version</h2><p>Transparens om vad som är färdigt och vad som återstår.</p></div></div>
      <div class="panel panel-pad"><table class="data-table" style="min-width:0"><tbody><tr><td><strong>Slutliga valresultat</strong></td><td><span class="pill green">2022 och 2026 publicerade</span></td></tr>
        <tr><td><strong>Partiprofiler</strong></td><td><span class="pill green">8 av 8</span></td></tr>
        <tr><td><strong>Helt kartlagda sakfrågor</strong></td><td>${store.issues.filter(t=>issueCoverage(t)===8).length} av ${store.issues.length}</td></tr>
        <tr><td><strong>Publicerade källbelagda ståndpunkter</strong></td><td>${store.issues.reduce((s,t)=>s+issueCoverage(t),0)}</td></tr>
        <tr><td><strong>Import av voteringsdata</strong></td><td><span class="pill ${store.parliament.votes?.length?'green':'orange'}">${store.parliament.votes?.length?'Synkade uppgifter finns':'Inväntar första synk'}</span></td></tr></tbody></table></div>
   </section>
   <section class="intro-band"><div><h2>Öppen metod – kontrollerbara uppgifter.</h2><p>Vi visar hellre en tydlig informationslucka än en osäker sammanfattning.</p></div><a class="btn" href="#sakfragor">Se sakfrågorna →</a></section></div>`;
}
function updateInputPreserveFocus(field, value){
 const active=document.activeElement; const key=active?.dataset?.field;
 const start=active?.selectionStart; const end=active?.selectionEnd;
 state[field]=value;render();
 const el=MAIN.querySelector(`[data-field="${key}"]`);
 if(el && key){el.focus();try{if(start!==null&&end!==null)el.setSelectionRange(start,end);}catch{}}
}
function attachHandlers(){
 document.querySelector('#menu-button').addEventListener('click',()=>{
   const nav=document.querySelector('#mobile-nav'); const open=nav.hidden;
   nav.hidden=!open;
   document.querySelector('#menu-button').setAttribute('aria-expanded',String(open));
 });
 document.querySelector('#mobile-nav').addEventListener('click',(ev)=>{
   if(ev.target.closest('a')){document.querySelector('#mobile-nav').hidden=true;document.querySelector('#menu-button').setAttribute('aria-expanded','false');}
 });
 document.addEventListener('click',(ev)=>{
   const el=ev.target.closest('[data-action]'); if(!el)return;
   const val=el.dataset.value;
   switch(el.dataset.action){
     case 'toggle-party':{
       if(state.selected.includes(val)){
         if(state.selected.length<=2)return;
         state.selected=state.selected.filter(v=>v!==val);
       }else {if(state.selected.length>=4)return;state.selected.push(val);}render();break;
     }
     case 'compare-mode':state.comparison=val;location.hash=`#jamfor${val==='election'?'/val':''}`;render();break;
     case 'history-metric':state.historyMetric=val;render();break;
     case 'more-votes':{
       const firstNew=state.voteLimit;
       state.voteLimit+=40;
       render();
       MAIN.querySelectorAll('.vote-item')[firstNew]?.querySelector('a')?.focus();
       break;
     }
     case 'clear-topic-search':state.topicSearch='';state.topicCategory='Alla';render();break;
   }
 });
 document.addEventListener('change',(ev)=>{
   const el=ev.target; if(!el.dataset.field)return;
   switch(el.dataset.field){
     case 'compare-topic':state.compareTopic=el.value;location.hash=`#jamfor/${el.value}`;render();break;
     case 'topic-category':state.topicCategory=el.value;render();break;
     case 'vote-session':state.voteSession=el.value;state.voteLimit=40;render();break;
     case 'vote-party':state.voteParty=el.value;state.voteLimit=40;render();break;
     case 'vote-decision':state.voteDecision=el.value;state.voteLimit=40;render();break;
   }
 });
 document.addEventListener('input',(ev)=>{
   const el=ev.target;
   if(el.dataset.field==='topic-search')updateInputPreserveFocus('topicSearch',el.value);
   if(el.dataset.field==='vote-search'){state.voteLimit=40;updateInputPreserveFocus('voteSearch',el.value);}
 });
 window.addEventListener('hashchange',()=>{render();window.scrollTo({top:0,behavior:'instant'});});
}
async function start(){
 attachHandlers();
 try {await loadData(); render();}
 catch(error){
  console.error('Kunde inte läsa projektets datafiler',error);
  MAIN.innerHTML=`<div class="page-wrap"><div class="empty-state"><div class="empty-icon">!</div><h2>Datafilerna kunde inte läsas</h2><p>Öppna webbplatsen via en webbserver i stället för genom att dubbelklicka på index.html. Kör <code>python3 -m http.server 8000</code> i projektmappen och gå till <code>http://localhost:8000</code>. Kontrollera att mappen <code>data</code> finns med.</p></div></div>`;
 }
}
start();
