/* Runs both in Node (tests/run.cjs) and in tests/index.html. */
globalThis.runDataTests = function () {
  const D = globalThis.TBW, results = [];
  const equal = (a, b) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw Error(`Erwartet ${JSON.stringify(b)}, erhalten ${JSON.stringify(a)}`); };
  const throws = fn => { let caught = false; try { fn(); } catch { caught = true; } if (!caught) throw Error('Ungültige Daten wurden akzeptiert'); };
  const test = (name, fn) => { try { fn(); results.push({name, ok:true}); } catch(e) { results.push({name, ok:false, error:e.message}); } };
  const initial = () => D.createInitialState(['Deckungsbeitragsrechnung|DBR-1']);
  const examState = () => {
    let s = D.editGroup(initial(), 'exams', {id:'vwl', name:'VWL'});
    return D.editEntry(s, 'exams', {id:'exam1', groupId:'vwl', term:'Frühjahr', year:'2024', note:''});
  };
  test('Migration erhält alle 70 Aufgaben und den alten Fortschritt', () => {
    const s = initial(); equal(s.collections.tasks.entries.length,70); equal(s.collections.tasks.groups.length,11);
    equal(s.collections.exams.entries,[]); equal(s.collections.tasks.done.length,1);
    equal(D.getCandidates(s,'tasks').some(e=>e.title==='DBR-1'),false);
  });
  test('Migration ignoriert unpassende Altdaten',()=>equal(D.createInitialState({}).collections.tasks.done,[]));
  test('Ohne ausgewählte Themen ist der Würfeltopf leer',()=>{ const s=initial();s.collections.tasks.selected=[];equal(D.getCandidates(s,'tasks'),[]); });
  test('Mehrfachauswahl begrenzt den Würfeltopf auf zwei Themen',()=>{ const s=initial();s.collections.tasks.selected=s.collections.tasks.groups.slice(0,2).map(g=>g.id);equal(D.getCandidates(s,'tasks').length,19); });
  test('Erledigte lassen sich pro Modus wieder einschließen',()=>{const s=initial();s.collections.tasks.skipDone=false;equal(D.getCandidates(s,'tasks').length,70);});
  test('Prüfung trägt Fach, Termin und Jahr in der Anzeige',()=>{const s=examState();equal(D.entryLabel(s,'exams',s.collections.exams.entries[0]),'VWL – Frühjahr 2024');});
  test('Prüfungsfortschritt verändert Aufgaben nicht',()=>{ const s=D.setDone(examState(),'exams','exam1',true);equal(D.getCandidates(s,'exams'),[]);equal(D.getCandidates(s,'tasks').length,69); });
  test('Umbenennen erhält Aufgaben-ID und Fortschritt',()=>{
    const s=initial(), e=s.collections.tasks.entries[0];const next=D.editEntry(s,'tasks',{...e,title:'Neue Bezeichnung'});
    equal(next.collections.tasks.done,s.collections.tasks.done);equal(next.collections.tasks.entries[0].title,'Neue Bezeichnung');equal(s.collections.tasks.entries[0].title,'DBR-1');
  });
  test('Fach umbenennen erhält zugeordnete Prüfungen und Auswahl',()=>{ const s=D.editGroup(examState(),'exams',{id:'vwl',name:'Volkswirtschaft'});equal(D.entryLabel(s,'exams',s.collections.exams.entries[0]),'Volkswirtschaft – Frühjahr 2024');equal(s.collections.exams.selected,['vwl']); });
  test('Neue Aufgaben lassen sich in neue Themen eintragen',()=>{let s=D.editGroup(initial(),'tasks',{id:'new',name:'Neu'});s=D.editEntry(s,'tasks',{id:'new-task',groupId:'new',title:'NEU-1'});equal(D.getCandidates(s,'tasks').some(e=>e.title==='NEU-1'),true);});
  test('Belegte Fächer lassen sich nicht löschen',()=>throws(()=>D.removeGroup(examState(),'exams','vwl')));
  test('Löschen räumt Fortschritt und anschließend leeres Fach auf',()=>{let s=D.setDone(examState(),'exams','exam1',true);s=D.removeEntry(s,'exams','exam1');s=D.removeGroup(s,'exams','vwl');equal(s.collections.exams.done,[]);equal(s.collections.exams.selected,[]);equal(s.collections.exams.groups,[]);});
  test('Doppelte Fächer und Prüfungen werden abgelehnt',()=>{const s=examState();throws(()=>D.editGroup(s,'exams',{id:'other',name:' vwl '}));throws(()=>D.editEntry(s,'exams',{...s.collections.exams.entries[0],id:'exam2'}));});
  test('Export und Import stellen Inhalt, Auswahl und Fortschritt wieder her',()=>{const s=D.setDone(examState(),'exams','exam1',true);s.mode='exams';s.collections.tasks.selected=[];equal(D.importState(D.exportState(s)),s);});
  test('Unbekannte Version oder fremdes Format wird abgelehnt',()=>{for(const field of ['version','format']){const s=initial();s[field]='fremd';throws(()=>D.importState(JSON.stringify(s)));}});
  test('Doppelte IDs und fremde Referenzen im Import werden abgelehnt',()=>{
    const changes=[s=>s.collections.tasks.entries.push({...s.collections.tasks.entries[0]}),s=>s.collections.tasks.entries[0].groupId='unknown',s=>s.collections.tasks.done.push('unknown'),s=>s.collections.tasks.selected.push('unknown')];
    for(const change of changes){const s=initial();change(s);throws(()=>D.importState(JSON.stringify(s)));}
  });
  test('Fehlende, leere und falsch typisierte Pflichtfelder werden abgelehnt',()=>{
    const changes=[s=>delete s.collections,s=>s.collections.tasks.entries[0].title=' ',s=>s.collections.tasks.skipDone='true',s=>s.collections.exams.entries[0].year=2024,s=>s.collections.exams.entries[0].year='24',s=>s.collections.exams.entries[0].term=''];
    for(const change of changes){const s=examState();change(s);throws(()=>D.importState(JSON.stringify(s)));}
  });
  test('Fehlgeschlagene Änderungen verändern die ursprünglichen Daten nicht',()=>{const s=examState(), before=JSON.stringify(s);throws(()=>D.editEntry(s,'exams',{id:'bad',groupId:'unknown',term:'Herbst',year:'2024',note:''}));equal(JSON.stringify(s),before);});
  test('Freier Text wird unverändert gespeichert, ohne als Code ausgewertet zu werden',()=>{const s=D.editGroup(initial(),'exams',{id:'html',name:'<img src=x onerror=alert(1)>'});equal(s.collections.exams.groups[0].name,'<img src=x onerror=alert(1)>');});
  test('Auswahl vermeidet direkte Wiederholung und behandelt leere Mengen',()=>{const pool=[{id:'a'},{id:'b'}];equal(D.choose(pool,'a',()=>0).id,'b');equal(D.choose([],null,()=>0),null);equal(D.choose([pool[0]],'a',()=>0).id,'a');});
  test('Ungültiges JSON wird abgelehnt',()=>throws(()=>D.importState('{broken')));
  test('Jeder akzeptierte größere Datenbestand bleibt exportierbar und importierbar',()=>{
    const s=initial();s.collections.exams.groups=[{id:'vwl',name:'VWL'}];s.collections.exams.selected=['vwl'];
    s.collections.exams.entries=Array.from({length:2000},(_,i)=>({id:'exam'+i,groupId:'vwl',term:'Termin '+i,year:'2024',note:'ä'.repeat(500)}));
    const exported=D.exportState(s);equal(D.importState(exported),s);
  });
  test('Kompakter Import darf die Größenbegrenzung der exportierten Sicherung nicht umgehen',()=>{
    const s=initial();s.collections.exams.groups=[{id:'vwl',name:'VWL'}];s.collections.exams.selected=['vwl'];
    s.collections.exams.entries=Array.from({length:8100},(_,i)=>({id:'exam'+i,groupId:'vwl',term:'Termin '+i,year:'2024',note:'a'.repeat(500)}));
    throws(()=>D.importState(JSON.stringify(s)));throws(()=>D.exportState(s));
  });
  test('Größenbegrenzung berücksichtigt UTF-8-Bytes bei Umlauten',()=>{
    const s=initial();s.collections.exams.groups=[{id:'vwl',name:'VWL'}];s.collections.exams.selected=['vwl'];
    s.collections.exams.entries=Array.from({length:5000},(_,i)=>({id:'exam'+i,groupId:'vwl',term:'Termin '+i,year:'2024',note:'ä'.repeat(500)}));
    throws(()=>D.validateState(s));
  });
  return results;
};
