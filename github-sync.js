(function () {
  'use strict';
  const sha = /^[a-f0-9]{40}$/;
  const filename = '/contents/lernstand.json';

  function encode(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 16384) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
    }
    return btoa(binary);
  }

  async function connect(repo, token, request = fetch) {
    if (!/^[a-z0-9][a-z0-9-]*\/[a-z0-9_.-]+$/i.test(repo) || !/^github_pat_[a-z0-9_]+$/i.test(token)) {
      throw new Error('Gib das Repository im Format Organisation/Name und einen Fine-grained Token ein.');
    }
    const path = '/repos/' + repo;
    async function github(endpoint, options = {}) {
      const response = await request('https://api.github.com' + endpoint, {
        ...options, credentials:'omit', redirect:'error', cache:'no-store',
        signal:AbortSignal.timeout(20000),
        headers:{Accept:'application/vnd.github+json', Authorization:'Bearer ' + token,
          'Content-Type':'application/json', 'X-GitHub-Api-Version':'2022-11-28'}
      });
      if (response.status === 401) throw new Error('Der GitHub-Token ist ungültig oder abgelaufen. Verbinde GitHub erneut.');
      return response;
    }

    async function access() {
      const response = await github(path);
      if (!response.ok) throw new Error('Prüfe den Repository-Namen und die Freigabe deines Tokens.');
      const repository = await response.json();
      if (!repository.private || !repository.permissions?.push) {
        throw new Error('Der Gruppenstand benötigt ein privates Repository mit Schreibzugriff.');
      }
      return repository;
    }

    await access();
    const account = await github('/user');
    if (!account.ok) throw new Error('GitHub konnte dein Konto nicht prüfen.');
    const {login} = await account.json();

    async function read() {
      const repository = await access();
      const response = await github(path + filename);
      const canInitialize = Boolean(repository.permissions.admin);
      if (response.status === 404) return {version:null, value:null, canInitialize};
      if (!response.ok) throw new Error('Der Gruppenstand konnte nicht geladen werden.');
      const file = await response.json();
      if (file.type !== 'file' || !sha.test(file.sha) || file.size > 5 * 1024 * 1024) {
        throw new Error('Der Gruppenstand ist ungültig oder zu groß.');
      }
      let blob = file;
      if (file.encoding !== 'base64') {
        const result = await github(path + '/git/blobs/' + file.sha);
        if (!result.ok) throw new Error('Der Gruppenstand konnte nicht gelesen werden.');
        blob = await result.json();
      }
      const bytes = Uint8Array.from(atob(blob.content), char => char.charCodeAt(0));
      const state = globalThis.TBW.importState(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
      return {version:file.sha, value:globalThis.TBWSync.shared(state), canInitialize};
    }

    async function write(version, value) {
      const repository = await access();
      if (version === null && !repository.permissions.admin) throw new Error('Nur die Gruppenleitung kann den ersten Stand anlegen.');
      if (version !== null && !sha.test(version)) throw new Error('Die Version des Gruppenstands ist ungültig.');
      const state = globalThis.TBWSync.apply(globalThis.TBW.createInitialState(),value);
      const response = await github(path + filename,{method:'PUT',body:JSON.stringify({
        message:'Lernstand der Gruppe synchronisieren', content:encode(globalThis.TBW.exportState(state)),
        ...(version ? {sha:version} : {})
      })});
      if (response.status === 409 || response.status === 422) {
        throw new Error('GitHub hat den Stand nicht gespeichert. Synchronisiere erneut oder prüfe die Regeln des Standardbranches.');
      }
      if (!response.ok) throw new Error('Speichern fehlgeschlagen. Prüfe, ob der Token Schreibzugriff auf Contents hat.');
    }

    return {repo:repo.toLowerCase(), login, read, write};
  }

  globalThis.TBWGitHub = {connect};
})();
