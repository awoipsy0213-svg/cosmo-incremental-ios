// Browser-side migration safety: store the original save before changing
// its schema. No other game's key is read or written.
export const LEGACY_BACKUP_GENERATIONS = 3;
export const LEGACY_BACKUP_SUFFIX = '_legacy_backup_';

export function backupBeforeSaveMigration(storage, key, raw, generations=LEGACY_BACKUP_GENERATIONS) {
  if (!storage || typeof storage.getItem!=='function' || typeof storage.setItem!=='function')
    throw new TypeError('A browser-compatible storage API is required');
  if (typeof key!=='string'||!key||typeof raw!=='string'||!raw)
    throw new TypeError('Save key and original data required');
  if(!Number.isInteger(generations)||generations<1||generations>3)
    throw new RangeError('Only one through three backup generations are supported');
  const prefix=key+LEGACY_BACKUP_SUFFIX;
  const existing=[];
  for(let n=1;n<=generations;n++)existing.push(storage.getItem(prefix+n));
  if(existing[0]===raw) return {created:false,latest:prefix+'1',generations};
  // Copy older generations from oldest to newest; the user's original save
  // remains untouched until the entire rotation has succeeded.
  for(let n=generations;n>1;n--) {
    if(existing[n-2]!==null)storage.setItem(prefix+n,existing[n-2]);
  }
  storage.setItem(prefix+'1',raw);
  return {created:true,latest:prefix+'1',generations};
}
export function needsHeroLearningMigration(raw) {
  if(typeof raw!=='string'||!raw)return false;
  try{
    const save=JSON.parse(raw);
    const state=save?.state;
    const hero=state?.heroProgression?.profiles?.['starter-hero'];
    return !hero || !hero.actionSuccessCounts || !state.heroRoster || (state.saveFormatRevision||0)<4;
  }catch{
    return true; // invalid saves must not be overwritten.
  }
}
