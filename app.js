(function () {
  'use strict';
  const D=globalThis.TBW, $=id=>document.getElementById(id), STORE='tbw-wuerfel-v1', LEGACY='aufgaben-wuerfel-erledigt';
  const PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
  const SAYINGS=[
  "Leider Schade, hätte ja schöner sein können",
  "Wenn du das blickst, dann blickst du immer noch nicht den Lagerbestand.",
  "Glückwunsch, du hast gewonnen. Die Aufgabe hat trotzdem keine Lust auf dich.",
  "Tja, so ist das Leben. Und die Aufgabe",
  "Schicksal entschieden, Ausreden gestrichen",
  "Der Würfel lügt nicht, auch wenn du es dir anders gewünscht hättest",
  "Keine Sorge, schlimmer geht's noch",
  "Das war's, mehr Glück hattest du nicht verdient",
  "Willkommen in der Realität, Abteilung Fertigung",
  "Nicht meine Schuld, frag den Würfel",
  "Überraschung. Keine gute",
  "Hättste halt besser gewürfelt.",
  "Es hätte schlimmer kommen können. Ist es aber nicht",
  "Zufall nennt man das. Pech wäre das falsche Wort. Oder doch nicht.",
  "Du wolltest Abwechslung, hier ist sie.",
  "Kein Backup-Plan, nur diese Aufgabe.",
  "Egal wie Scheiße du bist! Die IHK ist schlimmer",
];
  const SYNC_STORE = 'tbw-group-draft-v1';
  const S = globalThis.TBWSync;
  let syncBase = null, syncDate = null, syncUser = null;
  let state, storageBlocked=false, manage=false, current=null, last={tasks:null,exams:null}, rolling=null, pendingImport=null, confirmAction=null;
  const copy=s=>JSON.parse(JSON.stringify(s));
  const c=()=>state.collections[state.mode];
  const isExam=()=>state.mode==='exams';
  const noun=()=>isExam()?'Prüfung':'Aufgabe';
  const groupNoun=()=>isExam()?'Fach':'Themenfeld';
  function el(tag,text,className) { const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node; }
  function button(text,action,className='btn') {const b=el('button',text,className);b.type='button';b.onclick=action;return b;}
  function errorAt(id,error) {$(id).textContent=error.message||String(error);$(id).hidden=false;}
  function notify(text) {$('message').textContent=text;$('message').hidden=false;}
  function storageError(text) {$('storageWarning').textContent=text;$('storageWarning').hidden=false;document.querySelector('.local-badge').textContent='! Nicht dauerhaft gespeichert';}
  function save() {
    if(storageBlocked)return;
    try {
      if (syncBase) {
        localStorage.setItem(SYNC_STORE, JSON.stringify({state, base:syncBase, date:syncDate}));
        $('storageWarning').hidden = true;
        renderSyncStatus();
        return;
      }
      localStorage.setItem(STORE,D.exportState(state));$('storageWarning').hidden=true;document.querySelector('.local-badge').textContent='● Lokal gespeichert';}
    catch {storageError('Deine Änderungen sind nur für diese Sitzung verfügbar: Der Browser konnte sie nicht speichern. Bitte exportiere jetzt eine Sicherung.');}
  }
  function load() {
    try {
      const groupDraft = localStorage.getItem(SYNC_STORE);
      if (groupDraft !== null) {
        const draft = JSON.parse(groupDraft);
        state = D.validateState(draft.state);
        S.apply(state, draft.base);
        syncBase = draft.base;
        syncDate = draft.date;
        return;
      }
      const raw=localStorage.getItem(STORE);
      if(raw!==null) {state=D.importState(raw);return;}
      let legacy=[];const old=localStorage.getItem(LEGACY);
      if(old!==null) {try {legacy=JSON.parse(old);} catch {notify('Der alte Erledigt-Status konnte nicht gelesen werden. Die ursprünglichen Daten bleiben erhalten.');}}
      state=D.createInitialState(legacy);save();
    } catch {
      state=D.createInitialState();storageBlocked=true;
      storageError('Gespeicherte Daten konnten nicht gelesen werden. Sie werden nicht überschrieben. Angezeigt wird ein vorläufiger Ausgangsstand; Änderungen bleiben nur in dieser Sitzung. Importiere eine gültige Sicherung zur Wiederherstellung.');
    }
  }
  function cancelRoll() {if(rolling!==null){clearInterval(rolling);rolling=null;}$('die').classList.remove('rolling');}
  function commit(next,{keepResult=false,replaceStorage=false}={}) {
    D.validateState(next);cancelRoll();state=next;
    if(!keepResult)current=null;
    if(replaceStorage)storageBlocked=false;
    save();render();
  }
  function update(action) {const next=copy(state);action(next.collections[next.mode]);commit(next);}
  function showDialog(id) {if(!$(id).open)$(id).showModal();}
  function closeDialog(id) {$(id).close();}
  function confirm(title,text,action) { $('confirmTitle').textContent=title;$('confirmText').textContent=text;confirmAction=action;showDialog('confirmDialog');$('confirmCancel').focus(); }
  function eyes(n) {[...$('die').children].forEach((p,i)=>p.classList.toggle('on',PIPS[n].includes(i)));}
  function resetResult() {
    $('resultGroup').textContent='';$('resultTitle').textContent='Bereit für die nächste Runde?';
    $('resultHint').textContent=!c().groups.length?`Lege zuerst ein ${groupNoun()} und eine ${noun()} an.`:
      !c().selected.length?'Wähle mindestens ein Themenfeld oder Fach aus.':
      !D.getCandidates(state,state.mode).length?'Keine offenen Einträge verfügbar. Passe die Auswahl an oder schließe Erledigte ein.':'Dein nächster Lernschritt ist nur einen Wurf entfernt.';
    $('markDone').hidden=true;
  }
  function renderGroups() {
    const collection=c(),selected=new Set(collection.selected),done=new Set(collection.done),container=$('groups');container.replaceChildren();
    if(!collection.groups.length)container.append(el('p',isExam()?'Noch keine Fächer. Lege z. B. VWL an.':'Noch keine Themenfelder.','empty'));
    for(const g of collection.groups) {
      const entries=collection.entries.filter(e=>e.groupId===g.id),count=entries.filter(e=>done.has(e.id)).length;
      const label=el('label',undefined,'group-option'),input=el('input');input.type='checkbox';input.checked=selected.has(g.id);
      input.onchange=()=>{const focusId=g.id;update(c=>{c.selected=input.checked?[...c.selected,g.id]:c.selected.filter(id=>id!==g.id);});[...container.querySelectorAll('input')].find(i=>i.dataset.group===focusId)?.focus();};input.dataset.group=g.id;
      const name=el('span',g.name,'group-name'),numbers=el('span',`${count}/${entries.length}`,'group-count');numbers.title='Erledigt / insgesamt';label.append(input,name,numbers);container.append(label);
    }
    $('selectionCount').textContent=`${selected.size} / ${collection.groups.length}`;
  }
  function renderList() {
    const collection=c(),selected=new Set(collection.selected),done=new Set(collection.done);
    const visible=manage?collection.entries:collection.entries.filter(e=>selected.has(e.groupId));
    $('list').replaceChildren();
    for(const entry of visible) {
      const li=el('li',undefined,done.has(entry.id)?'done':''),label=el('label',undefined,'entry-label'),check=el('input');
      check.type='checkbox';check.checked=done.has(entry.id);check.setAttribute('aria-label',`${D.entryLabel(state,state.mode,entry)} erledigt`);
      check.onchange=()=>{const id=entry.id;commit(D.setDone(state,state.mode,id,check.checked),{keepResult:true});$('list').querySelector(`[data-entry="${CSS.escape(id)}"] input`)?.focus();};li.dataset.entry=entry.id;
      const text=el('span',undefined,'entry-copy');text.append(el('span',D.entryLabel(state,state.mode,entry),'entry-title'));
      if(!isExam())text.append(el('span',collection.groups.find(g=>g.id===entry.groupId).name,'entry-meta'));
      label.append(check,text);li.append(label);
      if(manage) {
        const actions=el('div',undefined,'row-actions');const edit=button('Bearbeiten',()=>openEntry(entry));edit.dataset.action='edit';edit.setAttribute('aria-label',`${D.entryLabel(state,state.mode,entry)} bearbeiten`);
        const remove=button('Löschen',()=>confirm(`${noun()} löschen?`,`${D.entryLabel(state,state.mode,entry)} wird mit dem zugehörigen Erledigt-Status entfernt.`,()=>{commit(D.removeEntry(state,state.mode,entry.id));notify('Eintrag gelöscht.');}),'btn danger');
        remove.setAttribute('aria-label',`${D.entryLabel(state,state.mode,entry)} löschen`);actions.append(edit,remove);li.append(actions);
      }
      $('list').append(li);
    }
    if(!visible.length)$('list').append(el('li',manage?`Keine ${isExam()?'Prüfungen':'Aufgaben'} vorhanden. Füge deinen ersten Eintrag hinzu.`:!collection.selected.length?'Keine Themen oder Fächer ausgewählt.':`Keine ${isExam()?'Prüfungen':'Aufgaben'} in deiner Auswahl vorhanden.`,'empty'));
    const n=visible.filter(e=>done.has(e.id)).length;
    $('progress').textContent=`${n} / ${visible.length} erledigt`;$('totalCount').textContent=`${collection.entries.length} insgesamt`;
    $('progressBar').max=visible.length||1;$('progressBar').value=n;
    $('reset').disabled=!collection.done.length;
  }
  function render() {
    $('modeTasks').setAttribute('aria-pressed',String(!isExam()));$('modeExams').setAttribute('aria-pressed',String(isExam()));
    $('selectionTitle').textContent=isExam()?'Deine Prüfungsfächer':'Deine Themenfelder';$('manageGroups').textContent=isExam()?'Fächer verwalten':'Themen verwalten';
    $('stageMode').textContent=isExam()?'DEINE NÄCHSTE PRÜFUNG':'DEINE NÄCHSTE AUFGABE';
    $('listTitle').textContent=isExam()?'Deine Prüfungen':'Deine Aufgaben';$('addEntry').textContent=`+ ${noun()} hinzufügen`;
    $('manageToggle').textContent=manage?'Bearbeitung beenden':'Liste bearbeiten';$('manageToggle').setAttribute('aria-pressed',String(manage));
    $('listHint').textContent=manage?'Alle Einträge – unabhängig von deiner Würfelauswahl.':'Einträge aus deinen ausgewählten Themenfeldern oder Fächern.';
    $('skipDone').checked=c().skipDone;
    const count=D.getCandidates(state,state.mode).length;$('poolCount').textContent=`${count} ${count===1?'Eintrag':'Einträge'} im Würfeltopf`;
    $('roll').disabled=count===0||rolling!==null;$('addEntry').disabled=c().groups.length===0;
    $('selectAll').disabled=!c().groups.length;$('selectNone').disabled=!c().groups.length;
    renderGroups();renderList();
    if(current) {
      const entry=c().entries.find(e=>e.id===current);
      if(entry) {$('resultTitle').textContent=D.entryLabel(state,state.mode,entry);$('resultGroup').textContent=c().groups.find(g=>g.id===entry.groupId).name;$('markDone').hidden=c().done.includes(entry.id);}
      else {current=null;resetResult();}
    } else resetResult();
  }
  function roll() {
    const mode=state.mode,target=D.choose(D.getCandidates(state,mode),last[mode]);if(!target||rolling!==null)return;
    current=null;$('markDone').hidden=true;$('roll').disabled=true;$('die').classList.add('rolling');
    $('resultGroup').textContent='Das Los entscheidet …';$('resultTitle').textContent='';$('resultHint').textContent='';
    const finish=()=>{
      cancelRoll();eyes(1+Math.floor(Math.random()*6));current=target.id;last[mode]=target.id;
      render();$('resultHint').textContent=SAYINGS[Math.floor(Math.random()*SAYINGS.length)];
    };
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return;}
    const start=Date.now();rolling=setInterval(()=>{eyes(1+Math.floor(Math.random()*6));if(Date.now()-start>=1100)finish();},80);
  }
  function resetGroupForm() {$('groupForm').reset();$('groupId').value='';$('groupNameLabel').textContent=isExam()?'Neues Prüfungsfach':'Neues Themenfeld';$('saveGroup').textContent='Hinzufügen';$('cancelGroupEdit').hidden=true;$('groupError').hidden=true;}
  function renderGroupManager() {
    $('groupList').replaceChildren();$('groupsDialogTitle').textContent=isExam()?'Prüfungsfächer verwalten':'Themen verwalten';
    for(const group of c().groups) {
      const li=el('li'),text=el('span',group.name),actions=el('div',undefined,'row-actions');
      const rename=button('Umbenennen',()=>{$('groupId').value=group.id;$('groupName').value=group.name;$('groupNameLabel').textContent=`${groupNoun()} umbenennen`;$('saveGroup').textContent='Speichern';$('cancelGroupEdit').hidden=false;$('groupError').hidden=true;$('groupName').focus();});rename.setAttribute('aria-label',`${group.name} umbenennen`);
      const remove=button('Löschen',()=>confirm(`${groupNoun()} löschen?`,`${group.name} wird entfernt.`,()=>{try{commit(D.removeGroup(state,state.mode,group.id));resetGroupForm();renderGroupManager();}catch(e){errorAt('groupError',e);}}),'btn danger');
      const used=c().entries.some(e=>e.groupId===group.id);remove.disabled=used;remove.title=used?'Enthält noch Einträge. Diese zuerst löschen oder einem anderen Bereich zuordnen.':'Leeren Bereich löschen';remove.setAttribute('aria-label',`${group.name} löschen`);
      actions.append(rename,remove);li.append(text,actions);$('groupList').append(li);
    }
    if(!c().groups.length)$('groupList').append(el('li','Noch keine Fächer vorhanden.','empty'));
  }
  function openEntry(entry=null) {
    const exam=isExam();$('entryForm').reset();$('entryError').hidden=true;$('entryId').value=entry?.id||'';
    $('entryDialogTitle').textContent=`${noun()} ${entry?'bearbeiten':'hinzufügen'}`;$('entryGroupLabel').textContent=groupNoun();
    $('taskFields').hidden=exam;$('examFields').hidden=!exam;$('entryTitle').required=!exam;$('entryTitle').disabled=exam;
    for(const id of ['entryTerm','entryYear','entryNote'])$(id).disabled=!exam;
    $('entryTerm').required=exam;$('entryYear').required=exam;
    $('entryGroup').replaceChildren();for(const g of c().groups){const opt=el('option',g.name);opt.value=g.id;$('entryGroup').append(opt);}
    $('entryGroup').value=entry?.groupId||c().selected[0]||c().groups[0]?.id||'';
    if(entry) {if(exam){$('entryTerm').value=entry.term;$('entryYear').value=entry.year;$('entryNote').value=entry.note;}else $('entryTitle').value=entry.title;}
    previewExam();showDialog('entryDialog');(exam?$('entryTerm'):$('entryTitle')).focus();
  }
  function previewExam() {
    const group=c().groups.find(g=>g.id===$('entryGroup').value);
    $('examPreview').textContent=`Vorschau: ${group?.name||'Fach'} – ${$('entryTerm').value||'Termin'} ${$('entryYear').value||'Jahr'}${$('entryNote').value?' · '+$('entryNote').value:''}`;
  }
  function id() {return 'id-'+crypto.randomUUID();}
  function download(content,filename) {
    const url=URL.createObjectURL(new Blob([content],{type:'application/json'})),a=el('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function exportData() {
    try {const now=new Date();const date=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');download(D.exportState(state),`tbw-wuerfel-${date}.json`);notify('Sicherungsdatei zum Herunterladen erstellt. Bewahre sie an einem sicheren Ort auf.');}
    catch(e){notify(e.message);}
  }
  async function readImport(file) {
    if(!file)return;
    try {
      if(file.size>5*1024*1024)throw Error('Die Datei ist zu groß (maximal 5 MB).');
      const candidate=D.importState(await file.text());pendingImport=candidate;
      const t=candidate.collections.tasks,x=candidate.collections.exams;
      $('importSummary').textContent=`${file.name}: ${t.entries.length} Aufgaben in ${t.groups.length} Themenfeldern und ${x.entries.length} Prüfungen in ${x.groups.length} Fächern. ${t.done.length+x.done.length} Einträge erledigt.`;
      $('importConsent').checked=false;$('confirmImport').disabled=true;$('importError').hidden=true;showDialog('importDialog');
    }catch(e){pendingImport=null;notify(`Import abgelehnt: ${e.message} Dein aktueller Datenbestand bleibt unverändert.`);}
    finally{$('importFile').value='';}
  }
  for(let i=0;i<9;i++)$('die').append(el('div',undefined,'pip'));eyes(5);
  for(const mode of ['tasks','exams'])$(mode==='tasks'?'modeTasks':'modeExams').onclick=()=>{
    if(state.mode===mode)return;const next=copy(state);next.mode=mode;manage=false;commit(next);
  };
  $('selectAll').onclick=()=>update(c=>{c.selected=c.groups.map(g=>g.id);});$('selectNone').onclick=()=>update(c=>{c.selected=[];});
  $('skipDone').onchange=e=>update(c=>{c.skipDone=e.target.checked;});$('roll').onclick=roll;
  $('markDone').onclick=()=>{if(current){commit(D.setDone(state,state.mode,current,true),{keepResult:true});notify('Erledigt! Ein Lernschritt mehr geschafft.');}};
  $('manageToggle').onclick=()=>{manage=!manage;renderList();render();};$('addEntry').onclick=()=>openEntry();
  $('manageGroups').onclick=()=>{resetGroupForm();renderGroupManager();showDialog('groupsDialog');};
  $('cancelGroupEdit').onclick=resetGroupForm;
  $('groupForm').onsubmit=e=>{e.preventDefault();try{commit(D.editGroup(state,state.mode,{id:$('groupId').value||id(),name:$('groupName').value}));resetGroupForm();renderGroupManager();$('groupName').focus();}catch(error){errorAt('groupError',error);}};
  $('entryForm').onsubmit=e=>{
    e.preventDefault();const entry={id:$('entryId').value||id(),groupId:$('entryGroup').value};
    if(isExam())Object.assign(entry,{term:$('entryTerm').value,year:$('entryYear').value,note:$('entryNote').value});else entry.title=$('entryTitle').value;
    try{commit(D.editEntry(state,state.mode,entry));closeDialog('entryDialog');notify(`${noun()} gespeichert.`);}catch(error){errorAt('entryError',error);}
  };
  for(const field of ['entryGroup','entryTerm','entryYear','entryNote'])$(field).addEventListener('input',previewExam);
  $('reset').onclick=()=>confirm('Fortschritt zurücksetzen?',`Alle ${isExam()?'Prüfungen':'Übungsaufgaben'} dieses Modus werden wieder offen markiert – auch außerhalb der aktuellen Auswahl.${syncBase?' Nach der Synchronisation gilt das für die ganze Lerngruppe.':''} Inhalte bleiben erhalten.`,()=>{update(c=>{c.done=[];});notify('Fortschritt dieses Modus zurückgesetzt.');});
  $('confirmCancel').onclick=()=>closeDialog('confirmDialog');$('confirmOk').onclick=()=>{const action=confirmAction;confirmAction=null;closeDialog('confirmDialog');action?.();};
  $('export').onclick=exportData;$('backupBeforeImport').onclick=exportData;$('import').onclick=()=>$('importFile').click();$('importFile').onchange=e=>readImport(e.target.files[0]);
  $('importConsent').onchange=()=>$('confirmImport').disabled=!$('importConsent').checked;
  $('confirmImport').onclick=()=>{if(!pendingImport||!$('importConsent').checked)return;try{last={tasks:null,exams:null};manage=false;commit(pendingImport,{replaceStorage:true});pendingImport=null;closeDialog('importDialog');notify('Sicherung übernommen. Inhalte, Auswahl und Lernfortschritt wurden wiederhergestellt.');}catch(error){errorAt('importError',error);}};
  // A queued close event from an earlier dialog must not discard a newly opened import.
  $('importDialog').addEventListener('close',()=>{if(!$('importDialog').open)pendingImport=null;});
  for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>closeDialog(b.dataset.close);
  window.addEventListener('beforeunload',()=>cancelRoll());
  function renderSyncStatus() {
    if (!syncBase) return;
    const dirty = !S.equal(S.shared(state), syncBase);
    document.querySelector('.local-badge').textContent = dirty ? 'Änderungen warten auf Sync' : 'Gruppenstand geladen';
    if (syncUser) {
      const date = syncDate ? new Date(syncDate).toLocaleString('de-DE') : 'noch nie';
      $('syncStatus').textContent = `${syncUser} · Zuletzt synchronisiert: ${date}${dirty?' · Änderungen warten auf Sync.':''}`;
    }
  }

  async function groupRequest(options) {
    const response = await fetch('/api/group', options);
    if (response.headers.get('X-TBW-Group-Sync') !== '1') return null;
    const data = await response.json();
    return {response, data};
  }

  function showSyncAccount(user, error) {
    syncUser = user;
    $('groupSync').hidden = false;
    $('syncLogin').hidden = Boolean(user);
    $('syncLogout').hidden = !user;
    $('syncNow').hidden = !user;
    $('syncStatus').textContent = error || (user ? `Angemeldet als ${user}.` : 'Melde dich mit GitHub an, um den Gruppenstand zu laden.');
    renderSyncStatus();
  }

  function syncPrompt(message, options, versions = []) {
    $('syncDetail').textContent = message;
    $('syncVersions').replaceChildren(...versions.map(text=>el('p',text)));
    return new Promise(resolve => {
      $('syncActions').replaceChildren(...options.map(([label,value]) => button(label, () => {
        $('syncActions').replaceChildren();
        $('syncVersions').replaceChildren();
        resolve(value);
      })));
      $('syncActions').querySelector('button')?.focus();
    });
  }

  function describeVersion(version) {
    if (!version) return 'Gelöscht';
    const text = version.name || version.title || [version.term, version.year, version.note].filter(Boolean).join(' · ');
    const status = Object.hasOwn(version,'done') ? (version.done ? ' · erledigt' : ' · offen') : '';
    return text + status + (version.groupId ? ' · Zuordnung: ' + version.groupId : '');
  }

  async function synchronize() {
    if ($('syncDialog').open) return;
    $('syncDetail').textContent = 'Gruppenstand wird geladen …';
    showDialog('syncDialog');
    try {
      const result = await groupRequest();
      if (!result?.response.ok) throw new Error(result?.data.error || 'Synchronisation nicht erreichbar.');
      const {version, value:remote, canInitialize} = result.data;
      const local = S.shared(state);
      let next = remote;
      if (!remote) {
        if (!canInitialize) throw new Error('Die Gruppenleitung muss zuerst einen Gruppenstand anlegen.');
        const confirmed = await syncPrompt('Diesen Lernstand als gemeinsamen Ausgangspunkt speichern?', [
          ['Abbrechen',false], ['Gruppenstand anlegen',true]
        ]);
        if (!confirmed) return;
        next = local;
      } else {
        let base = syncBase;
        if (!base && !S.equal(local,S.shared(D.createInitialState())) && !S.equal(local,remote)) {
          const choice = await syncPrompt('Auf diesem Gerät gibt es einen eigenen Lernstand. Möchtest du ihn mit dem Gruppenstand zusammenführen?', [
            ['Abbrechen',null], ['Gruppenstand laden','remote'], ['Zusammenführen','merge']
          ]);
          if (!choice) return;
          if (choice === 'merge') base = S.shared(D.createInitialState());
        }
        if (base) {
          const choices = Object.create(null);
          for (const conflict of S.merge(base,local,remote).conflicts) {
            const choice = await syncPrompt('Dieser Eintrag wurde auf beiden Seiten geändert. Welche Fassung soll die Gruppe übernehmen?', [
              ['Abbrechen',null], ['Online-Fassung','remote'], ['Meine Fassung','local']
            ], ['Online: '+describeVersion(conflict.remote), 'Auf diesem Gerät: '+describeVersion(conflict.local)]);
            if (!choice) return;
            choices[conflict.key] = choice;
          }
          next = S.merge(base,local,remote,choices).value;
        }
      }
      let updated;
      try { updated = S.apply(state,next); }
      catch (error) { throw new Error(`Die Änderungen passen nicht zusammen. Prüfe doppelte Namen und die Zuordnung zu Themen oder Fächern. ${error.message}`); }
      if (!S.equal(next,remote)) {
        $('syncDetail').textContent = 'Gruppenstand wird gespeichert …';
        const saved = await groupRequest({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version,value:next})});
        if (!saved?.response.ok) throw new Error(saved?.data.error || 'Speichern fehlgeschlagen.');
      }
      syncBase = next;
      syncDate = new Date().toISOString();
      commit(updated,{replaceStorage:true});
      notify('Gruppenstand synchronisiert.');
    } catch (error) {
      await syncPrompt(error.message,[['Schließen',null]]);
    } finally {
      closeDialog('syncDialog');
    }
  }

  $('syncDialog').addEventListener('cancel',event=>event.preventDefault());
  $('syncNow').onclick = synchronize;
  $('syncLogout').onclick = async () => {
    try {
      const response = await fetch('/auth/logout',{method:'POST'});
      if (!response.ok) throw new Error();
      showSyncAccount(null);
    } catch {notify('Abmelden fehlgeschlagen.');}
  };
  load();render();renderSyncStatus();
  if (location.protocol !== 'file:') {
    groupRequest().then(result => {
      if (!result) return;
      showSyncAccount(result.response.ok ? result.data.user : null,result.data.error);
    }).catch(()=>{});
  }
})();
