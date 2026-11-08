(function () {
  'use strict';
  const modes = ['tasks', 'exams'];
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  function shared(state) {
    return Object.fromEntries(modes.map(mode => {
      const {groups, entries, done} = state.collections[mode];
      return [mode, {groups, entries, done: [...done].sort()}];
    }));
  }

  function apply(local, value) {
    const next = structuredClone(local);
    for (const mode of modes) {
      const previous = next.collections[mode];
      const known = new Set(previous.groups.map(group => group.id));
      const selected = new Set(previous.selected);
      const {groups, entries, done} = value[mode];
      next.collections[mode] = {
        groups, entries, done, skipDone: previous.skipDone,
        selected: groups.filter(group => selected.has(group.id) || !known.has(group.id)).map(group => group.id)
      };
    }
    return globalThis.TBW.validateState(next);
  }

  function merge(base, local, remote, choices = {}) {
    const conflicts = [];
    function records(key, original, mine, theirs) {
      const maps = [original, mine, theirs].map(items => new Map(items.map(item => [item.id, item])));
      const ids = new Set([...maps[2].keys(), ...maps[1].keys()]);
      return [...ids].flatMap(id => {
        const [before, left, right] = maps.map(map => map.get(id));
        let chosen = right;
        if (equal(right, before)) chosen = left;
        else if (!equal(left, before) && !equal(left, right)) {
          const idKey = key + '/' + id;
          if (choices[idKey] === 'local') chosen = left;
          else if (choices[idKey] !== 'remote') conflicts.push({key: idKey, local: left, remote: right});
        }
        return chosen === undefined ? [] : [chosen];
      });
    }

    const value = {};
    for (const mode of modes) {
      const [original, mine, theirs] = [base, local, remote].map(state => state[mode]);
      const groups = records(mode + '/groups', original.groups, mine.groups, theirs.groups);
      const entries = records(mode + '/entries', ...[original, mine, theirs].map(collection => {
        const done = new Set(collection.done);
        return collection.entries.map(entry => ({...entry, done: done.has(entry.id)}));
      }));
      value[mode] = {
        groups,
        entries: entries.map(({done, ...entry}) => entry),
        done: entries.filter(entry => entry.done).map(entry => entry.id).sort()
      };
    }
    return {value, conflicts};
  }

  globalThis.TBWSync = {shared, apply, merge, equal};
})();
