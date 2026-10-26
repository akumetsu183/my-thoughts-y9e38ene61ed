/* Great Pyramid workforce model.
   Split out of index.html: the arithmetic in one file, the rendering in
   the same file, because they share a closure and splitting them across
   scripts would only trade one long file for two fragile ones. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const fmt  = n => Math.round(n).toLocaleString('en-US');
const fmt1 = n => n.toLocaleString('en-US',{maximumFractionDigits:1});
const fmtS = n => n>=1e9 ? (n/1e9).toFixed(1)+'B' : n>=1e6 ? (n/1e6).toFixed(1)+'M'
                 : n>=1e3 ? (n/1e3).toFixed(0)+'k' : Math.round(n).toString();

const TOTAL_BLOCKS=2_300_000, STONE_D=2600, CU_G_CM3=8.96;
/* Headline total of the Mainstream preset, used only for "how much did
   this scenario buy" comparisons. Keep in sync with PRESETS.mainstream. */
const MAINSTREAM_TOTAL=380791;
const SAW_KG=14.5, CU_CM3_HR=52/14, USABLE_FRAC=0.20, POP=1_550_000;

/* ── SPLITTING, NOT SAWING ────────────────────────────────────────
   Bedding-plane splitting: a shallow groove or a row of holes is cut
   along one line, wooden wedges are driven in and wetted, and the block
   parts along the plane. The split runs the full depth at once, which is
   the whole reason it is cheaper than a saw.

   SPLIT_MH_PER_M is man-hours per metre of groove line, and
   SPLIT_DRESS_MH is man-hours of dressing per freed face. Neither is a
   published measurement for Giza limestone — no controlled trial has
   been run, exactly as with the copper saw on limestone. They are my own
   estimates, set deliberately high (a slow chiseller, generous dressing)
   so the scenario cannot be accused of being rigged. The page says so
   wherever the numbers appear. */
const SPLIT_MH_PER_M=1.2, SPLIT_DRESS_MH=2.0;

const CTRLS=['rate','block','years','hours','days','support','tripMin','kgPerDay','tPerFarmer','prepMonths','prepM3PerDay'];

const PRESETS={
  /* ── MAINSTREAM: the position archaeology actually holds ──────────
     rate 7.5 : Stocks measured 7.5 mm/hr on GRANITE at Aswan, dry sand.
                Granite is the hardest stone present, so this is a
                conservative floor, not a flattering figure.
     days 120 : Merer's logbook runs July-November - the Akhet flood,
                when fields were underwater and farm labour was free.
     years 20 : Herodotus' figure, and it must fit Khufu's 23-29 yr reign.
     hours 9  : daylight-bound field day.                              */
  mainstream: {rate:7.5, block:1.05, years:20, hours:9,  days:120, support:1.0, tripMin:90,  kgPerDay:0.75, tPerFarmer:2.4, prepMonths:12, prepM3PerDay:0.15},

  /* Mainstream values but year-round corvée: no flood downtime. This is
     the assumption that actually shelters a 20,000-worker figure. */
  yearround:  {rate:7.5, block:1.05, years:20, hours:9,  days:300, support:1.0, tripMin:90,  kgPerDay:0.75, tPerFarmer:2.4, prepMonths:12, prepM3PerDay:0.15},

  /* Slowest defensible rate: Stocks' wet-sand notched-blade result,
     applied to the whole build. Seasonal labour, as mainstream. */
  granite:    {rate:2.1, block:1.05, years:20, hours:9,  days:120, support:1.0, tripMin:90,  kgPerDay:0.75, tPerFarmer:2.4, prepMonths:12, prepM3PerDay:0.15},

  /* Slow rate + longest plausible reign + year-round corvée. */
  surfacetrue:{rate:2.1, block:1.05, years:23, hours:9,  days:300, support:1.0, tripMin:90,  kgPerDay:0.75, tPerFarmer:2.4, prepMonths:12, prepM3PerDay:0.15},

  /* ── SOLVE FOR THE CALENDAR ────────────────────────────────────
     Not a fixed set of assumptions: mainstream in every respect
     except the span, which is whatever it takes for 22,500 people
     to finish. `years` here is a placeholder — solveYears() below
     computes the real value by bisection and writes it in, so the
     preset stays a legitimate target for the match test. */
  solveyears: {rate:7.5, block:1.05, years:null, hours:9, days:120, support:1.0, tripMin:90, kgPerDay:0.75, tPerFarmer:2.4, prepMonths:12, prepM3PerDay:0.15},

  /* ── SPLITTING INSTEAD OF SAWING ───────────────────────────────
     Every assumption identical to Mainstream — same calendar, hours,
     season, support ratio, rations, farm yield — with one change: the
     blocks are freed by wedging along bedding planes rather than sawn
     with copper and sand. `how` selects the method; it is not a slider,
     because it is not a quantity. */
  split:      {rate:7.5, block:1.05, years:20, hours:9,  days:120, support:1.0, tripMin:90, kgPerDay:0.75, tPerFarmer:2.4, prepMonths:12, prepM3PerDay:0.15, how:'split'}
};

const TARGET_WORKFORCE=22500;

/* ── FIGURE SILHOUETTES ────────────────────────────────────
   Six distinct outlines in a 24×30 box, so each crew is
   identifiable even at ~20 px tall.
   ───────────────────────────────────────────────────────── */
function pawnPath(x,y,w,h){
  const cx=x+w/2, U=v=>y+h*v, W=v=>cx+w*v/24;
  return `M${W(-2.6)},${U(.10)} a${w*.108},${w*.108} 0 1,0 ${w*.216},0 a${w*.108},${w*.108} 0 1,0 -${w*.216},0 Z `+
         `M${W(-1.5)},${U(.21)} L${W(1.5)},${U(.21)} L${W(2.0)},${U(.64)} L${W(-2.0)},${U(.64)} Z `+
         `M${W(-3.1)},${U(.64)} L${W(3.1)},${U(.64)} L${W(3.1)},${U(.74)} L${W(-3.1)},${U(.74)} Z `+
         `M${W(-3.7)},${U(.74)} L${W(3.7)},${U(.74)} L${W(3.7)},${U(.92)} L${W(-3.7)},${U(.92)} Z`;
}
function rookPath(x,y,w,h){
  const cx=x+w/2, U=v=>y+h*v, W=v=>cx+w*v/24;
  return `M${W(-3.4)},${U(.06)} L${W(-2.1)},${U(.06)} L${W(-2.1)},${U(.15)} L${W(-1.0)},${U(.15)} `+
         `L${W(-1.0)},${U(.06)} L${W(1.0)},${U(.06)} L${W(1.0)},${U(.15)} L${W(2.1)},${U(.15)} `+
         `L${W(2.1)},${U(.06)} L${W(3.4)},${U(.06)} L${W(3.4)},${U(.26)} L${W(-3.4)},${U(.26)} Z `+
         `M${W(-2.5)},${U(.26)} L${W(2.5)},${U(.26)} L${W(2.9)},${U(.70)} L${W(-2.9)},${U(.70)} Z `+
         `M${W(-3.3)},${U(.70)} L${W(3.3)},${U(.70)} L${W(3.3)},${U(.80)} L${W(-3.3)},${U(.80)} Z `+
         `M${W(-3.9)},${U(.80)} L${W(3.9)},${U(.80)} L${W(3.9)},${U(.94)} L${W(-3.9)},${U(.94)} Z`;
}
function knightPath(x,y,w,h){
  const cx=x+w/2, U=v=>y+h*v, W=v=>cx+w*v/24;
  return `M${W(-3.3)},${U(.94)} L${W(-2.9)},${U(.36)} `+
         `Q${W(-3.1)},${U(.20)} ${W(-1.3)},${U(.13)} `+
         `Q${W(-.5)},${U(.09)} ${W(-.7)},${U(.02)} `+
         `L${W(1.1)},${U(.05)} `+
         `Q${W(3.4)},${U(.13)} ${W(3.2)},${U(.36)} `+
         `Q${W(3.0)},${U(.60)} ${W(2.5)},${U(.94)} Z `+
         `M${W(-3.7)},${U(.94)} L${W(3.3)},${U(.94)} L${W(3.3)},${U(1.0)} L${W(-3.7)},${U(1.0)} Z`;
}
function bishopPath(x,y,w,h){
  const cx=x+w/2, U=v=>y+h*v, W=v=>cx+w*v/24;
  return `M${cx},${U(.02)} Q${W(2.5)},${U(.13)} ${W(1.9)},${U(.34)} `+
         `Q${W(1.3)},${U(.52)} ${W(2.1)},${U(.65)} L${W(-2.1)},${U(.65)} `+
         `Q${W(-1.3)},${U(.52)} ${W(-1.9)},${U(.34)} Q${W(-2.5)},${U(.13)} ${cx},${U(.02)} Z `+
         `M${W(-3.1)},${U(.65)} L${W(3.1)},${U(.65)} L${W(3.1)},${U(.75)} L${W(-3.1)},${U(.75)} Z `+
         `M${W(-3.7)},${U(.75)} L${W(3.7)},${U(.75)} L${W(3.7)},${U(.92)} L${W(-3.7)},${U(.92)} Z`;
}
function queenPath(x,y,w,h){
  const cx=x+w/2, U=v=>y+h*v, W=v=>cx+w*v/24;
  return `M${W(-3.3)},${U(.24)} L${W(-2.1)},${U(.11)} L${W(-1.1)},${U(.21)} L${W(0)},${U(.07)} `+
         `L${W(1.1)},${U(.21)} L${W(2.1)},${U(.11)} L${W(3.3)},${U(.24)} `+
         `L${W(2.3)},${U(.62)} L${W(-2.3)},${U(.62)} Z `+
         `M${W(-2.9)},${U(.62)} L${W(2.9)},${U(.62)} L${W(2.9)},${U(.73)} L${W(-2.9)},${U(.73)} Z `+
         `M${W(-3.7)},${U(.73)} L${W(3.7)},${U(.73)} L${W(3.7)},${U(.93)} L${W(-3.7)},${U(.93)} Z`;
}
function kingPath(x,y,w,h){
  const cx=x+w/2, U=v=>y+h*v, W=v=>cx+w*v/24;
  return `M${W(-.5)},${U(.00)} L${W(.5)},${U(.00)} L${W(.5)},${U(.05)} L${W(1.4)},${U(.05)} `+
         `L${W(1.4)},${U(.09)} L${W(.5)},${U(.09)} L${W(.5)},${U(.14)} L${W(-.5)},${U(.14)} `+
         `L${W(-.5)},${U(.09)} L${W(-1.4)},${U(.09)} L${W(-1.4)},${U(.05)} L${W(-.5)},${U(.05)} Z `+
         `M${W(-3.1)},${U(.19)} L${W(3.1)},${U(.19)} L${W(2.3)},${U(.63)} L${W(-2.3)},${U(.63)} Z `+
         `M${W(-2.9)},${U(.63)} L${W(2.9)},${U(.63)} L${W(2.9)},${U(.74)} L${W(-2.9)},${U(.74)} Z `+
         `M${W(-3.8)},${U(.74)} L${W(3.8)},${U(.74)} L${W(3.8)},${U(.94)} L${W(-3.8)},${U(.94)} Z`;
}

const PIECES={pawn:pawnPath, rook:rookPath, knight:knightPath, bishop:bishopPath, queen:queenPath, king:kingPath};

const ROLES = [
  {key:'prep',  label:'Příprava staveniště',      piece:'rook',   color:'var(--prep)',    desc:'příprava staveniště'},
  {key:'cut',   label:'Řezači',        piece:'bishop', color:'var(--cut)',     desc:'cutting'},
  {key:'trans', label:'Lom → staveniště',  piece:'knight', color:'var(--trans)',   desc:'hauling'},
  {key:'haul',  label:'Nahoru po rampách',   piece:'pawn',   color:'var(--haul)',    desc:'ramps'},
  {key:'supp',  label:'Podpůrná řemesla', piece:'queen',  color:'var(--support)', desc:'support'},
  {key:'farm',  label:'Rolníci',        piece:'king',   color:'var(--farmer)',  desc:'farmers'}
];

/* Which cutting method is active. A preset sets it; sliders never do, because
   the method is not a quantity. Flipping between saw and split is the whole
   difference between scenarios 01 and 06. */
let MODE='saw';
/* Filled at boot: the Mainstream cutter count, so the splitting scenario can
   say how far cutting fell without hard-coding a second number. */
const MAP_SAW_CUTTERS = compute(Object.assign({}, PRESETS.mainstream, {how:'saw'})).cutters;
function read(){const o={};CTRLS.forEach(k=>o[k]=parseFloat($(k).value));o.how=MODE;return o;}

function compute(o){
  const sideCm=o.block*100, rateCmH=o.rate/10;
  const buildMonths=Math.max(6,o.years*12-o.prepMonths);
  const buildYears=buildMonths/12;

  /* Sawing: two people on a blade, five faces per block.
     Splitting: one person works the groove line, the split runs the whole
     face at once, then the face is dressed. Time scales with the length of
     the groove (the block edge), not with a saw rate, so `rate` is unused
     in this branch — that is the point of the scenario, not an oversight. */
  const splitMode = o.how==='split';
  const hoursPerFace = splitMode
    ? (sideCm/100)*SPLIT_MH_PER_M + SPLIT_DRESS_MH
    : sideCm/rateCmH;
  const hoursPerBlock=hoursPerFace*5;
  const manHoursBlock=splitMode ? hoursPerBlock : hoursPerBlock*2;
  const totalManYears=manHoursBlock*TOTAL_BLOCKS/o.hours/o.days;
  const cutters=totalManYears/buildYears;

  const workDays=buildYears*o.days;
  const blocksPerDay=TOTAL_BLOCKS/workDays;
  const minutesPerBlock=(o.hours*60)/blocksPerDay;
  const blocksPerHour=blocksPerDay/o.hours;

  /* No saw, no blade, no abrasive slurry: the copper terms are zero by
     construction under splitting, not small by accident. */
  const totalSawHours=splitMode?0:hoursPerBlock*TOTAL_BLOCKS;
  const copperCm3=totalSawHours*CU_CM3_HR;
  const copperTonnes=copperCm3/1e6*CU_G_CM3;
  const sawCm3=SAW_KG*1000/CU_G_CM3;
  const sawLifeHours=(sawCm3*USABLE_FRAC)/CU_CM3_HR;
  const sawsConsumed=totalSawHours/sawLifeHours;
  const bladesInUse=splitMode?0:Math.max(1,Math.round(cutters/2));
  const cuPerYear=copperTonnes/(o.years||1);

  const blockTonnes=o.block**3*STONE_D/1000;
  const pullers=Math.max(8,Math.round(blockTonnes*8));
  const transport=(o.tripMin/minutesPerBlock)*pullers;
  const haul=(o.tripMin*1.5/minutesPerBlock)*Math.round(pullers*1.5);

  const support=(cutters+transport+haul)*o.support;
  const total=cutters+transport+haul+support;

  const baseSide=230.33, platThick=0.52, courtW=10;
  const platArea=baseSide*baseSide;
  const courtArea=(baseSide+courtW*2)**2-platArea;
  const platVol=platArea*platThick;
  const rockCut=platArea*1.0+courtArea*0.3;
  const prepManDays=(rockCut+platVol)/o.prepM3PerDay;
  const prepWorkDays=o.prepMonths*30*0.8;
  const prepWorkers=prepManDays/prepWorkDays;

  const grainT=total*365*o.kgPerDay/1000;
  const farmers=grainT/o.tPerFarmer;

  const grandAll=prepWorkers+cutters+transport+haul+support+farmers;

  return {...o, how:o.how, splitMode, grandAll, buildMonths,buildYears,sideCm,rateCmH,hoursPerFace,hoursPerBlock,totalManYears,cutters,
    workDays,blocksPerDay,minutesPerBlock,blocksPerHour,totalSawHours,copperCm3,copperTonnes,
    sawCm3,sawLifeHours,sawsConsumed,bladesInUse,cuPerYear,blockTonnes,pullers,transport,haul,
    support,total,grainT,farmers,grand:total+farmers,
    baseSide,platThick,platArea,courtArea,platVol,rockCut,prepManDays,prepWorkers,prepWorkDays};
}

/* ── SOLVE THE CALENDAR (scenario 05) ────────────────────
   Declared AFTER compute() so the call is safe at load time;
   PRESETS is only read here, never re-bound. The total falls
   monotonically as the span stretches, so bisection converges.
   The result is rounded UP to the next whole year: the first span
   that does not exceed the published 22,500. */
function solveYears(){
  const base=PRESETS.solveyears;
  const at=y=>compute(Object.assign({},base,{years:y})).grandAll;
  if(at(400)>=TARGET_WORKFORCE) return null;   // does not close inside the slider range
  let lo=1, hi=400;
  for(let i=0;i<60;i++){
    const mid=(lo+hi)/2;
    if(at(mid)>TARGET_WORKFORCE) lo=mid; else hi=mid;
  }
  return Math.min(400, Math.ceil(hi));
}
const SOLVED_YEARS=solveYears();
if(SOLVED_YEARS) PRESETS.solveyears.years=SOLVED_YEARS;

/* ── WORKFORCE RAIL ──────────────────────────────────────
   Icons only. Each icon stands for a fixed number of people.
   The rail accumulates as you move through the pages: every tab
   adds the crews it introduces, and the last tabs show the whole
   workforce — identical to the overview.
   ───────────────────────────────────────────────────────── */
const NICE=[10,25,50,100,250,500,1000,2500,5000,10000,25000,50000,100000,250000,500000];
function pickScale(n,target){
  let best=NICE[NICE.length-1], err=Infinity;
  for(const s of NICE){
    const n_icons=Math.ceil(n/s);
    const e=Math.abs(n_icons-target);
    if(e<err){err=e;best=s;}
  }
  return best;
}

/* crews revealed per tab — each page adds the crews it introduces */
const TAB_CREWS={
  overview:['prep','cut','trans','haul','supp','farm'],
  ground:  ['prep'],
  cutting: ['prep','cut'],
  copper:  ['prep','cut','supp'],
  moving:  ['prep','cut','supp','trans','haul'],
  feeding: ['prep','cut','supp','trans','haul','farm'],
  verdict: ['prep','cut','supp','trans','haul','farm'],
  sources: ['prep','cut','supp','trans','haul','farm']
};
const TAB_ADDS={ground:'prep',cutting:'cut',copper:'supp',moving:'trans',feeding:'farm'};

let CURRENT_TAB='overview';

function crewValues(r){
  return {prep:r.prepWorkers, cut:r.cutters, trans:r.transport,
          haul:r.haul, supp:r.support, farm:r.farmers};
}

function renderColumn(r,tab,animate){
  const vals=crewValues(r);
  const visible=TAB_CREWS[tab]||TAB_CREWS.overview;
  const added=TAB_ADDS[tab];
  const shown=visible.reduce((s,k)=>s+vals[k],0);
  const full=Object.values(vals).reduce((a,b)=>a+b,0)||1;

  /* Default scale is 1 icon = 100 people. If a scenario pushes the total
     past what the rail can legibly hold, step the scale up so the grid
     stays readable — and say so, rather than silently changing it. */
  let scale=100;
  const MAX_ICONS=1200;
  if(shown/scale > MAX_ICONS){
    scale=250;
    for(const s of [250,500,1000,2500,5000]){
      scale=s;
      if(shown/s <= MAX_ICONS) break;
    }
  }

  const icons=[];
  visible.forEach(key=>{
    const role=ROLES.find(x=>x.key===key);
    const n=Math.max(1,Math.ceil(vals[key]/scale));
    for(let i=0;i<n;i++) icons.push({role,key});
  });

  $('railHead').textContent = visible.length===6 ? 'Total workforce' : 'Pracovní síla zatím';
  $('railTotal').textContent = fmt(shown);
  $('railScale').innerHTML = `jedna ikona = <b>${fmt(scale)}</b> lidí`;

  $('railIcons').innerHTML = icons.map(u=>
    `<i class="${animate&&u.key===added?'fresh':''}">
       <svg viewBox="0 0 24 30" aria-hidden="true">
         <path d="${PIECES[u.role.piece](0,0,24,30)}" fill="${u.role.color}" fill-rule="evenodd"/>
       </svg>
     </i>`).join('');

  $('railFoot').textContent = `${fmt(icons.length)} ikon · ${visible.length} ze 6 skupin`;
}

function renderHero(r){
  const big=$('totalBig');
  big.textContent=fmt(r.grandAll);
  big.className='big'+(r.grandAll>400000?' hot':r.grandAll>120000?' warn':'');
  const share=r.grandAll/POP*100;
  $('totalSub').innerHTML=`To je <b>${fmt1(share)} %</b> populace pozdní Staré říše (odhad 1,55 mil.) — na jednu stavbu, po ${r.years} let, z toho <b>${r.prepMonths} měsíců</b> je příprava staveniště. Jen řezání spolkne <b>${fmtS(r.totalManYears)}</b> osoboroků.`;
  const vals=[['prep','Příprava staveniště', r.prepWorkers, 'levelling + platform'],
    ['cut','Řezači', r.cutters, 'party u pily, 2 na list'],
    ['trans','Lom → staveniště', r.transport, 'štafeta na saních'],
    ['haul','Nahoru po rampách', r.haul, 'tah na svahu'],
    ['supp','Podpora', r.support, 'kováři, pekaři, písaři'],
    ['farm','Rolníci', r.farmers, 'obilí za tím vším']];
  $('kpis').innerHTML=vals.map(([c,k,v,n])=>
    `<div class="kpi ${c}"><div class="k">${k}</div><div class="v">${fmt(v)}</div><div class="n">${n}</div></div>`).join('');
}

function renderSticky(r){
  const n=$('stickyNum');
  n.textContent=fmt(r.grandAll);
  n.className='num'+(r.grandAll>400000?' hot':r.grandAll>120000?' warn':'');
  $('chC').textContent=fmt(r.cutters);
  $('chCu').textContent=fmt(r.copperTonnes)+' t';
  $('chP').textContent=fmt1(r.minutesPerBlock)+' min';
  $('chG').textContent=fmt(r.grainT)+' t';
}

function renderBars(r){
  const rows=[['prep','Příprava staveniště', r.prepWorkers, `${r.prepMonths} mo · ${fmt(r.prepManDays)} man-days`],
    ['cut','Řezači', r.cutters, 'dvoučlenné party u pily, pět stěn'],
    ['trans','Lom → staveniště', r.transport, `${fmt(r.pullers)} per sledge`],
    ['haul','Nahoru po rampách', r.haul, `${fmt(Math.round(r.pullers*1.5))} per block`],
    ['supp','Podpůrná řemesla', r.support, 'písek, kování, jídlo, záznamy'],
    ['farm','Rolníci', r.farmers, `${fmt1(r.grainT)} t grain a year`]];
  const max=Math.max(...rows.map(x=>x[2]))||1;
  const html=rows.map(([c,k,v,n])=>
    `<div class="bar ${c}"><div class="nm">${k}<small>${n}</small></div>
      <div class="track"><div class="fill" style="width:${(v/max*100).toFixed(1)}%"></div></div>
      <div class="val">${fmt(v)}</div></div>`).join('');
  $('barsOverview').innerHTML=html;
  $('barsVerdict').innerHTML=html;
}

function renderGround(r){
  $('prepCrew').textContent=fmt(r.prepWorkers);
  $('prepCrewNote').textContent=`${r.prepMonths} months straight`;
  $('prepMonthsTxt').textContent=`${r.prepMonths} months`;
  $('prepVolume').textContent=fmt(r.rockCut+r.platVol)+' m³';
  $('prepVolumeNote').textContent=`${fmt(r.rockCut)} m³ vysekané skály · ${fmt(r.platVol)} m³ položené plošiny`;
  $('courtAreaTxt').textContent=fmt(r.courtArea)+' m²';
  $('platVolTxt').textContent=fmt(r.platVol)+' m³';

  const prepPct=(r.prepMonths/(r.years*12))*100;
  $('tlBar').innerHTML=
    `<div class="tl-seg prep" style="flex-basis:${prepPct}%">${r.prepMonths} měs. příprava</div><div class="tl-seg build" style="flex-basis:${100-prepPct}%">${fmt1(r.buildYears)} let stavba</div>`;
  $('tl0').textContent='rok 0';
  $('tlMid').textContent=`year ${fmt1(r.prepMonths/12)}`;
  $('tlEnd').textContent=`year ${fmt(r.years)}`;

  $('prepNote').innerHTML=`Příprava staveniště zabere <b>${fmt(r.prepManDays)} člověkodnů</b> — zhruba <b>${fmt(r.prepManDays/300)} osoboroků</b>. Protože spotřebuje <b>${r.prepMonths} měsíců</b> z ${r.years} dostupných let, mají řezači a přepravci na svou práci jen <b>${fmt1(r.buildYears)} let</b> místo ${r.years}. Zvyšte přípravu na 36 měsíců a sledujte, jak počet řezačů stoupá.`;
}

function renderCutting(r){
  $('cutCrew').textContent=fmt(r.cutters);
  $('cutCrewNote').textContent=`jen řezání, okno ${fmt1(r.buildYears)} let`;
  $('cutHours').textContent=fmt1(r.hours);
  $('cutYears').textContent=fmt1(r.buildYears);
  $('cutManYears').textContent=fmtS(r.totalManYears);
  $('cutPerFace').textContent=fmt1(r.hoursPerFace)+' h';
  $('cutPerBlock').textContent=fmt1(r.hoursPerBlock)+' h';

  const rows=[['Vyřezané bloky',fmt(TOTAL_BLOCKS),'odhad hlavního proudu'],
    ['Stěn na blok','5','základna zůstává připevněná, dokud se blok nevypáčí'],
    ['Hrana bloku',fmt1(r.block)+' m',`${fmt1(r.sideCm)} cm`],
    ['Rychlost řezání',fmt1(r.rate)+' mm/hr','Stocks, asuánský suchý písek'],
    ['Hodin na stěnu',fmt1(r.hoursPerFace)+' h',`${fmt1(r.sideCm)} cm ÷ ${fmt1(r.rateCmH)} cm/hr`],
    ['Hodin na blok',fmt1(r.hoursPerBlock)+' h','5 stěn'],
    ['Celkem hodin pily',fmtS(r.totalSawHours),'jeden list, nepřetržitě']];
  $('cutTable').innerHTML=rows.map(([k,v,d])=>
    `<tr><td>${k}</td><td class="num">${v}</td><td style="color:var(--dim);font-size:.78rem">${d}</td></tr>`).join('');
}

function renderCopper(r){
  if(r.splitMode){
    /* No saw means no blade, no slurry and no wear rate: the whole copper
       argument collapses by construction rather than by a low number. Say
       that plainly instead of printing a table of zeroes. */
    $('sawLife').textContent='none';
    $('sawLifeNote').textContent='no blade in use';
    $('copperTotal').textContent='0 t';
    $('copperNote').textContent='wedges and water · no abrasive slurry';
    $('copperReality').innerHTML=
      `Splitting removes the copper question rather than answering it. No blade, no `+
      `quartz sand, no slurry — so none of the wear, the standing stock or the annual `+
      `make-up that the other scenarios have to justify. What is left is chisel and `+
      `pounder wear on the groove lines, which is a tool-maintenance cost, not an `+
      `industrial supply chain. <b>This is the one scenario where "where is all the copper?" `+
      `stops being a fair question</b> — because there is no reason for much copper to be there.`;
    const srows=[['Method','wedge-split','grooves + water, not abrasive sawing'],
      ['Groove effort',fmt1(SPLIT_MH_PER_M)+' mh/m','own estimate, not published'],
      ['Dressing',fmt1(SPLIT_DRESS_MH)+' mh/face','own estimate, not published'],
      ['Blades','none','nothing to wear out'],
      ['Průtok mědi','0 t','chisel wear only'],
      ['Abrasive sand','none','the cutting agent is gone']];
    $('cuTable').innerHTML=srows.map(([k,v,d])=>
      `<tr><td>${k}</td><td class="num">${v}</td><td style="color:var(--dim);font-size:.78rem">${d}</td></tr>`).join('');
    return;
  }
  $('sawLife').textContent=fmt(r.sawLifeHours)+' hours';
  $('sawLifeNote').textContent=`≈ ${fmt1(r.sawLifeHours/r.hours)} pracovních dnů před přežíháním`;
  $('copperTotal').textContent=fmt(r.copperTonnes)+' t';
  $('copperNote').textContent=`${fmtS(r.sawsConsumed)} životů listu · ${fmt(r.bladesInUse)} v použití naráz`;

  const el=$('copperReality');
  if(r.copperTonnes>2000){
    el.innerHTML=`That is <b>${fmt(r.copperTonnes)} tonnes</b> — <b>${fmt(r.cuPerYear)} t a year</b> for ${r.years} years. `+
      `Bronze Age Sinai copper production is estimated in the low thousands of tonnes <i>across centuries</i>. `+
      `The metal can be reforged and reused, so this is throughput rather than loss — but the smiths, the fuel and `+
      `the recycling loop all have to exist, and none of them are in a 20,000-worker estimate.`;
  } else {
    el.innerHTML=`At these settings the project wears through <b>${fmt(r.copperTonnes)} tonnes</b> — ${fmt(r.cuPerYear)} t a year. `+
      `Within reach of Egyptian supply, provided blades are reforged rather than replaced. `+
      `Note what bought you that: ${fmt1(r.rate)} mm/hr cutting.`;
  }

  const rows=[['Hmotnost listu',SAW_KG+' kg','Stocks 1999'],
    ['Objem listu',fmt(r.sawCm3)+' cm³','při 8,96 g/cm³'],
    ['Použitelné opotřebení',fmt(r.sawCm3*USABLE_FRAC)+' cm³',`${USABLE_FRAC*100}% before too thin`],
    ['Míra opotřebení',fmt1(CU_CM3_HR)+' cm³/hr','52 cm³ za 14 h'],
    ['Životnost listu',fmt(r.sawLifeHours)+' h',`${fmt1(r.sawLifeHours/r.hours)} working days`],
    ['Spotřebované listy',fmtS(r.sawsConsumed),'za celý projekt'],
    ['Průtok mědi',fmt(r.copperTonnes)+' t',`${fmt(r.cuPerYear)} t/yr`]];
  $('cuTable').innerHTML=rows.map(([k,v,d])=>
    `<tr><td>${k}</td><td class="num">${v}</td><td style="color:var(--dim);font-size:.78rem">${d}</td></tr>`).join('');
}

function renderMoving(r){
  $('moveCrew').textContent=fmt(r.transport);
  $('moveCrewNote').textContent=`${fmt1(r.tripMin)} min round trip`;
  $('movePullers').textContent=fmt(r.pullers);
  $('haulCrew').textContent=fmt(r.haul);
  $('haulCrewNote').textContent=`${fmt(Math.round(r.pullers*1.5))} na blok na svahu`;

  const rows=[['Průměrná hmotnost bloku',fmt1(r.blockTonnes)+' t',`${fmt1(r.block)} m cube at ${STONE_D} kg/m³`],
    ['Pracovní dny',fmt(r.workDays),`${fmt1(r.buildYears)} yr × ${r.days} d`],
    ['Bloků za den',fmt1(r.blocksPerDay),`${fmt1(r.blocksPerHour)} per hour`],
    ['Interval na blok',fmt1(r.minutesPerBlock)+' min','dovoz a uložení'],
    ['Tahačů na saně',fmt(r.pullers),'Stocks: 45 for 16 t, 8 for 2.75 t'],
    ['Doba obrátky',fmt1(r.tripMin)+' min','lom → staveniště → zpět']];
  $('moveTable').innerHTML=rows.map(([k,v,d])=>
    `<tr><td>${k}</td><td class="num">${v}</td><td style="color:var(--dim);font-size:.78rem">${d}</td></tr>`).join('');

  const ratio=r.total/25000;
  $('paceNote').innerHTML=`Blok musí opustit lom každých <b>${fmt1(r.minutesPerBlock)} minut</b>, každý pracovní den, po <b>${fmt1(r.buildYears)} let</b>. To tempo se nezmění, když přidáte dělníky — je dané objemem pyramidy a kalendářem. `?`Právě teď to vyžaduje celkem <b>${fmt(r.total)}</b> lidí, <b>${fmt1(ratio)}×</b> číslo hlavního proudu.`:`Při tomto nastavení to vyžaduje celkem <b>${fmt(r.total)}</b> lidí.`;
}

function renderFeeding(r){
  $('farmCrew').textContent=fmt(r.farmers);
  $('farmCrewNote').textContent=`při ${fmt1(r.tPerFarmer)} t na zemědělského dělníka`;
  $('grainTotal').textContent=fmt(r.grainT)+' t';
  $('suppCrew').textContent=fmt(r.support);
  $('suppCrewNote').textContent=`${fmt1(r.support)}× kvalifikované pracovní síly`;

  const rows=[['Dělníků k uživení',fmt(r.total),'cutters + hauliers + support'],
    ['Obilí na dělníka a den',fmt1(r.kgPerDay)+' kg','pracující dospělý'],
    ['Celkem obilí za rok',fmt(r.grainT)+' t',`${fmt(r.total)} × 365 × ${fmt1(r.kgPerDay)} kg`],
    ['Obilí, které vyprodukuje jeden dělník',fmt1(r.tPerFarmer)+' t','~1 ha at 2,700–2,900 l/ha'],
    ['Potřební rolníci',fmt(r.farmers),'grain total ÷ per-farmer output'],
    ['Rolníci v % pracovní síly',fmt1(r.farmers/r.total*100)+'%','']];
  $('farmTable').innerHTML=rows.map(([k,v,d])=>
    `<tr><td>${k}</td><td class="num">${v}</td><td style="color:var(--dim);font-size:.78rem">${d}</td></tr>`).join('');

  $('farmNote').innerHTML=`Uživit <b>${fmt(r.total)}</b> dělníků vyžaduje <b>${fmt(r.farmers)}</b> zemědělských dělníků — <b>${fmt1(r.farmers/r.total*100)} %</b> navíc k pracovní síle pyramidy samotné. Ti rolníci jsou v každém odhadu práce neviditelní, protože nikdy neopouštějí svá pole. Ale pyramidy stály uvnitř zemědělské ekonomiky, která musela vyprodukovat jejich potravu, a ta ekonomika měla své vlastní lidi.`;
}

function renderVerdict(r){
  const share=r.grandAll/POP*100, ratio=r.grandAll/25000, needRate=r.rate*ratio;
  let body;
  if(r.splitMode){
    /* Splitting changes what the sentences have to be about. Talking about a
       millimetre-per-hour rate here would be a non sequitur: there is no saw. */
    const sawCutters=MAP_SAW_CUTTERS;
    body=`Splitting moves the answer from <em>${fmt(MAINSTREAM_TOTAL)} people</em> to <em>${fmt(r.grandAll)}</em> — `+
      `<em>${fmt1(share)}%</em> of the country instead of 25%, and <em>${fmt1(r.grandAll/22500)}×</em> the 22,500 headcount `+
      `instead of 17×. The cutters themselves collapse from <em>${fmt(sawCutters)}</em> to <em>${fmt(r.cutters)}</em>: `+
      `an 86-fold cut, because a wedge line frees a face in one go where a saw grinds along it for hours. `+
      `<b>What does not move is everything that was never about the saw</b> — ${fmt(r.transport)} in the quarry relay, `+
      `${fmt(r.haul)} on the ramps, ${fmt(r.support)} support trades and ${fmt(r.farmers)} farmers. Splitting removes `+
      `the hardest engineering problem on the page and leaves the logistics standing. `+
      `<b>It does not close the gap to 22,500 either</b> — it halves the distance, and the half that remains is the `+
      `half mainstream estimates usually leave out.`;
  } else if(ratio>=1.5){
    body=`At the mainstream timeline and a measured cutting rate you need <em>${fmt(r.grandAll)} people</em> — `+
      `<em>${fmt1(share)}%</em> of the country — for ${r.years} straight years, of which ${r.prepMonths} months `+
      `is just the hole in the ground. Archaeology says 20,000–30,000. The arithmetic says `+
      `<em>${fmt1(ratio)}×</em> that, wants <em>${fmt(r.copperTonnes)} tonnes</em> of copper, and needs `+
      `<em>${fmt(r.farmers)} farmers</em> feeding them. Getting back to 25,000 would need a cutting rate of `+
      `<em>${fmt1(needRate)} mm/hr</em> — nobody has demonstrated that with copper and sand.`;
  } else if(ratio>=0.8){
    body=`At these settings the workforce lands at <em>${fmt(r.grandAll)} people</em>, inside the mainstream window. `+
      `That took ${fmt1(r.rate)} mm/hr cutting, ${r.hours}-hour days, ${r.days} days a year, ${r.prepMonths} months `+
      `of prep and a support ratio of ${fmt1(r.support)} — the optimistic end of every assumption at once. `+
      `The mainstream number is reachable; it is just not reachable robustly.`;
  } else {
    body=`At these settings you need only <em>${fmt(r.grandAll)} people</em> — <em>${fmt1(1/ratio)}×</em> cheaper `+
      `than the mainstream estimate. That is suspicious in the other direction. A figure this low means something `+
      `has been given away, usually a cutting rate far beyond anything measured.`;
  }
  $('verdict').innerHTML=body;

  /* ── live objection figures ─────────────────────────── */
  const BIR_NASIB_TOTAL=5000, BIR_NASIB_YEARS=1300;
  const birPerYear=BIR_NASIB_TOTAL/BIR_NASIB_YEARS;   // ~3.85 t/yr

  /* Throughput is the wrong headline on its own: blades were reforged, so
     metal circulated. The binding constraint is the STANDING STOCK of
     copper in simultaneous use, plus the make-up metal worn away each year.
     Stock = blades in use x mass per blade; make-up = annual wear. */
  const bladesInUse=r.bladesInUse;
  const stockTonnes=bladesInUse*SAW_KG/1000;
  const makeupPerYear=r.copperTonnes/(r.years||1);
  /* annual make-up against what one Sinai year produced */
  const makeupMult=makeupPerYear/birPerYear;
  /* stock against the entire known Bir Nasib output */
  const stockVsAll=stockTonnes/BIR_NASIB_TOTAL*100;

  $('obj1Cu').textContent = r.splitMode ? 'none' : fmt(stockTonnes)+' tonnes';
  $('obj1CuYr').textContent = r.splitMode ? 'none' : fmt(makeupPerYear)+' t';
  $('obj1Mult').textContent = r.splitMode ? '—' : fmt1(makeupMult)+'×';
  if(r.splitMode){
    /* Printing "0 blades / 0x an average Sinai year" would be arithmetically
       true and rhetorically useless. Under splitting the objection does not
       get a low score — it stops applying. */
    $('obj1Verdict').innerHTML =
      `There is nothing to find, because there is no abrasive slurry being made. `+
      `Splitting frees the block along a bedding plane with wedges and water: no blade `+
      `runs against stone, so no copper is ground into the spoil and no workshop floor `+
      `should be stained green. <b>The objection is not answered here — it is removed, `+
      `and that is a different thing.</b> It does not make the mainstream case stronger; `+
      `it makes the saw-based versions of it cheaper than they were, which is the `+
      `honest way to put it.`;
  } else {
  $('obj1Verdict').innerHTML =
    `Skutečný požadavek je <b>${fmt(bladesInUse)} listů v současném použití</b> — zásoba na skladě asi <b>${fmt(stockTonnes)} tun</b>, tedy <b>${fmt1(stockVsAll)} %</b> každé tuny, kterou Bir Nasib za 1 300 let údajně vyprodukoval. Navíc se opotřebení musí doplňovat <b>${fmt(makeupPerYear)} t ročně</b>, což je <b>${fmt1(makeupMult)}×</b> průměrný sinajský rok. `?`Recyklace drží <i>zásobu</i> ve hře, ale samotná potřeba doplňování několikrát převyšuje celkový průměrný výnos Sinaje — ten kov musí odněkud přijít a žádný egyptský zdroj mědi takového rozsahu není znám.`: makeupMult>=2
        ?`Pro známý sinajský výnos je to příliš, i když důkladná recyklace a opětovné použití by to značně změkčily.`:`To je v mezích toho, co by pevně recyklovaný sinajský zdroj mohl plausibilně unést.`;
  }

  const popShare=r.farmers/1_550_000*100;
  $('obj2Farm').textContent=fmt(r.farmers);
  $('obj2Pct').textContent=fmt1(popShare)+'%';
  $('obj2Pct2').textContent=fmt1(popShare)+'%';
  $('obj2Verdict').innerHTML = popShare>=8
    ?`<b>${fmt1(popShare)} %</b> celé populace na polích, která živí jediný projekt, není samozásobitelská ekonomika s volnou kapacitou — je to direktivní ekonomika. To je silné tvrzení o tom, jak byla Stará říše skutečně organizovaná.`:`<b>${fmt1(popShare)} %</b> populace na obilí pro pyramidu je náročné, ale ne nemožné pro stát, který dokázal odvádět práci a přerozdělovat úrodu.`;

  const totalShare=r.grandAll/1_550_000*100;
  $('obj3Total').textContent=fmt(r.grandAll);
  $('obj3Pct').textContent=fmt1(totalShare)+'%';
  $('obj3Years').textContent=fmt(r.years);
  $('obj3Verdict').innerHTML = totalShare>=15
    ?`Při <b>${fmt1(totalShare)} %</b> populace je to číslo těžko obhajitelné jen ubytováním: vykopaná dělnická osada v Gíze je dimenzovaná zhruba na 20 000, ne na ${fmt(r.grandAll)}.`:`Při <b>${fmt1(totalShare)} %</b> populace je to velké, ale blízko tomu, co by vykopaná osada mohla reálně ubytovat.`;

  $('obj4Rate').textContent=fmt1(r.rate);

  /* 05 - corvee supply */
  const shiftMonths = r.days/30;
  const shiftsPerYear = 12/Math.max(shiftMonths,1);
  const pool = r.grandAll*shiftsPerYear;
  const poolShare = pool/1_550_000*100;
  $('obj5Total').textContent=fmt(r.grandAll);
  $('obj5Days').textContent=fmt(r.days);
  $('obj5Pool').textContent=fmt(pool);
  $('obj5PoolPct').textContent=fmt1(poolShare)+'%';
  $('obj5Verdict').innerHTML = poolShare>=40
    ?`Stáhnout do dvou desetiletí sezónní stavby <b>${fmt1(poolShare)} %</b> celé populace — mužů, žen i dětí — není pracovní odvod, je to plná mobilizace. Egyptské zemědělství by muselo fungovat s tím, kdo zůstal.`: poolShare>=20
      ?`Při <b>${fmt1(poolShare)} %</b> celé populace to předpokládá, že téměř každý schopný muž pracuje dvě desetiletí každý rok na pyramidě. Pro silný stát možné; pro farmy velmi tvrdé.`:`<b>${fmt1(poolShare)} %</b> populace po dvě desetiletí je vážný, ale udržitelný odvod — zhruba takový režim model hlavního proudu popisuje.`;
  const ratioToMainstream=r.grandAll/22500;
  $('obj4Verdict').innerHTML = ratioToMainstream<=2
    ?`Při tomto nastavení je model už jen <b>${fmt1(ratioToMainstream)}×</b> od počtu hlavního proudu. Dostat se až tam vyžaduje jen <b>${fmt1(r.rate*ratioToMainstream)} mm/h</b> — skromná rezerva nad žulovým číslem a u měkčího vápence uvěřitelná.`:`Aby model dosáhl 22 500, musí klesnout <b>${fmt1(ratioToMainstream)}×</b>. Kdyby to přišlo jen z rychlosti řezání, vápenec by se musel řezat rychlostí <b>${fmt1(r.rate*ratioToMainstream)} mm/h</b> — neuvěřitelné. V praxi by se mezera musela zavřít několika předpoklady naráz: rychlejší vápenec, delší rozpětí, víc pracovních dnů a metoda dobývání, která pily vůbec nepoužívá. To je poctivý tvar toho problému.`;

  /* ── SCENARIO-SPECIFIC VERDICT ─────────────────────────
     Which preset the sliders are on (same test as the top
     switcher), then the figures that scenario stresses hardest.
     The five objections below this block stay the same for all
     four — these two paragraphs are what changes. */
  const presetKey=(()=>{
    let k=null;
    /* Compare against the live slider values, not `r` — the compute
       result carries derived figures and must not be assumed to echo
       the raw inputs back. */
    const live=read();
    Object.keys(PRESETS).forEach(n=>{
      const same=(PRESETS[n].how||'saw')===(live.how||'saw')
                 && CTRLS.every(c=>Math.abs(PRESETS[n][c]-live[c])<1e-6);
      if(same) k=n;
    });
    return k;
  })();
  const svBlades=Math.max(1,Math.round(r.cutters/2));
  const svStock=svBlades*SAW_KG/1000;
  const svMakeup=r.copperTonnes/(r.years||1);
  const svBirYear=BIR_NASIB_TOTAL/BIR_NASIB_YEARS;
  const svShiftMonths=Math.max(r.days/30,1);
  const svPool=r.grandAll*(12/svShiftMonths);
  const svPoolShare=svPool/1_550_000*100;
  const svFarmShare=r.farmers/1_550_000*100;
  const svSharePct=r.grandAll/1_550_000*100;

  const svNames={mainstream:'01 · Mainstream',yearround:'02 · Celoroční korvej',
    granite:'03 · Nejpomalejší řezání',surfacetrue:'04 · Drsný',
    solveyears:'05 · Ať to trvá, jak dlouho to trvá',split:'06 · Splitting, not sawing'};
  const svScen=$('svScen');
  svScen.textContent=presetKey?svNames[presetKey]:'Vlastní nastavení';
  svScen.classList.toggle('custom',!presetKey);
  /* Where a custom rig came from is worth saying: "Harsh + edited"
     is far more useful than a bare "Custom". */
  if(!presetKey && typeof nearestPreset==='function'){
    const near=nearestPreset(read());
    if(near) svScen.textContent='Upraveno z '+svNames[near].replace(/^\d+ · /,'');
  }

  const svText={
    mainstream:{
      press:'Řezání — rychlost pily a 120denní sezóna dohromady',
      holds:'The recruitment window — 25–26% of the population is a heavy levy, but it is a levy a state can actually make',
      lede:`Everything in this scenario is published, which is what makes it the awkward one: the arithmetic closes only if <em>${fmt(r.grandAll)} people</em> — about <em>${fmt1(r.grandAll/22500)}×</em> the 22,500 headcount and <em>${fmt1(svSharePct)}%</em> of the country — work on it for <em>${r.years} years</em>.`,
      obj:`Cutting is not the cheapest thing to doubt here, it is the <em>hardest</em>. Stocks' rate is a measurement on granite, the hardest stone on site, so understating it helps the mainstream case; and the season is documented, not assumed — Merer's logbook runs July to November. Push either lever and you are arguing against evidence rather than filling a gap. What the at-the-resource numbers show is the shape of the bind: <b>${fmt(svStock)} tonnes</b> of copper standing in blades at once, <b>${fmt(svMakeup)} t</b> worn away every year against a Sinai average of <b>~${fmt1(svBirYear)} t</b>, and <b>${fmt(r.farmers)} farmers</b> — <b>${fmt1(svFarmShare)}%</b> of Egypt — growing grain for one building.`,
      escape:`Reach <b>25,000</b> from here and limestone has to cut at <b>${fmt1(r.rate*r.grandAll/25000)} mm/hr</b>, roughly <em>${fmt1((r.rate*r.grandAll/25000)/r.rate)}×</em> this scenario's own rate. That is a big, testable claim nobody has run an experiment on. The softer version of the same escape: much of the pyramid's core may have been split along bedding planes rather than sawn, which removes most of the saw-hours without contradicting a single published number.`
    },
    yearround:{
      press:'Zásobování — obilí a farmy, když je kalendář volný',
      holds:'Řezání — když z harmonogramu vytlačíte sezónu, rychlost pily zůstane nedotčená',
      lede:`This is the most generous reading anyone puts forward, and it still lands at <em>${fmt(r.grandAll)}</em> — <em>${fmt1(r.grandAll/22500)}×</em> the headcount, <em>${fmt1(svSharePct)}%</em> of the population, sustained for two decades.`,
      obj:`Working 300 days instead of 120 solves the calendar problem completely — and moves the problem somewhere harder to argue about. Grain is bought with labour all year now, so the farm count only falls to <b>${fmt(r.farmers)}</b> (<b>${svFarmShare.toFixed(1)}%</b> of the population) while the crews that eat it keep working through the flood season with nobody home to tend the fields. The corvée also has to be <em>rotating</em>, and at this intensity that means drawing in roughly <b>${fmt(svPool)}</b> individuals — <b>${fmt1(svPoolShare)}%</b> of everyone in Egypt — when the mainstream number is 20,000–30,000.`,
      escape:`The cleanest escape is not faster cutting — you barely need it. At a <b>${fmt1(r.rate)} mm/hr</b> rate this scenario is already within <b>${fmt1(r.grandAll/25000)}×</b> of 25,000, so the remaining gap is closeable by any two of: softer-stone rates, a longer span, a lower support ratio, or a quarrying method that skips saws. What it cannot paper over is that year-round corvée contradicts the seasonality Merer's logbook records.`
    },
    granite:{
      press:'Copper — blades in use, standing stock, and annual make-up',
      holds:'The calendar — this scenario is still seasonal, so the labour pool problem does not compound',
      lede:`Take the slowest defensible saw with everything else mainstream, and the cutters alone need <em>${fmt(r.cutters)}</em>. The total is <em>${fmt(r.grandAll)}</em>: <em>${fmt1(r.grandAll/22500)}×</em> the headcount, <em>${fmt1(svSharePct)}%</em> of Egypt.`,
      obj:`The copper objection stops being rhetorical here. <b>${fmt(svBlades)} blades</b> in simultaneous use is a standing stock of <b>${fmt(svStock)} tonnes</b> — a little over <b>80%</b> of the entire estimated lifetime output of Bir Nasib, <b>5,000 t in 1,300 years</b> — and the wear has to be replaced at <b>${fmt(svMakeup)} t a year</b>, which is <b>${fmt1(svMakeup/svBirYear)}×</b> an average Sinai year. This scenario is the one that makes the model's weak link visible: not how many men you can find, but whether the metal to keep them sawing can exist at all.`,
      escape:`Everything relaxes the moment the rate is wrong in the generous direction, and this is the scenario where a single measured limestone rate would do the most damage. If limestone cuts <b>3×</b> faster than this granite figure — plausible, untested — the total falls to roughly <b>${fmt(r.grandAll/3.3)}</b>, and the copper problem shrinks with it. The other escape is method: wedge-split blocks remove the saw-hour demand instead of meeting it.`
    },
    surfacetrue:{
      press:'Ta mezera sama — tři ústupky naskládané a pořád se nezavírá',
      holds:'Reign length — 23 years is the top of the credible range, so this scenario has already spent its best card',
      lede:`Every generous lever at once — slow saw <em>${fmt1(r.rate)} mm/hr</em>, long span <em>${r.years} years</em>, year-round <em>${r.days} days</em> — and the answer is still <em>${fmt(r.grandAll)}</em> people, <em>${fmt1(r.grandAll/22500)}×</em> the headcount and <em>${fmt1(svSharePct)}%</em> of Egypt.`,
      obj:`This scenario is the strongest case the mainstream has, and the interesting result is how little it buys. Stacking all three sensible concessions lands only <b>${fmt1(Math.abs(1-r.grandAll/MAINSTREAM_TOTAL)*100)}%</b> below the plain mainstream case — because the span and the season pull against each other: a longer build means more working days, the year-round corvée needed to use them means feeding everyone through the flood, and every extra day of grain has to be grown by someone. What survives here is the <b>${fmt(r.farmers)} farmers</b> and <b>${fmt1(svPoolShare)}%</b> of the population in the corvée pool. If the numbers are to close, they will not close through the calendar.`,
      escape:`Only two levers are left, and both are about <b>method</b> rather than effort: a limestone cutting rate several times faster than Stocks' granite measurement, or a quarrying technique that does not saw blocks at all. Either one breaks the model's load-bearing assumption; neither has been tested on Giza limestone with copper. That is the honest place to put your scepticism.`
    },
    solveyears:{
      press:'Politický čas — trůn, pokladna a obilná rezerva, které přežijí tři staletí',
      holds:'The workforce figure itself — by construction, 22,500 is exactly what this scenario delivers',
      lede:`Run the model backwards: hold the workforce at the published <em>22,500</em>, keep every other mainstream value, and let the calendar stretch. It stretches to <em>${r.years} years</em>.`,
      obj:`This scenario is the cleanest demonstration of what the workforce number actually costs. Nothing is tuned — the rate, the season, the hours and the rations are all the mainstream ones — so the only variable left is time, and time has to grow by <b>${fmt1(r.years/29)}×</b> Khufu's longest plausible reign to buy the published headcount. That is the trade in one line: <b>the people are free, the centuries are not.</b> A pyramid that takes ${r.years} years is not Khufu's monument in any ordinary sense — the pharaoh who commissioned it is a tradition by the time the casing is dressed, the administration that funded it has turned over many times, and every generation in between has to keep the quarry open, the copper flowing and the grain coming.`,
      escape:`There is no escape inside this scenario, by design — it is arithmetic, not advocacy. It does tell you where the real question sits, though. If a long build is politically impossible and a large workforce is archaeologically unattested, the resolution is almost certainly in the third variable this page holds fixed: <b>method</b>. Blocks that are split rather than sawn, and limestone that cuts far faster than the granite figure, both break the dependence on time and headcount at once. Notice too that the copper demand is unchanged: <b>${fmt(svMakeup)} t</b> a year worn away for <b>${r.years} years</b> — the same metal bill, spread thin.`
    },
    split:{
      press:'Method — the one lever on this page that is not effort',
      holds:'Logistics — transport, ramps, support and grain are untouched by how the stone is freed, so they now dominate the total',
      lede:`Mainstream in every respect except the saw. The workforce falls to <em>${fmt(r.grandAll)}</em> — <em>${fmt1(r.grandAll/22500)}×</em> the 22,500 headcount instead of 17×, and <em>${fmt1(svSharePct)}%</em> of the population instead of 25%. Cutters: <em>${fmt(r.cutters)}</em>, against <em>${fmt(MAP_SAW_CUTTERS)}</em> when every face is sawn.`,
      obj:`Two of this scenario's numbers are <b>mine, not published</b>: <b>${fmt1(SPLIT_MH_PER_M)} man-hours per metre</b> of wedge line and <b>${fmt1(SPLIT_DRESS_MH)} man-hours per face</b> of dressing. That is roughly one 10 cm hole every 15 cm, drilled and wedged, then the face dressed — plausible for limestone with copper and sand, but untested, in exactly the way the copper saw is untested on Giza limestone. Halve both and the total barely moves, because cutting is no longer where the labour is: <b>${fmt(r.cutters)}</b> cutters against <b>${fmt(r.transport+r.haul+r.support)}</b> in haulage, ramps and support. Note also that the model still charges <b>five faces per block</b> — split blocks still have to be squared — and that wedging works because Egyptian limestone has good bedding planes. Granite is a different argument, which is why the obelisk at Aswan was split in its bed and never moved.`,
      escape:`No escape is needed, and that is the point: this is the only scenario on the page that arrives in the same order of magnitude as the published headcount without touching the calendar, the season or the ration. What it does not do is get to <b>22,500</b> — it gets to <b>${fmt(r.grandAll)}</b>. The remaining gap is not a cutting problem at all; it is the cost of moving, raising, feeding and housing, which the mainstream figure has never included. If you want the mainstream number exactly, splitting is where the argument has to be settled, not which lever to pull.`
    }
  };
  const sv = presetKey ? svText[presetKey] : null;
  if(sv){
    $('svPress').textContent=sv.press;
    $('svHolds').textContent=sv.holds;
    $('svLede').innerHTML=sv.lede;
    $('svObj').innerHTML=sv.obj;
    $('svEscape').innerHTML=sv.escape;
  } else {
    $('svPress').textContent='Dáno tím, co jste změnili';
    $('svHolds').textContent='—';
    $('svLede').innerHTML=`These sliders match none of the six scenarios, so there is no fixed story to tell: at <b>${fmt(r.grandAll)} people</b> the page is <b>${fmt1(r.grandAll/22500)}×</b> the headcount and <b>${fmt1(svSharePct)}%</b> of the population. Pick a scenario at the top of the page to get its specific reading.`;
    $('svObj').innerHTML=`Ať se součet pohnul kterýmkoli způsobem, námitka, která roste s ním, je zásobování: <b>${fmt(r.farmers)} rolníků</b> (<b>${fmt1(svFarmShare)} %</b> Egypta) a <b>${fmt(svMakeup)} t</b> mědi ročně. Pět námitek níže platí pro každé nastavení.`;
    $('svEscape').innerHTML=`Dostat se odtud na 25 000 vyžaduje buď rychlost řezání <b>${fmt1(r.rate*r.grandAll/25000)} mm/h</b> — <b>${fmt1(r.grandAll/25000)}×</b> oproti současnému nastavení — nebo metodu, která bloky nikdy neřeže pilou.`;
  }
  /* ── COPPER POWDER (oxide) SECTION ─────────────────────
     Copper worn off the blades, per Stocks' measured 52 cm³ per
     14-hour cut, scaled by this page's own saw-hours. The per-day
     figure is what makes the claim testable: it is small enough to
     be missed, large enough to expect an archaeological trace. */
  const powderCm3=r.totalSawHours*(52/14);
  const powderT=powderCm3*CU_G_CM3/1e6;
  const buildDays=Math.max(1,r.buildYears*r.days);
  const powderPerDay=powderT*1000/buildDays;
  /* Scenario 05 card: the solved calendar, and what it implies. */
  if(SOLVED_YEARS){
    const sy=SOLVED_YEARS, syDays=Math.max(1,(sy*12-r.prepMonths)/12*r.days);
    const syPerDay=TOTAL_BLOCKS/syDays, syMins=(r.hours*60)/syPerDay;
    const set=(id,v)=>{const el=$(id); if(el) el.innerHTML=v;};
    set('syYears', fmt(sy));
    set('syMult', fmt1(sy/29)+'×');
    set('syDyn', (sy/110)>=1.6 ? 'více než '+Math.floor(sy/110)+' times' : 'asi '+fmt1(sy/110)+'×');
    set('syPace', syMins>=120 ? fmt1(syMins/60)+' hours'
                             : fmt1(syMins)+' minutes');
    set('syKings', fmt1(sy/25));
  }
  $('cuPowder').textContent=fmt(powderT)+' tonnes';
  $('cuPerDay').textContent=fmt(powderPerDay)+' kg';
  /* Same quantity, quoted inside the prose paragraph. Written here so
     the sentence and the stat card can never drift apart. */
  if($('cuTons')) $('cuTons').textContent=fmt(powderT)+' tonnes';
  const cuScenText={
    mainstream:`All the wear figures are mainstream here — this is the scenario where the copper powder claim is <em>strongest</em>, because the cutting rate is Stocks' own measurement. <b>${fmt(powderT)} tonnes</b> of copper turns to oxide across the build, spread as <b>${fmt(powderPerDay)} kg a working day</b> over ${fmt(buildDays)} days. That is not a warehouse fire; it is a steady, diluted, site-wide dust — which is exactly the signature the 2024 harbour core found.`,
    yearround:`Same total copper (<b>${fmt(powderT)} tonnes</b>) as the mainstream case, since the metal worn depends on saw-hours rather than the calendar — but squeezed into ${fmt(r.days)} days a year, so the daily rate rises to <b>${fmt(powderT*1000/buildDays)} kg</b>. Year-round working makes the powder signal <em>denser and easier to detect</em>, not larger.`,
    granite:`This is the scenario that should have buried the site in powder. Saw-hours run ~3.6× the mainstream case, so the copper worn reaches <b>${fmt(powderT)} tonnes</b> — but it is spread over ${fmt(buildDays)} days at <b>${fmt(powderPerDay)} kg a day</b>. Two decades of cutting at 2.1 mm/hr should leave an expectation of copper-contaminated floors, sumps and spoil across the quarry and the working areas, and nothing of that mass has been reported. This is where absence bites hardest.`,
    surfacetrue:`The slowest saw means the most powder of any realistic setting — <b>${fmt(powderT)} tonnes</b> — spread over the longest span this model allows, ${fmt(buildDays)} days, at about <b>${fmt(powderPerDay)} kg a day</b>. If the powder argument holds anywhere, it holds here: this is the setting that most demands a copper-rich archaeological residue, and the residue reported so far is enrichment in harbour sediment, not a mass deposit.`,
    solveyears:`Stretching the calendar to <b>${r.years} years</b> does not reduce the copper by a single gram — total wear is set by saw-hours, which is set by the stone, not the schedule. It only thins the powder out: <b>${fmt(powderT)} tonnes</b> across ${fmt(buildDays)} days is <b>${fmt(powderPerDay)} kg a day</b>, the lowest daily rate of any setting here. A long enough build makes the copper harder to find without making it any smaller.`
  };
  const cuLine=$('cuScenLine');
  cuLine.innerHTML = presetKey ? (cuScenText[presetKey] || cuScenText.custom)
    : `At these settings the build wears about <b>${fmt(powderT)} tonnes</b> of copper off its blades — <b>${fmt(powderPerDay)} kg a working day</b> over ${fmt(buildDays)} days. Raise the cutting rate and the powder shrinks proportionally; slow the saw and the expectation grows.`;
  $('svCu').innerHTML=fmt(svStock)+' t<small>'+fmt(svBlades)+' blades in use</small>';
  $('svCuYr').innerHTML=fmt(svMakeup)+' t<small>'+fmt1(svMakeup/svBirYear)+'× a Sinai year</small>';
  $('svFarm').innerHTML=fmt(r.farmers)+'<small>'+svFarmShare.toFixed(1)+'% of the population</small>';
  $('svPool').innerHTML=(svPoolShare>=100?'<b>':'')+fmt(svPool)+'</b><small>'+fmt1(svPoolShare)+'% of the population</small>';
  $('svNeed').innerHTML=fmt1(r.rate*r.grandAll/25000)+' mm/hr<small>'+fmt1(r.grandAll/25000)+'× the current rate</small>';
  $('svShare').innerHTML=fmt1(svSharePct)+'%<small>'+fmt(r.grandAll)+' people</small>';
  const svCuBox=$('svCu').closest('.sv-item'), svPoolBox=$('svPool').closest('.sv-item'), svShareBox=$('svShare').closest('.sv-item');
  [svCuBox,svPoolBox,svShareBox].forEach(el=>{el.className='sv-item';});
  if(svStock/BIR_NASIB_TOTAL>=0.5) svCuBox.classList.add('hot');
  if(svPoolShare>=100) svPoolBox.classList.add('hot'); else if(svPoolShare>=40) svPoolBox.classList.add('warn');
  if(svSharePct>=50) svShareBox.classList.add('hot'); else if(svSharePct>=15) svShareBox.classList.add('warn');

  $('weakPoint').innerHTML=`Vše se odvíjí od <b>rychlosti řezání</b>. Výchozí hodnota (${fmt1(r.rate)} mm/h) je Stocksovo měření na <i>žule</i> — nejtvrdším kameni pyramidy, který tvoří jen 0,1 % jejího objemu. Většina pyramidy je měkký vápenec, který se řeže rychleji. Kdyby skutečné rychlosti u vápence byly <b>2–3×</b> vyšší, počet řezačů klesne stejným faktorem. Ten jediný neznámý pohybuje výsledkem víc než kterýkoli jiný jezdec a s gízským vápencem a měděnou pilou neběžel žádný experiment.`;
}

/* The closest named scenario to the current sliders — used only to
   label a custom rig ("edited from Harsh"), never to claim a match. */
function nearestPreset(o){
  let best=null, bestD=Infinity;
  Object.keys(PRESETS).forEach(n=>{
    const p=PRESETS[n]; if(!p) return;
    let d=0, n2=0;
    CTRLS.forEach(k=>{
      if(p[k]==null) return;
      const el=$(k); const span=(+el.max-+el.min)||1;
      d+=Math.pow((o[k]-p[k])/span,2); n2++;
    });
    d=Math.sqrt(d/n2);
    if(d<bestD){ bestD=d; best=n; }
  });
  return bestD<0.28?best:null;
}

/* Safe accessor for CURRENT_TAB from functions that run before its
   declaration is initialised. */
function currentTab(){
  try{ return (typeof CURRENT_TAB!=='undefined') ? CURRENT_TAB : 'overview'; }
  catch(e){ return 'overview'; }
}

function update(){
  const o=read();
  const outs={rate:' mm/hr',block:' m',years:' yr',hours:' h',days:' d',support:'×',tripMin:' min',
    kgPerDay:' kg',tPerFarmer:' t',prepMonths:' mo',prepM3PerDay:' m³/d'};
  Object.keys(outs).forEach(k=>{const el=$(k+'Ven');if(el)el.textContent=fmt1(o[k])+outs[k];});

  const r=compute(o);
  /* CURRENT_TAB is a `const` declared further down; read it through
     this helper so update() never hits the temporal dead zone at
     first paint (which used to abort every renderer after this line). */
  renderHero(r); renderSticky(r); renderBars(r); renderColumn(r,currentTab(),false);
  renderGround(r); renderCutting(r); renderCopper(r); renderMoving(r);
  renderFeeding(r); renderVerdict(r);

  syncScenarios(o);

  /* Persist the live state so returning visitors land where they left
     off, and mirror it into the URL so the current view is shareable. */
  try{
    localStorage.setItem('pyramid-state',JSON.stringify({
      settings:Object.fromEntries(CTRLS.map(k=>[k,o[k]])),
      tab:(typeof CURRENT_TAB!=='undefined'?CURRENT_TAB:'overview')
    }));
  }catch(e){}
  if(typeof syncUrl==='function') syncUrl();
}

/* ── SCENARIO UI ─────────────────────────────────────────
   One active scenario description at a time, keyed to whichever
   preset the sliders currently match. Any manual drift from a
   preset drops back to a neutral "custom" note instead of
   leaving a description on screen that no longer describes the
   numbers.
   ─────────────────────────────────────────────────────── */
function syncScenarios(o){
  let active=null;
  document.querySelectorAll('[data-preset]').forEach(b=>{
    const p=PRESETS[b.dataset.preset];
    const on = !!p && (p.how||'saw')===(o.how||'saw')
               && CTRLS.every(k=>Math.abs(p[k]-o[k])<1e-6);
    if(on) active=b.dataset.preset;
    b.classList.toggle('on',on);
    b.setAttribute('aria-pressed',on?'true':'false');
  });
  let shown=false;
  document.querySelectorAll('.scen-card').forEach(c=>{
    const on = c.dataset.scen===active;
    c.classList.toggle('on',on); if(on) shown=true;
  });
  const cs=$('scenCustom');
  if(cs) cs.classList.toggle('on',!shown);
  const note=$('scenNote');
  if(note) note.textContent = shown
    ? 'Each scenario is a fixed set of published assumptions. Edit any slider below and it becomes a custom set.'
    : 'Vlastní nastavení — nejblíž scénáři, ze kterého jste vyšli.';
}

const ORDER=['overview','ground','cutting','copper','moving','feeding','verdict','sources'];
function showTab(name,animate){
  if(!ORDER.includes(name)) name='overview';
  const changed = name!==CURRENT_TAB;
  CURRENT_TAB=name;
  ORDER.forEach(t=>{
    const on = t===name;
    const panel=$('p-'+t), tab=document.querySelector(`.tab[data-t="${t}"]`);
    panel.classList.toggle('on',on);
    /* Assistive tech: hidden panels must not be reachable by Tab, and
       a visible panel must announce itself as the active tabpanel. */
    panel.setAttribute('aria-hidden', on?'false':'true');
    if(on){ panel.removeAttribute('inert'); } else { panel.setAttribute('inert',''); }
    tab.classList.toggle('on',on);
    tab.setAttribute('aria-selected',on?'true':'false');
    tab.tabIndex = on?0:-1;
  });
  /* Keep any ?state= in the address bar when switching sections. */
  const _sp=new URLSearchParams(location.search), _q=_sp.toString();
  history.replaceState(null,'',(_q?'?'+_q:'')+'#'+name);
  if(changed) renderColumn(compute(read()),name,!!animate);
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>showTab(t.dataset.t,true)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.go,true)));

CTRLS.forEach(k=>$(k).addEventListener('input',update));
document.querySelectorAll('[data-preset]').forEach(b=>{
  b.addEventListener('click',()=>{const p=PRESETS[b.dataset.preset];if(!p)return;
    MODE = p.how==='split' ? 'split' : 'saw';
    CTRLS.forEach(k=>{
      /* A preset with a null field is solved at load time, never loaded
         raw — a null would blank the slider. */
      if(p[k]==null) return;
      $(k).value=p[k];
    });
    update();});
});

document.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select')) return;
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
    const cur=ORDER.findIndex(t=>$('p-'+t).classList.contains('on'));
    const next=cur+(e.key==='ArrowRight'?1:-1);
    if(next>=0&&next<ORDER.length){showTab(ORDER[next],true);e.preventDefault();}
  }
});

/* ── SHAREABLE STATE ─────────────────────────────────────
   Settings that differ from the Mainstream preset are written to
   the query string, so a link can carry "Harsh" or a custom rig
   to someone else. Defaults are omitted to keep links short; the
   page reads them back on load and re-applies them verbatim. */
const PARAMS=new URLSearchParams(location.search);
/* Boot flag: update() fires several times while the initial state is
   being assembled, and each call would rewrite the address bar before
   the #section has been read. URL syncing stays off until boot ends. */
let BOOTED=false;

function stateToParam(o){
  const base=PRESETS.mainstream, out=new URLSearchParams();
  CTRLS.forEach(k=>{ if(Math.abs(o[k]-base[k])>1e-9) out.set(k,o[k]); });
  if(o.how==='split') out.set('how','split');
  return out;
}
function paramToState(sp){
  const o=read();
  CTRLS.forEach(k=>{
    if(!sp.has(k)) return;
    const v=parseFloat(sp.get(k));
    const el=$(k);
    if(Number.isFinite(v) && v>=+el.min && v<=+el.max) o[k]=v;
  });
  if(sp.get('how')==='split') o.how='split';
  return o;
}
function syncUrl(){
  if(!BOOTED) return;                            // still booting
  if(typeof CURRENT_TAB==='undefined') return;
  const o=read();
  /* If the settings match a named scenario exactly, share the short
     ?preset= form instead of eleven numbers. */
  const matched=Object.keys(PRESETS).find(n=>PRESETS[n]
    && (PRESETS[n].how||'saw')===(o.how||'saw')
    && CTRLS.every(k=>PRESETS[n][k]!=null && Math.abs(PRESETS[n][k]-o[k])<1e-9));
  const sp=matched ? new URLSearchParams({preset:matched}) : stateToParam(o);
  const tab=CURRENT_TAB||'overview';
  const q=sp.toString();
  const url=location.pathname + (q?'?'+q:'') + '#' + tab;
  try{ history.replaceState(null,'',url); }catch(e){}
}

/* Card body text for a shared/custom setting, so the scenario
   block still says something true when the numbers match nothing. */
function applyState(o){
  CTRLS.forEach(k=>{ if(o[k]!=null) $(k).value=o[k]; });
  update();
}

function showShareBox(url){
  let box=$('shareBox');
  if(box){ box.querySelector('input').value=url; box.hidden=false; box.querySelector('input').select(); return; }
  box=document.createElement('div');
  box.id='shareBox'; box.className='share-box';
  box.innerHTML='<label for="shareUrl">Link to this exact view — copy it:</label>';
  const inp=document.createElement('input');
  inp.id='shareUrl'; inp.type='text'; inp.readOnly=true; inp.value=url; inp.spellcheck=false;
  const close=document.createElement('button');
  close.type='button'; close.textContent='Zavřít'; close.className='share-close';
  close.addEventListener('click',()=>{ box.hidden=true; });
  box.appendChild(inp); box.appendChild(close);
  $('scen').appendChild(box);
  inp.select();
}

/* Share: copy the live URL, with a graceful fallback for browsers
   without the clipboard API (iOS Safari over plain http, etc). */
const shareBtn=$('shareBtn');
if(shareBtn){
  shareBtn.addEventListener('click',async()=>{
    syncUrl();
    const url=location.href;
    let ok=false;
    try{ await navigator.clipboard.writeText(url); ok=true; }
    catch(e){
      try{
        const ta=document.createElement('textarea');
        ta.value=url; ta.setAttribute('readonly','');
        ta.style.cssText='position:absolute;left:-9999px';
        document.body.appendChild(ta); ta.select();
        ok=document.execCommand('copy'); ta.remove();
      }catch(e2){ ok=false; }
    }
    const old=shareBtn.dataset.label||shareBtn.textContent;
    shareBtn.dataset.label=old;
    if(ok){
      shareBtn.textContent='Odkaz zkopírován';
      shareBtn.classList.add('ok');
      setTimeout(()=>{ shareBtn.textContent=old; shareBtn.classList.remove('ok','fail'); },2200);
    } else {
      /* Nothing to copy with? Show the link itself, selected, so it can
         be copied by hand rather than just saying it failed. */
      showShareBox(url);
      shareBtn.classList.add('fail');
      setTimeout(()=>{ shareBtn.classList.remove('ok','fail'); },2200);
    }
  });
}

/* ── BOOT ────────────────────────────────────────────────
   Precedence: an explicit ?s= section wins for navigation, then any
   slider values in the query string, then the last visited state
   remembered locally, then the Mainstream default. */
const remembered=(()=>{
  try{ const v=localStorage.getItem('pyramid-state'); return v?JSON.parse(v):null; }
  catch(e){ return null; }
})();

/* ?preset=mainstream|yearround|granite|surfacetrue|solveyears loads a
   whole scenario by name — the short form of a share link. Explicit
   slider params win over it, so a custom rig can still be pinned. */
const namedPreset=PRESETS[PARAMS.get('preset')];
const fromUrl=paramToState(PARAMS);
const hasUrlState=CTRLS.some(k=>PARAMS.has(k));
if(namedPreset){
  MODE = namedPreset.how==='split' ? 'split' : 'saw';
  CTRLS.forEach(k=>{ if(namedPreset[k]!=null) $(k).value=namedPreset[k]; });
  update();
  if(hasUrlState) applyState(fromUrl); else syncUrl();
} else if(!hasUrlState && remembered && remembered.settings){
  applyState(remembered.settings);
} else {
  applyState(fromUrl);
}

/* Section: ?s= wins, then the #hash, then the remembered tab. */
const qs=(PARAMS.get('s')||decodeURIComponent(location.hash.replace(/^#/,''))).trim();
showTab(ORDER.includes(qs)?qs:((remembered&&remembered.tab&&!qs)?remembered.tab:'overview'));
BOOTED=true;
syncUrl();
})();
