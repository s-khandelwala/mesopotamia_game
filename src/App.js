import { useState, useMemo, useEffect, useCallback } from "react";

// ═══════════════════════════════════════════════════
// SHARED & UTILS
// ═══════════════════════════════════════════════════
const GC = "#D4AF37";
const SAND = "#F5E6CC";
const SEAS = ["Spring", "Summer", "Autumn", "Winter"];
const SEA_ICO = ["🌱", "☀️", "🍂", "❄️"];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

const SAVES_KEY = "mesopotamia_saves_v6";

const getSaves = () => {
  try { return JSON.parse(localStorage.getItem(SAVES_KEY) || "{}"); }
  catch { return {}; }
};
const saveGame = (name, mode, state) => {
  if (!name) return;
  const saves = getSaves();
  const phase = state.phase;
  // A game is "ended" when it is in a terminal phase and not continuing in endless mode
  const ended = mode === "ruler"
    ? (phase === "gameover" || (phase === "victory" && !state.endless))
    : (phase === "dead");
  const endKind = mode === "ruler"
    ? (phase === "gameover" ? "fallen" : (phase === "victory" && !state.endless ? "victorious" : null))
    : (phase === "dead" ? "died" : null);

  let summary = "";
  if (mode === "ruler") {
    const year = Math.ceil((state.turn || 1) / 4);
    if (phase === "gameover") summary = `Fallen · Year ${year} · Pop ${state.pop}`;
    else if (phase === "victory" && !state.endless) summary = `Victorious · Year ${year} · Pop ${state.pop}`;
    else summary = `Year ${year} · Pop: ${state.pop} · Silver: ${Math.floor(state.gold)}`;
  } else {
    const jobLabel = state.job && JOBS[state.job] ? JOBS[state.job].label : "Citizen";
    if (phase === "dead") summary = `Died · ${jobLabel} · Year ${state.year}`;
    else summary = `Year ${state.year} · ${jobLabel} · Silver: ${state.silver}`;
  }
  saves[name] = { name, mode, timestamp: Date.now(), summary, data: state, ended, endKind };
  localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
};
const deleteSave = (name) => {
  const saves = getSaves();
  delete saves[name];
  localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
};

const HIST_FACTS = [
  { icon: "🏛️", head: "City of Uruk", body: "Uruk was likely the world's first true city, home to up to 80,000 people by 2900 BCE. Tradition credits the hero-king Gilgamesh with its construction." },
  { icon: "🌊", head: "The Sacred Rivers", body: "Mesopotamia means 'land between the rivers'. The Tigris and Euphrates flooded annually, leaving rich black silt on the fields. Without this, the plains could not be farmed." },
  { icon: "🌾", head: "The Barley Economy", body: "Barley was the backbone of Sumerian civilization. It was eaten as bread, brewed into beer, and used as currency. Workers were paid in daily beer rations." },
  { icon: "✍️", head: "The Birth of Writing", body: "Cuneiform script was invented around 3200 BCE not for literature but for accounting. Scribes pressed a reed stylus into wet clay to make wedge-shaped marks." },
  { icon: "⛩️", head: "The Temple Economy", body: "Sumerian temples functioned as banks, granaries, factories, and courts. The temple of Inanna at Uruk owned vast fields and employed thousands of workers." },
  { icon: "🍺", head: "Beer and Society", body: "Beer (called 'kash') was consumed daily by all social classes. Workers received up to 5 litres per day. The 'Hymn to Ninkasi' is both a prayer and a brewing recipe." },
  { icon: "⚖️", head: "Women in Sumer", body: "Sumerian women had significant legal rights. They could own property, run businesses, serve as temple administrators, and brew beer commercially." },
  { icon: "🐪", head: "The Trade Networks", body: "Lapis lazuli came from Afghanistan, 3,000 km away. Copper arrived from Oman. Sumerians traded grain and textiles for metals along donkey caravan routes." },
];

const SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600&family=IM+Fell+English:ital@0;1&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#050200;font-size:15px;color:${SAND};font-family:'IM Fell English',serif;}
  ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:#080301} ::-webkit-scrollbar-thumb{background:#7A4820;border-radius:3px}
  button{outline:none;}

  .input-field{background:rgba(0,0,0,0.5);border:1px solid rgba(212,175,55,0.5);color:#F5E6CC;padding:12px 16px;border-radius:8px;font-family:'Cinzel',serif;font-size:16px;width:100%;max-width:320px;text-align:center;outline:none;transition:all 0.2s;}
  .input-field:focus{border-color:#D4AF37;box-shadow:0 0 14px rgba(212,175,55,0.35);}
  .save-card{background:rgba(0,0,0,0.4);border:1px solid rgba(212,175,55,0.3);border-radius:10px;padding:16px;display:flex;justify-content:space-between;align-items:center;transition:background 0.2s;margin-bottom:10px;text-align:left;}
  .save-card:hover{background:rgba(212,175,55,0.12);border-color:${GC};}

  .tbtn{cursor:pointer;border:2px solid ${GC};border-radius:10px;background:linear-gradient(135deg,#7A4820,#B87A30);color:${SAND};font-family:'Cinzel',serif;font-size:12px;font-weight:600;letter-spacing:1.5px;padding:11px 18px;transition:background .2s,transform .15s;width:100%}
  .tbtn:hover:not(:disabled){background:linear-gradient(135deg,#B87A30,#E0A040);transform:scale(1.03)}
  .tbtn:disabled{opacity:.4;cursor:not-allowed}
  @keyframes pls{0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,.35)}60%{box-shadow:0 0 0 9px rgba(212,175,55,0)}}
  .tbtn:not(:disabled){animation:pls 2.6s infinite}
  .tbtn2{cursor:pointer;border:1px solid rgba(212,175,55,0.35);border-radius:8px;background:rgba(212,175,55,0.07);color:${SAND};font-family:'Cinzel',serif;font-size:11px;font-weight:600;letter-spacing:1px;padding:9px 14px;transition:background .2s;width:100%}
  .tbtn2:hover:not(:disabled){background:rgba(212,175,55,0.15)} .tbtn2:disabled{opacity:.35;cursor:not-allowed}
  .abtn{cursor:pointer;border:1px solid rgba(212,175,55,0.3);border-radius:10px;background:linear-gradient(145deg,rgba(90,48,16,0.85),rgba(50,25,6,0.95));color:${SAND};font-family:'Cinzel',serif;transition:all .18s;display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:10px;}
  .abtn:hover:not(:disabled){border-color:${GC};background:linear-gradient(145deg,rgba(120,72,20,0.9),rgba(80,40,10,0.95));transform:translateY(-2px);box-shadow:0 5px 16px rgba(0,0,0,0.5)}
  .abtn:disabled{opacity:.35;cursor:not-allowed;transform:none}
  .abtn.special-btn{border-color:rgba(212,175,55,0.7);background:linear-gradient(145deg,rgba(150,100,30,0.85),rgba(80,50,15,0.95))}
  .abtn.special-btn:hover:not(:disabled){border-color:${GC};background:linear-gradient(145deg,rgba(180,120,40,0.9),rgba(100,60,15,0.95))}
  .abtn.end-btn{border-color:rgba(180,100,20,0.5);background:linear-gradient(145deg,rgba(120,60,0,0.75),rgba(60,30,0,0.85));align-items:center;text-align:center;}
  .abtn.end-btn:hover:not(:disabled){background:linear-gradient(145deg,rgba(160,80,10,0.9),rgba(90,45,5,0.95))}
  .gbtn{cursor:pointer;border:1px solid rgba(50,140,80,0.4);border-radius:8px;background:rgba(50,140,80,0.08);color:${SAND};font-family:'Cinzel',serif;font-size:11px;font-weight:600;letter-spacing:1px;padding:9px 14px;transition:background .2s;width:100%}
  .gbtn:hover:not(:disabled){background:rgba(50,140,80,0.2)}
  .rbtn{cursor:pointer;border:1px solid rgba(204,56,32,0.5);border-radius:8px;background:rgba(204,56,32,0.1);color:#FF9070;font-family:'Cinzel',serif;font-size:11px;font-weight:600;letter-spacing:1px;padding:9px 14px;transition:background .2s;width:100%}
  .rbtn:hover:not(:disabled){background:rgba(204,56,32,0.22)} .rbtn:disabled{opacity:.35;cursor:not-allowed}
  .ibtn{cursor:pointer;border:1px solid rgba(96,144,255,0.4);border-radius:8px;background:rgba(96,144,255,0.08);color:${SAND};font-family:'Cinzel',serif;font-size:11px;font-weight:600;letter-spacing:1px;padding:9px 14px;transition:background .2s;width:100%}
  .ibtn:hover:not(:disabled){background:rgba(96,144,255,0.2)}
  .tr-btn{cursor:pointer;border:1px solid rgba(212,175,55,0.25);border-radius:8px;padding:10px 14px;background:rgba(255,255,255,0.03);color:${SAND};font-family:'Cinzel',serif;font-size:11px;transition:background .2s;text-align:left;width:100%;display:flex;justify-content:space-between;align-items:center}
  .tr-btn:hover:not(:disabled){background:rgba(212,175,55,0.1)} .tr-btn:disabled{opacity:.32;cursor:not-allowed}
  .hbtn{cursor:pointer;border:1px dashed rgba(212,175,55,0.4);border-radius:6px;background:transparent;color:${GC};font-family:'Cinzel',serif;font-size:10px;font-weight:600;letter-spacing:1px;padding:5px 10px;transition:background .2s;display:inline-block}
  .hbtn:hover{background:rgba(212,175,55,0.1)}
  .choice-btn{cursor:pointer;border:1px solid rgba(212,175,55,0.3);border-radius:9px;background:rgba(255,255,255,0.04);color:${SAND};font-family:'Cinzel',serif;font-size:11px;letter-spacing:0.5px;padding:12px 14px;transition:all .15s;text-align:left;width:100%}
  .choice-btn:hover{border-color:${GC};background:rgba(212,175,55,0.1)}

  /* Modals & Layouts */
  .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;z-index:600;padding:16px;backdrop-filter:blur(3px)}
  .modal{background:linear-gradient(150deg,#1a0a03,#0c0402);border:1px solid rgba(212,175,55,0.4);border-radius:16px;padding:24px;width:100%;max-width:480px;max-height:88vh;overflow-y:auto;box-shadow: 0 20px 50px rgba(0,0,0,0.8);}
  .modal-wide{background:linear-gradient(150deg,#1a0a03,#0c0402);border:1px solid rgba(212,175,55,0.4);border-radius:16px;padding:28px 24px;width:100%;max-width:720px;max-height:88vh;overflow-y:auto;box-shadow: 0 20px 50px rgba(0,0,0,0.8);}
  .modal-h{font-family:'Cinzel Decorative',serif;letter-spacing:1.5px;margin-bottom:6px;text-align:center}
  .modal-sub{font-family:'Cinzel',serif;font-size:10px;letter-spacing:2px;color:rgba(245,230,204,0.45);text-align:center;margin-bottom:18px;text-transform:uppercase}
  .panel{background:rgba(0,0,0,0.32);border:1px solid rgba(212,175,55,0.18);border-radius:10px;padding:12px 14px}
  .panel-h{font-family:'Cinzel',serif;font-size:10px;letter-spacing:2.5px;color:${GC};text-transform:uppercase;margin-bottom:8px}
  .lore-box{background:rgba(212,175,55,0.05);border:1px solid rgba(212,175,55,0.15);border-radius:8px;padding:10px 12px;margin-top:8px}
  .lore-text{font-family:'IM Fell English',serif;font-style:italic;font-size:12px;color:rgba(245,230,204,0.65);line-height:1.65}
  .warn-chip{font-family:'Cinzel',serif;font-size:10px;padding:4px 12px;border-radius:12px;display:inline-flex;align-items:center;gap:5px}
  .silver-coin{display:inline-block;filter:grayscale(1) brightness(1.3) contrast(1.05);}

  /* Grid & Animation */
  @keyframes logSlide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
  .le{animation:logSlide .3s ease}
  @keyframes evIn{from{opacity:0;transform:translate(-50%,-50%) scale(.65)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
  .ev-pop{animation:evIn .38s cubic-bezier(.34,1.56,.64,1) forwards}
  @keyframes cellPop{0%{transform:scale(.65);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
  .cell-anim{animation:cellPop .32s ease forwards}
  .cell{position: relative; transition:filter .12s,transform .12s} .cell.placeable{cursor:pointer}
  .cell.placeable:hover{filter:brightness(1.45);transform:scale(1.09)}
  .brow{transition:transform .14s,background .14s;cursor:pointer;border-radius:8px}
  .brow:hover{transform:translateX(5px)} .brow.sel{outline:2px solid ${GC};outline-offset:1px}
  .brow.locked{cursor:not-allowed;opacity:.4;filter:grayscale(0.8)} .brow.locked:hover{transform:none}
  .river-shimmer{position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(90deg,rgba(50,130,220,0),rgba(100,180,255,0.25),rgba(50,130,220,0));animation:shimmer 2.5s ease-in-out infinite}
  @keyframes shimmer{0%,100%{opacity:0.4}50%{opacity:1}}
  @keyframes factIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  .fact-anim{animation:factIn .5s ease}

  /* TUTORIAL HIGHLIGHT SYSTEM */
  .tut-target{box-shadow:0 0 0 3px #D4AF37, 0 0 26px 6px rgba(212,175,55,0.75) !important;border-radius:12px;animation:pulseHighlight 1.6s infinite alternate;position:relative;z-index:5;}
  @keyframes pulseHighlight{from{box-shadow:0 0 0 3px #D4AF37, 0 0 14px 3px rgba(212,175,55,0.6);} to{box-shadow:0 0 0 3px #D4AF37, 0 0 30px 9px rgba(212,175,55,0.95);}}
  .tut-arrow{position:absolute;top:-36px;left:50%;transform:translateX(-50%);font-size:26px;color:#D4AF37;text-shadow:0 -2px 6px rgba(0,0,0,0.9);animation:tutBounce 1s infinite;pointer-events:none;z-index:6;}
  @keyframes tutBounce{0%,100%{transform:translate(-50%,0);} 50%{transform:translate(-50%,-8px);}}
  /* Tutorial bar always at the very bottom — never overlaps game content */
  .tut-bar{position:fixed;bottom:0;left:0;right:0;z-index:900;display:flex;justify-content:center;pointer-events:none;}
  .tut-bar > .tut-inner{pointer-events:auto;width:min(860px,100vw);background:linear-gradient(to top,rgba(20,10,2,0.97),rgba(45,22,5,0.97));border-top:2px solid #D4AF37;box-shadow:0 -6px 28px rgba(0,0,0,0.7);display:flex;align-items:center;gap:14px;padding:10px 18px;}
  .tut-bar .tut-icon{font-size:28px;flex-shrink:0;}
  .tut-bar .tut-text{flex:1;min-width:0;}
  .tut-bar .tut-text h4{font-family:'Cinzel Decorative',serif;color:#D4AF37;font-size:13px;margin-bottom:4px;}
  .tut-bar .tut-text p{font-size:11.5px;line-height:1.5;color:rgba(245,230,204,0.82);margin:0;}
  .tut-bar .tut-hint{font-size:11px;color:#D4AF37;font-family:'Cinzel',serif;background:rgba(212,175,55,0.08);border:1px dashed rgba(212,175,55,0.4);border-radius:6px;padding:4px 9px;margin-top:5px;display:inline-block;}
  .tut-bar .tut-btns{display:flex;gap:8px;flex-shrink:0;}
`;

// ═══════════════════════════════════════════════════
// RULER CONSTANTS
// ═══════════════════════════════════════════════════
const GRID = 10, RIVER_COL = [2, 2, 3, 3, 4, 4, 5, 5, 6, 6];
const isRiverCell = (r, c) => RIVER_COL[r] === c;
const RDIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const GODS = {
  enki: { id: "enki", n: "Enki", title: "God of Water and Wisdom", d: "+2 Water and +1 Intel per season.", i: "🌊", col: "#40A0E0" },
  ishtar: { id: "ishtar", n: "Ishtar", title: "Goddess of Love and War", d: "+10 Defense, +2 Pop growth/szn.", i: "⚔️", col: "#D070C0" },
  enlil: { id: "enlil", n: "Enlil", title: "God of Wind and Earth", d: "Farms +1 Grain, Disasters -25% severity.", i: "🌪️", col: "#A0D850" },
};

// Tutorial steps. `action` = required interaction to advance. `locked` = informational only (cannot do yet).
const TUTORIAL_STEPS = [
  { t: "Welcome to Uruk", i: "🌅", d: "You are an Ensi, the priest-governor of a fledgling Sumerian city-state circa 2800 BCE. Your survival depends on mastering agriculture, managing a growing population, and unlocking the secrets of early civilization.", target: null },
  { t: "The Interface", i: "📊", d: "At the top, you see your vital resources: Grain, Water, Workers, Silver, Population, Morale, Intel, and Favor. If Grain or Water hit 0, your people will starve!", target: "ruler-stats" },
  { t: "The River is Life", i: "〰", d: "The Euphrates is the silver thread running down your map. Farms placed next to it get bonus grain. Don't try to build on river tiles.", target: "ruler-grid" },
  { t: "Building the City", i: "🏗️", d: "Try it now: pick a building below, then click an empty tile on the grid to place it.", targets: ["ruler-build", "ruler-grid"], action: "place_building", actionHint: "Place any building on the grid to continue." },
  { t: "Building Descriptions", i: "📖", d: "Click any building name in the Construct panel to read its historical lore — a brief note from Sumerian history about what that structure meant to the city. You can also open the 🏛️ Buildings button in the header for a full reference.", target: "ruler-build" },
  { t: "Population Roles", i: "👷", d: "Open the Roles menu to see how your citizens are assigned: workers gather, scholars learn, soldiers defend.", target: "ruler-roles", action: "open_roles", actionHint: "Click 'Roles' to open the panel." },
  { t: "Advancing Time", i: "⏳", d: "When you've placed what you can afford, click 'ADVANCE SEASON' to process production, consumption, and random events.", target: "ruler-advance", action: "advance", actionHint: "Click ADVANCE SEASON to continue." },
  { t: "Your Quests", i: "📜", d: "Open the Quests scroll to see what you must achieve to win.", target: "ruler-quests", action: "open_quests", actionHint: "Click 'Quests' to view your goals." },
  { t: "Tablet Archives (Locked)", i: "🧠", d: "Research lives in the Archives — but you'll need a Scribal School (built after a Temple) to start gathering Intel. You'll unlock this naturally as your city grows.", target: null, locked: true },
  { t: "War & Trade (Locked)", i: "⚔️", d: "Once you research Bronze Tools and build a Barracks, the War Council opens up. Sailboats unlock the Trade Post for caravans. You'll see these later.", target: null, locked: true },
  { t: "The Will of the Gods", i: "✨", d: "Keep Divine Favor above 20 by building Temples and making Offerings, or face Divine Wraths. High favor blesses your harvests.", target: "ruler-stats" },
  { t: "Path to Glory", i: "△", d: "To win: complete every Quest, reach 150 population, and build the Great Ziggurat. Good luck, Ensi.", target: null },
];

const B = {
  farm: { n: "Farm", s: "✿", c: { gold: 5, workers: 1 }, pr: { grain: 4 }, col: "#4A8C28", lore: "Sumerian farmers grew barley, emmer wheat, and lentils. Barley was the most important crop: it fed people, livestock, and was brewed into beer." },
  well: { n: "Well", s: "◎", c: { gold: 4, workers: 1 }, pr: { water: 2 }, col: "#2878C0", lore: "Mesopotamia receives little rainfall. City wells tapped the underground water table, supplementing river irrigation for household use." },
  housing: { n: "Housing", s: "⌂", c: { gold: 10, workers: 1 }, pb: 8, col: "#B86828", lore: "Ordinary Sumerian homes were rectangular mudbrick structures. Families clustered together, using the flat roofs for sleeping in the brutal 50°C summer heat." },
  granary: { n: "Granary", s: "⊞", c: { gold: 9, workers: 2 }, sc: 50, col: "#9A7040", lore: "Temple granaries were the heart of the Sumerian economy. Grain stored inside paid workers and fed the poor during famines. Scribes recorded every transaction." },
  temple: { n: "Temple", s: "⛩", c: { gold: 18, workers: 2 }, morBonus: 12, fa: 2, col: "#8040C0", lore: "The temple was the city's economic center: bank, granary, workshop, and court of law. It employed thousands of workers and was dedicated to the patron god of the city." },
  market: { n: "Market", s: "⚖", c: { gold: 16, workers: 2 }, pr: { gold: 10 }, col: "#C4A020", lore: "Sumerian merchants operated under temple sponsorship. They traveled long overland routes by donkey caravan, trading textiles and grain for metals and timber." },
  canal: { n: "Canal", s: "≈", reqT: "irrigation", c: { gold: 10, workers: 2 }, pr: { water: 5 }, col: "#1A60A8", lore: "Canals were the great infrastructure achievement of Mesopotamia. Maintenance required enormous corvée labor. If channels silted up, cities died." },
  scribal: { n: "Scribal School", s: "𒀭", reqB: "temple", c: { gold: 22, workers: 3 }, pr: { intel: 3 }, col: "#1A3A70", lore: "The edubba ('tablet house') was the ancient school. Students spent years mastering cuneiform signs, mathematics, and accounting." },
  barracks: { n: "Barracks", s: "⚔", reqT: "bronze", c: { gold: 20, workers: 3, grain: 5 }, def: 15, mil: true, col: "#504030", lore: "City-states constantly warred over water rights and fertile land. Soldiers fought in tight phalanx formations using copper weapons and rawhide shields." },
  watchtower: { n: "Watchtower", s: "🗼", reqB: "barracks", c: { gold: 15, workers: 2 }, def: 10, pr: { intel: 1 }, col: "#506060", lore: "City walls and towers were critical in an era of frequent warfare, providing advance warning of approaching armies or desert raiders." },
  tradepost: { n: "Trade Post", s: "🏪", reqT: "sailboats", c: { gold: 25, workers: 2 }, pr: { gold: 5 }, tr: true, col: "#806020", lore: "By 2500 BCE, Sumerian merchants were sailing the Persian Gulf to Dilmun (Bahrain) and Magan (Oman). Trade posts served as ancient customs houses." },
  ziggurat: { n: "Ziggurat", s: "△", reqT: "architecture", reqB: "temple", c: { gold: 45, workers: 8, grain: 15 }, morBonus: 30, fa: 10, col: "#C49010", lore: "The ziggurat was a massive stepped pyramid serving as the earthly home of the city's patron deity, built with millions of mudbricks. The most famous was the Great Ziggurat of Ur." },
};

const INVS = [
  { id: "irrigation", n: "Irrigation", icon: "🌊", cost: 15, prereqs: [], desc: "Farms near river +3 grain. Unlocks Canals." },
  { id: "pottery", n: "Potter's Wheel", icon: "🏺", cost: 15, prereqs: [], desc: "Markets and Trade Posts +3 silver." },
  { id: "bronze", n: "Bronze Tools", icon: "🔨", cost: 20, prereqs: [], desc: "All output +25%. Unlocks Barracks." },
  { id: "sailboats", n: "Sailboats", icon: "⛵", cost: 25, prereqs: ["irrigation"], desc: "Unlocks Trade Posts." },
  { id: "wheel", n: "The Wheel", icon: "⚙️", cost: 25, prereqs: ["bronze"], desc: "Markets produce +5 silver each." },
  { id: "writing", n: "Cuneiform Writing", icon: "✍️", cost: 30, prereqs: [], reqB: "scribal", desc: "Scribal Schools +2 intel. Scholars buffed." },
  { id: "chariots", n: "War Chariots", icon: "🐎", cost: 40, prereqs: ["wheel", "bronze"], reqB: "barracks", desc: "Barracks +20 defense." },
  { id: "seals", n: "Cylinder Seals", icon: "🛞", cost: 35, prereqs: ["writing"], desc: "Markets +5 silver. +2 global morale/season." },
  { id: "mathematics", n: "Mathematics", icon: "📐", cost: 45, prereqs: ["writing"], desc: "All production +15%." },
  { id: "metallurgy", n: "Iron Metallurgy", icon: "⚒️", cost: 60, prereqs: ["bronze", "mathematics"], desc: "Military attacks and defense +50%." },
  { id: "laws", n: "Code of Laws", icon: "⚖️", cost: 50, prereqs: ["writing", "seals"], desc: "Morale can never drop below 30." },
  { id: "astronomy", n: "Astronomy", icon: "🌟", cost: 55, prereqs: ["mathematics"], reqB: "watchtower", desc: "Disasters lose 50% severity." },
  { id: "architecture", n: "Architecture", icon: "🏛️", cost: 75, prereqs: ["mathematics"], desc: "Ziggurats double morale bonus. Unlocks Ziggurat." },
  { id: "epic", n: "Epic Literature", icon: "📜", cost: 80, prereqs: ["writing"], desc: "Housing provides +2 morale each." },
];

const TECH_TIERS = [
  { name: "Era of Foundation", techs: [INVS[0], INVS[1], INVS[2]] },
  { name: "Era of Commerce and Script", techs: [INVS[3], INVS[4], INVS[5]] },
  { name: "Era of Organization", techs: [INVS[6], INVS[7], INVS[8]] },
  { name: "Era of Empires", techs: [INVS[9], INVS[10], INVS[11]] },
  { name: "Era of Legends", techs: [INVS[12], INVS[13]] },
];

const RULER_EVS = [
  { t: "Euphrates Flood", i: "🌊", e: { water: 14, grain: -8 }, sev: false },
  { t: "Harsh Drought", i: "☀️", e: { water: -12, grain: -6 }, sev: true },
  { t: "Merchant Caravan", i: "🐪", e: { gold: 16 }, sev: false },
  { t: "Bountiful Harvest", i: "🌾", e: { grain: 22 }, sev: false },
  { t: "Plague", i: "💀", e: { pop: -15, workers: -3, morale: -14 }, sev: true },
  { t: "Grand Festival", i: "🎊", e: { morale: 22 }, sev: false },
  { t: "Desert Raid", i: "⚔️", e: { gold: -14, workers: -4, morale: -8 }, sev: true },
  { t: "Lapis Lazuli Trade", i: "💎", e: { gold: 14, workers: 2 }, sev: false },
  { t: "Locust Swarm", i: "🦗", e: { grain: -18 }, sev: true },
  { t: "New Settlers", i: "🚶", e: { workers: 5, pop: 10 }, sev: false },
];

const QUEST_DEFS = [
  { id: "canals", text: "Build 2 canals", desc: "Control the life-giving flow of the Euphrates", icon: "≈" },
  { id: "temple", text: "Build a temple", desc: "Honor the gods who sustain your city", icon: "⛩" },
  { id: "scribal", text: "Build a scribal school", desc: "Preserve knowledge for eternity on clay tablets", icon: "𒀭" },
  { id: "epic", text: "Research Epic Literature", desc: "Immortalize your heroes in cuneiform verse", icon: "📜" },
  { id: "pop50", text: "Grow to 50 population", desc: "Let your city-state swell with life and ambition", icon: "👥" },
  { id: "ziggurat", text: "Build the great Ziggurat", desc: "Raise a mountain of brick to touch the heavens", icon: "△" },
];


function autoAssignIdle(state) {
  const { workers, roles } = state;
  const assigned = roles.workers + roles.scholars + roles.soldiers;
  let idle = Math.max(0, workers - assigned);
  if (idle === 0) return state;
  const r = { ...roles };
  while (idle > 0) {
    if (r.workers <= r.scholars && r.workers <= r.soldiers) r.workers++;
    else if (r.scholars <= r.soldiers) r.scholars++;
    else r.soldiers++;
    idle--;
  }
  return { ...state, roles: r };
}

function capRolesToWorkers(state) {
  const max = Math.max(0, Math.floor(state.workers));
  const r = { ...state.roles };
  const total = r.workers + r.scholars + r.soldiers;
  if (total <= max) return autoAssignIdle(state);
  const scale = max / total;
  r.workers = Math.floor(r.workers * scale);
  r.scholars = Math.floor(r.scholars * scale);
  r.soldiers = Math.floor(r.soldiers * scale);
  return autoAssignIdle({ ...state, roles: r });
}

function rulerCalcStats(grid, invs = [], roles = { workers: 0, scholars: 0, soldiers: 0 }, god = null) {
  let gr = 0, wa = 0, go = 0, pb = 0, sc = 0, morBonus = 0, def = 0, intel = 0, fa = 0, hasTrade = false, hasMil = false;
  const has = (id) => invs.includes(id);
  if (god === "enki") { wa += 2; intel += 1; }
  if (god === "ishtar") def += 10;
  grid.forEach((row, r) => row.forEach((k, c) => {
    if (!k) return;
    const b = B[k];
    if (!b) return;
    let ga = b.pr?.grain || 0, wa2 = b.pr?.water || 0, goa = b.pr?.gold || 0, ia = b.pr?.intel || 0, da = b.def || 0, faa = b.fa || 0;
    if (k === "farm") {
      if (god === "enlil") ga += 1;
      for (const [dr, dc] of RDIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID) {
          if (isRiverCell(nr, nc)) ga += has("irrigation") ? 3 : 1;
          if (grid[nr][nc] === "canal") ga += 1;
        }
      }
    }
    if (k === "housing") {
      for (const [dr, dc] of RDIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && grid[nr][nc] === "temple") morBonus += 3;
      }
    }
    if (k === "market") {
      for (const [dr, dc] of RDIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && grid[nr][nc] === "market") goa += 2;
      }
    }
    if (k === "farm" && has("irrigation")) ga += 2;
    if (k === "market" && has("wheel")) goa += 5;
    if (k === "market" && has("pottery")) goa += 3;
    if (k === "market" && has("seals")) goa += 5;
    if (k === "tradepost" && has("pottery")) goa += 3;
    if (k === "tradepost" && has("sailboats")) goa += 8;
    if (k === "scribal" && has("writing")) ia += 2;
    if (k === "barracks" && has("chariots")) da += 20;
    if (k === "ziggurat" && has("architecture")) morBonus += 30;
    if (k === "housing" && has("epic")) morBonus += 2;
    if (has("bronze")) { ga = Math.floor(ga * 1.25); wa2 = Math.floor(wa2 * 1.25); }
    if (has("mathematics")) { ga = Math.floor(ga * 1.15); wa2 = Math.floor(wa2 * 1.15); goa = Math.floor(goa * 1.15); }
    if (has("metallurgy")) da = Math.floor(da * 1.5);
    if (k === "scribal") ia += Math.floor(roles.scholars * 0.3);
    gr += ga; wa += wa2; go += goa; pb += b.pb || 0; sc += b.sc || 0; morBonus += b.morBonus || 0; def += da; intel += ia; fa += faa;
    if (b.tr) hasTrade = true;
    if (b.mil) hasMil = true;
  }));
  gr += Math.floor(roles.workers * 0.5);
  wa += Math.floor(roles.workers * 0.2);
  def += Math.floor(roles.soldiers * (has("chariots") ? 1.0 : 0.5));
  if (has("seals")) morBonus += 2;
  return { gr, wa, go, pb, sc, morBonus, def, intel, fa, hasTrade, hasMil };
}

function rulerCheckQuests(quests, grid, S) {
  return quests.map(q => {
    if (q.done) return q;
    const flat = grid.flat();
    let done = false;
    switch (q.id) {
      case "canals": done = flat.filter(k => k === "canal").length >= 2; break;
      case "temple": done = flat.includes("temple"); break;
      case "scribal": done = flat.includes("scribal"); break;
      case "epic": done = S.invs.includes("epic"); break;
      case "pop50": done = S.pop >= 50; break;
      case "ziggurat": done = flat.includes("ziggurat"); break;
      default: done = false;
    }
    return { ...q, done };
  });
}

const mkRulerGrid = () => {
  const g = Array(GRID).fill(null).map(() => Array(GRID).fill(null));
  g[9][3] = "farm"; g[9][4] = "farm"; g[9][5] = "well";
  g[8][3] = "housing"; g[8][4] = "granary"; g[8][5] = "farm";
  return g;
};
const mkRulerState = () => ({
  grid: mkRulerGrid(), grain: 55, water: 45, workers: 12, gold: 60, pop: 30, morale: 68,
  intel: 0, favor: 50, grainCap: 150, turn: 1, sea: 0, invs: [],
  roles: { workers: 4, scholars: 4, soldiers: 4 },
  quests: QUEST_DEFS.map(q => ({ ...q, done: false })),
  won: false, endless: false, offeringMade: false, god: null,
  seenAdvisors: {}, seenBldgs: {},
  log: ["𒀭 Your village stirs on the banks of the Euphrates. Forge a civilisation!"],
  phase: "god_select",
});

// ═══════════════════════════════════════════════════
// CIVILIAN CONSTANTS
// ═══════════════════════════════════════════════════
const CIVIL_TUTORIAL = [
  { t: "Life as a Citizen", i: "🌾", d: "You are a citizen of Uruk. Every day gives you 3 Actions. If your Health or Hunger reach 0, you die.", target: null },
  { t: "Your Vital Stats", i: "📊", d: "Monitor Health, Hunger, Energy and Silver here. Low hunger damages health; low silver means you can't pay taxes.", target: "civ-stats" },
  { t: "Action Descriptions", i: "📖", d: "The first time you use any action, a brief Scribe's Note pops up with its historical context. You can also open the ⚡ Actions button in the header at any time for a full list with descriptions.", target: "civ-actions" },
  { t: "Try an Action", i: "⚡", d: "Pick any action and use it once. Working the fields gives grain; pottery and trade give silver; rest restores energy.", target: "civ-actions", action: "any_action", actionHint: "Perform any daily action to continue." },
  { t: "End the Day", i: "🌅", d: "When you're done with your actions (or out of energy), click 'End Day' to advance to tomorrow.", target: "civ-actions", action: "end_day", actionHint: "Click 'End Day' to continue." },
  { t: "Seasons and Survival", i: "☀️", d: "Spring brings floods, Summer the harvest, Autumn brisk trading, and Winter the dreaded Temple Taxes. Prepare your stores!", target: null },
  { t: "Temple Taxes", i: "📜", d: "Every Winter, the temple scribes assess a tax. You MUST pay it via 'Pay Tax' before Spring or face brutal penalties.", target: null },
  { t: "Your Family", i: "👨‍👩‍👧‍👦", d: "Use 'Tend Family' regularly to keep Family Health high. Each Spring, a healthy household (Family Health 60+) has a chance to grow — the higher the health, the better the odds. A thriving family of 4+ fulfils the Patriarch legacy goal.", target: null },
  { t: "Your Legacy", i: "🌟", d: "Open the 🌟 Legacy button to see your six life-long goals — four shared goals (Patriarch, Devout, Famous, Long-Lived) and two unique to your archetype. Achieve all six and your name will be carved in clay forever.", target: null },
];

const JOBS = {
  farmer: { label: "Farmer", icon: "🌾", desc: "You tend barley fields along the Euphrates.", bonusLine: "Work Fields yields +4 grain. Irrigation bonus lasts 3 actions.", specialLabel: "Tend Irrigation", specialIcon: "🌊", specialDesc: "Prepare channels. Next 3 Work Fields yield +8 bonus grain.", specialCost: "-10 energy", startSilver: 5, startGrain: 18, startPottery: 0 },
  potter: { label: "Potter", icon: "🏺", desc: "You fire clay vessels in your kiln.", bonusLine: "Craft Pottery makes +2 vessels. Sell pottery at +1 premium.", specialLabel: "Kiln Batch", specialIcon: "🔥", specialDesc: "Fire a full batch producing 6 to 10 vessels at once.", specialCost: "-25 energy, -2 grain", startSilver: 10, startGrain: 8, startPottery: 5 },
  merchant: { label: "Merchant", icon: "⚖️", desc: "You work caravan routes between cities.", bonusLine: "Trade earns min 3 silver. Buy Provisions costs only 1 silver.", specialLabel: "Caravan Route", specialIcon: "🐪", specialDesc: "Call in contacts for a guaranteed profitable deal.", specialCost: "-3 silver (once/szn)", startSilver: 18, startGrain: 6, startPottery: 0 },
};

// First-click lore popup for each action
const CIV_ACT_LORE = {
  work_field: "Agriculture in Sumer depended on massive irrigation networks. The Euphrates was tamed by vast amounts of corvée labor, turning desert into the world's most productive farmland.",
  craft_pottery: "The potter's wheel allowed mass production of standard vessels, essential for storing and trading grain, oil, and beer across the Sumerian world.",
  trade_market: "Silver shekels were the standard of value, weighed on balance scales. Merchants organized donkey caravans that traveled hundreds of miles to trade for foreign timber and metals.",
  buy_provisions: "During droughts, grain prices skyrocketed, forcing many commoners into crushing debt and even temple-servitude to survive.",
  rest: "Homes were simple mudbrick structures with flat roofs. Families often slept on the roof during the brutal 50°C summer heat.",
  pray_temple: "Temples functioned as the city's bank, granary, and factory. The gods required daily feeding and appeasement through offerings and song.",
  pay_tax: "Scribes kept meticulous clay tablet records of every citizen's debts. Tax evasion meant brutal punishment or indentured labor on canals and ziggurats.",
  tend_family: "A citizen's primary duty was to maintain their household and produce heirs who would tend to the spirits of their ancestors.",
  end_day: "Each day the sun rose and the Euphrates flowed. Your actions today echo in the clay tablets of tomorrow.",
  farmer_special: "Farmers knew the land intimately. Clearing channels at the right moment could triple a harvest.",
  potter_special: "Master potters fired their largest batches at the height of summer, when the kilns could reach their peak temperatures.",
  merchant_special: "Merchant families built generations of contacts. A well-timed caravan could make a year's profit in a single trip.",
};

const addLog = (s, text, type = "") => ({
  ...s,
  log: [{ text, type, label: `Day ${s.dayInSeason}, ${SEAS[s.seasonIndex]}, Year ${s.year}` }, ...s.log].slice(0, 35),
});

const CIVIL_EVS = [
  { id: "flood", seasonal: [0], title: "🌊 The Rivers Rise", body: "The Euphrates has broken its banks. Muddy water rushes through the lower quarters.", onTrigger: s => ({ ...s, flood: true }), choices: [{ label: "Move grain to high ground", sub: "-20 energy", apply: s => addLog({ ...s, energy: clamp(s.energy - 20, 0, 100) }, "You haul sacks to safety.") }, { label: "Pray at temple", sub: "lose grain, +10 favor", apply: s => addLog({ ...s, templeRelation: clamp(s.templeRelation + 10, 0, 100), grain: Math.max(0, s.grain - rand(2, 5)) }, "You pray as the flood takes grain.", "bad") }] },
  { id: "drought", seasonal: [1], title: "☀️ The Land Cracks", body: "No rains have come for weeks. The barley wilts in the fields.", onTrigger: s => ({ ...s, drought: true }), choices: [{ label: "Dig deeper channels", sub: "-15 energy, save grain", apply: s => addLog({ ...s, energy: clamp(s.energy - 15, 0, 100), grain: s.grain + rand(2, 5) }, "You coax water from the earth.", "good") }, { label: "Buy extra grain (4 silver)", sub: "-4 silver, +8 grain", apply: s => s.silver >= 4 ? addLog({ ...s, silver: s.silver - 4, grain: s.grain + 8 }, "You buy grain before shortages worsen.", "good") : addLog(s, "You cannot afford grain at these prices.", "bad") }] },
  { id: "plague", seasonal: null, title: "🦠 A Sickness Spreads", body: "A fever unlike any seen before moves through Uruk.", onTrigger: s => ({ ...s, plague: true }), choices: [{ label: "Buy healing herbs (5 silver)", sub: "-5 silver, cures plague", apply: s => s.silver >= 5 ? addLog({ ...s, silver: s.silver - 5, health: clamp(s.health + 15, 0, 100), familyHealth: clamp(s.familyHealth + 20, 0, 100), plague: false }, "The herbs work quickly.", "good") : addLog({ ...s, plague: true }, "You cannot afford medicine.", "bad") }, { label: "Isolate household", sub: "-15 energy, -8 reputation", apply: s => addLog({ ...s, energy: clamp(s.energy - 15, 0, 100), reputation: clamp(s.reputation - 8, 0, 100), plague: Math.random() < 0.4 }, "You bolt the doors.") }] },
  { id: "harvest_bonus", seasonal: [1], title: "🌾 A Bountiful Harvest", body: "The gods have smiled upon the fields this season.", choices: [{ label: "Harvest everything", sub: "+12 to 20 grain", apply: s => addLog({ ...s, grain: s.grain + rand(12, 20) }, "The storeroom is packed.", "good") }, { label: "Give a tenth to the temple", sub: "+favour, +reputation, net grain gain", apply: s => { const h = rand(10, 18); const t = Math.floor(h * 0.1); return addLog({ ...s, grain: s.grain + h - t, templeRelation: clamp(s.templeRelation + 12, 0, 100), reputation: clamp(s.reputation + 8, 0, 100) }, `You harvest generously and tithe to the temple.`, "good"); } }] },
];

// Shared legacy goals available to all archetypes
const LEGACY_SHARED = [
  { id: "patriarch", icon: "👨‍👩‍👧‍👦", label: "Patriarch", desc: "Raise a household of 4+ kin", check: (s) => (s.family?.length || 0) >= 4 },
  { id: "devout",    icon: "🛐",         label: "Devout",    desc: "Reach 90 Temple Favour",        check: (s) => s.templeRelation >= 90 },
  { id: "famous",    icon: "🌟",         label: "Famous",    desc: "Reach 90 Reputation in Uruk",   check: (s) => s.reputation >= 90 },
  { id: "longlived", icon: "🕰️",        label: "Long-Lived", desc: "Survive 5 full years",         check: (s) => s.year >= 5 },
];

// Archetype-specific legacy goals (2 unique goals per job)
const LEGACY_JOB = {
  farmer: [
    { id: "granary",    icon: "🌾", label: "Granary of Uruk",  desc: "Amass 80 grain at once",                       check: (s) => s.grain >= 80 },
    { id: "irrigator",  icon: "🌊", label: "Master Irrigator", desc: "Tend Irrigation 20 times over your lifetime",  check: (s) => (s.lifetimeIrrigation || 0) >= 20 },
  ],
  potter: [
    { id: "craftsman",  icon: "🏺", label: "Master Craftsman", desc: "Sell 50 pottery vessels in your lifetime",     check: (s) => (s.lifetimePottery || 0) >= 50 },
    { id: "kilnmaster", icon: "🔥", label: "Kiln Master",      desc: "Fire 10 grand kiln batches in your lifetime",  check: (s) => (s.lifetimeKiln || 0) >= 10 },
  ],
  merchant: [
    { id: "magnate",   icon: "💰", label: "Silver Magnate",   desc: "Hold 150 silver at once",                      check: (s) => s.silver >= 150 },
    { id: "caravaner", icon: "🐪", label: "Caravan Master",   desc: "Complete 10 caravan routes in your lifetime",  check: (s) => (s.lifetimeCaravans || 0) >= 10 },
  ],
};

const getLegacyGoals = (job) => [...LEGACY_SHARED, ...(LEGACY_JOB[job] || [])];
// Keep a flat alias used in legacy completion check
const LEGACY_GOALS = { farmer: getLegacyGoals("farmer"), potter: getLegacyGoals("potter"), merchant: getLegacyGoals("merchant") };

const mkCivilState = (job) => ({
  phase: "play", job, day: 1, dayInSeason: 1, seasonIndex: 0, year: 1, totalDays: 0, actionsLeft: 3,
  health: 85, hunger: 80, energy: 100, reputation: 50, silver: JOBS[job].startSilver, grain: JOBS[job].startGrain, pottery: JOBS[job].startPottery,
  family: ["Wife", "Child"], familyHealth: 90, templeRelation: 50, taxDue: false, taxAmount: 0,
  flood: false, drought: false, plague: false, harvestReady: false, irrigationBonus: 0, caravanUsed: false, pendingEventId: null,
  marketOpen: false, marketPrices: { pottery: 0, grain: 0 }, marketSales: 0, seenActs: {},
  goals: {}, lifetimePottery: 0, lifetimeIrrigation: 0, lifetimeKiln: 0, lifetimeCaravans: 0, legacyAchieved: false,
  log: [{ text: `${JOBS[job].icon} You are a ${JOBS[job].label} of Uruk. The morning sun rises over the ziggurat of Anu.`, type: "", label: "Day 1, Spring, Year 1" }],
});

// ═══════════════════════════════════════════════════
// MENU COMPONENTS
// ═══════════════════════════════════════════════════
function MainMenu({ onStartNew, onLoadGame }) {
  const [factIdx, setFactIdx] = useState(0);
  useEffect(() => { const t = setInterval(() => setFactIdx((i) => (i + 1) % HIST_FACTS.length), 6000); return () => clearInterval(t); }, []);
  const f = HIST_FACTS[factIdx];

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 18% 82%, #2C1106 0%, #08030A 55%, #0A0200 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px", gap: "28px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "clamp(36px,7vw,60px)", marginBottom: "10px", filter: "drop-shadow(0 0 20px rgba(212,175,55,0.5))" }}>𒀭</div>
        <h1 style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: "clamp(26px,6vw,48px)", fontWeight: 700, color: GC, letterSpacing: "5px", textShadow: `0 0 30px rgba(212,175,55,0.7)`, marginBottom: "10px" }}>MESOPOTAMIA</h1>
        <p style={{ fontFamily: "'Cinzel',serif", fontSize: "12px", letterSpacing: "5px", color: "rgba(245,230,204,0.45)" }}>BETWEEN THE TWO RIVERS · 2800 BCE</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '320px', marginTop: '20px' }}>
        <button className="tbtn" style={{ padding: '16px' }} onClick={onStartNew}>START NEW CHRONICLE</button>
        <button className="tbtn2" style={{ padding: '14px' }} onClick={onLoadGame}>LOAD TABLETS</button>
      </div>
      <div key={factIdx} className="fact-anim" style={{ maxWidth: "660px", width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "12px", padding: "16px 20px", display: "flex", gap: "14px", alignItems: "flex-start", marginTop: '20px' }}>
        <div style={{ fontSize: "28px", flexShrink: 0 }}>{f.icon}</div>
        <div>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: "11px", color: GC, letterSpacing: "1px", marginBottom: "5px" }}>{f.head.toUpperCase()}</div>
          <div style={{ fontFamily: "'IM Fell English',serif", fontSize: "12px", color: "rgba(245,230,204,0.68)", lineHeight: 1.65, fontStyle: "italic" }}>{f.body}</div>
        </div>
      </div>
    </div>
  );
}

function ModeSelect({ onSelect, onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 18% 82%, #2C1106 0%, #08030A 55%, #0A0200 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px", gap: "28px" }}>
      <button onClick={onBack} className="hbtn" style={{ position: "absolute", top: "20px", left: "20px" }}>← Back</button>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: "28px", color: GC, letterSpacing: "3px" }}>CHOOSE YOUR PATH</h1>
      </div>
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center", maxWidth: "780px", width: "100%" }}>
        {[
          { mode: "ruler", icon: "👑", title: "Rule as Ensi", sub: "City Builder & Ruler", desc: "Command a Sumerian city-state from above. Build on a grid, manage population roles, research technologies, and construct the Great Ziggurat.", color: "#C49010", border: "rgba(200,144,16,0.5)" },
          { mode: "civilian", icon: "🌾", title: "Live as Citizen", sub: "Civilian Daily Survival", desc: "Survive as a common citizen of Uruk. Manage hunger, health, temple taxes, and unexpected events with only 3 actions each day.", color: "#8040C0", border: "rgba(128,64,192,0.5)" }
        ].map((opt) => (
          <div key={opt.mode} onClick={() => onSelect(opt.mode)} style={{ flex: "1", minWidth: "280px", maxWidth: "340px", background: "rgba(0,0,0,0.35)", border: `2px solid ${opt.border}`, borderRadius: "18px", padding: "28px 24px", cursor: "pointer", transition: "all 0.22s", textAlign: "center" }}
            onMouseOver={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.58)"; e.currentTarget.style.transform = "translateY(-5px)"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.35)"; e.currentTarget.style.transform = "none"; }}>
            <div style={{ fontSize: "52px", marginBottom: "14px", filter: `drop-shadow(0 0 14px ${opt.color}66)` }}>{opt.icon}</div>
            <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: "16px", color: opt.color, letterSpacing: "1px", marginBottom: "5px" }}>{opt.title}</div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: "9px", letterSpacing: "2.5px", color: "rgba(245,230,204,0.4)", marginBottom: "14px", textTransform: "uppercase" }}>{opt.sub}</div>
            <p style={{ fontSize: "12px", color: "rgba(245,230,204,0.68)", lineHeight: 1.65 }}>{opt.desc}</p>
            <div style={{ marginTop: "18px" }}>
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: "10px", letterSpacing: "2px", color: opt.color, border: `1px solid ${opt.border}`, padding: "6px 16px", borderRadius: "8px" }}>CHOOSE ›</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NamePrompt({ mode, onConfirm, onBack }) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  const handleConfirm = () => {
    const n = name.trim();
    if (!n) return setErr("Name cannot be empty.");
    if (n.length > 20) return setErr("Name too long.");
    const saves = getSaves();
    // Ended chronicles can be overwritten (the old one becomes history)
    if (saves[n] && !saves[n].ended) return setErr("An active chronicle with this name already exists.");
    onConfirm(n, mode);
  };

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 18% 82%, #2C1106 0%, #08030A 55%, #0A0200 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px", textAlign: "center" }}>
      <h2 style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: "26px", color: GC, letterSpacing: "2px", marginBottom: "10px" }}>NAME YOUR CHRONICLE</h2>
      <p style={{ marginBottom: "26px", color: "rgba(245,230,204,0.6)", fontSize: "13px" }}>A unique name to record your legacy in the clay tablets.</p>
      <input autoFocus className="input-field" value={name} onChange={e => { setName(e.target.value); setErr(""); }} placeholder="e.g. Gilgamesh" onKeyDown={e => e.key === "Enter" && handleConfirm()} />
      <div style={{ minHeight: "20px", color: "#FF6040", fontSize: "12px", marginTop: "10px", fontFamily: "'Cinzel',serif" }}>{err}</div>
      <div style={{ display: 'flex', gap: '16px', marginTop: '20px', width: "100%", maxWidth: "320px" }}>
        <button className="tbtn2" style={{ flex: 1 }} onClick={onBack}>BACK</button>
        <button className="tbtn" style={{ flex: 2 }} onClick={handleConfirm}>BEGIN JOURNEY</button>
      </div>
    </div>
  );
}

function LoadMenu({ onLoad, onBack }) {
  const [saves, setSaves] = useState(getSaves());
  const handleDelete = (name) => { deleteSave(name); setSaves(getSaves()); };
  const saveList = Object.values(saves).sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 18% 82%, #2C1106 0%, #08030A 55%, #0A0200 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px" }}>
      <h2 style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: "28px", color: GC, letterSpacing: "2px" }}>TABLET ARCHIVES</h2>
      <div style={{ width: '100%', maxWidth: '600px', maxHeight: '60vh', overflowY: 'auto', marginTop: '24px', paddingRight: "5px" }}>
        {saveList.length === 0 && <p style={{ textAlign: "center", color: "rgba(245,230,204,0.5)", fontSize: "14px" }}>No chronicles found in the archives.</p>}
        {saveList.map(s => {
          const ended = !!s.ended;
          const tagColor = s.endKind === "victorious" ? GC : "#CC3820";
          const tagLabel = s.endKind === "victorious" ? "🌟 VICTORIOUS" : s.endKind === "fallen" ? "💀 FALLEN" : s.endKind === "died" ? "💀 DIED" : null;
          return (
            <div key={s.name} className="save-card" style={{ opacity: ended ? 0.72 : 1 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ fontFamily: "'Cinzel',serif", color: GC, fontSize: "16px", fontWeight: "bold" }}>{s.name}</div>
                  {tagLabel && <span style={{ fontFamily: "'Cinzel',serif", fontSize: "9px", letterSpacing: "2px", color: tagColor, border: `1px solid ${tagColor}`, padding: "2px 8px", borderRadius: "6px" }}>{tagLabel}</span>}
                </div>
                <div style={{ fontSize: "11px", color: "rgba(245,230,204,0.65)", marginTop: "6px", fontFamily: "'Cinzel',serif" }}>
                  {s.mode === "ruler" ? "👑 Ruler Mode" : "🌾 Citizen Mode"} · {s.summary}
                </div>
                <div style={{ fontSize: "9.5px", color: "rgba(245,230,204,0.35)", marginTop: "4px" }}>
                  {ended ? "Ended" : "Last played"}: {new Date(s.timestamp).toLocaleString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="tbtn"
                  style={{ padding: '8px 16px', width: 'auto' }}
                  disabled={ended}
                  title={ended ? "This chronicle has ended and cannot be resumed." : ""}
                  onClick={() => !ended && onLoad(s.name, s.mode, s.data)}
                >
                  {ended ? "ENDED" : "LOAD"}
                </button>
                <button className="rbtn" style={{ padding: '8px 12px', width: 'auto' }} onClick={() => handleDelete(s.name)}>X</button>
              </div>
            </div>
          );
        })}
      </div>
      <button className="tbtn2" style={{ marginTop: "24px", maxWidth: "200px" }} onClick={onBack}>RETURN TO MENU</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// CIVILIAN GAME
// ═══════════════════════════════════════════════════
function CivilianGame({ saveName, initialState, onBack }) {
  const [S, setS] = useState(initialState || { phase: "job_select" });
  const activeEvent = useMemo(
    () => (S.pendingEventId ? CIVIL_EVS.find((e) => e.id === S.pendingEventId) || null : null),
    [S.pendingEventId]
  );
  const [tutStep, setTutStep] = useState(-1);
  const [instPan, setInstPan] = useState(false);
  const [legacyPan, setLegacyPan] = useState(false);
  const [actsPan, setActsPan] = useState(false);
  const [advisor, setAdvisor] = useState(null); // Lore popup on first click
  const [tutBarHidden, setTutBarHidden] = useState(false);
  const signalTut = useCallback((act) => {
    setTutStep((cur) => {
      if (cur < 0 || cur >= CIVIL_TUTORIAL.length) return cur;
      const want = CIVIL_TUTORIAL[cur].action;
      if (!want) return cur;
      if (want === act || (want === "any_action" && act !== "end_day")) return cur + 1;
      return cur;
    });
    setTutBarHidden(false); // re-show bar on step advance
  }, []);

  useEffect(() => { saveGame(saveName, "civilian", S); }, [S, saveName]);

  const startJob = (job) => { setS(mkCivilState(job)); setTutStep(0); };

  const civilSeasonChange = useCallback((s) => {
    const n = SEAS[s.seasonIndex];
    if (n === "Spring") return addLog({ ...s, flood: false, drought: false }, "🌱 Floodwaters recede. Planting begins.", "event");
    if (n === "Summer") return addLog({ ...s, harvestReady: true }, "☀️ Sun scorches the plain. Harvest barley now.", "event");
    if (n === "Autumn") return addLog({ ...s, harvestReady: false }, "🍂 Merchants flood markets. Trade is brisk.", "event");
    return addLog(s, "❄️ Cold descends. Temple priests prepare to collect winter tribute.", "event");
  }, []);

  const civilAdvanceDay = useCallback((prev) => {
    let s = { ...prev, day: prev.day + 1, totalDays: prev.totalDays + 1, dayInSeason: prev.dayInSeason + 1, actionsLeft: 3 };
    s.hunger = clamp(s.hunger - rand(5, 9), 0, 100);
    s.energy = clamp(s.energy + 10, 0, 100);
    if (s.plague) { s.health = clamp(s.health - rand(3, 8), 0, 100); s.familyHealth = clamp(s.familyHealth - rand(2, 6), 0, 100); }
    if (s.drought) s.hunger = clamp(s.hunger - rand(2, 5), 0, 100);
    if (s.flood && s.grain > 0) s.grain = Math.max(0, s.grain - rand(0, s.job === "farmer" ? 1 : 3));

    if (s.seasonIndex === 3 && s.dayInSeason > 30 && s.taxDue) {
      if (s.silver >= s.taxAmount) {
        s.silver -= s.taxAmount;
        s = addLog(s, `⚖️ Temple guards forcefully seize your owed ${s.taxAmount} silver!`, "bad");
      } else {
        s.silver = 0; s.grain = Math.max(0, s.grain - 12); s.reputation = clamp(s.reputation - 40, 0, 100); s.templeRelation = clamp(s.templeRelation - 50, 0, 100); s.health = clamp(s.health - 25, 0, 100);
        s = addLog(s, `⚖️ TAX DEFAULT! Guards beat you, taking your grain and ruining your name in Uruk.`, "bad");
      }
      s.taxDue = false; s.taxAmount = 0;
    }

    if (s.dayInSeason > 30) {
      s.dayInSeason = 1; s.seasonIndex = (s.seasonIndex + 1) % 4;
      if (s.seasonIndex === 0) {
        s.year++; s.day = 1;
      }
      // Family growth check: once per season (Spring only), driven by familyHealth.
      // familyHealth 80-100 → 40% chance, 60-79 → 20%, 40-59 → 8%, <40 → 0%.
      // Also requires basic material support and household not already at max (8).
      if (s.seasonIndex === 0 && s.family.length < 8 && s.grain >= 8 && s.silver >= 5) {
        const fh = s.familyHealth;
        const chance = fh >= 80 ? 0.40 : fh >= 60 ? 0.20 : fh >= 40 ? 0.08 : 0;
        if (chance > 0 && Math.random() < chance) {
          const kin = ["Son", "Daughter", "Cousin", "Nephew", "Niece"][Math.floor(Math.random() * 5)];
          s.family.push(kin);
          s.silver = Math.max(0, s.silver - 5);
          s.grain = Math.max(0, s.grain - 3);
          s = addLog(s, `🍼 A new ${kin} joins your household! (−5 silver, −3 grain)`, "good");
        }
      }
      s = civilSeasonChange(s);
      s.caravanUsed = false;
    }

    if (s.seasonIndex === 3 && s.dayInSeason === 1 && !s.taxDue) {
      s.taxDue = true; s.taxAmount = Math.max(3, Math.floor(s.silver * 0.3) + s.family.length);
      s = addLog(s, `❗ The temple scribes arrive: ${s.taxAmount} silver shekels are due before season's end!`, "event");
    }

    const need = s.family.length + 1;
    if (s.grain >= need) {
      s.grain -= need;
      s.hunger = clamp(s.hunger + rand(18, 26), 0, 100); // <- daily family meal restores hunger
      s.familyHealth = clamp(s.familyHealth + 2, 0, 100); // family is fed
      if (s.hunger > 60) s.health = clamp(s.health + 1, 0, 100); // well-fed = slow health regen
    } else {
      s.hunger = clamp(s.hunger - rand(4, 10), 0, 100);
      s.health = clamp(s.health - rand(1, 4), 0, 100);
      s.familyHealth = clamp(s.familyHealth - rand(3, 7), 0, 100); // family also suffers
      s = addLog(s, "Your family had little to eat today.", "bad");
    }

    if (s.hunger <= 0) { s.health = clamp(s.health - rand(5, 12), 0, 100); s = addLog(s, "You are starving.", "bad"); }

    // Family health: if it hits 0, lose a family member
    if (s.familyHealth <= 0 && s.family.length > 0) {
      const lost = s.family.shift();
      s.familyHealth = 35; // others rally around grief
      s.health = clamp(s.health - 8, 0, 100);
      s.reputation = clamp(s.reputation - 6, 0, 100);
      s = addLog(s, `💔 Your ${lost} has perished from neglect. The household mourns.`, "bad");
    }

    // Legacy goal evaluation (job-specific)
    const jobGoals = getLegacyGoals(s.job);
    const newGoals = { ...(s.goals || {}) };
    jobGoals.forEach((g) => {
      if (!newGoals[g.id] && g.check(s)) {
        newGoals[g.id] = true;
        s = addLog(s, `🌟 Legacy: ${g.label} achieved!`, "good");
      }
    });
    s.goals = newGoals;
    if (!s.legacyAchieved && jobGoals.every((g) => newGoals[g.id])) {
      s.legacyAchieved = true;
      s = addLog(s, `✨ Your legacy is complete — your name will live on in the clay tablets of Uruk.`, "good");
    }

    if (Math.random() < 0.12) {
      const avail = CIVIL_EVS.filter((e) => !e.seasonal || e.seasonal.includes(s.seasonIndex));
      if (avail.length > 0) {
        const ev = avail[Math.floor(Math.random() * avail.length)];
        if (ev.onTrigger) s = ev.onTrigger(s);
        s.pendingEventId = ev.id;
      }
    }

    s = addLog(s, `🌆 Day ${s.dayInSeason} of ${SEAS[s.seasonIndex]}, Year ${s.year}.`);
    if (s.health <= 0) s.phase = "dead";
    return s;
  }, [civilSeasonChange]);

  // Core action dispatcher
  const runAction = useCallback((id) => {
    setS((prev) => {
      if (prev.phase !== "play" || (prev.actionsLeft <= 0 && id !== "end_day")) return prev;
      let s = { ...prev };
      const use = () => { s.actionsLeft--; };
      const isF = s.job === "farmer", isP = s.job === "potter", isM = s.job === "merchant";
      switch (id) {
        case "work_field": { use(); s.energy = clamp(s.energy - 20, 0, 100); s.hunger = clamp(s.hunger - 8, 0, 100); let b = s.seasonIndex === 1 && s.harvestReady ? rand(10, 16) : rand(4, 8); if (isF) b += 4; if (s.irrigationBonus > 0) { b += 8; s.irrigationBonus--; } s.grain += b; s = addLog(s, `Gathered ${b} grain.`); break; }
        case "craft_pottery": { if (s.grain < 1) return addLog(s, "Need 1 grain to work kiln.", "bad"); use(); s.energy = clamp(s.energy - 15, 0, 100); s.grain -= 1; s.hunger = clamp(s.hunger - 5, 0, 100); let m = rand(1, 3); if (isP) m += 2; s.pottery += m; s = addLog(s, `Fired ${m} clay vessels.`); break; }
        case "trade_market": { use(); s.energy = clamp(s.energy - 10, 0, 100); s.hunger = clamp(s.hunger - 4, 0, 100); s.marketPrices = { pottery: (s.drought ? rand(2, 4) : rand(1, 3)) + (isP ? 1 : 0), grain: s.drought ? rand(2, 4) : rand(1, 2) }; s.marketSales = 0; s.marketOpen = true; break; }
        case "buy_provisions": { const c = isM ? 1 : 2; if (s.silver < c) return addLog(s, `Need ${c} silver.`, "bad"); use(); s.silver -= c; s.grain += 6; s.hunger = clamp(s.hunger + 15, 0, 100); s = addLog(s, `Bought provisions.`); break; }
        case "rest": { use(); s.energy = clamp(s.energy + 25, 0, 100); s.health = clamp(s.health + 5, 0, 100); s.hunger = clamp(s.hunger - 1, 0, 100); s = addLog(s, "Rested on the reed mat."); break; }
        case "pray_temple": { if (s.grain < 1) return addLog(s, "Need 1 grain offering.", "bad"); use(); s.grain -= 1; s.templeRelation = clamp(s.templeRelation + 8, 0, 100); s.reputation = clamp(s.reputation + 4, 0, 100); s = addLog(s, "Prayed at ziggurat."); break; }
        case "pay_tax": { use(); if (!s.taxDue) return addLog(s, "No tax due."); if (s.silver < s.taxAmount) { const p = s.silver; const r = s.taxAmount - p; s.silver = 0; s.taxAmount = r; s.reputation = clamp(s.reputation - 15, 0, 100); s.templeRelation = clamp(s.templeRelation - 15, 0, 100); s = addLog(s, `Paid ${p} but owe ${r}. Marked in debt.`, "bad"); } else { s.silver -= s.taxAmount; s.taxDue = false; s.taxAmount = 0; s.templeRelation = clamp(s.templeRelation + 10, 0, 100); s = addLog(s, `Delivered silver. Debts cleared.`, "good"); } break; }
        case "tend_family": { if (s.grain < 2) return addLog(s, "Not enough grain.", "bad"); use(); s.grain -= 2; s.familyHealth = clamp(s.familyHealth + 10, 0, 100); s.hunger = clamp(s.hunger + 8, 0, 100); s = addLog(s, `Prepared family meal.`, "good"); break; }
        case "farmer_special": { if (s.seasonIndex > 1) return addLog(s, "Only Spring/Summer.", "bad"); use(); s.energy = clamp(s.energy - 10, 0, 100); s.irrigationBonus = 3; s.lifetimeIrrigation = (s.lifetimeIrrigation || 0) + 1; s = addLog(s, "Prepared irrigation channels.", "good"); break; }
        case "potter_special": { if (s.grain < 2 || s.energy < 25) return addLog(s, "Need 2 grain & 25 energy.", "bad"); use(); s.energy -= 25; s.grain -= 2; const b = rand(6, 10); s.pottery += b; s.lifetimeKiln = (s.lifetimeKiln || 0) + 1; s = addLog(s, `Grand kiln batch: ${b} vessels.`, "good"); break; }
        case "merchant_special": { if (s.caravanUsed || s.silver < 3) return addLog(s, "Route used or need 3 silver.", "bad"); use(); s.silver -= 3; s.caravanUsed = true; const p = rand(10, 18); s.silver += p; s.lifetimeCaravans = (s.lifetimeCaravans || 0) + 1; s = addLog(s, `Route paid off: ${p} silver.`, "good"); break; }
        case "end_day": s = civilAdvanceDay(s); break;
        default: break;
      }
      return s;
    });
  }, [civilAdvanceDay]);

  // First-click Scribe's Note, then action. Tutorial signal is fired AFTER the action runs.
  const doAction = (id) => {
    const loreKey = CIV_ACT_LORE[id] ? id : null;
    const title = id === "end_day"
      ? "End of Day"
      : id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    if (loreKey && !S.seenActs?.[loreKey]) {
      setS((prev) => ({ ...prev, seenActs: { ...(prev.seenActs || {}), [loreKey]: true } }));
      setAdvisor({ title, text: CIV_ACT_LORE[loreKey], pendingId: id });
      return;
    }
    runAction(id);
    signalTut(id);
  };

  const dismissAdvisor = () => {
    const pending = advisor?.pendingId;
    setAdvisor(null);
    if (pending) {
      runAction(pending);
      signalTut(pending);
    }
  };

  const resolveChoice = (fn) => {
    setS((prev) => {
      const next = fn(prev);
      return { ...next, pendingEventId: null };
    });
  };

  if (S.phase === "job_select") {
    return (
      <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 18% 82%, #2C1106 0%, #08030A 55%, #0A0200 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px", gap: "22px" }}>
        <button onClick={onBack} className="hbtn" style={{ position: "absolute", top: "18px", left: "18px" }}>← Menu</button>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: "clamp(18px,4.5vw,32px)", color: GC, letterSpacing: "3px", textShadow: `0 0 28px rgba(212,175,55,0.6)`, marginBottom: "8px" }}>𒀭 Choose Your Labor 𒀭</h1>
        </div>
        <div style={{ maxWidth: "600px", width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "12px", padding: "18px 22px" }}>
          <p style={{ fontSize: "13px", color: "rgba(245,230,204,0.72)", lineHeight: 1.75 }}>You dwell in the great walled city of Uruk. You must feed your family, honor the gods, pay your taxes, and survive the seasons.</p>
        </div>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center", maxWidth: "780px" }}>
          {Object.entries(JOBS).map(([key, job]) => (
            <div key={key} onClick={() => startJob(key)} style={{ width: "220px", background: "rgba(0,0,0,0.38)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: "14px", padding: "20px 16px", cursor: "pointer", textAlign: "center", transition: "all 0.2s" }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = GC; e.currentTarget.style.transform = "translateY(-4px)"; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = "rgba(212,175,55,0.25)"; e.currentTarget.style.transform = "none"; }}>
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>{job.icon}</div>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: "14px", color: GC, marginBottom: "7px" }}>{job.label}</div>
              <div style={{ fontSize: "11px", color: "rgba(245,230,204,0.58)", lineHeight: 1.6, marginBottom: "10px" }}>{job.desc}</div>
              <div style={{ borderTop: "1px solid rgba(212,175,55,0.15)", paddingTop: "9px", fontSize: "10px", color: "rgba(160,224,96,0.85)" }}>{job.bonusLine}</div>
              <div style={{ marginTop: "8px", fontSize: "9.5px", color: "rgba(160,120,255,0.85)" }}>Special: {job.specialLabel}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (S.phase === "dead") {
    return (
      <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 18% 82%, #2C1106 0%, #08030A 55%, #0A0200 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "18px", padding: "28px" }}>
        <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: "clamp(24px,5.5vw,42px)", color: "#CC3820", textShadow: "0 0 40px rgba(204,56,32,0.8)", textAlign: "center" }}>💀 YOUR DAYS HAVE ENDED 💀</div>
        <p style={{ fontFamily: "'IM Fell English',serif", fontStyle: "italic", fontSize: "15px", color: "rgba(245,230,204,0.55)" }}>"The scribes have sealed your tablet."</p>
        <div style={{ textAlign: "center", fontSize: "13px", color: "rgba(245,230,204,0.6)", lineHeight: 2.1 }}>
          <div>Survived <strong style={{ color: SAND }}>Year {S.year}, Day {S.dayInSeason}</strong> in the city of Uruk</div>
          <div>Died with <strong style={{ color: SAND }}>{S.silver} silver</strong> and <strong style={{ color: SAND }}>{S.grain} grain</strong></div>
        </div>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", justifyContent: "center" }}>
          <button className="tbtn" style={{ width: "auto", padding: "12px 30px" }} onClick={() => setS({ phase: "job_select" })}>Try Again</button>
          <button className="tbtn2" style={{ width: "auto" }} onClick={onBack}>Main Menu</button>
        </div>
      </div>
    );
  }

  const job = JOBS[S.job];
  const canSpecial = S.actionsLeft > 0 && (S.job === "farmer" ? (S.seasonIndex === 0 || S.seasonIndex === 1) && S.energy >= 10 : S.job === "potter" ? S.grain >= 2 && S.energy >= 25 : S.job === "merchant" ? !S.caravanUsed && S.silver >= 3 : false);

  const actions = [
    { id: "work_field", icon: "🌾", label: "Work Fields", cost: "-20 energy", desc: "Harvest barley. Summer yields much more than Spring." },
    { id: "craft_pottery", icon: "🏺", label: "Craft Pottery", cost: "-15 energy, -1 grain", desc: "Fire clay vessels for sale at the market." },
    { id: "trade_market", icon: "⚖️", label: "Market", cost: "-10 energy", desc: "Sell pottery and grain for silver shekels." },
    { id: "buy_provisions", icon: "🫙", label: "Buy Food", cost: "-1-2 silver", desc: "Purchase 6 grain and restore hunger." },
    { id: "rest", icon: "🌙", label: "Rest", cost: "+25 energy", desc: "Recover on the reed mat. Small health regen." },
    { id: "pray_temple", icon: "🏛️", label: "Visit Temple", cost: "-1 grain", desc: "Offer grain; +temple favour & reputation." },
    { id: "pay_tax", icon: "📜", label: "Pay Tax", cost: "pay debt", desc: "Settle temple dues before Day 30 of Winter." },
    { id: "tend_family", icon: "👨‍👩‍👦", label: "Tend Family", cost: "-2 grain", desc: "Prepare a meal; restores family health." },
    { id: S.job + "_special", icon: job.specialIcon, label: job.specialLabel, cost: job.specialCost, desc: job.specialDesc, special: true },
    { id: "end_day", icon: "🌅", label: "End Day", cost: "advance", desc: S.actionsLeft > 0 ? `Skip ${S.actionsLeft} unused action${S.actionsLeft > 1 ? "s" : ""} and advance.` : "Sleep and advance to tomorrow.", end: true },
  ];

  // Tutorial target lookup -- suppressed while a Scribe's Note popup is open. Supports single target or array.
  const _civilStep = tutStep >= 0 && tutStep < CIVIL_TUTORIAL.length && !advisor ? CIVIL_TUTORIAL[tutStep] : null;
  const tutT = _civilStep ? (_civilStep.targets || _civilStep.target) : null;
  const _matches = (id) => Array.isArray(tutT) ? tutT.includes(id) : tutT === id;
  const tCls = (id) => _matches(id) ? "tut-target" : "";
  const tArrow = (id) => _matches(id) ? <div className="tut-arrow">▼</div> : null;

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 18% 82%, #2C1106 0%, #08030A 55%, #0A0200 100%)", color: SAND, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 10px 90px", gap: "12px" }}>
      {/* Tutorial bottom bar -- never overlaps game content; hidden while a Scribe's Note popup is open */}
      {tutStep >= 0 && tutStep < CIVIL_TUTORIAL.length && !advisor && (() => {
        const step = CIVIL_TUTORIAL[tutStep];
        const isLast = tutStep === CIVIL_TUTORIAL.length - 1;
        const interactive = !!step.action && !step.locked;
        if (tutBarHidden) return (
          <div className="tut-bar">
            <div className="tut-inner" style={{ justifyContent: "center", padding: "8px 18px", cursor: "pointer" }} onClick={() => setTutBarHidden(false)}>
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: "12px", color: GC, letterSpacing: "1px" }}>📜 TUTORIAL — tap to show</span>
            </div>
          </div>
        );
        return (
          <div className="tut-bar">
            <div className="tut-inner">
              <div className="tut-icon">{step.i}</div>
              <div className="tut-text">
                <h4>{step.t}</h4>
                <p>{step.d}</p>
                {interactive && <span className="tut-hint">👉 {step.actionHint}</span>}
              </div>
              <div className="tut-btns">
                {interactive && <button className="tbtn2" style={{ width: "auto", fontSize: "10px", padding: "5px 10px" }} onClick={() => setTutBarHidden(true)}>Hide ›</button>}
                <button className="tbtn2" style={{ width: "auto", fontSize: "10px", padding: "5px 10px" }} onClick={() => setTutStep(-1)}>Skip</button>
                {!interactive && (
                  <button className="tbtn" style={{ width: "auto", fontSize: "11px", padding: "6px 14px" }} onClick={() => isLast ? setTutStep(-1) : setTutStep((p) => p + 1)}>
                    {isLast ? "Start Life" : "Next ›"}
                  </button>
                )}
                {interactive && <button className="tbtn2" style={{ width: "auto", fontSize: "10px", padding: "5px 10px" }} onClick={() => { setTutStep((p) => p + 1); setTutBarHidden(false); }}>Skip step ›</button>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* First-click lore popup -- z-index above tutorial highlight (505) and dialog (510) */}
      {advisor && (
        <div className="modal-bg" style={{ zIndex: 1200 }}>
          <div className="modal" style={{ maxWidth: "440px", border: `2px solid ${GC}` }}>
            <div className="modal-h" style={{ color: GC, fontSize: "15px" }}>📜 SCRIBE'S NOTE</div>
            <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "10px", textAlign: "center" }}>{advisor.title}</div>
            <p style={{ fontSize: "12px", color: "rgba(245,230,204,0.82)", lineHeight: 1.7, textAlign: "center", marginBottom: "20px", fontStyle: "italic" }}>"{advisor.text}"</p>
            <button className="tbtn" onClick={dismissAdvisor}>Continue</button>
          </div>
        </div>
      )}

      {legacyPan && (() => {
        const jobGoals = getLegacyGoals(S.job);
        const sharedGoals = jobGoals.filter(g => LEGACY_SHARED.find(sg => sg.id === g.id));
        const uniqueGoals = jobGoals.filter(g => !LEGACY_SHARED.find(sg => sg.id === g.id));
        const doneCount = jobGoals.filter(g => S.goals?.[g.id]).length;
        const GoalRow = ({ g }) => {
          const done = S.goals?.[g.id];
          return (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", marginBottom: "8px", background: done ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${done ? GC : "rgba(212,175,55,0.15)"}`, borderRadius: "9px" }}>
              <div style={{ fontSize: "22px" }}>{done ? "✅" : g.icon}</div>
              <div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: "12px", color: done ? GC : SAND, fontWeight: 700 }}>{g.label}</div>
                <div style={{ fontSize: "10.5px", color: "rgba(245,230,204,0.55)", fontStyle: "italic", marginTop: "2px" }}>{g.desc}</div>
              </div>
            </div>
          );
        };
        return (
          <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setLegacyPan(false)}>
            <div className="modal" style={{ maxWidth: "480px" }}>
              <div className="modal-h" style={{ color: GC, fontSize: "16px" }}>🌟 LEGACY OF THE {(JOBS[S.job]?.label || "Citizen").toUpperCase()}</div>
              <div className="modal-sub">{doneCount} / {jobGoals.length} goals achieved · A life remembered in clay</div>
              {S.legacyAchieved && (
                <div style={{ background: "rgba(212,175,55,0.12)", border: `1px solid ${GC}`, color: GC, padding: "10px 14px", borderRadius: "9px", marginBottom: "14px", textAlign: "center", fontFamily: "'Cinzel',serif", fontSize: "12px" }}>✨ Your legacy is complete — your name will live on.</div>
              )}
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: "10px", color: "rgba(212,175,55,0.6)", letterSpacing: "1.5px", marginBottom: "8px" }}>SHARED GOALS</div>
              {sharedGoals.map(g => <GoalRow key={g.id} g={g} />)}
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: "10px", color: "rgba(212,175,55,0.6)", letterSpacing: "1.5px", margin: "12px 0 8px" }}>{(JOBS[S.job]?.label || "JOB").toUpperCase()} GOALS</div>
              {uniqueGoals.map(g => <GoalRow key={g.id} g={g} />)}
              <button className="tbtn2" style={{ marginTop: "8px" }} onClick={() => setLegacyPan(false)}>Close</button>
            </div>
          </div>
        );
      })()}

      {/* ACTIONS REFERENCE MODAL */}
      {actsPan && (
        <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setActsPan(false)}>
          <div className="modal-wide">
            <div className="modal-h" style={{ color: GC, fontSize: "18px" }}>⚡ DAILY ACTIONS</div>
            <div className="modal-sub">How to spend your three actions each day</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
              {actions.map((a) => {
                const accent = a.special ? GC : a.end ? "#E09040" : GC;
                const accentBd = a.special ? "rgba(212,175,55,0.55)" : a.end ? "rgba(180,100,20,0.45)" : "rgba(212,175,55,0.3)";
                return (
                  <div key={a.id} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${accentBd}`, borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: `1px solid ${accentBd}`, paddingBottom: "8px" }}>
                      <span style={{ fontSize: "32px", lineHeight: 1 }}>{a.icon}</span>
                      <div>
                        <div style={{ fontFamily: "'Cinzel',serif", fontSize: "14px", color: accent, fontWeight: 700, letterSpacing: "0.5px" }}>{a.label}</div>
                        <div style={{ fontSize: "10px", color: GC, fontStyle: "italic", marginTop: "2px" }}>{a.cost}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: "12px", color: "rgba(245,230,204,0.82)", lineHeight: 1.55 }}>{a.desc}</div>
                    {CIV_ACT_LORE[a.id] && (
                      <div style={{ fontSize: "11px", color: "rgba(245,230,204,0.6)", fontStyle: "italic", borderTop: "1px solid rgba(212,175,55,0.12)", paddingTop: "7px", lineHeight: 1.55 }}>"{CIV_ACT_LORE[a.id]}"</div>
                    )}
                  </div>
                );
              })}
            </div>
            <button className="tbtn2" style={{ marginTop: "16px" }} onClick={() => setActsPan(false)}>Close</button>
          </div>
        </div>
      )}

      {instPan && (
        <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setInstPan(false)}>
          <div className="modal" style={{ maxWidth: "580px" }}>
            <div className="modal-h" style={{ color: GC, fontSize: "16px" }}>📜 INSTRUCTIONS & CODEX</div>
            <div className="modal-sub">Surviving in Uruk</div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "9px", padding: "13px 15px", marginBottom: "10px" }}>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: "11px", color: GC, marginBottom: "7px" }}>⚙️ HOW TO PLAY</div>
              <ul style={{ paddingLeft: "20px", fontSize: "12px", color: "rgba(245,230,204,0.72)", lineHeight: 1.6 }}>
                <li>You get 3 Actions per day. Use them wisely to gather Grain and Pottery.</li>
                <li>Your family eats every day. If Hunger or Health hit 0, you die.</li>
                <li>Go to the Market to sell goods for Silver. Prices fluctuate.</li>
                <li>Every Winter, you MUST pay the Temple Tax by Day 30, or face brutal penalties.</li>
              </ul>
            </div>
            <button className="tbtn" style={{ marginTop: "6px" }} onClick={() => setInstPan(false)}>RETURN</button>
          </div>
        </div>
      )}

      {activeEvent && (
        <div className="modal-bg">
          <div className="modal" style={{ maxWidth: "500px" }}>
            <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: "16px", color: GC, textAlign: "center", marginBottom: "10px" }}>{activeEvent.title}</div>
            <p style={{ fontSize: "13px", color: "rgba(245,230,204,0.78)", lineHeight: 1.7, textAlign: "center", marginBottom: "14px", fontStyle: "italic" }}>{activeEvent.body}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {activeEvent.choices.map((ch, i) => (
                <button key={i} className="choice-btn" onClick={() => resolveChoice(ch.apply)}>
                  <div style={{ fontWeight: 600, marginBottom: "3px", fontSize: "12px" }}>{ch.label}</div>
                  <div style={{ fontSize: "10px", color: "rgba(212,175,55,0.6)" }}>{ch.sub}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {S.marketOpen && (
        <div className="modal-bg">
          <div className="modal" style={{ maxWidth: "420px", textAlign: "center" }}>
            <div className="modal-h" style={{ color: GC, fontSize: "16px" }}>⚖️ TRADE MARKET</div>
            <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "16px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: "8px", padding: "12px" }}>
              <div>
                <div style={{ fontSize: "28px" }}>🏺</div>
                <div style={{ fontSize: "12px", fontFamily: "'Cinzel',serif" }}>Pottery</div>
                <div style={{ fontSize: "11px", color: GC }}>{S.marketPrices.pottery} silver each</div>
                <div style={{ fontSize: "10px", color: "rgba(245,230,204,0.5)" }}>Inv: {S.pottery}</div>
              </div>
              <div>
                <div style={{ fontSize: "28px" }}>🌾</div>
                <div style={{ fontSize: "12px", fontFamily: "'Cinzel',serif" }}>Grain</div>
                <div style={{ fontSize: "11px", color: GC }}>{S.marketPrices.grain} silver each</div>
                <div style={{ fontSize: "10px", color: "rgba(245,230,204,0.5)" }}>Inv: {S.grain}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="tr-btn" style={{ flex: 1, justifyContent: "center" }} disabled={S.pottery < 1} onClick={() => setS((p) => p.pottery >= 1 ? { ...p, pottery: p.pottery - 1, silver: p.silver + p.marketPrices.pottery, marketSales: p.marketSales + 1, lifetimePottery: (p.lifetimePottery || 0) + 1 } : p)}>Sell 1 Pottery</button>
                <button className="tr-btn" style={{ flex: 1, justifyContent: "center" }} disabled={S.pottery < 1} onClick={() => setS((p) => p.pottery > 0 ? { ...p, silver: p.silver + p.pottery * p.marketPrices.pottery, marketSales: p.marketSales + p.pottery, lifetimePottery: (p.lifetimePottery || 0) + p.pottery, pottery: 0 } : p)}>Sell All Pottery</button>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="tr-btn" style={{ flex: 1, justifyContent: "center" }} disabled={S.grain < 1} onClick={() => setS((p) => p.grain >= 1 ? { ...p, grain: p.grain - 1, silver: p.silver + p.marketPrices.grain, marketSales: p.marketSales + 1 } : p)}>Sell 1 Grain</button>
                <button className="tr-btn" style={{ flex: 1, justifyContent: "center" }} disabled={S.grain < 1} onClick={() => setS((p) => p.grain > 0 ? { ...p, silver: p.silver + p.grain * p.marketPrices.grain, marketSales: p.marketSales + p.grain, grain: 0 } : p)}>Sell All Grain</button>
              </div>
              <button className="tbtn2" onClick={() => setS((p) => { let n = { ...p, marketOpen: false }; if (n.marketSales > 0) n = addLog(n, `Sold ${n.marketSales} items.`, "good"); return n; })}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ width: "100%", maxWidth: "980px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <button className="hbtn" onClick={onBack}>← Menu</button>
        <div style={{ textAlign: "center", flex: 1 }}>
          <h1 style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: "clamp(14px,4vw,24px)", color: GC, letterSpacing: "3px" }}>𒀭 Life in Uruk 𒀭</h1>
          <p style={{ fontFamily: "'Cinzel',serif", fontSize: "10px", letterSpacing: "3px", color: "rgba(245,230,204,0.42)", marginTop: "3px" }}>{SEA_ICO[S.seasonIndex]} {SEAS[S.seasonIndex]} · Day {S.dayInSeason}/30 · Year {S.year}</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ fontSize: "10px", color: "rgba(212,175,55,0.5)", fontFamily: "'Cinzel',serif" }}>💾 Autosaving...</span>
          <button className="hbtn" onClick={() => setActsPan(true)}>⚡ Actions</button>
          <button className="hbtn" onClick={() => setLegacyPan(true)}>🌟 Legacy</button>
          <button className="hbtn" onClick={() => setInstPan(true)}>📜 Codex</button>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: "11px", color: S.actionsLeft > 0 ? "#90E060" : "rgba(245,230,204,0.3)", padding: "5px" }}>⚡ {S.actionsLeft}/3</div>
        </div>
      </div>

      {/* STATS BAR */}
      <div id="civ-stats" className={tCls("civ-stats")} style={{ position: "relative", width: "100%", maxWidth: "980px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "12px", padding: "12px 18px", display: "flex", flexWrap: "wrap", gap: "14px 20px", alignItems: "center", justifyContent: "center" }}>
        {tArrow("civ-stats")}
        {[{ label: "HEALTH", val: S.health, col: "#E05050" }, { label: "HUNGER", val: S.hunger, col: "#E0A020" }, { label: "ENERGY", val: S.energy, col: "#4090E0" }, { label: "REPUTE", val: S.reputation, col: "#60C030" }, { label: "FAMILY", val: S.familyHealth, col: "#E0C040" }].map((st) => (
          <div key={st.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "60px" }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: "8px", letterSpacing: "1.5px", color: "rgba(245,230,204,0.38)" }}>{st.label}</div>
            <div style={{ fontSize: "18px", fontWeight: 700, fontFamily: "'Cinzel',serif", color: st.val < 25 ? "#FF6040" : SAND }}>{st.val}</div>
            <div style={{ width: "56px", height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px" }}>
              <div style={{ height: "100%", width: `${st.val}%`, background: st.col, borderRadius: "3px", transition: "width .5s" }} />
            </div>
          </div>
        ))}
        <div style={{ width: "1px", height: "42px", background: "rgba(212,175,55,0.18)" }} />
        {[{ icon: <span className="silver-coin">🪙</span>, label: "SILVER", val: S.silver, warn: S.silver < 2 }, { icon: "🌾", label: "GRAIN", val: S.grain, warn: S.grain < 5 }, { icon: "🏺", label: "POTTERY", val: S.pottery }].map((r) => (
          <div key={r.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "52px" }}>
            <div style={{ fontSize: "18px" }}>{r.icon}</div>
            <div style={{ fontSize: "18px", fontWeight: 700, fontFamily: "'Cinzel',serif", color: r.warn ? "#FF6040" : SAND }}>{r.val}</div>
          </div>
        ))}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {S.taxDue && <span className="warn-chip" style={{ background: "rgba(140,40,0,0.3)", border: "1px solid rgba(200,80,0,0.4)", color: "#ffaa80" }}>⚠ Tax {S.taxAmount} <span className="silver-coin">🪙</span></span>}
          {S.flood && <span className="warn-chip" style={{ background: "rgba(0,40,140,0.3)", border: "1px solid rgba(30,80,200,0.4)", color: "#80c0ff" }}>🌊 Flood</span>}
          {S.drought && <span className="warn-chip" style={{ background: "rgba(120,80,0,0.3)", border: "1px solid rgba(180,120,0,0.4)", color: "#ffcc60" }}>☀️ Drought</span>}
          {S.plague && <span className="warn-chip" style={{ background: "rgba(100,0,0,0.3)", border: "1px solid rgba(160,0,0,0.4)", color: "#ff8080" }}>🦠 Plague</span>}
          {S.hunger <= 25 && <span className="warn-chip" style={{ background: "rgba(120,60,0,0.3)", border: "1px solid rgba(180,100,0,0.4)", color: "#ffb060" }}>🍽️ Starving</span>}
          {S.health <= 25 && <span className="warn-chip" style={{ background: "rgba(120,0,0,0.3)", border: "1px solid rgba(180,40,40,0.4)", color: "#ff7070" }}>❤️ Dying</span>}
          {S.energy <= 25 && <span className="warn-chip" style={{ background: "rgba(20,40,120,0.3)", border: "1px solid rgba(40,100,180,0.4)", color: "#80b0ff" }}>😴 Exhausted</span>}
          {S.familyHealth <= 25 && S.family.length > 0 && <span className="warn-chip" style={{ background: "rgba(120,80,20,0.3)", border: "1px solid rgba(180,140,30,0.4)", color: "#f0c060" }}>👪 Family suffering</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: "14px", width: "100%", maxWidth: "980px", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "center" }}>
        {/* SIDE PANELS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "224px", flexShrink: 0 }}>
          <div className="panel">
            <div className="panel-h">🏛️ Temple</div>
            <div style={{ width: "100%", height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", marginBottom: "5px" }}>
              <div style={{ height: "100%", width: `${S.templeRelation}%`, background: `hsl(${S.templeRelation * 1.2},70%,50%)`, borderRadius: "3px", transition: "width .5s" }} />
            </div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: "10px", color: S.templeRelation > 60 ? GC : "rgba(245,230,204,0.45)", marginBottom: "6px" }}>{S.templeRelation}/100 Favour</div>
          </div>
          <div className="panel" style={{ border: "1px solid rgba(212,175,55,0.25)" }}>
            <div className="panel-h" style={{ color: GC }}>✦ {job.label.toUpperCase()}</div>
            <div style={{ fontSize: "11px", color: "rgba(160,224,96,0.85)", marginBottom: "8px" }}>{job.bonusLine}</div>
            <div style={{ borderTop: "1px solid rgba(212,175,55,0.15)", paddingTop: "8px" }}>
              <div style={{ fontSize: "10px", color: GC, marginBottom: "4px", fontFamily: "'Cinzel',serif" }}>✦ Special: {job.specialLabel}</div>
              <div style={{ fontSize: "11px", color: "rgba(245,230,204,0.52)", fontStyle: "italic" }}>{job.specialDesc}</div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-h">👪 Family</div>
            <div style={{ fontSize: "11px", color: "rgba(245,230,204,0.78)", fontFamily: "'Cinzel',serif" }}>
              {S.family.length === 0 ? "Alone in the world" : `${S.family.length} household member${S.family.length > 1 ? "s" : ""}`}
            </div>
            <div style={{ width: "100%", height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", marginTop: "6px" }}>
              <div style={{ height: "100%", width: `${S.familyHealth}%`, background: `hsl(${S.familyHealth * 1.2},70%,50%)`, borderRadius: "3px", transition: "width .5s" }} />
            </div>
          </div>
        </div>

        {/* LOG & ACTIONS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: "1", minWidth: "320px" }}>
          <div style={{ background: "rgba(0,0,0,0.42)", border: "1px solid rgba(212,175,55,0.16)", borderRadius: "10px", padding: "10px 14px", maxHeight: "185px", overflowY: "auto" }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: "9px", letterSpacing: "2.5px", color: GC, marginBottom: "6px" }}>CHRONICLES OF THE CITIZEN</div>
            {S.log.map((entry, i) => (
              <div key={i} className="le" style={{ fontSize: "11px", padding: "3px 0", borderBottom: i < S.log.length - 1 ? "1px solid rgba(150,100,60,0.09)" : "none", color: i === 0 ? entry.type === "bad" ? "#FF8060" : entry.type === "good" ? "#90E060" : "rgba(245,230,204,0.94)" : `rgba(245,230,204,${Math.max(0.1, 0.62 - i * 0.045)})` }}>
                {i === 0 && <div style={{ fontFamily: "'Cinzel',serif", fontSize: "8px", color: "rgba(212,175,55,0.5)", marginBottom: "2px" }}>{entry.label}</div>}
                {entry.text}
              </div>
            ))}
          </div>
          {/* 2-COLUMN ACTIONS WITH DESCRIPTIONS */}
          <div id="civ-actions" className={tCls("civ-actions")} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", position: "relative" }}>
            {tArrow("civ-actions")}
            {actions.map((a) => (
              <button key={a.id} className={`abtn${a.special ? " special-btn" : a.end ? " end-btn" : ""}`} disabled={!a.end && (!a.special ? S.actionsLeft <= 0 : !canSpecial)} onClick={() => doAction(a.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
                  <span style={{ fontSize: "26px", flexShrink: 0 }}>{a.icon}</span>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: SAND, fontFamily: "'Cinzel',serif", letterSpacing: "0.5px" }}>{a.label}</div>
                    <div style={{ fontSize: "9px", color: GC, fontStyle: "italic", marginTop: "2px" }}>{a.cost}</div>
                    <div style={{ fontSize: "10px", color: "rgba(245,230,204,0.55)", marginTop: "3px", lineHeight: 1.3 }}>{a.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// RULER GAME
// ═══════════════════════════════════════════════════
function RulerGame({ saveName, initialState, onBack }) {
  const [S, setS] = useState(initialState || mkRulerState());
  const [sel, setSel] = useState(null);
  const [advisor, setAdvisor] = useState(null); // First-click lore popup only
  const [tutStep, setTutStep] = useState(() => (initialState ? -1 : 0));
  const [instPan, setInstPan] = useState(false);
  const [bldgPan, setBldgPan] = useState(false);
  const [tradePan, setTradePan] = useState(false);
  const [warPan, setWarPan] = useState(false);
  const [questPan, setQuestPan] = useState(false);
  const [rolesPan, setRolesPan] = useState(false);
  const [techPan, setTechPan] = useState(false);
  const [demolishMode, setDemolishMode] = useState(false);
  const [seasonReport, setSeasonReport] = useState(null); // {label, entries:[{icon,title,body,kind}]}
  const [tutBarHidden, setTutBarHidden] = useState(false);
  const signalTut = useCallback((act) => {
    setTutStep((cur) => {
      if (cur < 0 || cur >= TUTORIAL_STEPS.length) return cur;
      if (TUTORIAL_STEPS[cur].action === act) return cur + 1;
      return cur;
    });
    setTutBarHidden(false); // re-show bar on step advance
  }, []);

  useEffect(() => { saveGame(saveName, "ruler", S); }, [S, saveName]);

  const prod = useMemo(() => rulerCalcStats(S.grid, S.invs, S.roles, S.god), [S.grid, S.invs, S.roles, S.god]);

  // Contextual advisor: hint messages are now appended to the chronicle log
  // (no popup) so they never block what the player is doing.
  useEffect(() => {
    if (S.phase !== "play") return;
    const seen = S.seenAdvisors || {};
    const newSeen = { ...seen };
    const messages = [];

    const tryTrigger = (id, msg) => {
      if (!newSeen[id]) { newSeen[id] = true; messages.push(msg); }
    };

    if (S.turn === 2) tryTrigger("t2", "🗣️ Tip: idle workers can be assigned in the Roles menu.");
    if (S.grain < 10 && S.pop > 10) tryTrigger("low_food", "🗣️ Famine threatens — build more farms by the river.");
    if (S.grid.some(r => r.includes("temple"))) tryTrigger("temple_built", "🗣️ A Temple stands. You can now build a Scribal School.");
    if (S.water < 10 && S.pop > 10) tryTrigger("low_water", "🗣️ Wells run dry — build more Wells soon.");
    if (S.turn === 5) tryTrigger("t5", "🗣️ Tip: the Draft button trades grain & morale for fresh workers.");

    if (messages.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setS(prev => ({ ...prev, seenAdvisors: newSeen, log: [...messages, ...prev.log].slice(0, 14) }));
    }
  }, [S.turn, S.grain, S.water, S.grid, S.phase, S.seenAdvisors, S.pop]);

  const selectGod = (id) => {
    setS((prev) => ({ ...prev, god: id, phase: "play", log: [`✨ You have dedicated the city to ${GODS[id].n}.`, ...prev.log] }));
    // If the tutorial is running, jump straight to the "Building the City" (place_building) step
    // since steps 0-2 were informational intros shown before god selection
    setTutStep((cur) => (cur >= 0 && cur < 3 ? 3 : cur));
  };
  const isBldgUnlocked = (k) => { const b = B[k]; return ((!b.reqT || S.invs.includes(b.reqT)) && (!b.reqB || S.grid.some((r) => r.includes(b.reqB)))); };
  const canAffordBldg = (k) => { const c = B[k].c; return ((c.gold || 0) <= S.gold && (c.workers || 0) <= S.workers && (c.grain || 0) <= S.grain); };

  const place = (r, c) => {
    if (S.phase !== "play" || isRiverCell(r, c)) return;
    // Demolish mode: clicking an existing building removes it with a 50% silver refund
    if (demolishMode && S.grid[r][c]) {
      const k = S.grid[r][c];
      const bk = B[k];
      if (!window.confirm(`Demolish ${bk.n}? You will recover 50% of its silver cost (${Math.floor((bk.c.gold || 0) / 2)} silver) and free its workers.`)) return;
      setS((prev) => {
        const g = prev.grid.map((row) => [...row]);
        g[r][c] = null;
        let next = { ...prev, grid: g, gold: prev.gold + Math.floor((bk.c.gold || 0) / 2), workers: prev.workers + (bk.c.workers || 0) };
        const ps = rulerCalcStats(g, prev.invs, prev.roles, prev.god);
        next.grainCap = 100 + ps.sc; next = capRolesToWorkers(next);
        return { ...next, log: [`💥 Demolished ${bk.n} (refunded ${Math.floor((bk.c.gold || 0) / 2)} silver)`, ...prev.log].slice(0, 14) };
      });
      return;
    }
    if (!sel || S.grid[r][c] || !canAffordBldg(sel) || !isBldgUnlocked(sel)) return;
    const bk = B[sel];
    setS((prev) => {
      const g = prev.grid.map((row) => [...row]);
      g[r][c] = sel;
      let next = { ...prev, grid: g, gold: prev.gold - (bk.c.gold || 0), workers: prev.workers - (bk.c.workers || 0), grain: prev.grain - (bk.c.grain || 0) };
      const ps = rulerCalcStats(g, prev.invs, prev.roles, prev.god);
      next.grainCap = 100 + ps.sc; next = capRolesToWorkers(next);
      const nq = rulerCheckQuests(prev.quests, g, prev);
      const newlyDone = nq.filter((q, i) => q.done && !prev.quests[i].done);
      const questLogs = newlyDone.map(q => `⭐ Quest complete: ${q.text}`);
      return { ...next, quests: nq, log: [...questLogs, `🔨 Built ${bk.n}`, ...prev.log].slice(0, 14) };
    });
    setSel(null);
    signalTut("place_building");
  };

  // First-click lore for a building
  const selectBuilding = (k) => {
    if (!isBldgUnlocked(k)) return;
    if (!S.seenBldgs?.[k]) {
      setS((prev) => ({ ...prev, seenBldgs: { ...(prev.seenBldgs || {}), [k]: true } }));
      setAdvisor({ title: B[k].n, text: B[k].lore, lore: true });
    }
    setSel(sel === k ? null : k);
  };

  const unlockTech = (inv) => {
    if (!S.grid.some((r) => r.includes("scribal"))) return;
    if (S.invs.includes(inv.id) || S.intel < inv.cost || !inv.prereqs.every((p) => S.invs.includes(p)) || (inv.reqB && !S.grid.some((r) => r.includes(inv.reqB)))) return;
    setS((prev) => {
      const ni = [...prev.invs, inv.id];
      const fp = rulerCalcStats(prev.grid, ni, prev.roles, prev.god);
      const nq = rulerCheckQuests(prev.quests, prev.grid, { ...prev, invs: ni });
      const newlyDone = nq.filter((q, i) => q.done && !prev.quests[i].done);
      const questLogs = newlyDone.map(q => `⭐ Quest complete: ${q.text}`);
      return { ...prev, invs: ni, intel: prev.intel - inv.cost, grainCap: 100 + fp.sc, quests: nq, log: [...questLogs, `💡 RESEARCHED: ${inv.n}`, ...prev.log].slice(0, 14) };
    });
  };

  const doPray = () => {
    if (S.grain >= 15 && S.gold >= 10 && S.phase === "play" && !S.offeringMade)
      setS((prev) => ({ ...prev, grain: prev.grain - 15, gold: prev.gold - 10, favor: Math.min(100, prev.favor + 20), offeringMade: true, log: ["🙏 Offerings made. The gods are appeased!", ...prev.log].slice(0, 14) }));
  };

  const draftWorkers = () => {
    if (S.grain >= 10 && S.workers < S.pop)
      setS((prev) => autoAssignIdle({ ...prev, grain: prev.grain - 10, workers: prev.workers + 2, morale: Math.max(0, prev.morale - 4), log: ["📜 Corvée Labor drafts 2 new workers.", ...prev.log].slice(0, 14) }));
  };

  const advance = () => {
    if (S.phase !== "play") return;
    signalTut("advance");
    let report = null;
    setS((prev) => {
      const ps = rulerCalcStats(prev.grid, prev.invs, prev.roles, prev.god);
      let { grain, water, gold, workers, pop, morale, intel, favor, grainCap, invs, roles, god } = prev;
      grain = Math.min(grainCap, grain + ps.gr);
      water += ps.wa; gold += ps.go; intel += ps.intel;
      favor = Math.max(0, Math.min(100, favor - 5 + ps.fa));
      morale = Math.max(0, Math.min(100, morale + ps.morBonus + (morale < 55 ? 2 : -1)));
      if (favor >= 80) morale = Math.min(100, morale + 2);
      grain -= Math.max(1, Math.floor(pop * 0.1));
      water -= Math.max(1, Math.floor(pop * 0.07));
      if (roles.workers + roles.scholars + roles.soldiers < Math.floor(pop * 0.3)) morale = Math.max(0, morale - 2);

      const events = []; // notable things this season
      const newLog = [];

      if (favor <= 20 && Math.random() < 0.6) {
        const wr = [
          { title: "Blight on the Fields", body: "A sudden blight destroys 15 Grain.", g: -15 },
          { title: "Wells Run Dry", body: "The gods withdraw their water. -15 Water.", w: -15 },
          { title: "Pestilence Strikes", body: "Disease takes 4 of your people.", p: -4 },
          { title: "Terror in the Streets", body: "Unrest grips the city. -10 Morale.", m: -10 },
        ];
        const w = wr[Math.floor(Math.random() * wr.length)];
        events.push({ icon: "⚡", title: `Divine Wrath: ${w.title}`, body: w.body, kind: "bad" });
        newLog.push(`⚡ Divine Wrath: ${w.title}`);
        if (w.g) grain = Math.max(0, grain + w.g); if (w.w) water = Math.max(0, water + w.w); if (w.p) pop = Math.max(0, pop + w.p); if (w.m) morale = Math.max(0, morale + w.m);
      } else if (favor >= 80 && Math.random() < 0.2) {
        events.push({ icon: "✨", title: "Divine Blessing", body: "The gods smile upon your pious city. Morale rises.", kind: "good" });
        newLog.push("✨ The gods bless your pious city!");
      }

      if (grain < 0) {
        const st = Math.max(1, Math.floor(Math.abs(grain) * 0.25));
        pop = Math.max(0, pop - st); morale = Math.max(0, morale - st * 4); grain = 0;
        events.push({ icon: "⚠️", title: "Famine", body: `${st} of your people perished from hunger. Morale plummets.`, kind: "bad" });
        newLog.push(`⚠️ Famine! ${st} perished.`);
      }
      if (water < 0) {
        const di = Math.max(1, Math.floor(Math.abs(water) * 0.3));
        pop = Math.max(0, pop - di); morale = Math.max(0, morale - di * 5); water = 0;
        events.push({ icon: "💀", title: "Dehydration", body: `${di} of your people perished from thirst.`, kind: "bad" });
        newLog.push(`💀 Dehydration! ${di} perished.`);
      }
      if (ps.pb > 0 && grain > 8 && water > 4) pop = Math.min(500, pop + Math.max(1, Math.floor(Math.sqrt(ps.pb))) + (god === "ishtar" ? 2 : 0));
      const tw = Math.floor(pop * 0.5);
      if (workers < tw) workers += Math.max(1, Math.floor((tw - workers) * 0.35));
      workers = Math.min(workers, pop);

      let ev = null;
      if (Math.random() < 0.38) {
        ev = RULER_EVS[Math.floor(Math.random() * RULER_EVS.length)];
        let mit = invs.includes("astronomy") && ev.sev ? 0.5 : 1; if (god === "enlil" && ev.sev) mit *= 0.75;
        const e = ev.e;
        const eParts = [];
        if (e.water) { water = Math.max(0, water + Math.round(e.water * mit)); eParts.push(`${e.water > 0 ? "+" : ""}${Math.round(e.water * mit)} 💧`); }
        if (e.grain) { grain = Math.min(grainCap, Math.max(0, grain + Math.round(e.grain * mit))); eParts.push(`${e.grain > 0 ? "+" : ""}${Math.round(e.grain * mit)} 🌾`); }
        if (e.gold) { gold = Math.max(0, gold + Math.round(e.gold * mit)); eParts.push(`${e.gold > 0 ? "+" : ""}${Math.round(e.gold * mit)} 🪙`); }
        if (e.pop) { pop = Math.max(0, pop + Math.round(e.pop * mit)); eParts.push(`${e.pop > 0 ? "+" : ""}${Math.round(e.pop * mit)} 👥`); }
        if (e.workers) { workers = Math.max(1, workers + Math.round(e.workers * mit)); eParts.push(`${e.workers > 0 ? "+" : ""}${Math.round(e.workers * mit)} 👷`); }
        if (e.morale) { morale = Math.min(100, Math.max(0, morale + Math.round(e.morale * mit))); eParts.push(`${e.morale > 0 ? "+" : ""}${Math.round(e.morale * mit)} ❤️`); }
        if (e.intel) { intel += Math.round(e.intel * mit); eParts.push(`${e.intel > 0 ? "+" : ""}${Math.round(e.intel * mit)} 🧠`); }
        const mitNote = mit < 1 ? " (severity reduced)" : "";
        events.push({ icon: ev.i, title: ev.t, body: `${eParts.join(" · ") || "An event occurred"}${mitNote}`, kind: ev.sev ? "bad" : "good" });
      }

      if (invs.includes("laws") && morale < 30) morale = 30;
      grain = Math.max(0, grain); water = Math.max(0, water); gold = Math.max(0, gold); morale = Math.max(0, Math.min(100, morale));
      const newTurn = prev.turn + 1;
      const nq = rulerCheckQuests(prev.quests, prev.grid, { ...prev, pop, intel, invs });
      const newlyDone = nq.filter((q, i) => q.done && !prev.quests[i].done);
      const questLogs = newlyDone.map(q => `⭐ Quest complete: ${q.text}`);
      newlyDone.forEach(q => events.push({ icon: "⭐", title: `Quest complete: ${q.text}`, body: q.desc, kind: "good" }));
      const won = nq.every((q) => q.done) && prev.grid.some((r) => r.includes("ziggurat")) && pop >= 150;
      let phase = pop <= 0 || morale <= 0 ? "gameover" : won && !prev.won && !prev.endless ? "victory" : prev.phase;

      const log = [ev ? `${ev.i} ${ev.t}` : `🌅 Season of ${SEAS[(prev.sea + 1) % 4]}, Year ${Math.ceil(newTurn / 4)}`, ...questLogs, ...newLog, ...prev.log].slice(0, 14);
      if (phase === "gameover") log.unshift("💀 The city has fallen.");
      if (phase === "victory" && !prev.won) log.unshift("🌟 Your city ascends to eternal legend!");

      const seasonName = SEAS[(prev.sea + 1) % 4];
      const yr = Math.ceil(newTurn / 4);
      if (events.length > 0) report = { label: `${seasonName} of Year ${yr}`, entries: events };

      return autoAssignIdle({ ...prev, grain, water, gold, workers, pop, morale, intel, favor, grainCap: 100 + ps.sc, turn: newTurn, sea: (prev.sea + 1) % 4, phase, won: prev.won || won, quests: nq, log, offeringMade: false });
    });
    if (report) setSeasonReport(report);
  };

  const doTrade = (type) =>
    setS((prev) => {
      let { grain, water, gold, workers, intel } = prev;
      const log = [...prev.log];
      if (type === "buy-grain" && gold >= 15) { gold -= 15; grain = Math.min(prev.grainCap, grain + 10); log.unshift("🐪 Bought 10 grain"); }
      else if (type === "buy-water" && gold >= 12) { gold -= 12; water += 10; log.unshift("🐪 Bought 10 water"); }
      else if (type === "buy-worker" && gold >= 25 && workers < prev.pop) { gold -= 25; workers += 2; log.unshift("🐪 Hired 2 workers"); }
      else if (type === "sell-grain" && grain >= 10) { grain -= 10; gold += 8; log.unshift("🐪 Sold 10 grain"); }
      else if (type === "sell-water" && water >= 10) { water -= 10; gold += 10; log.unshift("🐪 Sold 10 water"); }
      else if (type === "buy-intel" && gold >= 20) { gold -= 20; intel += 8; log.unshift("📜 Purchased foreign scrolls: +8 intel"); }
      return autoAssignIdle({ ...prev, grain, water, gold, workers, intel, log: log.slice(0, 14) });
    });

  const doRaid = () => {
    const chance = Math.min(0.85, 0.5 + Math.min(prod.def / 200, 0.2) + (S.invs.includes("metallurgy") ? 0.12 : 0));
    const ok = Math.random() < chance;
    setS((prev) => {
      let { gold, grain, workers, morale } = prev;
      workers -= 3; gold -= 8; const log = [...prev.log];
      if (ok) { const gg = 15 + rand(0, 22); const gr = 8 + rand(0, 15); gold += gg; grain = Math.min(prev.grainCap, grain + gr); morale = Math.min(100, morale + 6); log.unshift(`⚔️ Raid victorious! +${gg} silver, +${gr} grain.`); }
      else { workers = Math.max(1, workers - 2); morale = Math.max(0, morale - 9); log.unshift("⚔️ Raid failed. Forces routed."); }
      return autoAssignIdle({ ...prev, gold, grain, workers, morale, log: log.slice(0, 14) });
    });
    setWarPan(false);
  };

  const adjustRole = (role, delta) => setS((prev) => {
    const total = prev.roles.workers + prev.roles.scholars + prev.roles.soldiers;
    const nv = Math.max(0, prev.roles[role] + delta);
    if (delta > 0 && total >= Math.floor(prev.workers)) return prev;
    return { ...prev, roles: { ...prev.roles, [role]: nv } };
  });

  const idleWorkers = Math.max(0, S.workers - (S.roles.workers + S.roles.scholars + S.roles.soldiers));
  const hasBarracks = S.grid.some((r) => r.includes("barracks"));
  const raidReady = S.workers >= 5 && S.gold >= 8 && hasBarracks;

  // Tutorial target lookup -- suppressed while a Scribe's Note popup is open. Supports single target or array.
  const _rulerStep = tutStep >= 0 && tutStep < TUTORIAL_STEPS.length && !advisor ? TUTORIAL_STEPS[tutStep] : null;
  const tutT = _rulerStep ? (_rulerStep.targets || _rulerStep.target) : null;
  const _matches = (id) => Array.isArray(tutT) ? tutT.includes(id) : tutT === id;
  const tCls = (id) => _matches(id) ? "tut-target" : "";
  const tArrow = (id) => _matches(id) ? <div className="tut-arrow">▼</div> : null;

  return (
    <>
      {/* RULER TUTORIAL bottom bar -- fixed at viewport bottom, never blocks game content */}
      {tutStep >= 0 && tutStep < TUTORIAL_STEPS.length && !advisor && S.phase !== "god_select" && (() => {
        const step = TUTORIAL_STEPS[tutStep];
        const isLast = tutStep === TUTORIAL_STEPS.length - 1;
        const interactive = !!step.action && !step.locked;
        if (tutBarHidden) return (
          <div className="tut-bar">
            <div className="tut-inner" style={{ justifyContent: "center", padding: "8px 18px", cursor: "pointer" }} onClick={() => setTutBarHidden(false)}>
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: "12px", color: GC, letterSpacing: "1px" }}>📜 TUTORIAL — tap to show</span>
            </div>
          </div>
        );
        return (
          <div className="tut-bar">
            <div className="tut-inner">
              <div className="tut-icon">{step.i}</div>
              <div className="tut-text">
                <h4>{step.t}</h4>
                <p>{step.d}</p>
                {interactive && <span className="tut-hint">👉 {step.actionHint}</span>}
              </div>
              <div className="tut-btns">
                {interactive && <button className="tbtn2" style={{ width: "auto", fontSize: "10px", padding: "5px 10px" }} onClick={() => setTutBarHidden(true)}>Hide ›</button>}
                <button className="tbtn2" style={{ width: "auto", fontSize: "10px", padding: "5px 10px" }} onClick={() => setTutStep(-1)}>Skip Tutorial</button>
                {!interactive && (
                  <button className="tbtn" style={{ width: "auto", fontSize: "11px", padding: "6px 14px" }} onClick={() => isLast ? setTutStep(-1) : setTutStep((p) => p + 1)}>
                    {isLast ? "Start Reign" : step.locked ? "Got it ›" : "Next ›"}
                  </button>
                )}
                {interactive && <button className="tbtn2" style={{ width: "auto", fontSize: "10px", padding: "5px 10px" }} onClick={() => { setTutStep((p) => p + 1); setTutBarHidden(false); }}>Skip step ›</button>}
              </div>
            </div>
          </div>
        );
      })()}

      {advisor && (
        <div className="modal-bg" style={{ zIndex: 1200 }}>
          <div className="modal" style={{ maxWidth: "420px", border: `2px solid ${GC}` }}>
            <div className="modal-h" style={{ color: GC, fontSize: "18px" }}>{advisor.lore ? "📜 SCRIBE'S NOTE" : "🗣️ ADVISOR"}</div>
            <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "10px", textAlign: "center" }}>{advisor.title}</div>
            <p style={{ fontSize: "12px", color: "rgba(245,230,204,0.8)", lineHeight: 1.6, textAlign: "center", marginBottom: "20px", fontStyle: advisor.lore ? "italic" : "normal" }}>{advisor.lore ? `"${advisor.text}"` : advisor.text}</p>
            <button className="tbtn" onClick={() => setAdvisor(null)}>Understood</button>
          </div>
        </div>
      )}

      {instPan && (
        <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setInstPan(false)}>
          <div className="modal" style={{ maxWidth: "580px" }}>
            <div className="modal-h" style={{ color: GC, fontSize: "16px" }}>📜 INSTRUCTIONS & CODEX</div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: "9px", padding: "13px 15px", marginBottom: "10px" }}>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: "11px", color: GC, marginBottom: "7px" }}>⚙️ HOW TO PLAY RULER MODE</div>
              <ul style={{ paddingLeft: "20px", fontSize: "12px", color: "rgba(245,230,204,0.72)", lineHeight: 1.6 }}>
                <li><strong>Build:</strong> Select buildings on the right to place on the Grid.</li>
                <li><strong>Advance:</strong> Click "Advance Season" to produce resources and progress time.</li>
                <li><strong>Balance:</strong> Keep Food and Water high. If they drop below 0, citizens die.</li>
                <li><strong>Research:</strong> Build Temples to unlock Scribal Schools. Schools generate Intel to research Techs.</li>
                <li><strong>Win:</strong> Complete all Quests (📜), reach 150 population, and construct a Ziggurat.</li>
              </ul>
            </div>
            {[
              { h: "🏙️ The City of Uruk", col: GC, text: "Uruk was likely the world's first true city, covering 250 hectares and housing up to 80,000 people. It was surrounded by a massive 9.5 km wall." },
              { h: "🌾 Agriculture and the Corvée", col: GC, text: "Temple and palace administrators controlled the canals. Citizens owed compulsory labor (corvée) to the state for canal maintenance and wall construction." },
              { h: "⚔️ Warfare in Ancient Sumer", col: GC, text: "City-states fought constantly. Build a Temple → Scribal School → Research Bronze → Build Barracks to unlock Raids." },
            ].map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${s.col}33`, borderRadius: "9px", padding: "13px 15px", marginBottom: "10px" }}>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: "11px", color: s.col, marginBottom: "7px" }}>{s.h}</div>
                <p style={{ fontStyle: "italic", fontSize: "12px", color: "rgba(245,230,204,0.72)", lineHeight: 1.7 }}>{s.text}</p>
              </div>
            ))}

            <div style={{ fontSize: "11px", color: "rgba(245,230,204,0.55)", fontStyle: "italic", textAlign: "center", marginTop: "4px", marginBottom: "10px" }}>For full building details, open the 🏛️ Buildings reference from the header.</div>

            <button className="tbtn" style={{ marginTop: "6px" }} onClick={() => setInstPan(false)}>RETURN</button>
          </div>
        </div>
      )}

      {S.phase === "god_select" && (
        <div className="modal-bg" style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: "560px", border: `2px solid ${GC}` }}>
            <div className="modal-h" style={{ color: GC, fontSize: "19px" }}>CHOOSE A PATRON DEITY</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {Object.values(GODS).map((g) => (
                <button key={g.id} onClick={() => selectGod(g.id)} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${g.col}55`, borderRadius: "10px", padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "14px", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontSize: "32px", flexShrink: 0 }}>{g.i}</div>
                  <div>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: "15px", color: g.col, fontWeight: "bold" }}>{g.n}</div>
                    <div style={{ fontSize: "11px", color: "rgba(245,230,204,0.8)" }}>{g.d}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEASON REPORT MODAL -- shown after Advance Season when notable things happen */}
      {seasonReport && (
        <div className="modal-bg" style={{ zIndex: 700 }}>
          <div className="modal" style={{ maxWidth: "520px" }}>
            <div className="modal-h" style={{ color: GC, fontSize: "16px" }}>🌅 SEASON REPORT</div>
            <div className="modal-sub">{seasonReport.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
              {seasonReport.entries.map((e, i) => {
                const colBg = e.kind === "bad" ? "rgba(204,56,32,0.12)" : e.kind === "good" ? "rgba(80,160,60,0.12)" : "rgba(212,175,55,0.08)";
                const colBd = e.kind === "bad" ? "rgba(204,56,32,0.4)" : e.kind === "good" ? "rgba(80,180,60,0.4)" : "rgba(212,175,55,0.3)";
                const titleCol = e.kind === "bad" ? "#FF8060" : e.kind === "good" ? "#90D870" : GC;
                return (
                  <div key={i} style={{ background: colBg, border: `1px solid ${colBd}`, borderRadius: "9px", padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ fontSize: "26px", flexShrink: 0, lineHeight: 1 }}>{e.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Cinzel',serif", fontSize: "12.5px", color: titleCol, fontWeight: 700, marginBottom: "4px", letterSpacing: "0.5px" }}>{e.title}</div>
                      <div style={{ fontSize: "11.5px", color: "rgba(245,230,204,0.78)", lineHeight: 1.55 }}>{e.body}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="tbtn" onClick={() => setSeasonReport(null)}>Continue</button>
          </div>
        </div>
      )}

      {/* BUILDINGS REFERENCE MODAL */}
      {bldgPan && (
        <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setBldgPan(false)}>
          <div className="modal-wide">
            <div className="modal-h" style={{ color: GC, fontSize: "18px" }}>🏛️ BUILDINGS REFERENCE</div>
            <div className="modal-sub">All structures of Uruk · click outside to close</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
              {Object.entries(B).map(([key, bk]) => {
                const unlocked = isBldgUnlocked(key);
                const reqs = [
                  bk.reqT && `Tech: ${INVS.find((i) => i.id === bk.reqT)?.n || bk.reqT}`,
                  bk.reqB && `Building: ${B[bk.reqB]?.n || bk.reqB}`,
                ].filter(Boolean);
                const produces = [];
                if (bk.pr?.grain) produces.push(<span key="g">🌾+{bk.pr.grain}</span>);
                if (bk.pr?.water) produces.push(<span key="w">💧+{bk.pr.water}</span>);
                if (bk.pr?.gold) produces.push(<span key="s"><span className="silver-coin">🪙</span>+{bk.pr.gold}</span>);
                if (bk.pr?.intel) produces.push(<span key="i">🧠+{bk.pr.intel}</span>);
                if (bk.morBonus) produces.push(<span key="m">❤️+{bk.morBonus}</span>);
                if (bk.def) produces.push(<span key="d">⚔️+{bk.def} def</span>);
                if (bk.fa) produces.push(<span key="f">✨+{bk.fa}</span>);
                if (bk.pb) produces.push(<span key="p">👥+{bk.pb}</span>);
                if (bk.sc) produces.push(<span key="c">📦+{bk.sc} cap</span>);
                return (
                  <div key={key} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${bk.col}55`, borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px", opacity: unlocked ? 1 : 0.6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", borderBottom: `1px solid ${bk.col}33`, paddingBottom: "8px" }}>
                      <div style={{ width: "44px", height: "44px", borderRadius: "8px", background: `radial-gradient(circle, ${bk.col}BB, ${bk.col}44)`, border: `1px solid ${bk.col}88`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>{unlocked ? bk.s : "🔒"}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Cinzel',serif", fontSize: "14px", color: GC, fontWeight: 700, letterSpacing: "0.5px" }}>{bk.n}</div>
                        <div style={{ fontSize: "9px", color: unlocked ? "#90D870" : "#FF8060", fontFamily: "'Cinzel',serif", letterSpacing: "1.5px", marginTop: "2px" }}>{unlocked ? "AVAILABLE" : "LOCKED"}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: "11px", display: "flex", flexWrap: "wrap", gap: "4px 10px" }}>
                      <div style={{ color: SAND, fontFamily: "'Cinzel',serif" }}>Cost:</div>
                      <span style={{ color: SAND }}><span className="silver-coin">🪙</span> {bk.c.gold}</span>
                      {bk.c.workers && <span style={{ color: SAND }}>👷 {bk.c.workers}</span>}
                      {bk.c.grain && <span style={{ color: SAND }}>🌾 {bk.c.grain}</span>}
                    </div>
                    {produces.length > 0 && (
                      <div style={{ fontSize: "11px", display: "flex", flexWrap: "wrap", gap: "4px 10px", color: "#90D870" }}>
                        <div style={{ color: SAND, fontFamily: "'Cinzel',serif" }}>Produces:</div>
                        {produces.reduce((acc, el, idx) => idx === 0 ? [el] : [...acc, " · ", el], [])}
                      </div>
                    )}
                    {reqs.length > 0 && (
                      <div style={{ fontSize: "10px", color: "#FF8060", fontFamily: "'Cinzel',serif" }}>Requires: {reqs.join(" · ")}</div>
                    )}
                    <div style={{ fontSize: "11px", color: "rgba(245,230,204,0.7)", fontStyle: "italic", lineHeight: 1.55, borderTop: `1px solid ${bk.col}22`, paddingTop: "8px" }}>"{bk.lore}"</div>
                  </div>
                );
              })}
            </div>
            <button className="tbtn2" style={{ marginTop: "16px" }} onClick={() => setBldgPan(false)}>Close</button>
          </div>
        </div>
      )}

      {/* TECH TREE MODAL */}
      {techPan && (
        <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setTechPan(false)}>
          <div className="modal-wide">
            <div className="modal-h" style={{ color: GC, fontSize: "18px" }}>🧠 TABLET ARCHIVES</div>
            <div className="modal-sub">Stored Intelligence: {S.intel}</div>
            {!S.grid.some(r => r.includes("scribal")) && (
              <div style={{ background: "rgba(204,56,32,0.12)", border: "1px solid rgba(204,56,32,0.4)", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", color: "#FF9070", fontFamily: "'Cinzel',serif", fontSize: "12px" }}>
                🔒 A Scribal School is required to conduct research. Build a Temple first, then construct a Scribal School.
              </div>
            )}
            {TECH_TIERS.map((tier, tIdx) => (
              <div key={tIdx} style={{ marginBottom: "18px" }}>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: "12px", color: GC, borderBottom: "1px solid rgba(212,175,55,0.25)", paddingBottom: "5px", marginBottom: "12px" }}>{tier.name}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                  {tier.techs.map((inv) => {
                    const unlocked = S.invs.includes(inv.id);
                    const pm = inv.prereqs.every((p) => S.invs.includes(p));
                    const bm = !inv.reqB || S.grid.some((r) => r.includes(inv.reqB));
                    const ca = S.intel >= inv.cost;
                    const av = pm && bm && !unlocked;
                    return (
                      <div key={inv.id} style={{ background: unlocked ? "rgba(212,175,55,0.10)" : "rgba(255,255,255,0.03)", border: unlocked ? `1px solid ${GC}` : av && ca ? "1px solid rgba(212,175,55,0.4)" : "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "12px", opacity: unlocked || (pm && bm) ? 1 : 0.42, display: "flex", flexDirection: "column", gap: "9px" }}>
                        <div>
                          <div style={{ fontSize: "18px", marginBottom: "5px" }}>{inv.icon} <span style={{ fontFamily: "'Cinzel',serif", fontSize: "13px", color: unlocked ? GC : SAND }}>{inv.n}</span></div>
                          <div style={{ fontSize: "11px", color: "rgba(245,230,204,0.68)", lineHeight: 1.5, marginBottom: "7px" }}>{inv.desc}</div>
                          {(!pm || !bm) && (
                            <div style={{ fontSize: "9px", color: "#E04040", marginBottom: "5px" }}>
                              Requires: {[...inv.prereqs.filter((p) => !S.invs.includes(p)).map((p) => INVS.find((i) => i.id === p).n), ...(!bm ? [B[inv.reqB].n] : [])].join(", ")}
                            </div>
                          )}
                        </div>
                        <button onClick={() => unlockTech(inv)} disabled={!av || !ca} style={{ background: unlocked ? "transparent" : av && ca ? "linear-gradient(135deg,#7A4820,#B87A30)" : "rgba(0,0,0,0.4)", border: unlocked ? "none" : `1px solid ${av && ca ? GC : "rgba(255,255,255,0.1)"}`, color: unlocked ? GC : av && ca ? SAND : "#888", padding: "8px 0", borderRadius: "6px", fontFamily: "'Cinzel',serif", fontSize: "11px", cursor: unlocked ? "default" : av && ca ? "pointer" : "not-allowed", width: "100%" }}>
                          {unlocked ? "✓ Researched" : `Research for ${inv.cost} 🧠`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button className="tbtn2" style={{ marginTop: "16px" }} onClick={() => setTechPan(false)}>Close Archives</button>
          </div>
        </div>
      )}

      {/* ROLES MODAL */}
      {rolesPan && (
        <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setRolesPan(false)}>
          <div className="modal">
            <div className="modal-h" style={{ color: GC, fontSize: "15px" }}>👷 POPULATION ROLES</div>
            <div className="modal-sub">Idle workers auto-assign each season</div>
            <div style={{ fontSize: "11px", color: idleWorkers > 0 ? "#ffaa60" : "rgba(245,230,204,0.42)", textAlign: "center", marginBottom: "14px", fontFamily: "'Cinzel',serif" }}>
              Workers: {S.workers} · Assigned: {S.roles.workers + S.roles.scholars + S.roles.soldiers} · Idle: {idleWorkers}
            </div>
            {[{ key: "workers", label: "Workers", icon: "👷", desc: "+0.5 grain, +0.2 water." }, { key: "scholars", label: "Scholars", icon: "📜", desc: "+0.3 intel." }, { key: "soldiers", label: "Soldiers", icon: "⚔️", desc: "+0.5 defense." }].map(({ key, label, icon, desc }) => (
              <div key={key} style={{ marginBottom: "12px", padding: "11px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: "9px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontFamily: "'Cinzel',serif", fontSize: "12px" }}>{icon} {label}: {S.roles[key]}</span>
                  <div style={{ display: "flex", gap: "7px" }}>
                    <button onClick={() => adjustRole(key, -1)} style={{ width: "28px", height: "28px", borderRadius: "5px", background: "rgba(200,80,40,0.2)", border: "1px solid rgba(200,80,40,0.35)", color: SAND }}>−</button>
                    <button onClick={() => adjustRole(key, 1)} style={{ width: "28px", height: "28px", borderRadius: "5px", background: "rgba(40,180,80,0.2)", border: "1px solid rgba(40,180,80,0.35)", color: SAND }}>+</button>
                  </div>
                </div>
                <div style={{ fontSize: "10px", color: "rgba(245,230,204,0.42)", fontStyle: "italic" }}>{desc}</div>
              </div>
            ))}
            <button className="tbtn2" onClick={() => setRolesPan(false)}>Done</button>
          </div>
        </div>
      )}

      {/* QUESTS MODAL */}
      {questPan && (
        <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setQuestPan(false)}>
          <div className="modal">
            <div className="modal-h" style={{ color: GC, fontSize: "15px" }}>📜 CITY OBJECTIVES</div>
            <div className="modal-sub">Complete all objectives + Ziggurat + 150 people to win</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              {S.quests.map((q) => (
                <div key={q.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", background: q.done ? "rgba(50,140,50,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${q.done ? "rgba(50,180,50,0.3)" : "rgba(212,175,55,0.15)"}`, borderRadius: "9px" }}>
                  <div style={{ fontSize: "20px" }}>{q.done ? "✅" : q.icon}</div>
                  <div>
                    <div style={{ fontSize: "12px", color: q.done ? "#90D870" : SAND, textDecoration: q.done ? "line-through" : "none", fontFamily: "'Cinzel',serif" }}>{q.text}</div>
                    <div style={{ fontSize: "10px", color: "rgba(245,230,204,0.38)", fontStyle: "italic" }}>{q.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="tbtn2" style={{ marginTop: "14px" }} onClick={() => setQuestPan(false)}>Close</button>
          </div>
        </div>
      )}

      {/* TRADE POST MODAL */}
      {tradePan && (
        <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setTradePan(false)}>
          <div className="modal">
            <div className="modal-h" style={{ color: GC, fontSize: "15px" }}>🏪 TRADE POST</div>
            <div className="modal-sub">Exchange resources with passing caravans</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                { type: "buy-grain", label: "Buy 10 Grain", cost: "15 silver", can: S.gold >= 15 },
                { type: "buy-water", label: "Buy 10 Water", cost: "12 silver", can: S.gold >= 12 },
                { type: "buy-worker", label: "Hire 2 Workers", cost: "25 silver", can: S.gold >= 25 && S.workers < S.pop },
                { type: "sell-grain", label: "Sell 10 Grain", cost: "earn 8 silver", can: S.grain >= 10 },
                { type: "sell-water", label: "Sell 10 Water", cost: "earn 10 silver", can: S.water >= 10 },
                { type: "buy-intel", label: "Buy Foreign Scrolls", cost: "20 silver for +8 intel", can: S.gold >= 20 },
              ].map((opt) => (
                <button key={opt.type} className="tr-btn" disabled={!opt.can} onClick={() => doTrade(opt.type)}>
                  <span>{opt.label}</span>
                  <span style={{ color: GC, fontSize: "10px" }}><span className="silver-coin">🪙</span> {opt.cost}</span>
                </button>
              ))}
            </div>
            <button className="tbtn2" style={{ marginTop: "14px" }} onClick={() => setTradePan(false)}>Close Post</button>
          </div>
        </div>
      )}

      {/* WAR COUNCIL MODAL */}
      {warPan && (
        <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setWarPan(false)}>
          <div className="modal">
            <div className="modal-h" style={{ color: "#CC3820", fontSize: "15px" }}>⚔️ WAR COUNCIL</div>
            {!hasBarracks ? (
              <div>
                <p style={{ fontSize: "12px", color: "rgba(245,230,204,0.72)", marginBottom: "16px", textAlign: "center", fontStyle: "italic" }}>Your city has no standing army. Build a Barracks first.</p>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(212,175,55,0.15)", borderRadius: "9px", padding: "13px 15px", marginBottom: "16px" }}>
                  <div style={{ fontFamily: "'Cinzel',serif", fontSize: "11px", color: GC, marginBottom: "10px" }}>PATH TO WAR</div>
                  {[
                    { done: S.grid.some((r) => r.includes("temple")), label: "Build a Temple (unlocks Scribal School)" },
                    { done: S.grid.some((r) => r.includes("scribal")), label: "Build a Scribal School (generates Intel)" },
                    { done: S.invs.includes("bronze"), label: "Research Bronze Tools" },
                    { done: hasBarracks, label: "Build a Barracks" },
                  ].map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "7px", fontSize: "11px", color: step.done ? "#90D870" : "rgba(245,230,204,0.58)" }}>
                      <span style={{ fontSize: "14px" }}>{step.done ? "✅" : "○"}</span>
                      <span style={{ textDecoration: step.done ? "line-through" : "none" }}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                {!raidReady && (
                  <div style={{ background: "rgba(200,56,20,0.12)", border: "1px solid rgba(200,56,20,0.3)", borderRadius: "9px", padding: "11px 13px", marginBottom: "13px", fontSize: "11px", color: "#FF8060" }}>
                    Cannot raid yet:
                    {S.workers < 5 && <div>· Need {5 - S.workers} more workers (have {S.workers}, need 5)</div>}
                    {S.gold < 8 && <div>· Need {8 - Math.floor(S.gold)} more silver (have {Math.floor(S.gold)}, need 8)</div>}
                  </div>
                )}
                <div style={{ fontSize: "12px", color: "rgba(245,230,204,0.58)", lineHeight: 1.9, marginBottom: "13px" }}>
                  Cost: <strong style={{ color: "#E09040" }}>3 workers and 8 silver</strong><br />
                  Victory: <strong style={{ color: GC }}>+15-35 silver, +8-22 grain, +6 morale</strong><br />
                  Defeat: <strong style={{ color: "#FF6040" }}>2 more workers lost, -9 morale</strong>
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: "9px" }}>
              <button className="tbtn" style={{ flex: 1 }} disabled={!raidReady} onClick={doRaid}>MARCH!</button>
              <button className="tbtn2" style={{ flex: 1 }} onClick={() => setWarPan(false)}>Stand Down</button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER & VICTORY */}
      {S.phase !== "play" && S.phase !== "god_select" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "22px", zIndex: 999, padding: "20px" }}>
          <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: "clamp(22px,5.5vw,44px)", textAlign: "center", color: S.phase === "victory" ? GC : "#CC3820", textShadow: `0 0 50px ${S.phase === "victory" ? "rgba(212,175,55,0.85)" : "rgba(204,56,32,0.85)"}` }}>
            {S.phase === "victory" ? "🌟  GLORY ETERNAL  🌟" : "💀  CITY FALLEN  💀"}
          </div>
          <p style={{ color: "rgba(245,230,204,0.68)", fontSize: "15px", maxWidth: "460px", textAlign: "center", fontStyle: "italic" }}>
            {S.phase === "victory" ? "Your city has ascended to the heights of civilisation. The gods inscribe your name on the eternal tablets." : S.morale <= 0 ? "The people rose against their rulers. Unrest consumed what neither drought nor famine could claim." : "The last of your citizens fade into the great desert. Only ruins recall what once was great."}
          </p>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", justifyContent: "center" }}>
            {S.phase === "victory" && <button className="tbtn" style={{ border: "2px solid #6090FF" }} onClick={() => setS((p) => ({ ...p, phase: "play", endless: true }))}>♾ Keep Building</button>}
            <button className="tbtn" onClick={() => { setS(mkRulerState()); setSel(null); setSeasonReport(null); setTradePan(false); setWarPan(false); setQuestPan(false); setRolesPan(false); setTechPan(false); setBldgPan(false); setTutStep(0); setInstPan(false); }}>Found a New City</button>
            <button className="tbtn2" onClick={onBack}>Main Menu</button>
          </div>
        </div>
      )}

      <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at 18% 82%, #2C1106 0%, #08030A 55%, #0A0200 100%)", color: SAND, display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 10px 90px", gap: "12px" }}>
        {/* HEADER */}
        <div style={{ display: "flex", width: "100%", maxWidth: "1120px", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            <button className="hbtn" onClick={onBack}>← Menu</button>
            <h1 style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: "clamp(18px,4.5vw,26px)", color: GC }}>𒀭 MESOPOTAMIA 𒀭</h1>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "10px", color: "rgba(212,175,55,0.5)", fontFamily: "'Cinzel',serif" }}>💾 Autosaving...</span>
            <button className="hbtn" onClick={() => setBldgPan(true)}>🏛️ Buildings</button>
            <button className="hbtn" onClick={() => setInstPan(true)}>📜 Codex</button>
          </div>
        </div>

        {/* STATS BAR */}
        <div id="ruler-stats" className={tCls("ruler-stats")} style={{ position: "relative", display: "flex", flexWrap: "wrap", gap: "10px 14px", justifyContent: "center", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(212,175,55,0.22)", borderRadius: "12px", padding: "12px 18px", width: "100%", maxWidth: "1120px" }}>
          {tArrow("ruler-stats")}
          {[
            { icon: "🌾", label: "GRAIN", val: Math.floor(S.grain), max: S.grainCap, col: "#78C040", warn: S.grain < 15 },
            { icon: "💧", label: "WATER", val: Math.floor(S.water), max: 100, col: "#40A0E0", warn: S.water < 12 },
            { icon: "👷", label: "WORKERS", val: S.workers, max: S.pop, col: "#E09040", warn: S.workers < 3 },
            { icon: <span className="silver-coin">🪙</span>, label: "SILVER", val: Math.floor(S.gold), max: 200, col: GC, warn: false },
            { icon: "👥", label: "PEOPLE", val: S.pop, max: 200, col: "#D070C0", warn: false },
            { icon: "❤️", label: "MORALE", val: S.morale, max: 100, col: "#A0D850", warn: S.morale < 25 },
            { icon: "🧠", label: "INTEL", val: S.intel, max: 250, col: "#6090FF", warn: false },
            { icon: "✨", label: "FAVOR", val: S.favor, max: 100, col: "#F0D040", warn: S.favor <= 20 },
          ].map(({ icon, label, val, max, col, warn }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", minWidth: "60px" }}>
              <div style={{ fontSize: "17px" }}>{icon}</div>
              <div style={{ fontSize: "17px", fontWeight: 700, fontFamily: "'Cinzel',serif", color: warn ? "#FF6040" : SAND }}>{val}</div>
              <div style={{ width: "50px", height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, (val / max) * 100))}%`, background: col, borderRadius: "2px", transition: "width .5s" }} />
              </div>
              <div style={{ fontSize: "8px", letterSpacing: "1px", color: "rgba(245,230,204,0.36)", fontFamily: "'Cinzel',serif" }}>{label}</div>
            </div>
          ))}
          <div style={{ borderLeft: "1px solid rgba(212,175,55,0.18)", paddingLeft: "14px", display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", color: "rgba(245,230,204,0.52)" }}>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: "9px", color: GC, letterSpacing: "1px" }}>PER SEASON</div>
            <div>🌾 +{prod.gr} · 💧 +{prod.wa}</div>
            <div><span className="silver-coin">🪙</span> +{prod.go} · 🧠 +{prod.intel}</div>
            <div>✨ {prod.fa - 5 > 0 ? "+" : ""}{prod.fa - 5} · ⚔ def {prod.def}</div>
          </div>
        </div>

        {/* MAIN GAME LAYOUT */}
        <div style={{ display: "flex", gap: "14px", width: "100%", maxWidth: "1120px", flexWrap: "wrap", justifyContent: "center" }}>
          {/* GRID */}
          <div id="ruler-grid" className={tCls("ruler-grid")} style={{ position: "relative" }}>
            {tArrow("ruler-grid")}
            {sel && (
              <div style={{ height: "28px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px", fontFamily: "'Cinzel',serif", fontSize: "11px", letterSpacing: "1px", color: GC }}>
                PLACING: {B[sel].n.toUpperCase()} · <span style={{ color: "rgba(245,230,204,0.4)", cursor: "pointer", textDecoration: "underline", marginLeft: "8px" }} onClick={() => setSel(null)}>Cancel</span>
              </div>
            )}
            {!sel && demolishMode && (
              <div style={{ height: "28px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "4px", fontFamily: "'Cinzel',serif", fontSize: "11px", letterSpacing: "1px", color: "#FF8060" }}>
                🔨 DEMOLISH: click any building · <span style={{ color: "rgba(245,230,204,0.4)", cursor: "pointer", textDecoration: "underline", marginLeft: "8px" }} onClick={() => setDemolishMode(false)}>Cancel</span>
              </div>
            )}
            {!sel && !demolishMode && <div style={{ height: "28px", marginBottom: "4px" }} />}
            <div style={{ background: "rgba(0,0,0,0.3)", border: "2px solid rgba(212,175,55,0.2)", borderRadius: "10px", padding: "6px" }}>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${GRID},50px)`, gap: "2px" }}>
                {S.grid.map((row, r) =>
                  row.map((cell, c) => {
                    const isRv = isRiverCell(r, c);
                    const bk = cell && !isRv ? B[cell] : null;
                    const isP = !cell && !isRv && !!sel && canAffordBldg(sel) && isBldgUnlocked(sel);
                    const isD = demolishMode && bk;
                    return (
                      <div key={`${r}-${c}`} className={`cell${isP || isD ? " placeable" : ""}`} onClick={() => place(r, c)} style={{ width: "50px", height: "50px", position: "relative", borderRadius: "5px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: isRv ? "rgba(18,60,140,0.55)" : bk ? `radial-gradient(circle at 35% 30%, ${bk.col}CC, ${bk.col}44)` : "rgba(70,42,18,0.22)", border: isRv ? "1px solid rgba(50,120,220,0.5)" : isD ? "1px dashed rgba(255,80,40,0.7)" : bk ? `1px solid ${bk.col}88` : isP ? "1px dashed rgba(212,175,55,0.5)" : "1px solid rgba(100,65,30,0.15)", cursor: isP || isD ? "pointer" : "default", boxShadow: isD ? "inset 0 0 8px rgba(255,80,40,0.45)" : "none" }}>
                        {isRv && (<><div className="river-shimmer" /><div style={{ zIndex: 1 }}>〰</div></>)}
                        {bk && (<><div style={{ fontSize: "20px" }}>{bk.s}</div><div style={{ fontSize: "6px", fontFamily: "'Cinzel',serif" }}>{bk.n.slice(0, 6).toUpperCase()}</div></>)}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: ACTIONS & BUILD */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "230px" }}>
            <div id="ruler-advance" className={tCls("ruler-advance")} style={{ position: "relative" }}>
              {tArrow("ruler-advance")}
              <button className="tbtn" onClick={advance} disabled={S.phase !== "play"}>ADVANCE SEASON ›</button>
            </div>
            <div id="ruler-quests" className={tCls("ruler-quests")} style={{ display: "flex", gap: "7px", position: "relative" }}>
              {tArrow("ruler-quests")}
              <button className="gbtn" onClick={() => { setQuestPan(true); signalTut("open_quests"); }} disabled={S.phase !== "play"}>📜 Quests</button>
              <button className="tbtn2" onClick={() => { setTechPan(true); signalTut("open_tech"); }} disabled={S.phase !== "play" || !S.grid.some(r => r.includes("scribal"))} title={S.grid.some(r => r.includes("scribal")) ? "" : "Requires a Scribal School"}>🧠 Archives</button>
            </div>
            <div id="ruler-roles" className={tCls("ruler-roles")} style={{ display: "flex", gap: "7px", position: "relative" }}>
              {tArrow("ruler-roles")}
              <button className="tbtn2" style={{ color: "#E09040" }} onClick={draftWorkers} disabled={S.phase !== "play" || S.grain < 10 || S.workers >= S.pop} title="Corvée Labor: -10 grain, -4 morale, +2 workers">👷 Draft</button>
              <button className="tbtn2" onClick={() => { setRolesPan(true); signalTut("open_roles"); }} disabled={S.phase !== "play"}>👷 Roles</button>
            </div>
            <div style={{ display: "flex", gap: "7px" }}>
              <button className="tbtn2" style={{ color: "#F0D040" }} onClick={doPray} disabled={S.phase !== "play" || S.grain < 15 || S.gold < 10 || S.offeringMade} title="-15 grain, -10 silver, +20 Favor">🙏 Pray</button>
              <button className="rbtn" disabled={S.phase !== "play"} onClick={() => setWarPan(true)}>⚔️ War</button>
            </div>
            {prod.hasTrade && (<button className="tbtn2" disabled={S.phase !== "play"} onClick={() => setTradePan(true)}>🏪 Trade Post</button>)}

            <div id="ruler-build" className={tCls("ruler-build")} style={{ position: "relative", background: "rgba(0,0,0,0.34)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "10px", padding: "10px", maxHeight: "320px", overflowY: "auto" }}>
              {tArrow("ruler-build")}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: "10px", color: GC }}>CONSTRUCT</div>
                <button
                  onClick={() => { setDemolishMode((d) => !d); setSel(null); }}
                  disabled={S.phase !== "play"}
                  title="Toggle demolish mode. Click any built tile to remove it for a 50% silver refund."
                  style={{ cursor: "pointer", border: `1px solid ${demolishMode ? "#FF6040" : "rgba(212,175,55,0.4)"}`, color: demolishMode ? "#FF8060" : GC, background: demolishMode ? "rgba(204,56,32,0.18)" : "rgba(212,175,55,0.06)", borderRadius: "6px", padding: "3px 8px", fontFamily: "'Cinzel',serif", fontSize: "9px", letterSpacing: "1px" }}
                >🔨 {demolishMode ? "DEMOLISHING" : "DEMOLISH"}</button>
              </div>
              {Object.entries(B).map(([key, bk]) => {
                const unlocked = isBldgUnlocked(key); const a = canAffordBldg(key) && unlocked; const on = sel === key;
                return (
                  <div key={key} className={`brow${on ? " sel" : ""}${!unlocked ? " locked" : ""}`} onClick={() => { if (demolishMode) setDemolishMode(false); selectBuilding(key); }} style={{ padding: "6px", marginBottom: "4px", background: on ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${on ? GC : "rgba(120,80,40,0.2)"}`, display: "flex", alignItems: "center", gap: "7px", opacity: a || !unlocked ? 1 : 0.38 }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "6px", flexShrink: 0, background: `radial-gradient(circle, ${bk.col}BB, ${bk.col}44)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", border: `1px solid ${bk.col}66` }}>{unlocked ? bk.s : "🔒"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: unlocked && a ? SAND : "rgba(245,230,204,0.38)" }}>{bk.n}</div>
                      <div style={{ fontSize: "8.5px", color: GC, marginTop: "2px" }}><span className="silver-coin">🪙</span>{bk.c.gold} {bk.c.workers ? `👷${bk.c.workers}` : ""} {bk.c.grain ? `🌾${bk.c.grain}` : ""}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* LOG */}
        <div style={{ width: "100%", maxWidth: "1120px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(212,175,55,0.16)", borderRadius: "10px", padding: "10px 14px", maxHeight: "120px", overflowY: "auto" }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: "9px", letterSpacing: "2.5px", color: GC, marginBottom: "6px" }}>CHRONICLES OF THE CITY</div>
          {S.log.map((entry, i) => (<div key={i} className="le" style={{ fontSize: "11px", padding: "3px 0", color: i === 0 ? "rgba(245,230,204,0.94)" : `rgba(245,230,204,${Math.max(0.12, 0.57 - i * 0.05)})`, borderBottom: i < S.log.length - 1 ? "1px solid rgba(150,100,60,0.09)" : "none" }}>{entry}</div>))}
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════
export default function App() {
  const [view, setView] = useState("main"); // main, mode_select, name_prompt, load, play
  const [activeMode, setActiveMode] = useState(null);
  const [saveName, setSaveName] = useState("");
  const [loadedState, setLoadedState] = useState(null);

  const handleStartNew = () => setView("mode_select");
  const handleLoadScreen = () => setView("load");
  const handleSelectMode = (mode) => { setActiveMode(mode); setView("name_prompt"); };
  const handleConfirmName = (name, mode) => { setSaveName(name); setActiveMode(mode); setLoadedState(null); setView("play"); };
  const handleLoadGame = (name, mode, state) => { setSaveName(name); setActiveMode(mode); setLoadedState(state); setView("play"); };
  const goHome = () => setView("main");

  return (
    <>
      <style>{SHARED_CSS}</style>
      {view === "main" && <MainMenu onStartNew={handleStartNew} onLoadGame={handleLoadScreen} />}
      {view === "mode_select" && <ModeSelect onSelect={handleSelectMode} onBack={goHome} />}
      {view === "name_prompt" && <NamePrompt mode={activeMode} onConfirm={handleConfirmName} onBack={() => setView("mode_select")} />}
      {view === "load" && <LoadMenu onLoad={handleLoadGame} onBack={goHome} />}
      {view === "play" && activeMode === "ruler" && <RulerGame saveName={saveName} initialState={loadedState} onBack={goHome} />}
      {view === "play" && activeMode === "civilian" && <CivilianGame saveName={saveName} initialState={loadedState} onBack={goHome} />}
    </>
  );
}
