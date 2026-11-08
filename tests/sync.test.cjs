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

const {Readable} = require('node:stream');
const {createServer} = require('../server.cjs');

function call(server, method, url, headers = {}, data) {
  return new Promise(resolve => {
    const req = Object.assign(Readable.from(data ? [Buffer.from(JSON.stringify(data))] : []), {method,url,headers});
    const response = {headers:{}, setHeader(key,value){this.headers[key]=value;},
      appendHeader(key,value){(this.headers[key] ||= []).push(value);},
      writeHead(status, extra){this.status=status;Object.assign(this.headers,extra);this.headersSent=true;},
      end(body){resolve({status:this.status,headers:this.headers,body});}};
    server.emit('request',req,response);
  });
}

test('authenticates sessions, rejects cross-origin writes and protects versions', async () => {
  const origin = 'https://example.test';
  const version = 'a'.repeat(40);
  let visibility = true, writes = 0;
  const server = createServer({TBW_ORIGIN:origin, TBW_GITHUB_CLIENT_ID:'id',
    TBW_GITHUB_CLIENT_SECRET:'secret', TBW_DATA_REPO:'owner/data', TBW_INITIALIZER:'owner'},
  async (url, options) => {
    const json = Response.json;
    if (url.endsWith('/access_token')) return json({access_token:'mock'});
    if (url.endsWith('/user')) return json({login:'owner'});
    if (url.endsWith('/repos/owner/data')) return json({private:visibility,permissions:{push:true}});
    if (options.method === 'PUT') {
      writes++;
      assert.equal(JSON.parse(options.body).sha, version);
      return json({content:{sha:'b'.repeat(40)}});
    }
    return json({sha:version, encoding:'base64', content:Buffer.from(D.exportState(initial)).toString('base64')});
  });
  try {
    assert.equal((await call(server,'GET','/api/group')).status,401);
    const login = await call(server,'GET','/auth/login');
    const nonce = new URL(login.headers.Location).searchParams.get('state');
    const loginCookie = login.headers['Set-Cookie'][0].split(';')[0];
    const session = await call(server,'GET','/auth/callback?code=x&state='+nonce,{cookie:loginCookie});
    assert.equal(session.status,303);
    const cookie = session.headers['Set-Cookie'].find(value=>value.startsWith('tbw_session=')).split(';')[0];
    assert.equal(JSON.parse((await call(server,'GET','/api/group',{cookie})).body).version,version);
    assert.equal((await call(server,'POST','/api/group',{cookie,origin:'https://foreign.test'})).status,403);
    assert.equal((await call(server,'POST','/api/group',{cookie,origin},{version:'c'.repeat(40),value:S.shared(initial)})).status,409);
    assert.equal(writes,0);
    assert.equal((await call(server,'POST','/api/group',{cookie,origin},{version,value:S.shared(initial)})).status,200);
    assert.equal(writes,1);
    visibility = false;
    assert.equal((await call(server,'GET','/api/group',{cookie})).status,403);
  } finally {
    server.emit('close');
  }
});
