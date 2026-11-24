// Check or regenerate the Git-blob fingerprints embedded in the PWA worker.
import {readFileSync,writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
const root=new URL("../",import.meta.url),swURL=new URL("sw.js",root);
const original=readFileSync(swURL,"utf8");
const files=[...original.match(/const CORE_FILES = \[([\s\S]*?)\];/)[1].matchAll(/"([^"]+)"/g)].map(m=>m[1]);
const hash=bytes=>createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
const expected=Object.fromEntries(files.map(path=>[path,hash(readFileSync(new URL(path,root)))]));
const block="const CORE_HASHES = [\n"+files.map(path=>"  "+JSON.stringify(expected[path])).join(",\n")+"\n];";
const updated=original.replace(/const CORE_HASHES = \[[\s\S]*?\];/,block);
if(process.argv.includes("--write")){
  writeFileSync(swURL,updated);writeFileSync(new URL("www/sw.js",root),updated);
  console.log("Updated PWA core fingerprints; bump APP_RELEASE/UI_REVISION for each new release.");
}else{
  if(updated!==original)throw Error("PWA fingerprints stale; run node scripts/pwa-integrity.mjs --write after final core changes.");
  if(readFileSync(new URL("www/sw.js",root),"utf8")!==original)throw Error("www/sw.js differs");
  const release=original.match(/const APP_RELEASE = "([^"]+)"/)[1];
  for(const [path,marker] of [["app.mjs",'const APP_RELEASE="'+release+'"'],["index.html",'id="buildLabel" hidden aria-hidden="true">'+release+'</span>'],["update.html",'const RELEASE="'+release+'"']]){
    const text=readFileSync(new URL(path,root),"utf8");
    if(!text.includes(marker))throw Error("Release mismatch: "+path);
    if(readFileSync(new URL("www/"+path,root),"utf8")!==text)throw Error("iOS asset mismatch: "+path);
  }
  console.log("PASS",files.length,"PWA core blob fingerprints, release identifiers and wrapper parity");
}
