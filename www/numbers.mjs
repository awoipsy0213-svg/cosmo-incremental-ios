/**
 * Nonnegative scientific numbers, ~14 significant digits.
 * Keeps exponents such as 9,999,999 without Number overflow.
 * Approximate game arithmetic, NOT arbitrary-precision/exact decimal arithmetic.
 * Save format: "mantissa e exponent". No NaN/Infinity allowed.
 */
export class Amount {
  constructor(value=0) {
    if (value instanceof Amount) { this.m=value.m; this.e=value.e; return; }
    if (typeof value !== "number" && typeof value !== "string") throw new TypeError("数値形式が不正です");
    const s=String(value).trim();
    if(!/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s)) throw new TypeError("負数・非有限数は使用できません");
    const [a,b="0"]=s.toLowerCase().split("e");
    const mant=Number(a), exp=Number(b);
    if(!Number.isFinite(mant)||!Number.isSafeInteger(exp)||Math.abs(exp)>1e12)throw new RangeError("数値の範囲外です");
    this.m=mant; this.e=exp; this.normalize();
  }
  static fromParts(m,e) {
    if(!Number.isFinite(m)||m<0||!Number.isFinite(e)||Math.abs(e)>1e12)throw new RangeError("計算範囲外です");
    const n=Object.create(Amount.prototype); n.m=m;n.e=e;n.normalize();return n;
  }
  static fromLog10(log) {
    if(log===-Infinity)return new Amount(0);
    if(!Number.isFinite(log)||Math.abs(log)>1e12)throw new RangeError("指数の範囲外です");
    const e=Math.floor(log); return Amount.fromParts(10**(log-e),e);
  }
  normalize() {
    if(this.m===0){this.e=0;return this;}
    const shift=Math.floor(Math.log10(this.m));
    this.m/=10**shift;this.e+=shift;
    this.m=Number(this.m.toPrecision(14));
    if(this.m>=10){this.m/=10;this.e++;}
    if(this.m<1&&this.m>0){this.m*=10;this.e--;}
    if(!Number.isSafeInteger(this.e)||Math.abs(this.e)>1e12)throw new RangeError("指数の範囲外です");
    return this;
  }
  cmp(other) {
    const b=new Amount(other);
    if(this.m===0||b.m===0)return Math.sign(this.m-b.m);
    return this.e===b.e?Math.sign(this.m-b.m):Math.sign(this.e-b.e);
  }
  add(other) {
    const b=new Amount(other);
    if(!this.m)return b;if(!b.m)return new Amount(this);
    const big=this.e>=b.e?this:b, small=big===this?b:this;
    if(big.e-small.e>15)return new Amount(big);
    return Amount.fromParts(big.m+small.m*10**(small.e-big.e),big.e);
  }
  sub(other) {
    const b=new Amount(other);if(this.cmp(b)<=0)return new Amount(0);
    if(!b.m||this.e-b.e>15)return new Amount(this);
    return Amount.fromParts(Math.max(0,this.m-b.m*10**(b.e-this.e)),this.e);
  }
  mul(other) {
    const b=new Amount(other);return Amount.fromParts(this.m*b.m,this.e+b.e);
  }
  div(other) {
    const b=new Amount(other);if(!b.m)throw new RangeError("ゼロ除算");
    return Amount.fromParts(this.m/b.m,this.e-b.e);
  }
  pow(power) {
    if(!Number.isFinite(power)||power<0)throw new RangeError("指数が不正です");
    if(power===0)return new Amount(1);
    return this.m?Amount.fromLog10((Math.log10(this.m)+this.e)*power):new Amount(0);
  }
  toNumber() {return this.m*10**this.e;}
  toString() {return this.m===0?"0":`${this.m}e${this.e}`;}
  toJSON() {return this.toString();}
}
export const A=v=>new Amount(v);
export const str=v=>A(v).toString();
export function formatAmount(value,precision=2,notation="auto") {
  const n=A(value);
  if(n.m===0)return "0";
  // Standard decimal grouping through one million, including exactly 1,000,000.
  if(n.e>=-4 && n.e<6 || (n.e===6 && n.toNumber()<=1000000)){
    return n.toNumber().toLocaleString("ja-JP",{
      maximumFractionDigits:n.e<0?Math.max(3,precision):precision
    });
  }
  const mant=n.m.toFixed(precision);
  const exponent=n.e.toLocaleString("en-US",{useGrouping:false});
  if(notation==="zeros")return `${mant}×10^${exponent} (0が${exponent}個)`;
  if(notation==="exponent")return `${mant}E${n.e>=0?"+":""}${exponent}`;
  return `${mant}e${exponent}`; // auto and scientific avoid unfamiliar M/B/T suffixes
}
/**
 * Display-only Existence formatter, independent of the orb integer formatter.
 * Small balances stay readable through 1,000,000 with at most three decimals.
 * Engraving prices use upward rounding so a short label never understates
 * the actual spend. Amount arithmetic and saved values are not rounded.
 */
export function formatExistenceDisplay(value,{roundUp=false}={}){
  const n=A(value);
  if(n.m===0)return "0";
  if(n.cmp("0.001")<0)return "0.001未満";
  if(n.cmp("1000000")<=0){
    const amount=n.toNumber();
    // Prices are conservatively shown in 0.001-Existence units.
    const shown=roundUp?Math.ceil(Number((amount*1000).toPrecision(14)))/1000:amount;
    return shown.toLocaleString("ja-JP",{maximumFractionDigits:3});
  }
  if(roundUp){
    // Preserve conservative price display even for very large Existence costs.
    let mantissa=Math.ceil(Number((n.m*100).toPrecision(14)))/100,exponent=n.e;
    if(mantissa>=10){mantissa=1;exponent++;}
    return `${mantissa.toFixed(2)}e${exponent>=0?"+":""}${exponent}`;
  }
  return formatScientific3(n);
}
/** Compact scientific notation with exactly three significant figures. UI-only. */
export function formatScientific3(value) {
  const n=A(value);
  if(n.m===0)return "0";
  let mantissa=Number(n.m.toPrecision(3)),exponent=n.e;
  if(mantissa>=10){mantissa/=10;exponent++;}
  return `${mantissa.toFixed(2)}e${exponent>=0?"+":""}${exponent}`;
}
// V3.51 Existence trial curves. Numeric geometric series remain unchanged.
const existencePrefix=[0];
for(let n=1;n<=100;n++)existencePrefix.push(existencePrefix[n-1]+n**1.5);
const fourthSum=n=>{const x=BigInt(n);return x*(x+1n)*(2n*x+1n)*(3n*x*x+3n*x-1n)/30n;};
function existenceCurveCost(base,curve,start,count){
  const end=start+count;
  if(end>1000000)throw RangeError("存在Lv範囲外");
  if(curve==="source-output-v351"){
    const f=n=>n<=100?n**1.15:100**1.15*(n/100)**2.8;
    return A(base).mul(f(end)-f(start));
  }
  const earlyEnd=Math.min(end,100),earlyStart=Math.min(start,100);
  const early=earlyEnd>earlyStart?(count===1?end**1.5:existencePrefix[earlyEnd]-existencePrefix[earlyStart]):0;
  let result=A(base).mul(early);
  if(end>100){
    const a=Math.max(start,100),n=end-a;
    if(curve==="source-price-v351"){
      const factor=n===1?end**4/100000:Number(fourthSum(end)-fourthSum(a))/100000;
      result=result.add(A(base).mul(factor));
    }else if(curve==="moment-price-v351"){
      result=result.add(seriesCost(A(base).mul(1045),1.045,a-100,n));
    }else throw Error("価格曲線が不正");
  }
  return result;
}
// V3.52: price segments expressed as base-10 log slopes, not Number-sized
// geometric ratios. Bulk/NEXT/MAX cost in O(three segments), even at Lv1M.
const gradeCurveCache=new Map();
function gradeCurveV352(growth){
  let curve=gradeCurveCache.get(growth);
  if(curve)return curve;
  const [kind,...values]=growth.split(":");
  const [d1,d2,tail]=values.map(Number);
  if(!["grade-price-v352","grade-output-v352"].includes(kind)||values.length!==3||
      ![d1,d2,tail].every(x=>Number.isFinite(x)&&x>0))throw Error("成長曲線が不正です");
  const s1=d1/9,s2=d2/90;
  curve={kind,parts:[[1,10,0,s1],[11,100,d1+s2,s2],[101,1000001,d1+d2+tail,tail]]};
  gradeCurveCache.set(growth,curve);
  return curve;
}
function gradeLogAt(curve,level){
  if(!Number.isSafeInteger(level)||level<1||level>1000001)throw RangeError("存在Lv範囲外");
  const [first,,offset,slope]=curve.parts[level<=10?0:level<=100?1:2];
  return offset+slope*(level-first);
}
function gradeSeriesV352(base,growth,start,count){
  const end=start+count;
  if(end>1000000)throw RangeError("存在Lv範囲外");
  const c=gradeCurveV352(growth);
  if(c.kind==="grade-output-v352"){
    // Cumulative gain for a level, calibrated against the following quote.
    // Positive marginal gains; late-Lv recovery gradually accelerates.
    const total=lv=>lv===0?A(0):A(base)
      .mul(Amount.fromLog10(gradeLogAt(c,lv+1)-gradeLogAt(c,2)))
      .mul(1+(lv-1)/1000);
    return total(end).sub(total(start));
  }
  let sum=A(0);
  for(const [first,last,offset,slope] of c.parts){
    const lo=Math.max(first,start+1),hi=Math.min(last,end);
    if(hi<lo)continue;
    const n=hi-lo+1,logLast=offset+slope*(hi-first);
    // Factor out the largest term; expm1 stays stable for tiny slopes,
    // while huge negative exponentials naturally tend to zero.
    const ratioSum=n===1?1:Math.expm1(-Math.LN10*slope*n)/Math.expm1(-Math.LN10*slope);
    sum=sum.add(A(base).mul(Amount.fromLog10(logLast)).mul(ratioSum));
  }
  return sum;
}
export function seriesCost(base,growth,start,count) {
  if(count<=0)return A(0);
  if(!Number.isInteger(start)||start<0||!Number.isInteger(count)||count<0||growth<1)throw Error("価格設定が不正");
  if(typeof growth==="string"){
    if(growth.startsWith("grade-price-v352:")||growth.startsWith("grade-output-v352:"))return gradeSeriesV352(base,growth,start,count);
    if(!["source-output-v351","source-price-v351","moment-price-v351"].includes(growth))throw Error("価格曲線が不正");
    return existenceCurveCost(base,growth,start,count);
  }
  const first=A(base).mul(A(growth).pow(start));
  return growth===1?first.mul(count):first.mul(A(growth).pow(count).sub(1)).div(growth-1);
}
export function maxAffordable(wallet,base,growth,start,limit) {
  let lo=0,hi=Math.max(0,Math.floor(limit));
  while(lo<hi) {
    const mid=Math.floor((lo+hi+1)/2);
    if(seriesCost(base,growth,start,mid).cmp(wallet)<=0)lo=mid;
    else hi=mid-1;
  }
  return lo;
}


/**
 * Display-only integer orb formatter. Never alters prices, accounting or saves.
 * Costs/required amounts round UP; balances and gains round DOWN.
 * Fractions below one are shown as "1未満" for nonzero positive gains.
 * Scientific values use an integer three-significant-digit coefficient.
 */
export function formatOrbAmount(value,rounding="floor",notation="auto"){
  const n=A(value);
  if(n.m===0)return "0";
  if(n.e<0)return rounding==="ceil"?"1":"1未満";
  if(n.e<6 || (n.e===6&&n.toNumber()<=1000000)){
    const rounded=rounding==="ceil"?Math.ceil(n.toNumber()):Math.floor(n.toNumber());
    if(rounded===0)return rounding==="ceil"?"1":"1未満";
    return rounded.toLocaleString("ja-JP",{maximumFractionDigits:0});
  }
  // Express huge quantities without any decimal point, including the mantissa.
  const significant=rounding==="ceil"?Math.ceil(n.m*100):Math.floor(n.m*100);
  const exponent=n.e-2,mark=notation==="exponent"?"E":notation==="zeros"?"×10^":"e";
  const exponentLabel=notation==="zeros"?String(exponent):`${exponent>=0?"+":""}${exponent}`;
  return `${significant}${mark}${exponentLabel}`;
}
