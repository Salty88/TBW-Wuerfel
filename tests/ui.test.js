/* Real browser integration tests; only temporary test-page storage is changed. */
globalThis.runUITests = async function (frame, report) {
  const results=[];
  const assert=(value,message)=>{if(!value)throw Error(message);};
  const test=async(name,fn)=>{try{await fn();results.push({name,ok:true});}catch(e){results.push({name,ok:false,error:e.message});}report(results);};
  const doc=()=>frame.contentDocument;
  const click=id=>{const el=doc().getElementById(id);assert(el,'Element fehlt: '+id);el.click();};
  const fill=(id,value)=>{const el=doc().getElementById(id);assert(el,'Feld fehlt: '+id);el.value=value;};
  const submit=id=>doc().getElementById(id).requestSubmit();
  const wait=()=>new Promise(r=>setTimeout(r,50));
  await test('Bestehende Aufgaben werden angezeigt',()=>{assert(doc().getElementById('list')?.textContent.includes('DBR-1'),'DBR-1 fehlt');});
  await test('Ohne Themenauswahl kann nicht gewürfelt werden',()=>{click('selectNone');assert(doc().getElementById('roll').disabled,'Würfeln bleibt möglich');click('selectAll');});
  await test('Aufgabe hinzufügen, erledigen und umbenennen erhält Fortschritt',()=>{
    click('addEntry');fill('entryTitle','TEST-NEU');submit('entryForm');
    let row=[...doc().querySelectorAll('#list li')].find(e=>e.textContent.includes('TEST-NEU'));assert(row,'Neue Aufgabe fehlt');row.querySelector('input').click();
    click('manageToggle');row=[...doc().querySelectorAll('#list li')].find(e=>e.textContent.includes('TEST-NEU'));row.querySelector('[data-action="edit"]').click();fill('entryTitle','TEST-UMBENANNT');submit('entryForm');
    row=[...doc().querySelectorAll('#list li')].find(e=>e.textContent.includes('TEST-UMBENANNT'));assert(row?.querySelector('input').checked,'Fortschritt beim Umbenennen verloren');
  });
  await test('Prüfungsfach und Prüfung lassen sich unabhängig anlegen',()=>{
    click('modeExams');assert(doc().getElementById('list').textContent.includes('Keine'),'Prüfungsbereich startet nicht leer');
    click('manageGroups');fill('groupName','VWL');submit('groupForm');click('closeGroups');
    click('addEntry');fill('entryTerm','Frühjahr');fill('entryYear','2024');submit('entryForm');
    assert(doc().getElementById('list').textContent.includes('VWL – Frühjahr 2024'),'Prüfung fehlt');
  });
  await test('Würfeln liefert eine Prüfung und getrennten Fortschritt',async()=>{
    click('roll');await new Promise(r=>setTimeout(r,1400));assert(doc().getElementById('resultTitle').textContent==='VWL – Frühjahr 2024','Falsches Würfelergebnis');click('markDone');assert(doc().getElementById('roll').disabled,'Erledigte Prüfung weiterhin verfügbar');
    click('modeTasks');assert(doc().getElementById('list').textContent.includes('TEST-UMBENANNT'),'Aufgaben durch Prüfungen ersetzt');
  });
  await test('Freier Text wird sicher angezeigt',()=>{
    click('manageGroups');fill('groupName','<img src=x onerror=alert(1)>');submit('groupForm');
    assert(!doc().getElementById('groupList').querySelector('img'),'HTML wurde ausgeführt');assert(doc().getElementById('groupList').textContent.includes('<img'),'Text fehlt');click('closeGroups');
  });
  await test('Neuladen erhält Änderungen und getrennten Fortschritt',async()=>{
    await new Promise(resolve=>{frame.onload=resolve;frame.contentWindow.location.reload();});await wait();
    assert(doc().getElementById('list').textContent.includes('TEST-UMBENANNT'),'Änderungen nach Neuladen verloren');click('modeExams');assert(doc().getElementById('roll').disabled,'Prüfungsfortschritt nicht gespeichert');
  });
  const loadFile=async (text,name='sicherung.json')=>{
    const w=frame.contentWindow,input=doc().getElementById('importFile'),transfer=new w.DataTransfer();
    transfer.items.add(new w.File([text],name,{type:'application/json'}));input.files=transfer.files;input.dispatchEvent(new w.Event('change'));await wait();
  };
  await test('Ungültiger Import lässt Daten und Fortschritt unverändert',async()=>{
    const before=localStorage.getItem('tbw-wuerfel-v1');await loadFile('{ungueltig');
    assert(doc().getElementById('message').textContent.includes('Import abgelehnt'),'Fehlermeldung fehlt');assert(localStorage.getItem('tbw-wuerfel-v1')===before,'Ungültiger Import veränderte Daten');
  });
  await test('Import erfordert Bestätigung und kann abgebrochen werden',async()=>{
    const before=localStorage.getItem('tbw-wuerfel-v1');await loadFile(TBW.exportState(TBW.createInitialState()));
    assert(doc().getElementById('importDialog').open,'Importvorschau fehlt');assert(doc().getElementById('confirmImport').disabled,'Import ohne Zustimmung möglich');
    doc().querySelector('[data-close="importDialog"]').click();assert(localStorage.getItem('tbw-wuerfel-v1')===before,'Abbrechen veränderte Daten');
  });
  await test('Bestätigter Import stellt sämtliche Inhalte und Fortschritt wieder her',async()=>{
    const saved=localStorage.getItem('tbw-wuerfel-v1');const replacement=TBW.createInitialState(['Plankostenrechnung|PKR-1']);await loadFile(TBW.exportState(replacement));click('importConsent');click('confirmImport');
    assert(!doc().getElementById('importDialog').open,'Importdialog bleibt offen');assert(!doc().getElementById('list').textContent.includes('TEST-UMBENANNT'),'Alte Aufgabe nach Import übrig');
    const imported=JSON.parse(localStorage.getItem('tbw-wuerfel-v1'));assert(imported.collections.tasks.done[0]==='task-PKR-1','Importierter Fortschritt fehlt');assert(imported.collections.exams.groups.length===0,'Prüfungsfächer nicht ersetzt');
    await loadFile(saved);click('importConsent');click('confirmImport');
  });
  await test('Wechsel der Auswahl während des Würfelns bricht den alten Wurf ab',async()=>{
    click('modeTasks');click('roll');click('selectNone');await new Promise(r=>setTimeout(r,1300));
    assert(doc().getElementById('markDone').hidden,'Veraltetes Ergebnis kann erledigt werden');assert(doc().getElementById('roll').disabled,'Würfeln ohne Auswahl möglich');click('selectAll');
  });
  await test('Löschen erfordert Bestätigung und entfernt nur den gewählten Eintrag',()=>{
    click('manageToggle');let row=[...doc().querySelectorAll('#list li')].find(e=>e.textContent.includes('TEST-UMBENANNT'));
    assert(row,'Testaufgabe fehlt');row.querySelector('.danger').click();assert(doc().getElementById('confirmDialog').open,'Löschbestätigung fehlt');click('confirmCancel');
    row=[...doc().querySelectorAll('#list li')].find(e=>e.textContent.includes('TEST-UMBENANNT'));assert(row,'Abbrechen hat gelöscht');row.querySelector('.danger').click();click('confirmOk');
    assert(!doc().getElementById('list').textContent.includes('TEST-UMBENANNT'),'Eintrag nicht gelöscht');assert(doc().getElementById('list').textContent.includes('DBR-1'),'Andere Aufgabe gelöscht');
  });
  await test('Speicherfehler werden sichtbar statt still verschluckt',()=>{
    const proto=frame.contentWindow.Storage.prototype,original=proto.setItem;
    try{proto.setItem=function(){throw new Error('Speicher nicht verfügbar');};click('selectNone');assert(!doc().getElementById('storageWarning').hidden,'Speicherfehler fehlt');assert(doc().getElementById('storageWarning').textContent.includes('exportiere'),'Handlungshinweis fehlt');}
    finally{proto.setItem=original;click('selectAll');}
  });
  await test('Unbekannte Importversion lässt den Browserbestand unverändert',async()=>{
    const before=localStorage.getItem('tbw-wuerfel-v1'),bad=TBW.createInitialState();bad.version=99;await loadFile(JSON.stringify(bad));
    assert(localStorage.getItem('tbw-wuerfel-v1')===before,'Fremde Version hat Daten überschrieben');assert(doc().getElementById('message').textContent.includes('Import abgelehnt'),'Ablehnung fehlt');
  });
  const reload=async()=>{await new Promise(resolve=>{frame.onload=resolve;frame.contentWindow.location.reload();});await wait();};
  await test('Alte Erledigt-Markierungen werden beim ersten Browserstart migriert',async()=>{
    localStorage.removeItem('tbw-wuerfel-v1');localStorage.setItem('aufgaben-wuerfel-erledigt',JSON.stringify(['Deckungsbeitragsrechnung|DBR-1']));await reload();
    const row=[...doc().querySelectorAll('#list li')].find(e=>e.querySelector('.entry-title')?.textContent==='DBR-1');
    assert(row?.querySelector('input').checked,'Alter Fortschritt nicht übernommen');assert(JSON.parse(localStorage.getItem('tbw-wuerfel-v1')).collections.tasks.done[0]==='task-DBR-1','Migration nicht gespeichert');
  });
  await test('Beschädigter Speicher bleibt geschützt und kann per Import wiederhergestellt werden',async()=>{
    localStorage.setItem('tbw-wuerfel-v1','{beschaedigt');await reload();assert(!doc().getElementById('storageWarning').hidden,'Warnung fehlt');click('selectNone');
    assert(localStorage.getItem('tbw-wuerfel-v1')==='{beschaedigt','Beschädigte Daten still überschrieben');
    await loadFile(TBW.exportState(TBW.createInitialState()));click('importConsent');click('confirmImport');
    assert(doc().getElementById('storageWarning').hidden,'Speicherwarnung bleibt nach Wiederherstellung');assert(JSON.parse(localStorage.getItem('tbw-wuerfel-v1')).collections.tasks.entries.length===70,'Wiederherstellung fehlt');
  });
  return results;
};
