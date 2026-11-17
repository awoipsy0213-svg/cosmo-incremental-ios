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
  if(n.e<0 && n.e>=-4)return n.toNumber().toLocaleString("ja-JP",{maximumFractionDigits:Math.max(3,precision)});
  if(n.e>=0&&n.e<6)return n.toNumber().toLocaleString("ja-JP",{maximumFractionDigits:precision});
  if(notation==="auto" && n.e>=6 && n.e<15){
    const names={6:"M",9:"B",12:"T"}, e=Math.floor(n.e/3)*3;
    return (n.m*10**(n.e-e)).toFixed(precision)+names[e];
  }
  return n.m.toFixed(precision)+"e"+n.e.toLocaleString("en-US",{useGrouping:false});
}
export function seriesCost(base,growth,start,count) {
  if(count<=0)return A(0);
  if(!Number.isInteger(start)||start<0||!Number.isInteger(count)||count<0||growth<1)throw Error("価格設定が不正");
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
