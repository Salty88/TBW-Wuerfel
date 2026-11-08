const test = require('node:test');
const assert = require('node:assert/strict');
require('../data.js');
require('../sync-model.js');

const D = globalThis.TBW;
const S = globalThis.TBWSync;
const initial = D.createInitialState();

test('combines different entries and shares completion while keeping local preferences', () => {
  const base = S.shared(initial);
  let local = D.editEntry(initial, 'tasks', {...initial.collections.tasks.entries[0], title:'Lokal'});
  local.collections.tasks.selected = [];
  let remote = D.editEntry(initial, 'tasks', {...initial.collections.tasks.entries[1], title:'Online'});
  remote = D.setDone(remote, 'tasks', remote.collections.tasks.entries[1].id, true);
  const merged = S.merge(base, S.shared(local), S.shared(remote));
  assert.deepEqual(merged.conflicts, []);
  const result = S.apply(local, merged.value);
  assert.deepEqual(result.collections.tasks.entries.slice(0,2).map(e=>e.title), ['Lokal','Online']);
  assert.equal(result.collections.tasks.done.length, 1);
  assert.deepEqual(result.collections.tasks.selected, []);
});

test('asks which version to keep for a concurrent edit', () => {
  const base = S.shared(initial);
  const entry = initial.collections.tasks.entries[0];
  const edit = title => S.shared(D.editEntry(initial, 'tasks', {...entry,title}));
  const local = edit('Lokal'), remote = edit('Online');
  const {conflicts} = S.merge(base, local, remote);
  assert.equal(conflicts.length, 1);
  assert.equal(S.merge(base, local, remote, {[conflicts[0].key]:'local'}).value.tasks.entries[0].title, 'Lokal');
});

test('preserves newly created exams and shares their completion', () => {
  const base = S.shared(initial);
  let remote = D.editGroup(initial, 'exams', {id:'vwl',name:'VWL'});
  remote = D.editEntry(remote,'exams',{id:'exam',groupId:'vwl',term:'Frühjahr',year:'2024',note:''});
  remote = D.setDone(remote,'exams','exam',true);
  const result = S.apply(initial,S.merge(base,base,S.shared(remote)).value);
  assert.deepEqual(result.collections.exams.done,['exam']);
  assert.deepEqual(result.collections.exams.selected,['vwl']);
});


require('../github-sync.js');

test('reads UTF-8 state and sends a versioned write only to a private GitHub repository', async () => {
  const version = 'a'.repeat(40);
  let privateRepo = true;
  let writes = 0;
  const request = async (url, options) => {
    assert.equal(new URL(url).origin,'https://api.github.com');
    if (url.endsWith('/user')) return Response.json({login:'mitglied'});
    if (url.endsWith('/repos/gruppe/daten')) return Response.json({private:privateRepo,permissions:{push:true,admin:false}});
    if (options.method === 'PUT') {
      writes++;
      const body = JSON.parse(options.body);
      assert.equal(body.sha,version);
      assert.deepEqual(D.importState(Buffer.from(body.content,'base64').toString()),initial);
      return Response.json({}, {status:409});
    }
    return Response.json({type:'file',sha:version,encoding:'base64',content:Buffer.from(D.exportState(initial)).toString('base64')});
  };
  const connection = await globalThis.TBWGitHub.connect('gruppe/daten','github_pat_test',request);
  assert.deepEqual(await connection.read(),{version,value:S.shared(initial),canInitialize:false});
  await assert.rejects(connection.write(null,S.shared(initial)),/Gruppenleitung/);
  await assert.rejects(connection.write(version,S.shared(initial)),/nicht gespeichert/);
  privateRepo = false;
  await assert.rejects(connection.write(version,S.shared(initial)),/privates Repository/);
  assert.equal(writes,1);
});
