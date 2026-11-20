/**
 * Verify that the publicly served GitHub Pages files are byte-identical to
 * the checked-out main commit. Do not mistake a successful build for a
 * successful publication: the live CDN must serve the actual source bytes.
 * Executed only AFTER the Pages deployment for this exact SHA has succeeded.
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";

const base=process.env.KOTOWARI_SMOKE_BASE_URL||"https://awoipsy0213-svg.github.io/cosmo-incremental-ios/";
const sha=process.env.GITHUB_SHA||"manual";
const attempts=Math.max(1,Math.min(60,Number(process.env.KOTOWARI_VERIFY_ATTEMPTS)||18));
const waitMs=Math.max(0,Number(process.env.KOTOWARI_VERIFY_DELAY_MS)||10000);
const files=[
  "index.html","sw.js","app.mjs","game.mjs","save.mjs",
  "balance-config.mjs","content.mjs","mobile.css","stage-worlds.css"
];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const digest=data=>createHash("sha256").update(data).digest("hex").slice(0,16);
const root=new URL("../",import.meta.url);

async function verify(name,attempt){
  const expected=readFileSync(new URL(name,root));
  const url=new URL(name,base);
  url.searchParams.set("release",sha);
  url.searchParams.set("attempt",String(attempt));
  try{
    const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(25000),headers:{"Cache-Control":"no-cache"}});
    if(!response.ok)return {name,reason:"HTTP "+response.status};
    const actual=Buffer.from(await response.arrayBuffer());
    if(expected.equals(actual))return null;
    return {name,reason:"SHA256 local="+digest(expected)+" live="+digest(actual)};
  }catch(error){
    return {name,reason:String(error?.message||error)};
  }
}

for(let attempt=1;attempt<=attempts;attempt++){
  const mismatches=(await Promise.all(files.map(name=>verify(name,attempt)))).filter(Boolean);
  if(!mismatches.length){
    console.log("PASS published Pages matches the checked-out main commit",sha);
    console.log("PASS validated files: "+files.join(", "));
    process.exit(0);
  }
  console.log("CDN not synchronized (attempt "+attempt+"/"+attempts+"): "+JSON.stringify(mismatches));
  if(attempt<attempts)await sleep(waitMs);
}
console.error("FAIL published Web does not match the intended main commit "+sha);
process.exit(1);
