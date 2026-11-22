import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CONTENT} from "../content.mjs";
import {moveMomentFavorite,cleanMomentPrefs,toggleMomentFavorite} from "../moment-filter.mjs";
import {createState,addOrbs,converge,validateState} from "../game.mjs";
import {encode,decode,KEYS} from "../save.mjs";
import {CONFIG} from "../balance-config.mjs";

const ids=CONTENT.moment.map(x=>x.id);
let passed=0;
function test(name,fn){fn();passed++;console.log("✓",name);}
test("U-42 moves only selected favorite one position without mutating source",()=>{
 const base=ids.slice(0,4),original=[...base];
 const move=moveMomentFavorite(base,base[2],-1,ids);
 assert.equal(move.changed,true);
 assert.deepEqual(move.favorites,[base[0],base[2],base[1],base[3]]);
 assert.deepEqual(base,original);
 assert.deepEqual(moveMomentFavorite(move.favorites,base[2],1,ids).favorites,base);
});
test("reordering rejects invalid direction, boundary and non-favorite IDs",()=>{
 const base=ids.slice(0,5);
 for(const [id,direction,error] of [[base[0],-1,"boundary"],[base[4],1,"boundary"],
   [ids[10],1,"not-favorite"],["unknown",-1,"not-favorite"],[base[1],0,"direction"],[base[1],2,"direction"]]){
   const result=moveMomentFavorite(base,id,direction,ids);
   assert.equal(result.changed,false);
   assert.equal(result.error,error);
   assert.deepEqual(result.favorites,base);
 }
});
test("five-entry cap, deduplication and order remain stable",()=>{
 const raw=[ids[3],ids[1],ids[0],ids[1],ids[2],ids[4],ids[5]];
 const clean=cleanMomentPrefs({momentFavorites:raw},ids).momentFavorites;
 assert.deepEqual(clean,[ids[3],ids[1],ids[0],ids[2],ids[4]]);
 assert.deepEqual(moveMomentFavorite(clean,ids[3],1,ids).favorites,
   [ids[1],ids[3],ids[0],ids[2],ids[4]]);
 assert.equal(toggleMomentFavorite(clean,ids[5],ids).error,"limit");
});
test("valid reorder is stored with original v31 keys and survives convergence",()=>{
 const time=1800000000000,s=createState(time,"normal");
 s.intro.complete=true;
 s.settings.momentFavorites=[ids[0],ids[1],ids[2]];
 s.settings.momentFavorites=moveMomentFavorite(s.settings.momentFavorites,ids[2],-1,ids).favorites;
 const desired=[ids[0],ids[2],ids[1]];
 assert.deepEqual(s.settings.momentFavorites,desired);
 assert.equal(CONFIG.schemaVersion,31);
 assert.equal(KEYS.normal,"kotowari_v31_normal");
 const restored=decode(encode(s,"U42-reorder"),"normal");
 assert.deepEqual(restored.settings.momentFavorites,desired);
 addOrbs(restored,"1e20");
 assert.ok(converge(restored).ok);
 assert.deepEqual(restored.settings.momentFavorites,desired);
 assert.deepEqual(validateState(restored,"normal").settings.momentFavorites,desired);
 assert.deepEqual(decode(encode(restored,"U42-after-convergence"),"normal").settings.momentFavorites,desired);
});
test("UI connects arrow buttons and keyboard labels without changing purchase maths",()=>{
 const ui=readFileSync(new URL("../app.mjs",import.meta.url),"utf8");
 const css=readFileSync(new URL("../astral-observatory.css",import.meta.url),"utf8");
 assert.ok(ui.includes('data-moment-move='));
 assert.ok(ui.includes('aria-label="${esc(x.name)}を前に移動"'));
 assert.ok(ui.includes("moveMomentFavorite(state.settings.momentFavorites"));
 assert.ok(ui.includes("save();renderPanel(true)"));
 assert.ok(css.includes(".favorite-pin button:focus-visible"));
});
console.log("PASS "+passed+" U-42 stable favorite ordering and v31 persistence");
