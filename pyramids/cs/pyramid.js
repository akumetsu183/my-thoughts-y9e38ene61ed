/* Great Pyramid workforce model.
   Split out of index.html: the arithmetic in one file, the rendering in
   the same file, because they share a closure and splitting them across
   scripts would only trade one long file for two fragile ones. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const fmt  = n => Math.round(n).toLocaleString('cs-CZ');
const fmt1 = n => n.toLocaleString('cs-CZ',{maximumFractionDigits:1});
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

/* Short names and the price of each lever, used by the verdict table.
   Kept next to the presets so a new scenario cannot be added without
   appearing in the comparison. */
const PRESET_LABELS={
  mainstream:'Mainstream', yearround:'Celoroční robota', granite:'Nejpomalejší řezání',
  surfacetrue:'Drsné podmínky', solveyears:'Jak dlouho to bude trvat', split:'Štípání místo řezání'
};
const LEVER_NOTES={
  mainstream:'Zásobení mědí musí být reálné a lom musí pojmout 157 000 řezačů naráz.',
  yearround:'Na papíře se nic neobětuje — cena je, že nezbývá záplavové období na obdělávání půdy.',
  granite:'Předpokládá se, že vápenec se řeže jako žula, což nikdo neprokázal.',
  surfacetrue:'Nejpomalejší změřená pila plus nejdrsnější podmínky; zbytek udělá kalendář.',
  solveyears:'Aritmetika sedí a pyramida trvá 351 let — déle, než trvala Stará říše.',
  split:'Jediná páka, která nestojí nic, co byste museli obětovat: metoda, kterou tu nikdo netestoval.'
};
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
      `Štípání měděnou otázku neodpovídá, ale odstraňuje. Žádný list, žádný křemenný písek, žádná kaše — tedy žádné opotřebení, žádná zásoba ani roční doplňování, které musí ostatní scénáře obhájit. Zůstává opotřebení dlát a tlouků na liniích klínů, což je náklad na údržbu nástrojů, ne průmyslový dodavatelský řetězec. <b>Tohle je jediný scénář, ve kterém přestává být otázka „kde je všechna ta měď?" fér</b> — protože tam není důvod, aby jí bylo tolik.`;
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
    body=`Štípání posouvá odpověď z <em>${fmt(MAINSTREAM_TOTAL)} lidí</em> na <em>${fmt(r.grandAll)}</em> — <em>${fmt1(share)} %</em> země místo 25 % a <em>${fmt1(r.grandAll/22500)}×</em> nad 22 500 místo 17×. Samotní řezači se zhroutí z <em>${fmt(sawCutters)}</em> na <em>${fmt(r.cutters)}</em>: osmdesátinásobný pokles, protože linie klínů uvolní stěnu naráz, kdežto pila po ní hodiny brousí. <b>Co se nehne, je všechno, co nikdy nebylo o pile</b> — ${fmt(r.transport)} v lomovém přesunu, ${fmt(r.haul)} na rampách, ${fmt(r.support)} v podpůrných profesích a ${fmt(r.farmers)} rolníků. Štípání odstraňuje nejtěžší technický problém na stránce a logistiku nechává stát. <b>Mezeru na 22 500 taky neuzavírá</b> — půlí ji, a ta zbylá polovina je právě ta, kterou hlavní odhady obvykle vynechávají.`;
  } else if(ratio>=1.5){
    body=`Při hlavním časovém plánu a změřené rychlosti řezání potřebujete <em>${fmt(r.grandAll)} lidí</em> — <em>${fmt1(share)} %</em> země — po ${r.years} let v řadě, z toho ${r.prepMonths} měsíců je jen díra v zemi. Archeologie říká 20 000–30 000. Aritmetika říká <em>${fmt1(ratio)}×</em> tolik, chce <em>${fmt(r.copperTonnes)} tun</em> mědi a potřebuje <em>${fmt(r.farmers)} rolníků</em>, aby je uživili. Návrat na 25 000 by vyžadoval rychlost řezání <em>${fmt1(needRate)} mm/h</em> — to s mědí a pískem nikdo nepředvedl.`;
  } else if(ratio>=0.8){
    body=`Při tomhle nastavení se pracovní síla dostane na <em>${fmt(r.grandAll)} lidí</em>, tedy do hlavního rozsahu. Stálo to ${fmt1(r.rate)} mm/h řezání, ${r.hours} hodin denně, ${r.days} dnů v roce, ${r.prepMonths} měsíců příprav a poměr podpory ${fmt1(r.support)} — optimistický konec každého předpokladu naráz. Hlavní číslo je dosažitelné; jen ne robustně.`;
  } else {
    body=`Při tomhle nastavení potřebujete jen <em>${fmt(r.grandAll)} lidí</em> — <em>${fmt1(1/ratio)}×</em> levněji než hlavní odhad. To je podezřelé na druhou stranu. Tak nízké číslo znamená, že se něco rozdalo, obvykle rychlost řezání daleko za vším, co bylo změřeno.`;
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

  /* One sentence, one message. Writing "needs <b>none</b> of copper" leaves the
     translator a word that cannot be made grammatical in Czech ("nepotřebuje
     žádnou měď" needs a negated verb), so the whole sentence is translatable. */
  $('obj1Lead').innerHTML = r.splitMode
    ?`Při štípání není na dně lomu potřeba <b>žádná zásoba mědi</b> — kamene se nedotkne žádný list, takže se nic neobrušuje tak jako pila. Nahrazuje ji údržba nástrojů: tlouky a dláta se tupí na liniích klínů i při zarovnávání, což je náklad dílny, ne průmyslový dodavatelský řetězec.`:`Projekt potřebuje <b>${fmt(stockTonnes)} tun</b> mědi na dně lomu v každém okamžiku a ročně asi <b>${fmt(makeupPerYear)} t</b> na její obnovu. Listy se překovávaly, nevyhazovaly, takže kov cirkuloval — ale cirkulace pořád potřebuje zásobu a k tomu huť a kovárnu, které běží nepřetržitě vedle stavby.`;
  $('obj1Mult').textContent = r.splitMode ? '—' : fmt1(makeupMult)+'×';
  if(r.splitMode){
    /* Printing "0 blades / 0x an average Sinai year" would be arithmetically
       true and rhetorically useless. Under splitting the objection does not
       get a low score — it stops applying. */
    $('obj1Verdict').innerHTML =
      `Není co najít, protože se nevyrábí žádná brusná kaše. Štípání uvolňuje blok podle vrstevní plochy klíny a vodou: proti kameni neběží žádný list, takže se do hlušiny neobrušuje měď a žádná podlaha dílny by neměla být zelená. <b>Námitka se tu nevyvrací — ruší se, a to je něco jiného.</b> Hlavní scénář tím není silnější; jen jeho verze s pilou jsou levnější než dřív, a to je poctivá formulace.`;
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
  if(r.splitMode){
    $('obj4Verdict').innerHTML =
      `Žádná rychlost tu nezbývá ke zvyšování: stěny se uvolňují jedním záběrem a model už má metodu na nejlevnější obhajitelné hodnotě. Zbylých <b>${fmt1(ratioToMainstream)}×</b> je <b>${fmt(r.transport)}</b> na lomovém přesunu, <b>${fmt(r.haul)}</b> na rampách, <b>${fmt(r.support)}</b> v podpůrných profesích a <b>${fmt(r.farmers)}</b> u obilí. Dostat se z ${fmt(r.grandAll)} na 22 500 není vůbec problém řezání — je to tvrzení o tom, kolik dopravy a zásobování stavba skutečně potřebovala, a tam se musí argument posunout.`;
  } else $('obj4Verdict').innerHTML = ratioToMainstream<=2
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
    solveyears:'05 · Ať to trvá, jak dlouho to trvá',split:'06 · Štípání místo řezání'};
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
      press:'Řezání — rychlost pily a 120denní sezona dohromady',
      holds:'Nábor — 25–26 % populace je těžká daň, ale daň, kterou stát skutečně umí vybrat',
      lede:`Všechno je v tomhle scénáři publikované, a právě proto je nepříjemný: aritmetika sedí jen tehdy, když na něm pracuje <em>${fmt(r.grandAll)} lidí</em> — asi <em>${fmt1(r.grandAll/22500)}×</em> nad 22 500 a <em>${fmt1(svSharePct)} %</em> země — po <em>${r.years} let</em>.`,
      obj:`Řezání tu není ta nejlevnější věc k pochybování, je ta <em>nejtěžší</em>. Stocksova rychlost je měření na žule, nejtvrdším kameni na stavbě, takže její podcenění hlavnímu scénáři pomáhá; a sezona je doložená, ne předpokládaná — Mererův deník běží od července do listopadu. Zatlačte na kteroukoli z těch pák a hádáte se proti evidenci, místo abyste zaplňovali mezeru. Čísla v místě zdroje ukazují tvar té pasti: <b>${fmt(svStock)} tun</b> mědi stojí najednou v listech, <b>${fmt(svMakeup)} t</b> se ročně obrousí proti sinajskému průměru <b>~${fmt1(svBirYear)} t</b> a <b>${fmt(r.farmers)} rolníků</b> — <b>${fmt1(svFarmShare)} %</b> Egypta — pěstuje obilí na jednu stavbu.`,
      escape:`Dostaňte se odsud na <b>25 000</b> a vápenec musí řezat <b>${fmt1(r.rate*r.grandAll/25000)} mm/h</b>, zhruba <em>${fmt1((r.rate*r.grandAll/25000)/r.rate)}×</em> rychlostí tohoto scénáře. To je velké a testovatelné tvrzení, na které nikdo neudělal experiment. Mírnější verze téhož úniku: velká část jádra pyramidy se možná štípala podle vrstevních ploch místo řezání, což odebere většinu hodin pily, aniž by odporovalo jedinému publikovanému číslu.`
    },
    yearround:{
      press:'Zásobování — obilí a pole, když je kalendář volný',
      holds:'Řezání — vytlačení sezony z rozvrhu nechává rychlost pily nedotčenou',
      lede:`Tohle je nejštědřejší čtení, jaké kdo předložil, a pořád vychází <em>${fmt(r.grandAll)}</em> — <em>${fmt1(r.grandAll/22500)}×</em> počet lidí, <em>${fmt1(svSharePct)} %</em> populace, a to po dvě desetiletí.`,
      obj:`Třista pracovních dnů místo 120 problém kalendáře úplně řeší — a posouvá problém tam, kde se o něm hádá těžší. Obilí se teď kupuje prací celý rok, takže počet rolníků klesne jen na <b>${fmt(r.farmers)}</b> (<b>${svFarmShare.toFixed(1)} %</b> populace), zatímco čety, které ho jedí, pracují i v záplavě a doma není nikdo, kdo by obdělával pole. Robota navíc musí být <em>rotační</em>, a v téhle intenzitě to znamená stáhnout zhruba <b>${fmt(svPool)}</b> jednotlivců — <b>${fmt1(svPoolShare)} %</b> všech lidí v Egyptě — když hlavní číslo je 20 000–30 000.`,
      escape:`Nejčistší únik není rychlejší řezání — to skoro nepotřebujete. Při rychlosti <b>${fmt1(r.rate)} mm/h</b> je scénář už <b>${fmt1(r.grandAll/25000)}×</b> od 25 000, takže zbylou mezeru zavře kterákoli dvě z těchhle: rychlosti na měkčím kameni, delší období, nižší poměr podpory, nebo metoda těžby bez pil. Co se zalepit nedá, je to, že celoroční robota odporuje sezonnosti, kterou Mererův deník zaznamenává.`
    },
    granite:{
      press:'Měď — listy v provozu, zásoba a roční doplňování',
      holds:'Kalendář — scénář zůstává sezonní, takže problém pracovních sil se nevrší',
      lede:`Vezměte nejpomalejší obhajitelnou pilu a všechno ostatní hlavní, a jen řezači potřebují <em>${fmt(r.cutters)}</em>. Součet je <em>${fmt(r.grandAll)}</em>: <em>${fmt1(r.grandAll/22500)}×</em> počet lidí, <em>${fmt1(svSharePct)} %</em> Egypta.`,
      obj:`Měděná námitka tu přestává být rétorická. <b>${fmt(svBlades)} listů</b> v souběžném provozu je zásoba <b>${fmt(svStock)} tun</b> — o málo víc než <b>80 %</b> celé odhadované produkce Bir Nasibu, <b>5 000 t za 1 300 let</b> — a opotřebení se musí nahrazovat <b>${fmt(svMakeup)} t ročně</b>, což je <b>${fmt1(svMakeup/svBirYear)}×</b> průměrný sinajský rok. Tenhle scénář ukazuje slabé místo modelu: ne kolik mužů seženete, ale jestli vůbec může existovat kov, který je udrží řezat.`,
      escape:`Všechno povolí ve chvíli, kdy je rychlost špatná tím štědrým směrem, a tady by jedno změřené číslo pro vápenec napáchalo nejvíc. Kdyby vápenec řezal <b>3×</b> rychleji než tenhle žulový údaj — což je plausible a neotestované — součet spadne na zhruba <b>${fmt(r.grandAll/3.3)}</b> a měděný problém se zmenší s ním. Druhý únik je metoda: štípané bloky poptávku po hodinách pily odstraňují, místo aby ji splnily.`
    },
    surfacetrue:{
      press:'Samotná mezera — tři ústupky narovnané a pořád se neuzavírá',
      holds:'Délka vlády — 23 let je strop věrohodného rozsahu, takže scénář už svou nejlepší kartu vyhodil',
      lede:`Všechny štědré páky naráz — pomalá pila <em>${fmt1(r.rate)} mm/h</em>, dlouhé období <em>${r.years} let</em>, celoročně <em>${r.days} dnů</em> — a odpověď je pořád <em>${fmt(r.grandAll)}</em> lidí, <em>${fmt1(r.grandAll/22500)}×</em> počet lidí a <em>${fmt1(svSharePct)} %</em> Egypta.`,
      obj:`Tohle je nejsilnější případ, jaký mainstream má, a zajímavý výsledek je, jak málo to koupí. Narovnání všech tří rozumných ústupků spadne jen <b>${fmt1(Math.abs(1-r.grandAll/MAINSTREAM_TOTAL)*100)} %</b> pod prostý hlavní scénář — protože období a sezona táhnou proti sobě: delší stavba znamená víc pracovních dnů, celoroční robota potřebná k jejich využití znamená uživit všechny přes záplavu a každý den obilí navíc musí někdo vypěstovat. Přežijí tu <b>${fmt(r.farmers)} rolníků</b> a <b>${fmt1(svPoolShare)} %</b> populace v robotním fondu. Pokud se čísla mají sejít, nesejdou se přes kalendář.`,
      escape:`Zbývají jen dvě páky a obě jsou o <b>metodě</b>, ne o úsilí: rychlost řezání vápence několikrát vyšší než Stocksovo měření na žule, nebo technika těžby, která bloky vůbec neřeže. Každá z nich rozbije nosný předpoklad modelu; ani jedna nebyla na gízském vápenci s mědí otestovaná. Tam patří vaše skepse.`
    },
    solveyears:{
      press:'Politický čas — trůn, pokladna a obilná rezerva, které přežijí tři století',
      holds:'Samotné číslo pracovních sil — konstrukčně je 22 500 přesně to, co scénář dodá',
      lede:`Pusťte model pozpátku: držte pracovní sílu na publikovaných <em>22 500</em>, nechte všechny ostatní hodnoty hlavní a nechte kalendář roztáhnout. Roztáhne se na <em>${r.years} let</em>.`,
      obj:`Tenhle scénář je nejčistší ukázka toho, co číslo pracovních sil vlastně stojí. Nic není laděné — rychlost, sezona, hodiny ani příděly nejsou hlavní — takže jediná zbývající proměnná je čas a čas musí narůst <b>${fmt1(r.years/29)}×</b> Chufuovy nejdelší věrohodné vlády, aby se publikovaný počet lidí koupil. Ten obchod v jedné větě: <b>lidé jsou zdarma, staletí ne.</b> Pyramida, která trvá ${r.years} let, není Chufuova památka v žádném obvyklém smyslu — faraon, který ji zadal, je v době dokončení obložení už tradicí, správa, která ji financovala, se mnohokrát vyměnila a každá generace mezi tím musí držet lom otevřený, měď proudící a obilí dodávané.`,
      escape:`Uvnitř tohohle scénáře únik není, a to záměrně — je to aritmetika, ne advokacie. Řekne vám ale, kde leží skutečná otázka. Pokud je dlouhá stavba politicky nemožná a velká pracovní síla archeologicky nedoložená, řešení je téměř jistě ve třetí proměnné, kterou tahle stránka drží pevně: <b>metoda</b>. Bloky štípané místo řezaných i vápenec řežící mnohem rychleji než žulový údaj rozbíjejí závislost na čase a na počtu lidí naráz. Všimněte si taky, že poptávka po mědi se nemění: <b>${fmt(svMakeup)} t</b> ročně obroušeno po <b>${r.years} let</b> — stejný účet za kov, jen rozředěný.`
    },
    split:{
      press:'Metoda — jediná páka na téhle stránce, která není o úsilí',
      holds:'Logistika — dopravu, rampy, podpůrné profese a obilí metoda uvolnění kamene nezmění, takže teď dominují součtu',
      lede:`Hlavní scénář ve všem kromě pily. Pracovní síla klesne na <em>${fmt(r.grandAll)}</em> — <em>${fmt1(r.grandAll/22500)}×</em> nad 22 500 místo 17×, a <em>${fmt1(svSharePct)} %</em> populace místo 25 %. Řezači: <em>${fmt(r.cutters)}</em>, proti <em>${fmt(MAP_SAW_CUTTERS)}</em>, když se každá stěna řeže.`,
      obj:`Dvě čísla tohohle scénáře jsou <b>moje, ne publikovaná</b>: <b>${fmt1(SPLIT_MH_PER_M)} člověkohodiny na metr</b> linie klínů a <b>${fmt1(SPLIT_DRESS_MH)} člověkohodiny na stěnu</b> zarovnání. To je zhruba jeden důlek o hloubce 10 cm každých 15 cm, navrtaný a naklínovaný, a pak zarovnaná stěna — plausible pro vápenec s mědí a pískem, ale neotestované, přesně tak, jak je měděná pila neotestovaná na gízském vápenci. Snižte obojí na polovinu a součet se sotva pohne, protože řezání už není tam, kde je práce: <b>${fmt(r.cutters)}</b> řezačů proti <b>${fmt(r.transport+r.haul+r.support)}</b> v dopravě, na rampách a v podpůrných profesích. Všimněte si taky, že model dál účtuje <b>pět stěn na blok</b> — štípané bloky se pořád musí zarovnat — a že klínování funguje, protože egyptský vápenec má dobré vrstevní plochy. Žula je jiný argument, a proto byl obelisk v Asuánu štípán ve svém loži a nikdy se nepohnul.`,
      escape:`Únik není potřeba, a to je právě pointa: je to jediný scénář na stránce, který se dostane do stejného řádu jako publikovaný počet lidí, aniž by sáhl na kalendář, sezonu nebo příděl. Co neudělá, je dostat se na <b>22 500</b> — dostane se na <b>${fmt(r.grandAll)}</b>. Zbylá mezera není vůbec problém řezání; je to cena za přesun, zdvihání, krmení a ubytování, kterou hlavní číslo nikdy nezahrnovalo. Jestli chcete hlavní číslo přesně, rozhoduje se to u štípání, ne u toho, kterou pákou zatáhnout.`
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
    $('svLede').innerHTML=`Tyhle posuvníky neodpovídají žádnému z šesti scénářů, takže není co vyprávět: při <b>${fmt(r.grandAll)} lidech</b> je stránka na <b>${fmt1(r.grandAll/22500)}×</b> počtu lidí a <b>${fmt1(svSharePct)} %</b> populace. Vyberte scénář nahoře na stránce a dostanete jeho konkrétní čtení.`;
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
    mainstream:`Tady jsou všechny údaje o opotřebení hlavní — v tomhle scénáři je tvrzení o měděném prachu <em>nejsilnější</em>, protože rychlost řezání je Stocksovo vlastní měření. <b>${fmt(powderT)} tun</b> mědi se během stavby přemění na oxid, rozložených jako <b>${fmt(powderPerDay)} kg na pracovní den</b> přes ${fmt(buildDays)} dnů. To není požár skladu; je to stálý, rozředěný prach po celém staveništi — přesně ten podpis, který našel vrt z přístavu z roku 2024.`,
    yearround:`Stejné celkové množství mědi (<b>${fmt(powderT)} tun</b>) jako v hlavním scénáři, protože opotřebený kov závisí na hodinách pily, ne na kalendáři — ale vtěsnané do ${fmt(r.days)} dnů v roce, takže denní dávka stoupne na <b>${fmt(powderT*1000/buildDays)} kg</b>. Celoroční práce dělá prachový signál <em>hustší a snadněji zachytitelný</em>, ne větší.`,
    granite:`Tohle je scénář, který měl staveniště zasypat prachem. Hodiny pily běží ~3,6× víc než v hlavním scénáři, takže opotřebená měď dosáhne <b>${fmt(powderT)} tun</b> — ale rozprostře se přes ${fmt(buildDays)} dnů po <b>${fmt(powderPerDay)} kg denně</b>. Dvě desetiletí řezání při 2,1 mm/h by měla zanechat očekávání mědí zamořených podlah, jímek a hlušiny v lomu i v pracovních prostorách, a nic z té masy hlášeno nebylo. Tady absence kouše nejvíc.`,
    surfacetrue:`Nejpomalejší pila znamená nejvíc prachu ze všech realistických nastavení — <b>${fmt(powderT)} tun</b> — rozprostřených přes nejdelší období, které model dovolí, ${fmt(buildDays)} dnů, zhruba <b>${fmt(powderPerDay)} kg denně</b>. Jestli prachový argument někde platí, tak tady: tohle nastavení nejvíc vyžaduje na měď bohatý archeologický zbytek, a to, co je hlášeno, je obohacení v přístavním sedimentu, ne hmotná vrstva.`,
    split:`Nic se tu neřeže, takže se nic neobrušuje: žádný list, žádný křemenný písek, žádná kaše a žádný oxidový prach, který by se hledal. Obohacení mědí a arsenem v jádru z přístavu tím přestává být důkazem o pilách vůbec — signál to pořád je, ale v tomhle scénáři ho musí vysvětlit údržba nástrojů, manipulace s rudou a kovozpracování, ne listy drtící vápenec. To není slabina geochemie; je to připomínka, že chemie nikdy neuměla ty dvě věci rozlišit.`,
    solveyears:`Roztažení kalendáře na <b>${r.years} let</b> nesníží měď ani o gram — celkové opotřebení určují hodiny pily, a ty určuje kámen, ne rozvrh. Jen prach rozředí: <b>${fmt(powderT)} tun</b> přes ${fmt(buildDays)} dnů je <b>${fmt(powderPerDay)} kg denně</b>, nejnižší denní dávka z celé stránky. Dost dlouhá stavba udělá měď hůř nalezitelnou, aniž by jí bylo méně.`
  };
  const cuLine=$('cuScenLine');
  cuLine.innerHTML = presetKey ? (cuScenText[presetKey] || cuScenText.custom)
    : `At these settings the build wears about <b>${fmt(powderT)} tonnes</b> of copper off its blades — <b>${fmt(powderPerDay)} kg a working day</b> over ${fmt(buildDays)} days. Raise the cutting rate and the powder shrinks proportionally; slow the saw and the expectation grows.`;
  $('svCu').innerHTML=fmt(svStock)+' t<small>'+fmt(svBlades)+' blades in use</small>';
  $('svCuYr').innerHTML=fmt(svMakeup)+' t<small>'+fmt1(svMakeup/svBirYear)+'× a Sinai year</small>';
  $('svFarm').innerHTML=fmt(r.farmers)+'<small>'+svFarmShare.toFixed(1)+'% of the population</small>';
  $('svPool').innerHTML=(svPoolShare>=100?'<b>':'')+fmt(svPool)+'</b><small>'+fmt1(svPoolShare)+'% of the population</small>';
  $('svNeed').innerHTML = r.splitMode
    ? '—<small>žádná pila se nepoužívá, takže není co zrychlovat</small>'
    : fmt1(r.rate*r.grandAll/25000)+' mm/hr<small>'+fmt1(r.grandAll/25000)+'× the current rate</small>';
  $('svShare').innerHTML=fmt1(svSharePct)+'%<small>'+fmt(r.grandAll)+' people</small>';
  const svCuBox=$('svCu').closest('.sv-item'), svPoolBox=$('svPool').closest('.sv-item'), svShareBox=$('svShare').closest('.sv-item');
  [svCuBox,svPoolBox,svShareBox].forEach(el=>{el.className='sv-item';});
  if(svStock/BIR_NASIB_TOTAL>=0.5) svCuBox.classList.add('hot');
  if(svPoolShare>=100) svPoolBox.classList.add('hot'); else if(svPoolShare>=40) svPoolBox.classList.add('warn');
  if(svSharePct>=50) svShareBox.classList.add('hot'); else if(svSharePct>=15) svShareBox.classList.add('warn');

  if(r.splitMode){
    $('weakPoint').innerHTML=`Všechno se tu odvíjí od <b>linie klínů</b>. Model účtuje <b>1,2 člověkohodiny na metr</b> navrtané a naklínované linie a <b>2 člověkohodiny</b> zarovnání na uvolněnou stěnu — moje vlastní odhady, nastavené vysoko, a na rozdíl od rychlostí pily ani nejsou měřené na žule. Žádný experiment neštípal gízský vápenec klíny a neměřil čas. Ale riziko nesedí v tom čísle: když obě snížíte na polovinu, součet se pohne o několik procent, protože řezání už není tam, kde je práce. Součty nesou doprava, rampy, podpůrné profese a obilí — a ty stojí na stejných předpokladech jako vždycky.`;
  } else $('weakPoint').innerHTML=`Vše se odvíjí od <b>rychlosti řezání</b>. Výchozí hodnota (${fmt1(r.rate)} mm/h) je Stocksovo měření na <i>žule</i> — nejtvrdším kameni pyramidy, který tvoří jen 0,1 % jejího objemu. Většina pyramidy je měkký vápenec, který se řeže rychleji. Kdyby skutečné rychlosti u vápence byly <b>2–3×</b> vyšší, počet řezačů klesne stejným faktorem. Ten jediný neznámý pohybuje výsledkem víc než kterýkoli jiný jezdec a s gízským vápencem a měděnou pilou neběžel žádný experiment.`;
}

/* ── THE SIX LEVERS, SIDE BY SIDE ───────────────────────
   Recomputed from PRESETS on every render, so the numbers in the table
   cannot drift from the numbers the sliders produce. The current row is
   highlighted only when the sliders still match that scenario exactly. */
function renderLeverTable(){
  const body=$('leverBody'); if(!body) return;
  const live=read();
  const active=Object.keys(PRESETS).find(n=>PRESETS[n]
    && (PRESETS[n].how||'saw')===(live.how||'saw')
    && CTRLS.every(k=>PRESETS[n][k]==null || Math.abs(PRESETS[n][k]-live[k])<1e-6));
  let html='';
  Object.keys(PRESETS).forEach((n,i)=>{
    const pr=PRESETS[n]; if(!pr) return;
    const r=compute(Object.assign({},pr));
    const ratio=r.grandAll/22500;
    const cls=ratio>=10?'hot':ratio>=3?'warn':'';
    const on=n===active?' on':'';
    html+=`<tr class="lv-row${on}" data-lever="${n}">`+
      `<td class="lv-n"><span class="lv-i">${String(i+1).padStart(2,'0')}</span>${PRESET_LABELS[n]||n}</td>`+
      `<td class="lv-v ${cls}">${fmt(r.grandAll)}</td>`+
      `<td class="lv-v ${cls}">${fmt1(ratio)}×</td>`+
      `<td class="lv-v">${fmt(r.cutters)}</td>`+
      `<td class="lv-c">${LEVER_NOTES[n]||''}</td></tr>`;
  });
  body.innerHTML=html;
  /* Row click loads that scenario: the table is an index, not decoration. */
  body.querySelectorAll('.lv-row').forEach(tr=>{
    tr.tabIndex=0; tr.setAttribute('role','button');
    tr.addEventListener('click',()=>{ const btn=document.querySelector(`[data-preset="${tr.dataset.lever}"]`); if(btn) btn.click(); });
    tr.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); tr.click(); } });
  });
  if($('leverFoot')){
    const ms=compute(Object.assign({},PRESETS.mainstream));
    const sp=compute(Object.assign({},PRESETS.split));
    $('leverFoot').innerHTML=`Pět z těch šesti si svou odpověď kupuje něčím, co by evidence musela obětovat — delším kalendářem, pomalejší pilou, drsnějším obdobím nebo ${fmt(ms.grandAll)} lidmi, které vykopané sídliště nepojme. Jen šestý si ji kupuje metodou: <b>${fmt(sp.grandAll)}</b> lidí, <b>${fmt1(ms.grandAll/sp.grandAll)}×</b> méně než hlavní scénář, a <b>${fmt1(sp.grandAll/22500)}×</b> publikovaného počtu lidí místo <b>${fmt1(ms.grandAll/22500)}×</b>. Mezeru to pořád neuzavírá. Nic na téhle stránce ne.`;
  }
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
  renderFeeding(r); renderVerdict(r); renderLeverTable();

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
