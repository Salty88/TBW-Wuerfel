/* Pure data model; deliberately usable without a server or module loader. */
(function () {
  'use strict';
  const MODES = ['tasks', 'exams'];
  const MAX_BYTES = 5 * 1024 * 1024;
  function byteLength(value) {
    let size=0;
    for(const char of value) {const point=char.codePointAt(0);size+=point>0xffff?4:point>0x7ff?3:point>0x7f?2:1;}
    return size;
  }
  const DEFAULTS = [
    ['Deckungsbeitragsrechnung','DBR',10], ['Plankostenrechnung','PKR',10],
    ['Gemeinkostenzuschlagsrechnung','GKZ',6], ['Maschinenstundensatzrechnung','MSZ',10],
    ['Bilanzansatz','BilAn',3], ['Lagerbestandsrechnung','MBLBR',7], ['Bedarfsrechnung','BR',3],
    ['Kapazitätswirtschaft','KW',3], ['Außenfinanzierung','AF',5],
    ['Kostenvergleichsrechnung','KVR',5], ['Dynamische Investitionsrechnung','DIR',8]
  ];
  const fail = message => { throw new Error(message); };
  const clone = value => JSON.parse(JSON.stringify(value));
  const normalized = value => value.trim().toLocaleLowerCase('de');
  function object(value, fields, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label}: Objekt erwartet.`);
    if (Object.keys(value).length !== fields.length || fields.some(f => !Object.hasOwn(value,f))) fail(`${label}: Felder fehlen oder sind unbekannt.`);
  }
  function text(value, label, max = 250, optional = false) {
    if (typeof value !== 'string' || value.length > max || (!optional && !value.trim())) fail(`${label}: gültigen Text mit höchstens ${max} Zeichen eingeben.`);
  }
  function array(value, label, max = 10000) {
    if (!Array.isArray(value) || value.length > max) fail(`${label}: Liste mit höchstens ${max} Einträgen erwartet.`);
  }
  function validateState(s) {
    object(s,['format','version','mode','collections'],'Sicherung');
    if (s.format !== 'tbw-wuerfel' || s.version !== 1) fail('Unbekanntes Dateiformat oder nicht unterstützte Version.');
    if (!MODES.includes(s.mode)) fail('Ungültiger Würfelmodus.');
    object(s.collections, MODES, 'Bereiche');
    const ids = new Set();
    const id = value => { text(value,'ID',120); if (ids.has(value)) fail('Doppelte ID in der Sicherung.'); ids.add(value); };
    for (const mode of MODES) {
      const c = s.collections[mode];
      object(c,['groups','entries','selected','done','skipDone'],mode);
      for (const field of ['groups','entries','selected','done']) array(c[field],field);
      if (typeof c.skipDone !== 'boolean') fail('Ungültige Einstellung für erledigte Einträge.');
      const groupIds = new Set(), entryIds = new Set(), groupNames = new Set(), entryNames = new Set();
      for (const g of c.groups) {
        object(g,['id','name'],'Fach/Thema'); id(g.id); text(g.name,'Fach/Thema');
        const name = normalized(g.name); if (groupNames.has(name)) fail('Dieses Fach/Thema gibt es bereits.');
        groupNames.add(name); groupIds.add(g.id);
      }
      for (const e of c.entries) {
        object(e,mode === 'tasks' ? ['id','groupId','title'] : ['id','groupId','term','year','note'],'Eintrag');
        id(e.id); if (!groupIds.has(e.groupId)) fail('Ein Eintrag verweist auf ein unbekanntes Fach/Thema.');
        if (mode === 'tasks') text(e.title,'Aufgabenbezeichnung');
        else {
          text(e.term,'Prüfungstermin',80); text(e.note,'Zusatz',500,true);
          if (typeof e.year !== 'string' || !/^[1-9][0-9]{3}$/.test(e.year)) fail('Das Prüfungsjahr muss vierstellig sein (1000–9999).');
        }
        const name = JSON.stringify(mode === 'tasks' ? [e.groupId,normalized(e.title)] : [e.groupId,normalized(e.term),e.year,normalized(e.note)]);
        if (entryNames.has(name)) fail('Diesen Eintrag gibt es in diesem Fach/Thema bereits.');
        entryNames.add(name); entryIds.add(e.id);
      }
      for (const [field,allowed] of [['selected',groupIds],['done',entryIds]]) {
        const seen = new Set();
        for (const ref of c[field]) {
          if (!allowed.has(ref) || seen.has(ref)) fail(`Ungültige oder doppelte Referenz: ${field}.`);
          seen.add(ref);
        }
      }
    }
    // Bound the canonical export, not just the input file. Every accepted state
    // must also remain reloadable and restorable after JSON formatting.
    const canonical=JSON.stringify(s,null,2);
    if(canonical.length>MAX_BYTES || byteLength(canonical)>MAX_BYTES) fail('Der Datenbestand ist zu groß für eine wiederherstellbare Sicherung (maximal 5 MB). Bitte weniger Einträge oder kürzere Texte verwenden.');
    return s;
  }
  function createInitialState(legacyDone = []) {
    const empty = () => ({groups:[],entries:[],selected:[],done:[],skipDone:true});
    const s = {format:'tbw-wuerfel',version:1,mode:'tasks',collections:{tasks:empty(),exams:empty()}};
    const old = new Set(Array.isArray(legacyDone) ? legacyDone.filter(x=>typeof x==='string') : []);
    const c = s.collections.tasks;
    for (const [name,short,count] of DEFAULTS) {
      const groupId = `topic-${short}`; c.groups.push({id:groupId,name}); c.selected.push(groupId);
      for (let i=1;i<=count;i++) {
        const title=`${short}-${i}`, entryId=`task-${title}`;
        c.entries.push({id:entryId,groupId,title}); if(old.has(`${name}|${title}`)) c.done.push(entryId);
      }
    }
    return validateState(s);
  }
  function collection(s, mode) { if (!MODES.includes(mode)) fail('Ungültiger Modus.'); return s.collections[mode]; }
  function change(s, mode, action) { const next = clone(s); action(collection(next,mode)); return validateState(next); }
  function getCandidates(s, mode) {
    const c=collection(s,mode), selected=new Set(c.selected), done=new Set(c.done);
    return c.entries.filter(e=>selected.has(e.groupId) && (!c.skipDone || !done.has(e.id)));
  }
  function editGroup(s,mode,group) {
    return change(s,mode,c=>{
      const value={id:group.id,name:typeof group.name==='string'?group.name.trim():group.name};
      const index=c.groups.findIndex(g=>g.id===group.id);
      if(index<0) { c.groups.push(value); c.selected.push(value.id); } else c.groups[index]=value;
    });
  }
  function editEntry(s,mode,entry) {
    return change(s,mode,c=>{
      const value=mode==='tasks'?{id:entry.id,groupId:entry.groupId,title:entry.title?.trim()}:
        {id:entry.id,groupId:entry.groupId,term:entry.term?.trim(),year:entry.year,note:entry.note?.trim()};
      const index=c.entries.findIndex(e=>e.id===entry.id);
      if(index<0) c.entries.push(value); else c.entries[index]=value;
    });
  }
  function removeGroup(s,mode,id) {
    return change(s,mode,c=>{
      if(c.entries.some(e=>e.groupId===id)) fail('Dieses Fach/Thema enthält noch Einträge. Diese zuerst löschen oder einem anderen Bereich zuordnen.');
      c.groups=c.groups.filter(g=>g.id!==id);c.selected=c.selected.filter(x=>x!==id);
    });
  }
  function removeEntry(s,mode,id) { return change(s,mode,c=>{c.entries=c.entries.filter(e=>e.id!==id);c.done=c.done.filter(x=>x!==id);}); }
  function setDone(s,mode,id,done) { return change(s,mode,c=>{c.done=c.done.filter(x=>x!==id);if(done)c.done.push(id);}); }
  function entryLabel(s,mode,e) {
    if(mode==='tasks') return e.title;
    const group=collection(s,mode).groups.find(g=>g.id===e.groupId);
    return `${group.name} – ${e.term} ${e.year}${e.note?' · '+e.note:''}`;
  }
  function choose(pool,lastId,random=Math.random) {
    if(!pool.length) return null;
    const filtered=pool.length>1?pool.filter(e=>e.id!==lastId):pool;
    return filtered[Math.floor(random()*filtered.length)];
  }
  function exportState(s) { return JSON.stringify(validateState(s),null,2); }
  function importState(json) {
    if(typeof json!=='string' || json.length>MAX_BYTES || byteLength(json)>MAX_BYTES) fail('Die Sicherung ist zu groß (maximal 5 MB).');
    let s; try { s=JSON.parse(json); } catch { fail('Die Datei enthält kein gültiges JSON.'); }
    return validateState(s);
  }
  globalThis.TBW={createInitialState,validateState,getCandidates,editGroup,editEntry,removeGroup,removeEntry,setDone,entryLabel,choose,exportState,importState};
})();
