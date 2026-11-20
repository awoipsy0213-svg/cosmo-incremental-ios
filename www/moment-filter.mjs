// 《理》刹那購入画面の表示補助。
// Do not influence earning, purchasing, price balance, or convergence calculations.
export const MOMENT_GROUP_NAMES=["基礎干渉","連続干渉","確率干渉","自律干渉","源泉共鳴","超越干渉"];
export const MOMENT_FILTERS=["all","affordable","favorites"];
export function cleanMomentPrefs(settings,validIds){
 const ids=new Set(validIds);
 const raw=Array.isArray(settings?.momentFavorites)?settings.momentFavorites:[];
 const favorites=[...new Set(raw.filter(x=>typeof x==="string"&&ids.has(x)))].slice(0,5);
 const group=/^(all|[0-5])$/.test(String(settings?.momentGroup))?String(settings.momentGroup):"0";
 const filter=MOMENT_FILTERS.includes(settings?.momentFilter)?settings.momentFilter:"all";
 return {momentFavorites:favorites,momentGroup:group,momentFilter:filter};
}
export function toggleMomentFavorite(favorites,id,validIds,max=5){
 const clean=cleanMomentPrefs({momentFavorites:favorites},validIds).momentFavorites;
 if(!validIds.includes(id))return {favorites:clean,changed:false,error:"invalid"};
 if(clean.includes(id))return {favorites:clean.filter(x=>x!==id),changed:true};
 if(clean.length>=max)return {favorites:clean,changed:false,error:"limit"};
 return {favorites:[...clean,id],changed:true};
}
export function momentVisible(item,{group="0",filter="all",search="",favorites=[]}={}){
 const key=String(search).trim().toLocaleLowerCase("ja-JP");
 const text=String(item.name||"")+" "+String(item.description||"");
 const words=key.split(/\s+/u).filter(Boolean);
 const haystack=text.toLocaleLowerCase("ja-JP");
 const found=words.every(word=>haystack.includes(word));
 // Searching scans all six groups; clearing search returns to the selected group.
 const inGroup=!!key||group==="all"||String(item.group)===String(group);
 const passed=filter==="favorites"?favorites.includes(item.id):
  filter==="affordable"?!!item.affordable:true;
 return found&&inGroup&&passed;
}

export function moveMomentFavorite(favorites,id,direction,validIds){
 const clean=cleanMomentPrefs({momentFavorites:favorites},validIds).momentFavorites;
 if(![-1,1].includes(direction))return {favorites:clean,changed:false,error:"direction"};
 const index=clean.indexOf(id);
 if(index<0)return {favorites:clean,changed:false,error:"not-favorite"};
 const target=index+direction;
 if(target<0||target>=clean.length)return {favorites:clean,changed:false,error:"boundary"};
 const reordered=[...clean];
 [reordered[index],reordered[target]]=[reordered[target],reordered[index]];
 return {favorites:reordered,changed:true};
}
