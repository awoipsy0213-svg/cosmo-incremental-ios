/*
 * UI-only purchase preview; preserve pricing, modes, gameplay and saved data.
 * The quote counts and costs are taken from the real game-engine purchaseQuote.
 */
import {CONTENT} from "./content.mjs";
import * as G from "./game.mjs";

export function purchasePreview(state,kind,id,mode=state.purchaseMode){
  const quote=G.purchaseQuote(state,kind,id,mode);
  const count=quote.enabled?quote.count:0;
  if(count<1)return {quote,count:0,sourceGain:null,afterEffect:null};
  if(kind==="source"){
    const projected={...state,sources:{...state.sources,[id]:{
      ...state.sources[id],level:state.sources[id].level+count
    }}};
    // Increment for this Source alone; global milestone effects are excluded.
    const sourceGain=G.sourceProduction(projected,id).sub(G.sourceProduction(state,id));
    return {quote,count,sourceGain,afterEffect:null};
  }
  const index=CONTENT.moment.findIndex(item=>item.id===id);
  if(index<0)throw Error("刹那IDが不正です");
  return {quote,count,sourceGain:null,afterEffect:G.momentAfterQuote(state,index,count)};
}
