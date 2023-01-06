export function downSample<EntryT>(entries: EntryT[], max: number): EntryT[] {
  const step = Math.ceil(entries.length / max);
  const result = [];
  for (let i = 0; i < entries.length; i += step) {
    result.push(entries[i]);
  }
  return result;
}
