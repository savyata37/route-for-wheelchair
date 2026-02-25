import { useState, useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle, Accessibility, X, Clock, Ruler,
  Download, Share2, ChevronDown, ChevronUp, Info,
  MapPin, AlertCircle, CheckCircle,
  Shield, Menu, Wifi, Navigation2, Target, Camera, Bell, Trash2, ArrowUpDown,
} from 'lucide-react';

//.
// TYPES
//.

interface RouteSegment { coordinates:[number,number][]; accessibility:'safe'|'caution'|'hazard'; surface?:string; description?:string; }
interface RouteResult { segments:RouteSegment[]; totalDistance:number; estimatedTime:number; warnings:string[]; elevationProfile?:{distance:number;elevation:number}[]; }
interface HazardPoint { lat:number;lng:number;type:'hazard'|'caution'|'info';category:string;description:string;icon:string; }
interface SearchResult { id:string;name:string;displayName:string;lat:number;lng:number;type:string;accessibilityScore:number; }
interface IssueReport { id:string;lat:number;lng:number;type:'blocked_path'|'broken_ramp'|'pothole'|'wet_floor'|'no_elevator'|'other';description:string;timestamp:string;photoDataUrl?:string; }

//.
// CONSTANTS — KU DHULIKEL
//.

const KU_CENTER = { lat: 27.6196, lng: 85.5385 };
const STORAGE_KEY = 'ku-nav-reports';

const TILE_LAYERS: Record<string,{url:string;attribution:string}> = {
  dark:      { url:'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',   attribution:'© CartoDB © OSM' },
  streets:   { url:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',              attribution:'© OpenStreetMap' },
  satellite: { url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution:'© Esri' },
  terrain:   { url:'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',                attribution:'© OpenTopoMap' },
};
const ROUTE_COLORS = { safe:'#10b981', caution:'#f59e0b', hazard:'#ef4444' };
const MAP_STYLES = [
  {id:'dark',label:'Dark',emoji:'🌙'},
  {id:'streets',label:'Streets',emoji:'🗺️'},
  {id:'satellite',label:'Satellite',emoji:'🛰️'},
  {id:'terrain',label:'Terrain',emoji:'⛰️'},
];

const ACCESSIBILITY_CATEGORIES: Record<string,{label:string;emoji:string;color:string;severity:'info'|'caution'|'hazard'}> = {
  ramp:           {label:'Accessible Ramp',    emoji:'♿', color:'#10b981', severity:'info'},
  broken_ramp:    {label:'Broken Ramp',        emoji:'⚠️', color:'#f97316', severity:'hazard'},
  elevator:       {label:'Elevator',           emoji:'🛗', color:'#3b82f6', severity:'info'},
  no_elevator:    {label:'No Elevator',        emoji:'🚫', color:'#ef4444', severity:'caution'},
  washroom:       {label:'Accessible WC',      emoji:'🚻', color:'#8b5cf6', severity:'info'},
  wet_floor:      {label:'Wet / Slippery',     emoji:'💧', color:'#0ea5e9', severity:'caution'},
  pothole:        {label:'Pothole',            emoji:'🕳️', color:'#ef4444', severity:'hazard'},
  construction:   {label:'Construction',       emoji:'🚧', color:'#f59e0b', severity:'hazard'},
  stairs:         {label:'Stairs Only',        emoji:'🪜', color:'#ef4444', severity:'hazard'},
  narrow_path:    {label:'Narrow Path',        emoji:'↔️', color:'#f97316', severity:'caution'},
  tactile_paving: {label:'Tactile Paving',     emoji:'⬛', color:'#10b981', severity:'info'},
  bench:          {label:'Rest Bench',         emoji:'🪑', color:'#10b981', severity:'info'},
};

const ISSUE_TYPES: {value:IssueReport['type'];label:string;emoji:string}[] = [
  {value:'blocked_path', label:'Blocked Path',   emoji:'🚫'},
  {value:'broken_ramp',  label:'Broken Ramp',    emoji:'⚠️'},
  {value:'pothole',      label:'Pothole',         emoji:'🕳️'},
  {value:'wet_floor',    label:'Wet/Slippery',    emoji:'💧'},
  {value:'no_elevator',  label:'Elevator Down',   emoji:'🛗'},
  {value:'other',        label:'Other',           emoji:'📌'},
];

//.
// KU CAMPUS ACCESS POINTS (realistic mock)
//.

function getKUAccessibilityPoints(): HazardPoint[] {
  const c = KU_CENTER;
  return [
    {lat:c.lat+0.0010,lng:c.lng+0.0005, type:'info',   category:'ramp',          icon:'♿', description:'Accessible ramp — Main Gate entrance'},
    {lat:c.lat-0.0015,lng:c.lng-0.0010, type:'info',   category:'ramp',          icon:'♿', description:'Ramp at School of Engineering'},
    {lat:c.lat+0.0005,lng:c.lng-0.0020, type:'info',   category:'ramp',          icon:'♿', description:'Accessible ramp — Central Library'},
    {lat:c.lat+0.0020,lng:c.lng+0.0015, type:'info',   category:'elevator',      icon:'🛗', description:'Elevator — School of Management (3F)'},
    {lat:c.lat+0.0020,lng:c.lng+0.0015, type:'info',   category:'elevator',      icon:'🛗', description:'Elevator — School of Management (3F)'},
    {lat:c.lat-0.0005,lng:c.lng+0.0025, type:'info',   category:'elevator',      icon:'🛗', description:'Elevator — Admin Block'},
    {lat:c.lat+0.0000,lng:c.lng+0.0010, type:'info',   category:'washroom',      icon:'🚻', description:'Accessible washroom near canteen'},
    {lat:c.lat-0.0008,lng:c.lng-0.0030, type:'info',   category:'washroom',      icon:'🚻', description:'Accessible WC — Medical Block'},
    {lat:c.lat+0.0018,lng:c.lng-0.0005, type:'info',   category:'bench',         icon:'🪑', description:'Rest bench — amphitheatre area'},
    {lat:c.lat-0.0012,lng:c.lng+0.0018, type:'info',   category:'bench',         icon:'🪑', description:'Shaded bench — garden path'},
    {lat:c.lat+0.0025,lng:c.lng-0.0012, type:'info',   category:'tactile_paving',icon:'⬛', description:'Tactile paving — main corridor'},
    {lat:c.lat+0.0008,lng:c.lng+0.0030, type:'hazard', category:'pothole',       icon:'🕳️', description:'Large pothole — eastern campus road'},
    {lat:c.lat-0.0020,lng:c.lng+0.0008, type:'hazard', category:'pothole',       icon:'🕳️', description:'Uneven surface — back road to hostel'},
    {lat:c.lat+0.0030,lng:c.lng-0.0018, type:'hazard', category:'stairs',        icon:'🪜', description:'Stairs only — Science Block side entrance'},
    {lat:c.lat-0.0025,lng:c.lng-0.0015, type:'hazard', category:'stairs',        icon:'🪜', description:'Steep stairs — IT Building rear exit'},
    {lat:c.lat+0.0012,lng:c.lng+0.0020, type:'hazard', category:'broken_ramp',   icon:'⚠️', description:'Broken ramp surface — Sports Complex'},
    {lat:c.lat-0.0030,lng:c.lng+0.0005, type:'hazard', category:'construction',  icon:'🚧', description:'Construction zone — New Academic Block'},
    {lat:c.lat+0.0005,lng:c.lng-0.0012, type:'caution',category:'narrow_path',   icon:'↔️', description:'Narrow pathway — E-Block to cafeteria'},
    {lat:c.lat-0.0018,lng:c.lng+0.0030, type:'caution',category:'narrow_path',   icon:'↔️', description:'Tight passage — Civil Engineering Dept'},
    {lat:c.lat+0.0022,lng:c.lng+0.0000, type:'caution',category:'wet_floor',     icon:'💧', description:'Flood-prone walkway — basketball court'},
    {lat:c.lat-0.0010,lng:c.lng-0.0025, type:'caution',category:'no_elevator',   icon:'🚫', description:'No elevator — Pharmacy Building (3F)'},
  ];
}

//.
// SEARCH
//.

const KU_PLACES: SearchResult[] = [
  {id:'1', name:'Main Gate',             displayName:'KU Main Gate, Dhulikel',          lat:27.6208,lng:85.5375,type:'gate',    accessibilityScore:9},
  {id:'2', name:'Central Library',       displayName:'KU Central Library',               lat:27.6200,lng:85.5368,type:'library', accessibilityScore:8},
  {id:'3', name:'School of Engineering', displayName:'SoE, Kathmandu University',        lat:27.6190,lng:85.5380,type:'building',accessibilityScore:6},
  {id:'4', name:'Admin Block',           displayName:'Administrative Block, KU',         lat:27.6196,lng:85.5395,type:'admin',   accessibilityScore:8},
  {id:'5', name:'KU Hospital / KUSOM',   displayName:'KU Hospital & School of Medicine', lat:27.6180,lng:85.5355,type:'hospital',accessibilityScore:9},
  {id:'6', name:'Cafeteria',             displayName:'Main Cafeteria, KU Campus',        lat:27.6198,lng:85.5378,type:'food',    accessibilityScore:7},
  {id:'7', name:'Sports Complex',        displayName:'KU Sports Complex',                lat:27.6210,lng:85.5400,type:'sport',   accessibilityScore:5},
  {id:'8', name:'Amphitheatre',          displayName:'Open Amphitheatre, KU',            lat:27.6192,lng:85.5370,type:'venue',   accessibilityScore:7},
  {id:'9', name:'IT Building',           displayName:'Dept. of CS & IT, KU',            lat:27.6185,lng:85.5388,type:'building',accessibilityScore:6},
  {id:'10',name:'Hostel Area',           displayName:'Student Hostel Block, KU',         lat:27.6175,lng:85.5375,type:'hostel',  accessibilityScore:5},
  {id:'11',name:'Pharmacy Block',        displayName:'School of Pharmacy, KU',           lat:27.6202,lng:85.5360,type:'building',accessibilityScore:4},
  {id:'12',name:'Civil Engineering',     displayName:'Dept. of Civil Engineering, KU',  lat:27.6188,lng:85.5398,type:'building',accessibilityScore:6},
];

async function searchPlaces(q: string): Promise<SearchResult[]> {
  if (!q || q.length < 2) return [];
  const lq = q.toLowerCase();
  const local = KU_PLACES.filter(p => p.name.toLowerCase().includes(lq)||p.displayName.toLowerCase().includes(lq));
  if (local.length) return local;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q+' Dhulikel Nepal')}&limit=5`,{headers:{'User-Agent':'AccessNavKU/1.0'}});
    const data = await res.json();
    return data.map((item:any)=>({id:item.place_id?.toString()||Math.random().toString(),name:item.display_name?.split(',')[0]||'Unknown',displayName:item.display_name||'',lat:parseFloat(item.lat),lng:parseFloat(item.lon),type:item.type||'place',accessibilityScore:5}));
  } catch { return []; }
}

//.
// GEOMETRY & ROUTING
//.

function haversine(a:[number,number],b:[number,number]):number {
  const R=6371000, dLa=((b[0]-a[0])*Math.PI)/180, dLo=((b[1]-a[1])*Math.PI)/180;
  const la1=(a[0]*Math.PI)/180, la2=(b[0]*Math.PI)/180;
  const x=Math.sin(dLa/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLo/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

function estimateTime(dist:number,segs:RouteSegment[]):number {
  if(!segs.length) return dist/1.0;
  const n=segs.length, sr=segs.filter(s=>s.accessibility==='safe').length/n, cr=segs.filter(s=>s.accessibility==='caution').length/n, hr=segs.filter(s=>s.accessibility==='hazard').length/n;
  return dist/Math.max(sr*1.0+cr*0.65+hr*0.35,0.2);
}

function classifySeg(coords:[number,number][],hazards:HazardPoint[]):RouteSegment['accessibility'] {
  for(const h of hazards) for(const c of coords) if(haversine(c,[h.lat,h.lng])<30) return h.type==='hazard'?'hazard':h.type==='caution'?'caution':'safe';
  return 'safe';
}

function buildResult(coords:[number,number][],dist:number,hazards:HazardPoint[]):RouteResult {
  const n=Math.min(10,Math.max(3,Math.floor(coords.length/5))), chunk=Math.ceil(coords.length/n);
  const segs:RouteSegment[]=[];
  for(let i=0;i<coords.length-1;i+=chunk){
    const sl=coords.slice(i,Math.min(i+chunk+1,coords.length));
    if(sl.length<2)continue;
    const acc=classifySeg(sl,hazards);
    segs.push({coordinates:sl,accessibility:acc,surface:acc==='safe'?'Paved':'Unknown',description:acc==='safe'?'Clear accessible path':acc==='caution'?'Proceed carefully':'Accessibility barrier'});
  }
  const hc=segs.filter(s=>s.accessibility==='hazard').length, cc=segs.filter(s=>s.accessibility==='caution').length;
  const warns:string[]=[];
  if(hc) warns.push(`⚠️ ${hc} accessibility barrier${hc>1?'s':''} on this route`);
  if(cc) warns.push(`🔶 ${cc} caution area${cc>1?'s':''} — proceed with care`);
  warns.push('Verify accessibility features on ground');
  return {segments:segs,totalDistance:dist,estimatedTime:estimateTime(dist,segs),warnings:warns,
    elevationProfile:coords.map((_,i)=>({distance:(i/coords.length)*dist,elevation:780+Math.sin(i*0.3)*15}))};
}

async function calcRoute(start:L.LatLng,end:L.LatLng,hazards:HazardPoint[]):Promise<RouteResult> {
  try {
    const r=await fetch(`https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`);
    if(!r.ok) throw new Error();
    const data=await r.json(); const route=data.routes?.[0]; if(!route) throw new Error();
    const coords:[number,number][]=route.geometry.coordinates.map((c:number[])=>[c[1],c[0]]);
    return buildResult(coords,route.distance,hazards);
  } catch {
    const coords:[number,number][]=[];
    const mid=(start.lat+end.lat)/2;
    for(let i=0;i<=12;i++){const t=i/12;coords.push([start.lat+(mid-start.lat)*t,start.lng]);}
    for(let i=0;i<=12;i++){const t=i/12;coords.push([mid,start.lng+(end.lng-start.lng)*t]);}
    coords.push([end.lat,end.lng]);
    return buildResult(coords,start.distanceTo(end)*1.25,hazards);
  }
}

//.
// STORAGE
//.

function getReports():IssueReport[]{ try{const r=localStorage.getItem(STORAGE_KEY);return r?JSON.parse(r):[];}catch{return [];} }
function saveReport(r:Omit<IssueReport,'id'|'timestamp'>):IssueReport{
  const nr:IssueReport={...r,id:Math.random().toString(36).substr(2,9),timestamp:new Date().toISOString()};
  const all=getReports();all.push(nr);localStorage.setItem(STORAGE_KEY,JSON.stringify(all));return nr;
}
function deleteReport(id:string){localStorage.setItem(STORAGE_KEY,JSON.stringify(getReports().filter(r=>r.id!==id)));}

//.
// MAP ICONS
//.

function emojiIcon(emoji:string,size=34,bg='#1e293b'){
  return L.divIcon({className:'',
    html:`<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:2.5px solid rgba(255,255,255,0.95);box-shadow:0 3px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:${Math.floor(size*0.48)}px;">${emoji}</div>`,
    iconSize:[size,size],iconAnchor:[size/2,size/2]});
}

const markerA=L.divIcon({className:'',
  html:`<div style="width:34px;height:44px"><div style="width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#22c55e;border:3px solid white;box-shadow:0 4px 14px rgba(34,197,94,0.55);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:white;font-size:14px;font-weight:900">A</span></div><div style="width:5px;height:10px;background:#22c55e;margin:0 auto;border-radius:0 0 3px 3px;opacity:.7"></div></div>`,
  iconSize:[34,44],iconAnchor:[17,44]});

const markerB=L.divIcon({className:'',
  html:`<div style="width:34px;height:44px"><div style="width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#3b82f6;border:3px solid white;box-shadow:0 4px 14px rgba(59,130,246,0.55);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:white;font-size:14px;font-weight:900">B</span></div><div style="width:5px;height:10px;background:#3b82f6;margin:0 auto;border-radius:0 0 3px 3px;opacity:.7"></div></div>`,
  iconSize:[34,44],iconAnchor:[17,44]});

const myLocIcon=L.divIcon({className:'',
  html:`<div style="width:22px;height:22px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 3px rgba(59,130,246,.3);display:flex;align-items:center;justify-content:center"><div style="width:8px;height:8px;border-radius:50%;background:white"></div></div>`,
  iconSize:[22,22],iconAnchor:[11,11]});

//.
// SEARCH DROPDOWN
//.

function SearchDropdown({query,results,loading,onSelect,empty}:{query:string;results:SearchResult[];loading:boolean;onSelect:(r:SearchResult)=>void;empty:string}){
  if(!query||query.length<2) return null;
  return(
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden max-h-56 overflow-y-auto">
      {loading?<div className="p-3 flex items-center gap-2 text-slate-400 text-xs"><div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>Searching…</div>
      :results.length===0?<div className="p-3 text-slate-400 text-xs text-center">{empty}</div>
      :results.map(r=>(
        <button key={r.id} onClick={()=>onSelect(r)} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50 last:border-0">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0"/>
          <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-800 truncate">{r.name}</p><p className="text-xs text-slate-400 truncate">{r.displayName}</p></div>
          <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full shrink-0">{r.accessibilityScore}/10</span>
        </button>
      ))}
    </div>
  );
}

//.
// ROUTE INPUT PANEL
//.

function RouteInputPanel({startLabel,endLabel,onSetStart,onSetEnd,onSwap,onClear,onUseMyLoc,hasMyLoc,isRouting,onPinA,onPinB,settingMarker}:{
  startLabel:string;endLabel:string;onSetStart:(r:SearchResult)=>void;onSetEnd:(r:SearchResult)=>void;
  onSwap:()=>void;onClear:()=>void;onUseMyLoc:()=>void;hasMyLoc:boolean;isRouting:boolean;
  onPinA:()=>void;onPinB:()=>void;settingMarker:'A'|'B'|null;
}){
  const [sq,setSq]=useState('');const [eq,setEq]=useState('');
  const [sr,setSr]=useState<SearchResult[]>([]);const [er,setEr]=useState<SearchResult[]>([]);
  const [ss,setSs]=useState(false);const [es,setEs]=useState(false);
  const [focus,setFocus]=useState<'s'|'e'|null>(null);
  const st = useRef<NodeJS.Timeout | null>(null);
  const et = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sq.length < 2) {
      setSr([]);
      return;
    }
    if (st.current !== null) clearTimeout(st.current);
    st.current = setTimeout(async () => {
      setSs(true);
      setSr(await searchPlaces(sq));
      setSs(false);
    }, 400);
  }, [sq]);

  useEffect(() => {
    if (eq.length < 2) {
      setEr([]);
      return;
    }
    if (et.current !== null) clearTimeout(et.current);
    et.current = setTimeout(async () => {
      setEs(true);
      setEr(await searchPlaces(eq));
      setEs(false);
    }, 400);
  }, [eq]);

  const selS=(r:SearchResult)=>{onSetStart(r);setSq('');setSr([]);setFocus(null);};
  const selE=(r:SearchResult)=>{onSetEnd(r);setEq('');setEr([]);setFocus(null);};

  return(
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-1100 w-full max-w-lg px-4 pointer-events-none">
      <div className="bg-white/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 pointer-events-auto">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-3 border-b border-slate-50">
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-black">♿</div>
          <div className="flex-1">
            <h1 className="text-sm font-black text-slate-800">Saha Yatri</h1>
            <p className="text-xs text-slate-400">Kathmandu University · Dhulikel Campus</p>
          </div>
          {isRouting&&<div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold"><div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>Routing…</div>}
        </div>

        <div className="px-4 py-3 space-y-2">
          {/* START field */}
          <div className="relative">
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-all ${focus==='s'?'border-emerald-400 bg-emerald-50/40':'border-slate-200 bg-slate-50/80'}`}>
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm text-white text-xs font-black">A</div>
              <input className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400 min-w-0"
                placeholder={startLabel||'From: Search KU location…'} value={sq}
                onChange={e=>{setSq(e.target.value);setFocus('s');}} onFocus={()=>setFocus('s')}/>
              {hasMyLoc&&<button onClick={onUseMyLoc} title="Use GPS location" className="shrink-0 p-1 hover:bg-emerald-100 rounded-lg transition-colors"><Navigation2 className="w-3.5 h-3.5 text-emerald-600"/></button>}
              <button onClick={onPinA} className={`shrink-0 px-2 py-1 rounded-lg text-xs font-bold transition-colors ${settingMarker==='A'?'bg-emerald-500 text-white':'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}>
                {settingMarker==='A'?'📍 Tap map':'Pin A'}
              </button>
            </div>
            <SearchDropdown query={sq} results={sr} loading={ss} onSelect={selS} empty="No KU locations found"/>
          </div>

          {/* Swap */}
          <div className="flex justify-center">
            <button onClick={onSwap} className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors" title="Swap A & B"><ArrowUpDown className="w-3.5 h-3.5 text-slate-500"/></button>
          </div>

          {/* END field */}
          <div className="relative">
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-all ${focus==='e'?'border-blue-400 bg-blue-50/40':'border-slate-200 bg-slate-50/80'}`}>
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0 shadow-sm text-white text-xs font-black">B</div>
              <input className="flex-1 bg-transparent outline-none text-sm text-slate-800 placeholder:text-slate-400 min-w-0"
                placeholder={endLabel||'To: Search destination or tap map…'} value={eq}
                onChange={e=>{setEq(e.target.value);setFocus('e');}} onFocus={()=>setFocus('e')}/>
              <button onClick={onPinB} className={`shrink-0 px-2 py-1 rounded-lg text-xs font-bold transition-colors ${settingMarker==='B'?'bg-blue-500 text-white':'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                {settingMarker==='B'?'📍 Tap map':'Pin B'}
              </button>
            </div>
            <SearchDropdown query={eq} results={er} loading={es} onSelect={selE} empty="No KU locations found"/>
          </div>
        </div>

        <div className="px-4 pb-3 text-center">
          {settingMarker?<span className="text-xs text-blue-600 font-semibold animate-pulse">👆 Tap the map to place marker {settingMarker}</span>
          :startLabel&&endLabel?<button onClick={onClear} className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium">✕ Clear route</button>
          :<span className="text-xs text-slate-400">Search above or click "Pin A / Pin B" to tap the map</span>}
        </div>
      </div>
    </div>
  );
}

//.
// LEGEND PANEL
//.

function LegendPanel(){
  const [open,setOpen]=useState(false);
  return(
    <div className="absolute bottom-6 left-4 z-1000">
      {!open?<button onClick={()=>setOpen(true)} className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg px-3 py-2.5 hover:bg-white border border-slate-100 flex items-center gap-2 text-xs font-bold text-slate-700"><Info className="w-4 h-4 text-slate-500"/>Legend</button>
      :(
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-72 max-h-[78vh] overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white">
            <h3 className="font-black text-slate-800 text-sm">♿ Accessibility Map</h3>
            <button onClick={()=>setOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-3.5 h-3.5 text-slate-500"/></button>
          </div>
          <div className="p-4 space-y-4">
            {[{title:'✅ Accessible Features',filter:'info'},{title:'⚠️ Caution Areas',filter:'caution'},{title:'🚫 Hazards',filter:'hazard'}].map(({title,filter})=>(
              <div key={filter}>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{title}</p>
                <div className="space-y-1.5">
                  {Object.entries(ACCESSIBILITY_CATEGORIES).filter(([,v])=>v.severity===filter).map(([k,v])=>(
                    <div key={k} className="flex items-center gap-2.5">
                      <span className="text-base w-6 text-center">{v.emoji}</span>
                      <span className="text-xs text-slate-700 flex-1">{v.label}</span>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{background:v.color}}/>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Route Colors</p>
              {[{c:'#10b981',l:'Accessible Path'},{c:'#f59e0b',l:'Caution'},{c:'#ef4444',l:'Barrier / Hazard'}].map(({c,l})=>(
                <div key={l} className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-1.5 rounded-full shrink-0" style={{background:c}}/>
                  <span className="text-xs text-slate-700">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

//.
// ROUTE RESULT PANEL
//.

function RoutePanel({route,startLabel,endLabel,onClose,startCoords,endCoords}:{
  route:RouteResult;startLabel:string;endLabel:string;onClose:()=>void;
  startCoords?:{lat:number;lng:number};endCoords?:{lat:number;lng:number};
}){
  const [showElev,setShowElev]=useState(false);const [showSegs,setShowSegs]=useState(false);
  const distM=route.totalDistance<1000?`${Math.round(route.totalDistance)} m`:`${(route.totalDistance/1000).toFixed(2)} km`;
  const distKm=(route.totalDistance/1000).toFixed(2);
  const mins=Math.ceil(route.estimatedTime/60);
  const timeStr=mins>=60?`${Math.floor(mins/60)}h ${mins%60}m`:`${mins} min`;
  const n=route.segments.length||1;
  const sp=Math.round(route.segments.filter(s=>s.accessibility==='safe').length/n*100);
  const cp=Math.round(route.segments.filter(s=>s.accessibility==='caution').length/n*100);
  const hp=Math.round(route.segments.filter(s=>s.accessibility==='hazard').length/n*100);
  const oc=hp>30?'#ef4444':cp>40?'#f59e0b':'#10b981';
  const ol=hp>30?'Difficult Route':cp>40?'Moderate Access':'Fully Accessible';

  return(
    <div className="absolute right-4 top-20 bottom-4 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-1000 flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between" style={{background:`linear-gradient(135deg,${oc}18,${oc}06)`}}>
        <div>
          <h2 className="font-black text-slate-800 text-base">Route Found</h2>
          <div className="flex items-center gap-1.5 mt-0.5"><div className="w-2 h-2 rounded-full" style={{background:oc}}/><span className="text-xs font-bold" style={{color:oc}}>{ol}</span></div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl"><X className="w-4 h-4 text-slate-500"/></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* A → B summary */}
        <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-black">A</div><span className="text-xs font-semibold text-slate-700 truncate flex-1">{startLabel||'Start'}</span></div>
          <div className="ml-2.5 border-l-2 border-dashed border-slate-300 h-3"/>
          <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-black">B</div><span className="text-xs font-semibold text-slate-700 truncate flex-1">{endLabel||'Destination'}</span></div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-blue-400 mb-1"><Ruler className="w-3.5 h-3.5"/><span className="text-xs">Distance</span></div>
            <p className="text-lg font-black text-blue-800">{distM}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-purple-400 mb-1"><Clock className="w-3.5 h-3.5"/><span className="text-xs">Est. Time</span></div>
            <p className="text-lg font-black text-purple-800">{timeStr}</p>
          </div>
        </div>

        {/* Accessibility bar */}
        <div>
          <p className="text-xs font-bold text-slate-600 mb-2">Route Accessibility</p>
          <div className="h-3 rounded-full overflow-hidden flex gap-0.5">
            {sp>0&&<div className="bg-emerald-500 transition-all rounded-l-full" style={{width:`${sp}%`}}/>}
            {cp>0&&<div className="bg-amber-400 transition-all" style={{width:`${cp}%`}}/>}
            {hp>0&&<div className="bg-red-500 transition-all rounded-r-full" style={{width:`${hp}%`}}/>}
          </div>
          <div className="flex justify-between mt-2">
            {[{v:sp,l:'Safe',c:'text-emerald-600'},{v:cp,l:'Caution',c:'text-amber-500'},{v:hp,l:'Barrier',c:'text-red-600'}].map(({v,l,c})=>(
              <div key={l} className="text-center"><span className={`block text-base font-black ${c}`}>{v}%</span><span className="text-xs text-slate-400">{l}</span></div>
            ))}
          </div>
        </div>

        {/* Warnings */}
        {route.warnings.length>0&&(
          <div className="space-y-1.5">
            {route.warnings.map((w,i)=>(
              <div key={i} className="flex items-start gap-2 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5"/>
                <span className="text-xs text-amber-800">{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Elevation */}
        {route.elevationProfile&&(
          <div className="border border-slate-100 rounded-xl overflow-hidden">
            <button onClick={()=>setShowElev(!showElev)} className="w-full px-4 py-2.5 flex items-center justify-between bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700">
              ⛰️ Elevation Profile {showElev?<ChevronUp className="w-3.5 h-3.5"/>:<ChevronDown className="w-3.5 h-3.5"/>}
            </button>
            {showElev&&<div className="p-3"><div className="h-12 flex items-end gap-px">{route.elevationProfile.map((p,i)=>{const mn=Math.min(...route.elevationProfile!.map(x=>x.elevation));const mx=Math.max(...route.elevationProfile!.map(x=>x.elevation));const h=((p.elevation-mn)/(mx-mn||1))*100;return<div key={i} className="flex-1 rounded-t-sm bg-blue-400 min-h-0.5" style={{height:`${Math.max(h,5)}%`}}/>;})}</div><div className="flex justify-between mt-1 text-xs text-slate-400"><span>Start</span><span>End</span></div></div>}
          </div>
        )}

        {/* Segments */}
        <div className="border border-slate-100 rounded-xl overflow-hidden">
          <button onClick={()=>setShowSegs(!showSegs)} className="w-full px-4 py-2.5 flex items-center justify-between bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700">
            📍 Segments ({route.segments.length}) {showSegs?<ChevronUp className="w-3.5 h-3.5"/>:<ChevronDown className="w-3.5 h-3.5"/>}
          </button>
          {showSegs&&<div className="p-3 space-y-2 max-h-40 overflow-y-auto">{route.segments.map((s,i)=>(
            <div key={i} className="flex items-start gap-2 pb-2 border-b border-slate-50 last:border-0">
              <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${s.accessibility==='safe'?'bg-emerald-500':s.accessibility==='caution'?'bg-amber-400':'bg-red-500'}`}/>
              <div><p className="text-xs font-bold text-slate-700">Seg {i+1} — {s.accessibility.toUpperCase()}</p>{s.description&&<p className="text-xs text-slate-500">{s.description}</p>}</div>
            </div>
          ))}</div>}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={()=>{
            const pts=route.segments.flatMap(s=>s.coordinates).map(([la,ln])=>`<trkpt lat="${la}" lon="${ln}"><ele>780</ele></trkpt>`).join('\n');
            const gpx=`<?xml version="1.0"?>\n<gpx version="1.1" creator="Saha Yatri"><trk><n>KU Wheelchair Route</n><trkseg>\n${pts}\n</trkseg></trk></gpx>`;
            const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([gpx],{type:'application/gpx+xml'}));a.download='ku-route.gpx';a.click();
          }} className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-2.5 text-xs font-bold transition-colors">
            <Download className="w-3.5 h-3.5"/>Export GPX
          </button>
          <button onClick={()=>{if(startCoords&&endCoords)navigator.clipboard.writeText(`${window.location.origin}?s=${startCoords.lat},${startCoords.lng}&e=${endCoords.lat},${endCoords.lng}`).then(()=>alert('Link copied!'));}}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 text-xs font-bold transition-colors">
            <Share2 className="w-3.5 h-3.5"/>Share
          </button>
        </div>
      </div>
    </div>
  );
}

//.
// SIDEBAR
//.

function Sidebar({open,onClose,reports,onDeleteReport,onFlyTo,reportCoord,onStartPick,pickingLoc,onReportSubmit,showForm,onOpenForm,onCancelForm}:{
  open:boolean;onClose:()=>void;reports:IssueReport[];onDeleteReport:(id:string)=>void;onFlyTo:(la:number,ln:number)=>void;
  reportCoord:{lat:number;lng:number};onStartPick:()=>void;pickingLoc:boolean;
  onReportSubmit:(d:{type:IssueReport['type'];description:string;photoDataUrl?:string})=>void;
  showForm:boolean;onOpenForm:()=>void;onCancelForm:()=>void;
}){
  const [tab,setTab]=useState<'report'|'alerts'>('alerts');
  const [type,setType]=useState<IssueReport['type']>('pothole');
  const [desc,setDesc]=useState('');const [photo,setPhoto]=useState<string|null>(null);
  const fRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(showForm)setTab('report');},[showForm]);
  if(!open) return null;

  return(
    <div className="absolute left-4 top-20 bottom-4 w-80 z-1000 flex flex-col">
      <div className="bg-white/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col h-full overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-linear-to-br from-blue-50 to-purple-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl">♿</div>
            <div><p className="text-sm font-black text-slate-800">Saha Yatri</p><p className="text-xs text-slate-400">Digital Inclusion · Dhulikel</p></div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-xl"><X className="w-4 h-4 text-slate-500"/></button>
        </div>

        <div className="flex border-b border-slate-100">
          {[{id:'report',label:'Report Issue',emoji:'📋'},{id:'alerts',label:`My Alerts${reports.length?` (${reports.length})`:''}`,emoji:'🔔'}].map(({id,label,emoji})=>(
            <button key={id} onClick={()=>{setTab(id as any);if(id==='report'&&!showForm)onOpenForm();}}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${tab===id?'border-blue-600 text-blue-600':'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {emoji} {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab==='report'&&(showForm?(
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1"><MapPin className="w-3 h-3"/>Issue Location</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white rounded-lg px-2 py-1.5 border border-slate-200 truncate text-slate-600">{reportCoord.lat.toFixed(5)}, {reportCoord.lng.toFixed(5)}</code>
                  <button onClick={onStartPick} className={`px-2 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 ${pickingLoc?'bg-orange-500 text-white':'bg-blue-600 hover:bg-blue-700 text-white'}`}><Target className="w-3 h-3"/>{pickingLoc?'Tapping…':'Pin'}</button>
                </div>
              </div>
              <div><p className="text-xs font-bold text-slate-600 mb-2">Issue Type</p>
                <div className="flex flex-wrap gap-1.5">{ISSUE_TYPES.map(t=>(
                  <button key={t.value} onClick={()=>setType(t.value)} className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors ${type===t.value?'bg-blue-600 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t.emoji} {t.label}</button>
                ))}</div>
              </div>
              <div><p className="text-xs font-bold text-slate-600 mb-2">Description</p>
                <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Describe the accessibility barrier…" className="w-full bg-slate-50 text-black rounded-xl px-3 py-2.5 text-sm placeholder:text-slate-400 outline-none resize-none h-20 border border-slate-200 focus:border-blue-500 transition-colors"/>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1"><Camera className="w-3 h-3 required:"/>Photo</p>
                <input ref={fRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>setPhoto(ev.target?.result as string);r.readAsDataURL(f);}}/>
                {photo?(<div className="relative"><img src={photo} className="w-full h-28 object-cover rounded-xl border border-slate-100"/><button onClick={()=>setPhoto(null)} className="absolute top-1.5 right-1.5 bg-white rounded-full p-1 shadow"><X className="w-3 h-3 text-red-500"/></button></div>)
                :(<button onClick={()=>fRef.current?.click()} className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl py-3 text-xs text-slate-400 hover:text-blue-500 flex items-center justify-center gap-2 transition-colors"><Camera className="w-4 h-4"/>Take / Upload Photo</button>)}
              </div>
              <div className="flex gap-2">
                <button onClick={()=>{setDesc('');setPhoto(null);onCancelForm();}} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-2.5 text-sm font-bold transition-colors">Cancel</button>
                <button onClick={()=>{if(!desc.trim())return;onReportSubmit({type,description:desc,photoDataUrl:photo||undefined});setDesc('');setPhoto(null);}} disabled={!desc.trim()} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-40 transition-colors">Submit</button>
              </div>
            </div>
          ):(
            <div className="text-center py-10">
              <div className="text-5xl mb-3">📋</div>
              <p className="font-bold text-slate-700 mb-1">Report Accessibility Issue</p>
              <p className="text-xs text-slate-400 mb-5">Help wheelchair users navigate KU campus safely</p>
              <button onClick={onOpenForm} className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-6 py-3 text-sm font-bold transition-colors">Start Report</button>
            </div>
          ))}

          {tab==='alerts'&&(reports.length===0?(
            <div className="text-center py-12"><div className="text-4xl mb-3">🔔</div><p className="font-semibold text-slate-600 mb-1">No alerts yet</p><p className="text-xs text-slate-400">Submitted reports appear here</p></div>
          ):(
            <div className="space-y-3">{[...reports].reverse().map(r=>{
              const it=ISSUE_TYPES.find(t=>t.value===r.type);
              const diff=Date.now()-new Date(r.timestamp).getTime();
              const mins=Math.floor(diff/60000);
              const rel=mins<1?'Just now':mins<60?`${mins}m ago`:mins<1440?`${Math.floor(mins/60)}h ago`:new Date(r.timestamp).toLocaleDateString();
              return(
                <div key={r.id} className="border border-slate-100 rounded-xl overflow-hidden hover:border-slate-200 transition-colors">
                  <button onClick={()=>onFlyTo(r.lat,r.lng)} className="w-full text-left p-3 hover:bg-slate-50">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl shrink-0">{it?.emoji||'📌'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5"><span className="text-sm font-bold text-slate-800">{it?.label||r.type}</span><span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold">Active</span></div>
                        <p className="text-xs text-black truncate">{r.description}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{rel}</p>
                      </div>
                    </div>
                  </button>
                  {r.photoDataUrl&&<div className="px-3 pb-2"><img src={r.photoDataUrl} className="w-full h-20 object-cover rounded-lg border border-slate-100"/></div>}
                  <div className="px-3 pb-3 flex gap-2">
                    <button onClick={()=>onFlyTo(r.lat,r.lng)} className="flex-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg py-1.5 flex items-center justify-center gap-1 transition-colors"><MapPin className="w-3 h-3"/>View</button>
                    <button onClick={()=>onDeleteReport(r.id)} className="text-xs text-red-500 bg-red-50 hover:bg-red-100 rounded-lg py-1.5 px-3 flex items-center gap-1 transition-colors"><Trash2 className="w-3 h-3"/>Delete</button>
                  </div>
                </div>
              );
            })}</div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-slate-50 bg-slate-50">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-wrap">
            <Wifi className="w-3 h-3"/>Connected<span className="mx-0.5">·</span><Shield className="w-3 h-3"/>Privacy First<span className="mx-0.5">·</span>♿ KU Accessibility
          </div>
        </div>
      </div>
    </div>
  );
}

//.
// MAP VIEW
//.

function MapView({onMapClick,route,accessPoints,reports,startPoint,endPoint,myLocation,flyTo,mapStyle,reportPickMode,reportPickCoord}:{
  onMapClick:(la:number,ln:number)=>void;route:RouteResult|null;accessPoints:HazardPoint[];reports:IssueReport[];
  startPoint:{lat:number;lng:number}|null;endPoint:{lat:number;lng:number}|null;myLocation:{lat:number;lng:number}|null;
  flyTo:{lat:number;lng:number}|null;mapStyle:string;reportPickMode:boolean;reportPickCoord:{lat:number;lng:number}|null;
}){
  const mapRef=useRef<L.Map|null>(null);const contRef=useRef<HTMLDivElement>(null);
  const tileRef=useRef<L.TileLayer|null>(null);const mkrRef=useRef<L.LayerGroup|null>(null);
  const routeRef=useRef<L.LayerGroup|null>(null);const aRef=useRef<L.LayerGroup|null>(null);
  const pickMkr=useRef<L.Marker|null>(null);
  // ✅ FIX: Use a ref for the click handler to always have fresh state without re-registering events
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  useEffect(()=>{
    if(!contRef.current||mapRef.current) return;
    const map=L.map(contRef.current,{center:[KU_CENTER.lat,KU_CENTER.lng],zoom:16,zoomControl:true});
    tileRef.current=L.tileLayer((TILE_LAYERS[mapStyle]||TILE_LAYERS.dark).url,{attribution:(TILE_LAYERS[mapStyle]||TILE_LAYERS.dark).attribution,maxZoom:19}).addTo(map);
    mkrRef.current=L.layerGroup().addTo(map);routeRef.current=L.layerGroup().addTo(map);aRef.current=L.layerGroup().addTo(map);
    // ✅ FIX: Delegate through ref so handler always sees latest state
    map.on('click',(e:L.LeafletMouseEvent)=>onMapClickRef.current(e.latlng.lat,e.latlng.lng));
    mapRef.current=map;
    return()=>{map.remove();mapRef.current=null;};
  },[]);

  useEffect(()=>{if(tileRef.current)tileRef.current.setUrl((TILE_LAYERS[mapStyle]||TILE_LAYERS.dark).url);},[mapStyle]);
  useEffect(()=>{if(mapRef.current)mapRef.current.getContainer().style.cursor=reportPickMode?'crosshair':'';},[reportPickMode]);

  useEffect(()=>{
    if(!mkrRef.current)return;mkrRef.current.clearLayers();
    if(startPoint)L.marker([startPoint.lat,startPoint.lng],{icon:markerA}).bindPopup('<b>🟢 Start (A)</b>').addTo(mkrRef.current);
    if(endPoint)  L.marker([endPoint.lat,  endPoint.lng],  {icon:markerB}).bindPopup('<b>🔵 Destination (B)</b>').addTo(mkrRef.current);
    if(myLocation)L.marker([myLocation.lat,myLocation.lng],{icon:myLocIcon}).bindPopup('<b>📍 You are here</b>').addTo(mkrRef.current);
  },[startPoint,endPoint,myLocation]);

  useEffect(()=>{
    if(!mapRef.current)return;if(pickMkr.current){pickMkr.current.remove();pickMkr.current=null;}
    if(reportPickCoord)pickMkr.current=L.marker([reportPickCoord.lat,reportPickCoord.lng],{icon:emojiIcon('📌',30,'#f97316')}).bindPopup('<b>Report location</b>').addTo(mapRef.current);
  },[reportPickCoord]);

  useEffect(()=>{
    if(!routeRef.current)return;routeRef.current.clearLayers();if(!route)return;
    route.segments.forEach(seg=>{
      if(seg.coordinates.length<2)return;const c=ROUTE_COLORS[seg.accessibility];
      L.polyline(seg.coordinates,{color:c,weight:7,opacity:0.95,lineCap:'round',lineJoin:'round'}).bindPopup(`<b style="color:${c}">${seg.accessibility.toUpperCase()}</b><br/>${seg.description||''}`).addTo(routeRef.current!);
      L.polyline(seg.coordinates,{color:c,weight:18,opacity:0.1,lineCap:'round',lineJoin:'round'}).addTo(routeRef.current!);
    });
  },[route]);

  useEffect(()=>{
    if(!aRef.current)return;aRef.current.clearLayers();
    accessPoints.forEach(h=>{
      const cat=ACCESSIBILITY_CATEGORIES[h.category];const color=cat?.color||'#64748b';const emoji=h.icon||cat?.emoji||'📍';
      L.marker([h.lat,h.lng],{icon:emojiIcon(emoji,32,color)})
        .bindPopup(`<div style="min-width:160px;font-size:12px"><b style="color:${color}">${emoji} ${cat?.label||h.category}</b><br/><span style="color:#555">${h.description}</span><div style="margin-top:4px;font-size:10px;color:#999;font-weight:700;text-transform:uppercase">${h.type==='info'?'♿ Accessible':h.type==='caution'?'⚠️ Caution':'🚫 Hazard'}</div></div>`)
        .addTo(aRef.current!);
    });
    reports.forEach(r=>{
      const it=ISSUE_TYPES.find(t=>t.value===r.type);
      L.marker([r.lat,r.lng],{icon:emojiIcon(it?.emoji||'📌',30,'#f97316')})
        .bindPopup(`<div style="min-width:160px;font-size:12px"><b style="color:#f97316">${it?.emoji||'📌'} User Report</b><br/><b>${it?.label||r.type}</b><br/><span style="color:#555">${r.description}</span>${r.photoDataUrl?`<br/><img src="${r.photoDataUrl}" style="width:140px;margin-top:6px;border-radius:6px"/>`:''}  <div style="color:#999;margin-top:4px;font-size:10px">${new Date(r.timestamp).toLocaleString()}</div></div>`)
        .addTo(aRef.current!);
    });
  },[accessPoints,reports]);

  useEffect(()=>{
    if(mapRef.current&&flyTo){
      console.log('flyTo triggered:', flyTo);
      mapRef.current.flyTo([flyTo.lat,flyTo.lng],17,{duration:1.2});
    }
  },[flyTo]);

  return<div ref={contRef} className="absolute inset-0"/>;
}

//.
// PERMISSION MODAL
//.

function PermissionModal({onAllow,onDeny}:{onAllow:()=>void;onDeny:()=>void}){
  return(
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-2000 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full">
        <div className="w-20 h-20 bg-linear-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-5 text-5xl">♿</div>
        <h2 className="text-2xl font-black text-slate-800 text-center">Saha Yatri</h2>
        <p className="text-slate-400 text-center text-sm mt-1 mb-2 font-semibold">Kathmandu University · Dhulikel</p>
        <p className="text-slate-600 text-center text-sm mb-6">Enable location for wheelchair-accessible campus navigation.</p>
        <div className="bg-linear-to-br from-blue-50 to-purple-50 rounded-xl p-4 mb-5 space-y-2.5">
          {['Navigate accessible campus paths','Find ramps, elevators & washrooms','Avoid potholes, stairs & barriers','Report new accessibility issues'].map(it=>(
            <div key={it} className="flex items-center gap-2.5"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0"/><span className="text-sm text-slate-700">{it}</span></div>
          ))}
        </div>
        <div className="space-y-2">
          <button onClick={onAllow} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 font-black transition-colors">Allow Location Access</button>
          <button onClick={onDeny} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-3.5 font-bold transition-colors">Browse Without GPS</button>
        </div>
      </div>
    </div>
  );
}

//.
// MAIN
//.

import { useSearchParams } from 'next/navigation';
const Index = () => {
  const searchParams = useSearchParams();
  const [startPoint, setStartPoint] = useState<{lat:number;lng:number}|null>(null);
  const [endPoint,   setEndPoint]   = useState<{lat:number;lng:number}|null>(null);
  const [startLabel, setStartLabel] = useState('');
  const [endLabel,   setEndLabel]   = useState('');
  const [myLoc,      setMyLoc]      = useState<{lat:number;lng:number}|null>(null);
  const [route,      setRoute]      = useState<RouteResult|null>(null);
  const [aPoints,    setAPoints]    = useState<HazardPoint[]>([]);
  const [reports,    setReports]    = useState<IssueReport[]>([]);
  const [flyTo,      setFlyTo]      = useState<{lat:number;lng:number}|null>(null);
  const [mapStyle,   setMapStyle]   = useState('dark');
  const [isRouting,  setIsRouting]  = useState(false);
  const [sidebarOpen,setSidebarOpen]= useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [repCoord,   setRepCoord]   = useState(KU_CENTER);
  const [pickingLoc, setPickingLoc] = useState(false);
  const [showPerm,   setShowPerm]   = useState(true);
  const [locErr,     setLocErr]     = useState<string|null>(null);
  const [settingMkr, setSettingMkr] = useState<'A'|'B'|null>(null);

  // On mount, check for lat/lng in query params and fly to that location
  useEffect(() => {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
      setFlyTo({ lat: Number(lat), lng: Number(lng) });
    }
  }, [searchParams]);

  // ✅ FIX: Use refs to hold latest values of the interactive state
  // so handleMapClick always reads current values without needing to be recreated
  const pickingLocRef = useRef(pickingLoc);
  const settingMkrRef = useRef(settingMkr);
  const startPointRef = useRef(startPoint);
  const myLocRef      = useRef(myLoc);

  useEffect(() => { pickingLocRef.current = pickingLoc; },   [pickingLoc]);
  useEffect(() => { settingMkrRef.current = settingMkr; },   [settingMkr]);
  useEffect(() => { startPointRef.current = startPoint; },   [startPoint]);
  useEffect(() => { myLocRef.current      = myLoc; },        [myLoc]);

  useEffect(()=>{ setAPoints(getKUAccessibilityPoints()); setReports(getReports()); },[]);
  useEffect(()=>{ if(startPoint&&endPoint) doRoute(); },[startPoint,endPoint]);

  async function doRoute(){
    if(!startPoint||!endPoint)return;
    setIsRouting(true);
    const combined=[...aPoints,...reports.map(r=>({lat:r.lat,lng:r.lng,type:'hazard' as const,category:r.type,icon:'📌',description:r.description}))];
    const res=await calcRoute(L.latLng(startPoint.lat,startPoint.lng),L.latLng(endPoint.lat,endPoint.lng),combined);
    setRoute(res);setIsRouting(false);
  }

  const handleAllowLoc=async()=>{
    try{
      const p=await new Promise<{lat:number;lng:number}>((res,rej)=>{
        navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude,lng:p.coords.longitude}),rej,{enableHighAccuracy:true,timeout:10000});
      });
      setMyLoc(p);setStartPoint(p);setStartLabel('My Location');setFlyTo(p);setShowPerm(false);
    }catch{setShowPerm(false);setFlyTo(KU_CENTER);}
  };

  // ✅ FIX: handleMapClick reads from refs — always fresh, no stale closure
  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (pickingLocRef.current) {
      setRepCoord({ lat, lng });
      setPickingLoc(false);
      return;
    }
    if (settingMkrRef.current === 'A') {
      setStartPoint({ lat, lng });
      setStartLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      setFlyTo({ lat, lng });
      setSettingMkr(null);
      return;
    }
    if (settingMkrRef.current === 'B') {
      setEndPoint({ lat, lng });
      setEndLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      setFlyTo({ lat, lng });
      setSettingMkr(null);
      return;
    }
    // default: set end point
    setEndPoint({ lat, lng });
    setEndLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    if (!startPointRef.current) {
      const base = myLocRef.current || KU_CENTER;
      setStartPoint(base);
      setStartLabel(myLocRef.current ? 'My Location' : 'KU Main Area');
    }
    setFlyTo({ lat, lng });
  }, []); // ✅ empty deps — refs handle freshness

  const handleSetStart=(r:SearchResult)=>{setStartPoint({lat:r.lat,lng:r.lng});setStartLabel(r.name);setFlyTo({lat:r.lat,lng:r.lng});};
  const handleSetEnd=(r:SearchResult)=>{
    setEndPoint({lat:r.lat,lng:r.lng});setEndLabel(r.name);setFlyTo({lat:r.lat,lng:r.lng});
    if(!startPoint){const base=myLoc||KU_CENTER;setStartPoint(base);setStartLabel(myLoc?'My Location':'KU Main Area');}
  };
  const handleSwap=()=>{const tp=startPoint,tl=startLabel;setStartPoint(endPoint);setStartLabel(endLabel);setEndPoint(tp);setEndLabel(tl);};
  const handleClear=()=>{setRoute(null);setEndPoint(null);setEndLabel('');setStartPoint(null);setStartLabel('');};

  return(
    <div className="relative w-full h-screen overflow-hidden bg-slate-900">
      <MapView onMapClick={handleMapClick} route={route} accessPoints={aPoints} reports={reports}
        startPoint={startPoint} endPoint={endPoint} myLocation={myLoc}
        flyTo={flyTo} mapStyle={mapStyle} reportPickMode={pickingLoc}
        reportPickCoord={showForm?repCoord:null}/>

      <RouteInputPanel
        startLabel={startLabel} endLabel={endLabel}
        onSetStart={handleSetStart} onSetEnd={handleSetEnd}
        onSwap={handleSwap} onClear={handleClear}
        onUseMyLoc={()=>{if(myLoc){setStartPoint(myLoc);setStartLabel('My Location');setFlyTo(myLoc);}else setLocErr('GPS not available');}}
        hasMyLoc={!!myLoc} isRouting={isRouting}
        onPinA={()=>setSettingMkr(settingMkr==='A'?null:'A')}
        onPinB={()=>setSettingMkr(settingMkr==='B'?null:'B')}
        settingMarker={settingMkr}/>

      {/* Top-left controls */}
      <div className="absolute top-4 left-4 z-1000 flex flex-col gap-2">
        <button onClick={()=>setSidebarOpen(true)} className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-2.5 hover:bg-white border border-slate-100">
          <Menu className="w-5 h-5 text-slate-700"/>
        </button>
        {myLoc&&<div className="bg-white/95 backdrop-blur-md rounded-xl shadow px-3 py-2 flex items-center gap-1.5 border border-slate-100"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"/><span className="text-xs font-bold text-slate-600">GPS Live</span></div>}
      </div>

      {/* Map style */}
      <div className="absolute top-20 right-4 z-1000 bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-1.5 flex flex-col gap-1 border border-slate-100">
        {MAP_STYLES.map(({id,label,emoji})=>(
          <button key={id} onClick={()=>setMapStyle(id)} className={`w-9 h-9 rounded-lg transition-colors flex items-center justify-center text-base ${mapStyle===id?'bg-blue-600':'hover:bg-slate-100'}`} title={label}>{emoji}</button>
        ))}
      </div>

      {/* Tap-mode banner */}
      {(pickingLoc||settingMkr)&&(
        <div className="absolute top-4 right-4 z-1100 bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-xl px-4 py-2.5 flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-400"/>
          <span className="text-sm font-bold">{pickingLoc?'Tap map to pin report location':`Tap map to place marker ${settingMkr}`}</span>
          <button onClick={()=>{setPickingLoc(false);setSettingMkr(null);}} className="ml-2 p-0.5 hover:bg-white/10 rounded"><X className="w-3.5 h-3.5"/></button>
        </div>
      )}

      <Sidebar open={sidebarOpen} onClose={()=>{setSidebarOpen(false);setPickingLoc(false);}}
        reports={reports} onDeleteReport={id=>{deleteReport(id);setReports(getReports());}}
        onFlyTo={(la,ln)=>setFlyTo({lat:la,lng:ln})}
        reportCoord={repCoord} onStartPick={()=>setPickingLoc(true)} pickingLoc={pickingLoc}
        onReportSubmit={d=>{saveReport({lat:repCoord.lat,lng:repCoord.lng,...d});setReports(getReports());setShowForm(false);setPickingLoc(false);}}
        showForm={showForm}
        onOpenForm={()=>{setRepCoord(myLoc||startPoint||KU_CENTER);setShowForm(true);}}
        onCancelForm={()=>{setShowForm(false);setPickingLoc(false);}}/>

      {route&&<RoutePanel route={route} startLabel={startLabel} endLabel={endLabel}
        onClose={()=>setRoute(null)} startCoords={startPoint||undefined} endCoords={endPoint||undefined}/>}

      <LegendPanel/>

      {/* FAB */}
      <button onClick={()=>{setRepCoord(myLoc||startPoint||KU_CENTER);setShowForm(true);setSidebarOpen(true);}}
        className="absolute bottom-6 right-4 z-1000 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-xl px-5 py-3 flex items-center gap-2 transition-colors">
        <AlertTriangle className="w-4 h-4"/>
        <span className="text-sm font-bold">Report Issue</span>
        {reports.length>0&&<span className="bg-white text-orange-500 text-xs font-black rounded-full w-5 h-5 flex items-center justify-center">{reports.length}</span>}
      </button>

      {showPerm&&<PermissionModal onAllow={handleAllowLoc} onDeny={()=>{setShowPerm(false);setFlyTo(KU_CENTER);}}/>}

      {isRouting&&<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-1100 bg-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-3 border border-slate-100"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/><span className="text-sm font-bold text-slate-700">Finding accessible route…</span></div>}

      {locErr&&<div className="absolute top-24 left-1/2 -translate-x-1/2 z-1100 bg-red-50 rounded-xl shadow-lg px-5 py-3 flex items-center gap-3 border border-red-100"><AlertCircle className="w-4 h-4 text-red-500"/><span className="text-sm text-red-700">{locErr}</span><button onClick={()=>setLocErr(null)}><X className="w-4 h-4 text-red-400"/></button></div>}
    </div>
  );
};

export default Index;