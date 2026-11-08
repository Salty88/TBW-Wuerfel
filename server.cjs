'use strict';
const http = require('node:http');
const {randomBytes, createHash} = require('node:crypto');
const {readFile} = require('node:fs/promises');
const path = require('node:path');
require('./data.js');
require('./sync-model.js');

const staticFiles = {
  '/': ['index.html', 'text/html'],
  '/styles.css': ['styles.css', 'text/css'],
  '/data.js': ['data.js', 'text/javascript'],
  '/app.js': ['app.js', 'text/javascript'],
  '/sync-model.js': ['sync-model.js', 'text/javascript']
};
const maxBytes = 5 * 1024 * 1024;
const random = () => randomBytes(32).toString('base64url');
const fail = (status, message) => Object.assign(new Error(message), {status});

function createServer(env, request = fetch) {
  const {TBW_ORIGIN, TBW_GITHUB_CLIENT_ID: clientId, TBW_GITHUB_CLIENT_SECRET: clientSecret,
    TBW_DATA_REPO: repo, TBW_INITIALIZER: initializer} = env;
  const origin = new URL(TBW_ORIGIN);
  if ((origin.protocol !== 'https:' && !(origin.protocol === 'http:' && origin.hostname === 'localhost'))
      || origin.origin !== TBW_ORIGIN || !clientId || !clientSecret
      || !/^[\w.-]+\/[\w.-]+$/.test(repo ?? '') || !initializer) {
    throw new Error('Bitte die Serverkonfiguration laut README prüfen.');
  }
  const callback = origin.origin + '/auth/callback';
  const sessions = new Map();
  const logins = new Map();
  const cleanup = setInterval(() => {
    for (const store of [sessions, logins]) {
      for (const [key, record] of store) if (record.expires <= Date.now()) store.delete(key);
    }
  }, 60_000).unref();
  const repositoryPath = '/repos/' + repo;
  const statePath = repositoryPath + '/contents/lernstand.json';

  function cookie(res, name, value, seconds) {
    const secure = origin.protocol === 'https:' ? '; Secure' : '';
    res.appendHeader('Set-Cookie', `${name}=${value}; Max-Age=${seconds}; Path=/; HttpOnly; SameSite=Lax${secure}`);
  }

  function reply(res, status, body) {
    res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'});
    res.end(JSON.stringify(body));
  }

  function redirect(res, url) {
    res.writeHead(303, {Location:url});
    res.end();
  }

  function github(session, url, options = {}) {
    return request('https://api.github.com' + url, {
      ...options, redirect:'error', signal:AbortSignal.timeout(15_000),
      headers:{Accept:'application/vnd.github+json', Authorization:'Bearer ' + session.token,
        'X-GitHub-Api-Version':'2022-11-28', 'Content-Type':'application/json'}
    });
  }

  async function readState(session) {
    const result = await github(session, statePath);
    if (result.status === 404) return {version:null, value:null};
    if (!result.ok) throw fail(502,'Der Gruppenstand konnte nicht geladen werden.');
    const file = await result.json();
    if (file.size > maxBytes || !/^[a-f0-9]{40}$/.test(file.sha)) {
      throw fail(422,'Der gespeicherte Gruppenstand ist ungültig oder zu groß.');
    }
    let blob = file;
    if (file.encoding !== 'base64') {
      const response = await github(session, repositoryPath + '/git/blobs/' + file.sha);
      if (!response.ok) throw fail(502,'Der Gruppenstand konnte nicht gelesen werden.');
      blob = await response.json();
    }
    const state = globalThis.TBW.importState(Buffer.from(blob.content,'base64').toString('utf8'));
    return {version:file.sha, value:globalThis.TBWSync.shared(state)};
  }

  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-TBW-Group-Sync','1');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'");
    try {
      const url = new URL(req.url, origin);
      const route = url.pathname;
      const cookies = Object.fromEntries((req.headers.cookie ?? '').split(/;\s*/).map(value => value.split('=')));
      const session = sessions.get(cookies.tbw_session);
      if (req.method === 'GET' && Object.hasOwn(staticFiles, route)) {
        const [file, type] = staticFiles[route];
        const body = await readFile(path.join(__dirname, file));
        res.writeHead(200, {'Content-Type':type + '; charset=utf-8', 'X-TBW-Group-Sync':'1'});
        res.end(body);
        return;
      }
      if (req.method === 'GET' && route === '/auth/login') {
        const nonce = random(), verifier = random();
        logins.set(nonce, {verifier, expires:Date.now()+600_000});
        cookie(res,'tbw_login',nonce,600);
        const params = new URLSearchParams({client_id:clientId, redirect_uri:callback, state:nonce,
          code_challenge:createHash('sha256').update(verifier).digest('base64url'), code_challenge_method:'S256'});
        return redirect(res,'https://github.com/login/oauth/authorize?' + params);
      }
      if (req.method === 'GET' && route === '/auth/callback') {
        const nonce = url.searchParams.get('state');
        const pending = logins.get(nonce), code = url.searchParams.get('code');
        if (!pending || nonce !== cookies.tbw_login || pending.expires <= Date.now() || !code) {
          throw fail(400,'Anmeldung abgelaufen oder abgebrochen. Bitte den Lernwürfel neu öffnen.');
        }
        logins.delete(nonce);
        cookie(res,'tbw_login','',0);
        const exchange = await request('https://github.com/login/oauth/access_token', {
          method:'POST', redirect:'error', signal:AbortSignal.timeout(15_000),
          headers:{Accept:'application/json'},
          body:new URLSearchParams({client_id:clientId, client_secret:clientSecret, code,
            redirect_uri:callback, code_verifier:pending.verifier})
        });
        const credentials = await exchange.json();
        if (!exchange.ok || !credentials.access_token) throw fail(401,'GitHub konnte die Anmeldung nicht bestätigen.');
        const login = {token:credentials.access_token};
        const response = await github(login,'/user');
        if (!response.ok) throw fail(401,'Das GitHub-Konto konnte nicht geprüft werden.');
        login.name = (await response.json()).login;
        const duration = Math.min(credentials.expires_in || 28800,28800);
        login.expires = Date.now() + duration * 1000;
        const key = random();
        sessions.delete(cookies.tbw_session);
        sessions.set(key,login);
        cookie(res,'tbw_session',key,duration);
        return redirect(res,'/');
      }
      if (req.method === 'POST' && req.headers.origin !== origin.origin) throw fail(403,'Ungültige Herkunft.');
      if (req.method === 'POST' && route === '/auth/logout') {
        sessions.delete(cookies.tbw_session);
        cookie(res,'tbw_session','',0);
        return reply(res,200,{});
      }
      if (route !== '/api/group' || !['GET','POST'].includes(req.method)) throw fail(404,'Seite nicht gefunden.');
      if (!session || session.expires <= Date.now()) throw fail(401,'Bitte mit GitHub anmelden.');

      const access = await github(session,repositoryPath);
      if (access.status === 401) throw fail(401,'GitHub-Anmeldung abgelaufen. Bitte erneut anmelden.');
      if (!access.ok) throw fail(403,'Dein GitHub-Konto hat keinen Zugriff auf den Gruppenstand.');
      const repository = await access.json();
      if (!repository.private || !repository.permissions?.push) throw fail(403,'Ein privates Repository mit Schreibzugriff ist erforderlich.');

      if (req.method === 'GET') {
        const current = await readState(session);
        return reply(res,200,{...current, user:session.name, canInitialize:session.name.toLowerCase()===initializer.toLowerCase()});
      }
      const chunks = [];
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > maxBytes + 1024) throw fail(413,'Der Gruppenstand ist zu groß.');
        chunks.push(chunk);
      }
      let payload, state;
      try {
        payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (payload.version !== null && !/^[a-f0-9]{40}$/.test(payload.version)) throw Error();
        state = globalThis.TBWSync.apply(globalThis.TBW.createInitialState(),payload.value);
      } catch {throw fail(422,'Der Gruppenstand konnte nicht validiert werden.');}
      if (payload.version === null && session.name.toLowerCase() !== initializer.toLowerCase()) {
        throw fail(403,'Nur die Gruppenleitung kann den ersten Gruppenstand anlegen.');
      }
      const current = await readState(session);
      if (current.version !== payload.version) throw fail(409,'Der Gruppenstand wurde inzwischen geändert. Bitte erneut synchronisieren.');
      const result = await github(session,statePath,{method:'PUT',body:JSON.stringify({
        message:'Lernstand der Gruppe synchronisieren',
        content:Buffer.from(globalThis.TBW.exportState(state)).toString('base64'),
        ...(payload.version ? {sha:payload.version} : {})
      })});
      if ([409,422].includes(result.status)) throw fail(409,'GitHub konnte den Stand nicht speichern. Bitte erneut synchronisieren.');
      if (!result.ok) throw fail(502,'GitHub konnte den Stand nicht speichern.');
      return reply(res,200,{version:(await result.json()).content.sha});
    } catch (error) {
      if (!res.headersSent) reply(res,error.status || 502,{error:error.status ? error.message : 'Die Verbindung zum Gruppenspeicher ist fehlgeschlagen.'});
      else res.end();
    }
  });
  server.on('close',()=>clearInterval(cleanup));
  return server;
}

if (require.main === module) createServer(process.env).listen(Number(process.env.PORT || 8080),'0.0.0.0');
module.exports = {createServer};
