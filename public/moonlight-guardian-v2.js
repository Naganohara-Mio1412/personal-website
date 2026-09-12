/* 花园防线：月光守卫
 * 原创 2D 横向分路塔防原型。所有图形均由 Canvas 几何图形绘制，便于后续替换正式素材。
 * 运行游戏请打开 index.html 或 http://localhost:8792/，不要直接打开 game.js。
 */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const crystalCountEl = document.getElementById("crystalCount");
const waveLabelEl = document.getElementById("waveLabel");
const levelLabelEl = document.getElementById("levelLabel");
const cardBarEl = document.getElementById("cardBar");
const collectButtonEl = document.getElementById("collectButton");
const collectCountBadgeEl = document.getElementById("collectCountBadge");
const pauseButtonEl = document.getElementById("pauseButton");
const removeButtonEl = document.getElementById("removeButton");
const menuButtonEl = document.getElementById("menuButton");
const restartButtonEl = document.getElementById("restartButton");
const overlayRestartButtonEl = document.getElementById("overlayRestartButton");
const overlayNextButtonEl = document.getElementById("overlayNextButton");
const overlayMenuButtonEl = document.getElementById("overlayMenuButton");
const messageOverlayEl = document.getElementById("messageOverlay");
const messageTitleEl = document.getElementById("messageTitle");
const messageTextEl = document.getElementById("messageText");
const menuOverlayEl = document.getElementById("menuOverlay");
const startMenuEl = document.getElementById("startMenu");
const levelSelectMenuEl = document.getElementById("levelSelectMenu");
const continueButtonEl = document.getElementById("continueButton");
const openLevelSelectButtonEl = document.getElementById("openLevelSelectButton");
const backToStartButtonEl = document.getElementById("backToStartButton");
const levelGridEl = document.getElementById("levelGrid");
const progressTextEl = document.getElementById("progressText");

const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;

const GRID_CONFIG = {
  rows: 5,
  cols: 9,
  x: 126,
  y: 84,
  cellWidth: 78,
  cellHeight: 82,
  gap: 6
};

const STATE = {
  READY: "ready",
  RUNNING: "running",
  PAUSED: "paused",
  WON: "won",
  LOST: "lost"
};

const STORAGE_KEY = "moonGardenDefenseProgressV1";

const GUARDIAN_RELIC_CONFIG = {
  name: "月核圣树",
  skillName: "月华净界",
  cost: 300,
  cooldown: 35,
  castDuration: 2.35,
  impactTime: 1.05,
  x: 62,
  y: 310
};

function drawLeaf(context, x, y, width, height, rotation, color, stroke = "rgba(255,255,255,0.18)") {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.fillStyle = color;
  context.strokeStyle = stroke;
  context.lineWidth = 1.5;
  context.beginPath();
  context.ellipse(0, 0, width, height, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function drawCrystal(context, x, y, radius, color, highlight = "#ffffff") {
  context.save();
  context.fillStyle = color;
  context.strokeStyle = "rgba(255,255,255,0.55)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x, y - radius);
  context.lineTo(x + radius * 0.72, y - radius * 0.2);
  context.lineTo(x + radius * 0.48, y + radius * 0.82);
  context.lineTo(x - radius * 0.48, y + radius * 0.82);
  context.lineTo(x - radius * 0.72, y - radius * 0.2);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = "rgba(255,255,255,0.34)";
  context.beginPath();
  context.moveTo(x, y - radius * 0.75);
  context.lineTo(x + radius * 0.28, y - radius * 0.15);
  context.lineTo(x, y + radius * 0.18);
  context.lineTo(x - radius * 0.24, y - radius * 0.15);
  context.closePath();
  context.fill();

  context.fillStyle = highlight;
  context.globalAlpha = 0.8;
  context.beginPath();
  context.arc(x - radius * 0.22, y - radius * 0.38, radius * 0.14, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawSparkStar(context, x, y, radius, color) {
  context.save();
  context.fillStyle = color;
  context.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2;
    const r = i % 2 === 0 ? radius : radius * 0.42;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) {
      context.moveTo(px, py);
    } else {
      context.lineTo(px, py);
    }
  }
  context.closePath();
  context.fill();
  context.restore();
}

// 可扩展单位配置。后续新增单位只需追加对象并扩展绘制或行为字段。
const DEFENDER_TYPES = [
  {
    id: "lumen_shoot",
    name: "光芽射手",
    cost: 100,
    maxHp: 160,
    damage: 28,
    attackInterval: 1.5,
    range: 900,
    projectileSpeed: 340,
    projectileColor: "#f6f68a",
    effectText: "单发光弹",
    role: "shooter",
    color: "#7ee8a7",
    cooldown: 4.5
  },
  {
    id: "crystal_bloom",
    name: "晶露花",
    cost: 50,
    maxHp: 120,
    damage: 0,
    attackInterval: 0,
    productionInterval: 7,
    productionValue: 25,
    effectText: "生产能量晶",
    role: "producer",
    color: "#78f4d5",
    cooldown: 5
  },
  {
    id: "shellcap",
    name: "坚壳菇",
    cost: 75,
    maxHp: 520,
    damage: 0,
    attackInterval: 0,
    effectText: "高生命阻挡",
    role: "wall",
    color: "#d7b57b",
    cooldown: 6
  },
  {
    id: "frost_bell",
    name: "寒霜铃",
    cost: 125,
    maxHp: 140,
    damage: 20,
    attackInterval: 2,
    range: 900,
    projectileSpeed: 300,
    slowAmount: 0.5,
    slowDuration: 2.2,
    projectileColor: "#9ddcff",
    effectText: "攻击并减速",
    role: "slower",
    color: "#8fb7ff",
    cooldown: 7
  },
  {
    id: "burst_fruit",
    name: "爆裂果",
    cost: 150,
    maxHp: 90,
    damage: 135,
    attackInterval: 0,
    fuseTime: 1.1,
    radius: 125,
    effectText: "延迟范围爆炸",
    role: "bomb",
    color: "#ff8a65",
    cooldown: 12
  },
  {
    id: "star_prism",
    name: "星棱镜",
    cost: 175,
    maxHp: 130,
    damage: 26,
    attackInterval: 2.4,
    range: 900,
    projectileSpeed: 390,
    projectileColor: "#ffd6ff",
    pierceHits: 3,
    effectText: "穿透星束",
    role: "piercer",
    color: "#d7a7ff",
    cooldown: 9
  },
  {
    id: "moonvine_trap",
    name: "月藤陷阱",
    cost: 60,
    maxHp: 80,
    damage: 70,
    attackInterval: 0,
    rootAmount: 0.92,
    rootDuration: 3,
    effectText: "触发缠绕",
    role: "trap",
    color: "#9ee28f",
    cooldown: 7
  },
  {
    id: "echo_beacon",
    name: "回声灯塔",
    cost: 125,
    maxHp: 150,
    damage: 0,
    attackInterval: 0,
    supportInterval: 5,
    healAmount: 35,
    boostRange: 2,
    attackSpeedMultiplier: 0.82,
    effectText: "治疗并增幅",
    role: "beacon",
    color: "#f7d46c",
    cooldown: 10
  }
];

// 可扩展敌人配置。波次管理器会按 id 调度生成。
const ENEMY_TYPES = {
  crawler: {
    id: "crawler",
    name: "灰影爬行者",
    maxHp: 110,
    speed: 22,
    attack: 18,
    attackInterval: 1.2,
    waveIntroduced: 1,
    color: "#7b8190",
    accent: "#b7bfcc"
  },
  helmet: {
    id: "helmet",
    name: "铁盔侵入者",
    maxHp: 190,
    speed: 16,
    attack: 22,
    attackInterval: 1.25,
    waveIntroduced: 3,
    color: "#53606f",
    accent: "#a4afbd"
  },
  runner: {
    id: "runner",
    name: "疾行影怪",
    maxHp: 80,
    speed: 36,
    attack: 14,
    attackInterval: 0.9,
    waveIntroduced: 4,
    color: "#905dd1",
    accent: "#d2b5ff"
  },
  crusher: {
    id: "crusher",
    name: "重甲破坏者",
    maxHp: 340,
    speed: 13,
    attack: 38,
    attackInterval: 1.45,
    waveIntroduced: 5,
    color: "#8d5647",
    accent: "#ffc2a9"
  },
  mender: {
    id: "mender",
    name: "幽灯医者",
    maxHp: 150,
    speed: 18,
    attack: 12,
    attackInterval: 1.4,
    healInterval: 4,
    healAmount: 35,
    healRadius: 130,
    waveIntroduced: 2,
    color: "#49645f",
    accent: "#78f4d5",
    role: "mender"
  },
  shieldbearer: {
    id: "shieldbearer",
    name: "晶盾护卫",
    maxHp: 220,
    speed: 16,
    attack: 24,
    attackInterval: 1.35,
    shieldHp: 95,
    waveIntroduced: 3,
    color: "#3f526d",
    accent: "#9ddcff",
    role: "shield"
  },
  splitter: {
    id: "splitter",
    name: "裂影孢团",
    maxHp: 165,
    speed: 19,
    attack: 16,
    attackInterval: 1.15,
    splitInto: { type: "crawler", count: 2, hpScale: 0.55, xSpread: 34 },
    waveIntroduced: 4,
    color: "#5d4770",
    accent: "#ffb3d1",
    role: "splitter"
  },
  lord: {
    id: "lord",
    name: "月蚀领主",
    maxHp: 980,
    speed: 10,
    attack: 55,
    attackInterval: 1.3,
    waveIntroduced: 10,
    color: "#2d1f47",
    accent: "#f2d479",
    isBoss: true
  }
};

const WAVES = [
  { number: 1, delay: 8, spawns: [{ type: "crawler", count: 3, every: 3.2 }] },
  { number: 2, delay: 7, spawns: [{ type: "crawler", count: 6, every: 2.55 }] },
  { number: 3, delay: 7, spawns: [{ type: "crawler", count: 6, every: 2.45 }, { type: "helmet", count: 2, every: 5 }] },
  { number: 4, delay: 7, spawns: [{ type: "crawler", count: 7, every: 2.15 }, { type: "runner", count: 3, every: 3.7 }] },
  { number: 5, delay: 8, spawns: [{ type: "helmet", count: 4, every: 3.2 }, { type: "crusher", count: 2, every: 6.2 }] },
  { number: 6, delay: 7, spawns: [{ type: "crawler", count: 8, every: 1.95 }, { type: "runner", count: 5, every: 3 }, { type: "helmet", count: 4, every: 3.8 }] },
  { number: 7, delay: 7, spawns: [{ type: "runner", count: 7, every: 2.65 }, { type: "crusher", count: 3, every: 5.5 }, { type: "mender", count: 2, every: 6, at: 5 }] },
  { number: 8, delay: 7, spawns: [{ type: "crawler", count: 9, every: 1.8 }, { type: "helmet", count: 6, every: 3.25 }, { type: "shieldbearer", count: 3, every: 5.2 }] },
  { number: 9, delay: 8, spawns: [{ type: "runner", count: 9, every: 2.25 }, { type: "splitter", count: 4, every: 4.2 }, { type: "crusher", count: 4, every: 5 }] },
  { number: 10, delay: 9, spawns: [{ type: "crawler", count: 8, every: 1.75 }, { type: "runner", count: 8, every: 2.05 }, { type: "shieldbearer", count: 4, every: 4.2 }, { type: "mender", count: 3, every: 5.4 }, { type: "lord", count: 1, every: 1, at: 10 }] }
];

const LEVELS = [
  {
    id: "dew_courtyard",
    number: 1,
    name: "萤露庭院",
    subtitle: "教学节奏",
    difficulty: "轻松",
    description: "月光花园的外侧庭院，敌人数量少，适合熟悉资源和放置冷却。",
    initialCrystals: 125,
    resourceInterval: 4.8,
    resourceValue: 25,
    theme: {
      skyA: "#17324a",
      skyB: "#193b35",
      skyC: "#102030",
      tileA: "rgba(65, 114, 86, 0.45)",
      tileB: "rgba(52, 99, 112, 0.42)",
      accent: "#78f4d5",
      entryLabel: "灰影入口"
    },
    waves: [
      { number: 1, delay: 10, spawns: [{ type: "crawler", count: 3, every: 3.4 }] },
      { number: 2, delay: 8, spawns: [{ type: "crawler", count: 5, every: 3 }] },
      { number: 3, delay: 8, spawns: [{ type: "crawler", count: 5, every: 2.7 }, { type: "helmet", count: 1, every: 5.5, at: 4 }] },
      { number: 4, delay: 8, spawns: [{ type: "crawler", count: 6, every: 2.5 }, { type: "runner", count: 2, every: 4.4, at: 6 }] },
      { number: 5, delay: 9, spawns: [{ type: "crawler", count: 7, every: 2.4 }, { type: "helmet", count: 2, every: 5 }] },
      { number: 6, delay: 10, spawns: [{ type: "crawler", count: 8, every: 2.2 }, { type: "runner", count: 3, every: 4 }] }
    ]
  },
  {
    id: "starvine_slope",
    number: 2,
    name: "星藤坡道",
    subtitle: "速度压力",
    difficulty: "普通",
    description: "星藤缠绕的斜坡，疾行影怪开始频繁试探边路。",
    initialCrystals: 115,
    resourceInterval: 5,
    resourceValue: 25,
    theme: {
      skyA: "#18264a",
      skyB: "#263b58",
      skyC: "#101826",
      tileA: "rgba(75, 91, 131, 0.44)",
      tileB: "rgba(49, 104, 99, 0.4)",
      accent: "#9ddcff",
      entryLabel: "星雾入口"
    },
    waves: [
      { number: 1, delay: 9, spawns: [{ type: "crawler", count: 5, every: 2.7 }] },
      { number: 2, delay: 7, spawns: [{ type: "crawler", count: 5, every: 2.5 }, { type: "runner", count: 2, every: 4.2, at: 4 }] },
      { number: 3, delay: 7, spawns: [{ type: "runner", count: 5, every: 3.1 }, { type: "crawler", count: 4, every: 2.8 }] },
      { number: 4, delay: 7, spawns: [{ type: "helmet", count: 3, every: 4.2 }, { type: "runner", count: 4, every: 3.4 }] },
      { number: 5, delay: 8, spawns: [{ type: "crawler", count: 8, every: 2.1 }, { type: "runner", count: 5, every: 3 }] },
      { number: 6, delay: 8, spawns: [{ type: "helmet", count: 4, every: 4.4 }, { type: "runner", count: 6, every: 2.8 }, { type: "mender", count: 1, every: 1, at: 6 }] },
      { number: 7, delay: 9, spawns: [{ type: "crawler", count: 8, every: 2 }, { type: "runner", count: 8, every: 2.6 }, { type: "helmet", count: 3, every: 4.5 }, { type: "mender", count: 2, every: 5.5 }] }
    ]
  },
  {
    id: "mistbell_marsh",
    number: 3,
    name: "雾铃湿地",
    subtitle: "护甲混编",
    difficulty: "进阶",
    description: "薄雾遮住湿地路径，铁盔侵入者和重甲破坏者开始混编推进。",
    initialCrystals: 110,
    resourceInterval: 5.4,
    resourceValue: 25,
    theme: {
      skyA: "#18323f",
      skyB: "#23443b",
      skyC: "#111d25",
      tileA: "rgba(61, 113, 108, 0.43)",
      tileB: "rgba(51, 91, 126, 0.39)",
      accent: "#8fb7ff",
      entryLabel: "雾门入口"
    },
    waves: [
      { number: 1, delay: 8, spawns: [{ type: "crawler", count: 6, every: 2.4 }, { type: "helmet", count: 1, every: 5, at: 5 }] },
      { number: 2, delay: 7, spawns: [{ type: "helmet", count: 4, every: 3.8 }] },
      { number: 3, delay: 7, spawns: [{ type: "crawler", count: 7, every: 2.1 }, { type: "helmet", count: 3, every: 4.2 }] },
      { number: 4, delay: 8, spawns: [{ type: "shieldbearer", count: 1, every: 1, at: 5 }, { type: "crawler", count: 6, every: 2.2 }] },
      { number: 5, delay: 8, spawns: [{ type: "helmet", count: 5, every: 3.5 }, { type: "runner", count: 4, every: 3.4 }, { type: "mender", count: 1, every: 1, at: 7 }] },
      { number: 6, delay: 9, spawns: [{ type: "crusher", count: 2, every: 6 }, { type: "shieldbearer", count: 2, every: 5.6 }, { type: "crawler", count: 8, every: 2.1 }] },
      { number: 7, delay: 9, spawns: [{ type: "helmet", count: 6, every: 3.2 }, { type: "runner", count: 5, every: 3 }, { type: "splitter", count: 2, every: 5.6 }] },
      { number: 8, delay: 10, spawns: [{ type: "crawler", count: 9, every: 1.9 }, { type: "shieldbearer", count: 4, every: 4.8 }, { type: "crusher", count: 3, every: 5.8 }, { type: "mender", count: 2, every: 6 }] }
    ]
  },
  {
    id: "crystal_ridge",
    number: 4,
    name: "晶脊温室",
    subtitle: "连续压线",
    difficulty: "困难",
    description: "晶体温室折射月光，敌人会用快慢组合连续压线。",
    initialCrystals: 100,
    resourceInterval: 5.7,
    resourceValue: 25,
    theme: {
      skyA: "#1c2742",
      skyB: "#314058",
      skyC: "#121724",
      tileA: "rgba(76, 108, 124, 0.43)",
      tileB: "rgba(76, 92, 133, 0.38)",
      accent: "#f7d46c",
      entryLabel: "晶雾入口"
    },
    waves: [
      { number: 1, delay: 8, spawns: [{ type: "runner", count: 5, every: 2.8 }, { type: "crawler", count: 5, every: 2.3 }] },
      { number: 2, delay: 7, spawns: [{ type: "helmet", count: 4, every: 3.4 }, { type: "runner", count: 4, every: 2.9 }] },
      { number: 3, delay: 7, spawns: [{ type: "crusher", count: 2, every: 5.4 }, { type: "splitter", count: 3, every: 4.4 }, { type: "crawler", count: 7, every: 1.9 }] },
      { number: 4, delay: 7, spawns: [{ type: "runner", count: 8, every: 2.4 }, { type: "shieldbearer", count: 4, every: 4.2 }] },
      { number: 5, delay: 8, spawns: [{ type: "crusher", count: 3, every: 5.2 }, { type: "runner", count: 6, every: 2.5 }, { type: "mender", count: 2, every: 5.2 }] },
      { number: 6, delay: 8, spawns: [{ type: "crawler", count: 10, every: 1.7 }, { type: "shieldbearer", count: 5, every: 3.8 }, { type: "runner", count: 6, every: 2.6 }] },
      { number: 7, delay: 8, spawns: [{ type: "crusher", count: 4, every: 5 }, { type: "splitter", count: 5, every: 3.8 }, { type: "runner", count: 7, every: 2.4 }] },
      { number: 8, delay: 9, spawns: [{ type: "crawler", count: 10, every: 1.6 }, { type: "runner", count: 9, every: 2.2 }, { type: "shieldbearer", count: 5, every: 4.2 }, { type: "mender", count: 2, every: 6 }] },
      { number: 9, delay: 10, spawns: [{ type: "helmet", count: 8, every: 2.8 }, { type: "runner", count: 10, every: 2.1 }, { type: "crusher", count: 5, every: 4.6 }, { type: "splitter", count: 4, every: 4.4 }] }
    ]
  },
  {
    id: "eclipse_corridor",
    number: 5,
    name: "月蚀回廊",
    subtitle: "终章 Boss",
    difficulty: "挑战",
    description: "月蚀阴影覆盖回廊，所有灰影兵种都会出现，最终迎战月蚀领主。",
    initialCrystals: 100,
    resourceInterval: 5.8,
    resourceValue: 25,
    theme: {
      skyA: "#151b31",
      skyB: "#2b2444",
      skyC: "#10121f",
      tileA: "rgba(69, 79, 123, 0.42)",
      tileB: "rgba(62, 54, 96, 0.4)",
      accent: "#f2d479",
      entryLabel: "月蚀入口"
    },
    waves: WAVES
  }
];

function loadProgress() {
  const fallback = { highestUnlocked: 1, completedLevels: [] };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") {
      return fallback;
    }

    const highestUnlocked = Math.min(
      LEVELS.length,
      Math.max(1, Number(saved.highestUnlocked) || 1)
    );
    const completedLevels = Array.isArray(saved.completedLevels)
      ? saved.completedLevels.filter((levelNumber) => Number.isInteger(levelNumber))
      : [];

    return { highestUnlocked, completedLevels };
  } catch {
    return fallback;
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // 存档失败时仍允许继续游玩。
  }
}

/**
 * Grid 管理 5 行 9 列的可放置区域、鼠标悬停和格子占用查询。
 */
class Grid {
  constructor(config) {
    this.rows = config.rows;
    this.cols = config.cols;
    this.x = config.x;
    this.y = config.y;
    this.cellWidth = config.cellWidth;
    this.cellHeight = config.cellHeight;
    this.gap = config.gap;
    this.hoverCell = null;
  }

  get width() {
    return this.cols * this.cellWidth + (this.cols - 1) * this.gap;
  }

  get height() {
    return this.rows * this.cellHeight + (this.rows - 1) * this.gap;
  }

  getCellAt(x, y) {
    if (x < this.x || y < this.y || x > this.x + this.width || y > this.y + this.height) {
      return null;
    }

    const localX = x - this.x;
    const localY = y - this.y;
    const colSpan = this.cellWidth + this.gap;
    const rowSpan = this.cellHeight + this.gap;
    const col = Math.floor(localX / colSpan);
    const row = Math.floor(localY / rowSpan);
    const insideCellX = localX - col * colSpan <= this.cellWidth;
    const insideCellY = localY - row * rowSpan <= this.cellHeight;

    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols || !insideCellX || !insideCellY) {
      return null;
    }

    return { row, col };
  }

  getCellRect(row, col) {
    return {
      x: this.x + col * (this.cellWidth + this.gap),
      y: this.y + row * (this.cellHeight + this.gap),
      width: this.cellWidth,
      height: this.cellHeight,
      centerX: this.x + col * (this.cellWidth + this.gap) + this.cellWidth / 2,
      centerY: this.y + row * (this.cellHeight + this.gap) + this.cellHeight / 2
    };
  }

  updateHover(x, y) {
    this.hoverCell = this.getCellAt(x, y);
  }

  draw(context, game) {
    const theme = game.currentLevel.theme;
    context.save();
    context.fillStyle = "#132433";
    context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const grd = context.createLinearGradient(0, 0, GAME_WIDTH, GAME_HEIGHT);
    grd.addColorStop(0, theme.skyA);
    grd.addColorStop(0.45, theme.skyB);
    grd.addColorStop(1, theme.skyC);
    context.fillStyle = grd;
    context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.drawMoonlitBorder(context);
    this.drawGardenTexture(context, theme);

    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.cols; col += 1) {
        const rect = this.getCellRect(row, col);
        const isHovered = this.hoverCell && this.hoverCell.row === row && this.hoverCell.col === col;
        const occupied = game.getDefenderAt(row, col);
        const canPlace = game.selectedDefenderType && !occupied && game.resourceManager.canAfford(game.selectedDefenderType.cost);
        const canRemove = game.removeMode && occupied;

        const tileGradient = context.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
        tileGradient.addColorStop(0, row % 2 === 0 ? theme.tileA : theme.tileB);
        tileGradient.addColorStop(1, row % 2 === 0 ? "rgba(85, 145, 112, 0.32)" : "rgba(71, 118, 135, 0.3)");
        context.fillStyle = tileGradient;
        context.strokeStyle = "rgba(217, 255, 235, 0.28)";
        context.lineWidth = 1;
        context.beginPath();
        context.roundRect(rect.x, rect.y, rect.width, rect.height, 6);
        context.fill();
        context.stroke();

        context.fillStyle = "rgba(255, 255, 255, 0.06)";
        context.beginPath();
        context.roundRect(rect.x + 4, rect.y + 4, rect.width - 8, 16, 5);
        context.fill();

        context.strokeStyle = "rgba(11, 28, 31, 0.22)";
        context.beginPath();
        context.moveTo(rect.x + 10, rect.y + rect.height - 12);
        context.quadraticCurveTo(rect.x + rect.width * 0.5, rect.y + rect.height - 5, rect.x + rect.width - 10, rect.y + rect.height - 14);
        context.stroke();

        if ((row + col) % 3 === 0) {
          drawLeaf(context, rect.x + 18, rect.y + rect.height - 14, 4, 10, -0.55, "rgba(180, 238, 153, 0.42)");
          drawLeaf(context, rect.x + 26, rect.y + rect.height - 12, 4, 9, 0.55, "rgba(142, 217, 178, 0.36)");
        }

        if (isHovered) {
          const isValidAction = canPlace || canRemove;
          context.fillStyle = isValidAction ? "rgba(247, 212, 108, 0.25)" : "rgba(255, 111, 126, 0.2)";
          context.strokeStyle = isValidAction ? theme.accent : "#ff6f7e";
          context.lineWidth = 2;
          context.fillRect(rect.x, rect.y, rect.width, rect.height);
          context.strokeRect(rect.x + 1, rect.y + 1, rect.width - 2, rect.height - 2);
        }
      }
    }

    context.fillStyle = "rgba(7, 20, 27, 0.48)";
    context.fillRect(6, this.y, 110, this.height);
    context.strokeStyle = "rgba(247, 212, 108, 0.58)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(116, this.y);
    context.lineTo(116, this.y + this.height);
    context.stroke();
    context.fillStyle = "rgba(255, 243, 191, 0.86)";
    context.font = "700 12px Microsoft YaHei, sans-serif";
    context.fillText("守护核心", 36, this.y + 22);

    context.restore();
  }

  drawMoonlitBorder(context) {
    context.save();
    context.globalAlpha = 0.42;
    context.fillStyle = "#f6f0b7";
    context.beginPath();
    context.arc(850, 42, 24, 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = "destination-out";
    context.beginPath();
    context.arc(860, 36, 24, 0, Math.PI * 2);
    context.fill();
    context.restore();

    context.save();
    context.strokeStyle = "rgba(120, 244, 213, 0.08)";
    context.lineWidth = 1;
    for (let x = 0; x < GAME_WIDTH; x += 42) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x + 120, GAME_HEIGHT);
      context.stroke();
    }
    context.restore();
  }

  drawGardenTexture(context, theme) {
    context.save();
    context.globalAlpha = 0.35;
    for (let row = 0; row < this.rows; row += 1) {
      const y = this.y + row * (this.cellHeight + this.gap) - 4;
      const laneGradient = context.createLinearGradient(this.x, y, this.x + this.width, y);
      laneGradient.addColorStop(0, "rgba(255,255,255,0.03)");
      laneGradient.addColorStop(0.5, "rgba(255,255,255,0.08)");
      laneGradient.addColorStop(1, "rgba(255,255,255,0.02)");
      context.fillStyle = laneGradient;
      context.fillRect(this.x - 10, y, this.width + 20, this.cellHeight + 8);
    }

    context.globalAlpha = 0.22;
    context.strokeStyle = theme.accent;
    context.lineWidth = 1;
    for (let i = 0; i < 34; i += 1) {
      const x = 46 + ((i * 79) % 880);
      const y = 76 + ((i * 53) % 420);
      context.beginPath();
      context.moveTo(x, y);
      context.quadraticCurveTo(x + 8, y - 10, x + 16, y);
      context.stroke();
    }
    context.restore();
  }
}

/**
 * Resource 表示可点击收集的能量晶。既可来自自动掉落，也可来自生产单位。
 */
class Resource {
  constructor(x, y, value = 25, lifetime = 10) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.radius = 18;
    this.lifetime = lifetime;
    this.age = 0;
    this.collected = false;
    this.floatOffset = Math.random() * Math.PI * 2;
  }

  update(deltaTime) {
    this.age += deltaTime;
    if (this.age >= this.lifetime) {
      this.collected = true;
    }
  }

  contains(x, y) {
    return Math.hypot(this.x - x, this.y - y) <= this.radius + 6;
  }

  draw(context) {
    const bob = Math.sin(this.age * 3 + this.floatOffset) * 5;
    const appear = Math.min(1, this.age / 0.55);
    const popScale = 0.25 + appear * 0.75 + Math.sin(appear * Math.PI) * 0.24;
    const pulse = 1 + Math.sin(this.age * 5 + this.floatOffset) * 0.1;
    const fadeStart = Math.max(0, this.lifetime - 2);
    const fadeProgress = this.age > fadeStart ? (this.age - fadeStart) / 2 : 0;
    const alpha = Math.max(0.28, 1 - fadeProgress);
    const drawRadius = this.radius * popScale * pulse;
    const glowRadius = 46 * popScale;
    const ringRadius = 26 + Math.sin(this.age * 4 + this.floatOffset) * 4;
    const drawY = this.y + bob - (1 - appear) * 24;
    const burstRatio = Math.min(1, this.age / 0.8);

    context.save();
    context.globalAlpha = alpha;

    if (burstRatio < 1) {
      context.globalAlpha = alpha * (1 - burstRatio);
      context.strokeStyle = "rgba(247, 255, 249, 0.95)";
      context.lineWidth = 3;
      context.beginPath();
      context.arc(this.x, drawY, 12 + burstRatio * 42, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = alpha;
    }

    const glow = context.createRadialGradient(this.x, drawY, 3, this.x, drawY, glowRadius);
    glow.addColorStop(0, "rgba(120, 244, 213, 0.95)");
    glow.addColorStop(0.42, "rgba(120, 244, 213, 0.46)");
    glow.addColorStop(1, "rgba(120, 244, 213, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(this.x, drawY, glowRadius, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "rgba(247, 255, 249, 0.72)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(this.x, drawY, ringRadius * popScale, 0, Math.PI * 2);
    context.stroke();

    context.shadowColor = "#78f4d5";
    context.shadowBlur = 22;
    drawCrystal(context, this.x, drawY, drawRadius, "#78f4d5", "#f7fff9");

    context.shadowBlur = 0;
    context.fillStyle = "rgba(255, 255, 255, 0.82)";
    context.beginPath();
    context.arc(this.x - drawRadius * 0.34, drawY - drawRadius * 0.34, drawRadius * 0.28, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#12403e";
    context.font = "700 12px Microsoft YaHei, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(this.value, this.x, drawY + 1);
    context.restore();
  }
}

/**
 * Defender 表示玩家放置的防御单位，按角色字段决定攻击、生产或一次性爆炸行为。
 */
class Defender {
  constructor(type, row, col, rect) {
    this.type = type;
    this.row = row;
    this.col = col;
    this.x = rect.centerX;
    this.y = rect.centerY;
    this.width = rect.width * 0.75;
    this.height = rect.height * 0.75;
    this.hp = type.maxHp;
    this.maxHp = type.maxHp;
    this.attackTimer = 0;
    this.productionTimer = 0;
    this.supportTimer = 0;
    this.fuseTimer = 0;
    this.markedForRemoval = false;
    this.exploded = false;
    this.pulse = Math.random() * Math.PI * 2;
  }

  get left() {
    return this.x - this.width / 2;
  }

  get right() {
    return this.x + this.width / 2;
  }

  get top() {
    return this.y - this.height / 2;
  }

  get bottom() {
    return this.y + this.height / 2;
  }

  update(deltaTime, game) {
    this.pulse += deltaTime * 4;

    if (this.type.role === "producer") {
      this.productionTimer += deltaTime;
      if (this.productionTimer >= this.type.productionInterval) {
        this.productionTimer = 0;
        game.resourceManager.spawnResource(
          this.x + (Math.random() * 24 - 12),
          this.y - 26,
          this.type.productionValue
        );
      }
    }

    if (this.type.role === "bomb") {
      this.fuseTimer += deltaTime;
      if (this.fuseTimer >= this.type.fuseTime && !this.exploded) {
        this.exploded = true;
        this.explode(game);
        this.markedForRemoval = true;
      }
      return;
    }

    if (this.type.role === "trap") {
      const target = game.enemies.find((enemy) => (
        enemy.row === this.row
        && !enemy.markedForRemoval
        && enemy.left <= this.right + 10
        && enemy.right >= this.left - 10
      ));

      if (target) {
        target.takeDamage(this.type.damage, game);
        target.applySlow(this.type.rootAmount, this.type.rootDuration);
        game.createExplosion(this.x, this.y, 72);
        game.createFloatingText(this.x, this.y - 28, "缠绕", "#dfffee");
        this.markedForRemoval = true;
      }
      return;
    }
    if (this.type.role === "beacon") {
      this.supportTimer += deltaTime;
      if (this.supportTimer >= this.type.supportInterval) {
        this.supportTimer = 0;
        game.healDefendersInRow(this);
      }
      return;
    }

    if (this.type.damage <= 0) {
      return;
    }

    this.attackTimer += deltaTime;
    const attackInterval = this.type.attackInterval * game.getAttackIntervalMultiplier(this);
    if (this.attackTimer >= attackInterval && game.hasEnemyInLane(this.row, this.x)) {
      this.attackTimer = 0;
      game.projectiles.push(new Projectile({
        x: this.x + 28,
        y: this.y - 2,
        row: this.row,
        damage: this.type.damage,
        speed: this.type.projectileSpeed,
        color: this.type.projectileColor,
        pierceHits: this.type.pierceHits || 1,
        slowAmount: this.type.slowAmount || 0,
        slowDuration: this.type.slowDuration || 0
      }));
    }
  }

  explode(game) {
    game.createExplosion(this.x, this.y, this.type.radius);
    game.enemies.forEach((enemy) => {
      const sameOrNearLane = Math.abs(enemy.row - this.row) <= 1;
      const distance = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (sameOrNearLane && distance <= this.type.radius) {
        enemy.takeDamage(this.type.damage, game);
      }
    });
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.markedForRemoval = true;
    }
  }

  draw(context) {
    context.save();
    this.drawBaseShadow(context);

    if (this.type.role === "shooter") {
      this.drawShooter(context);
    } else if (this.type.role === "producer") {
      this.drawProducer(context);
    } else if (this.type.role === "wall") {
      this.drawWall(context);
    } else if (this.type.role === "slower") {
      this.drawFrostBell(context);
    } else if (this.type.role === "bomb") {
      this.drawBomb(context);
    } else if (this.type.role === "piercer") {
      this.drawPrism(context);
    } else if (this.type.role === "trap") {
      this.drawTrap(context);
    } else if (this.type.role === "beacon") {
      this.drawBeacon(context);
    }

    this.drawHpBar(context);
    context.restore();
  }

  drawBaseShadow(context) {
    context.fillStyle = "rgba(0, 0, 0, 0.22)";
    context.beginPath();
    context.ellipse(this.x, this.y + 28, this.width * 0.42, 10, 0, 0, Math.PI * 2);
    context.fill();
  }

  drawShooter(context) {
    drawLeaf(context, this.x - 18, this.y + 16, 11, 23, -0.82, "#55b86f");
    drawLeaf(context, this.x + 4, this.y + 18, 10, 22, 0.72, "#64c987");

    context.fillStyle = "#3d8f5d";
    context.beginPath();
    context.roundRect(this.x - 9, this.y - 4, 18, 32, 8);
    context.fill();

    const headGlow = context.createRadialGradient(this.x + 4, this.y - 9, 2, this.x + 4, this.y - 9, 34);
    headGlow.addColorStop(0, "rgba(246, 246, 138, 0.78)");
    headGlow.addColorStop(1, "rgba(126, 232, 167, 0)");
    context.fillStyle = headGlow;
    context.beginPath();
    context.arc(this.x + 4, this.y - 9, 34, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = this.type.color;
    context.beginPath();
    context.arc(this.x - 1, this.y - 8, 25, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#d8ffe7";
    context.lineWidth = 3;
    context.stroke();

    context.fillStyle = "#d8ffe7";
    context.beginPath();
    context.arc(this.x + 10, this.y - 12, 12, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#f6f68a";
    context.beginPath();
    context.roundRect(this.x + 14, this.y - 17, 30, 12, 6);
    context.fill();
    context.fillStyle = "#315442";
    context.beginPath();
    context.arc(this.x + 5, this.y - 13, 3, 0, Math.PI * 2);
    context.fill();
  }

  drawProducer(context) {
    const glow = context.createRadialGradient(this.x, this.y, 4, this.x, this.y, 36);
    glow.addColorStop(0, "rgba(120, 244, 213, 0.75)");
    glow.addColorStop(1, "rgba(120, 244, 213, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(this.x, this.y, 38, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#39a57d";
    context.beginPath();
    context.ellipse(this.x - 12, this.y + 12, 18, 10, -0.45, 0, Math.PI * 2);
    context.ellipse(this.x + 12, this.y + 12, 18, 10, 0.45, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = this.type.color;
    for (let i = 0; i < 6; i += 1) {
      const angle = (Math.PI * 2 * i) / 6 + Math.sin(this.pulse) * 0.05;
      context.beginPath();
      context.ellipse(
        this.x + Math.cos(angle) * 14,
        this.y + Math.sin(angle) * 14,
        10,
        17,
        angle,
        0,
        Math.PI * 2
      );
      context.fill();
    }

    context.fillStyle = "#f8ffe4";
    context.beginPath();
    context.arc(this.x, this.y, 12, 0, Math.PI * 2);
    context.fill();
  }

  drawWall(context) {
    context.fillStyle = "#7c6144";
    context.beginPath();
    context.ellipse(this.x, this.y + 12, 28, 24, 0, Math.PI, 0);
    context.fill();

    context.fillStyle = this.type.color;
    context.beginPath();
    context.roundRect(this.x - 33, this.y - 27, 66, 54, 18);
    context.fill();
    context.strokeStyle = "#fff0c2";
    context.lineWidth = 2;
    context.stroke();

    context.strokeStyle = "#8b6c48";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(this.x - 22, this.y - 9);
    context.bezierCurveTo(this.x - 10, this.y - 15, this.x + 8, this.y - 13, this.x + 22, this.y - 8);
    context.moveTo(this.x - 18, this.y + 10);
    context.bezierCurveTo(this.x - 6, this.y + 15, this.x + 8, this.y + 14, this.x + 18, this.y + 9);
    context.stroke();

    context.fillStyle = "rgba(255,255,255,0.32)";
    context.beginPath();
    context.ellipse(this.x - 13, this.y - 15, 8, 5, -0.5, 0, Math.PI * 2);
    context.fill();
  }

  drawFrostBell(context) {
    drawLeaf(context, this.x - 18, this.y + 16, 10, 18, -0.7, "#6fa7d9");
    drawLeaf(context, this.x + 18, this.y + 16, 10, 18, 0.7, "#6fa7d9");

    context.fillStyle = this.type.color;
    context.beginPath();
    context.moveTo(this.x, this.y - 30);
    context.quadraticCurveTo(this.x + 28, this.y - 18, this.x + 24, this.y + 18);
    context.lineTo(this.x - 24, this.y + 18);
    context.quadraticCurveTo(this.x - 28, this.y - 18, this.x, this.y - 30);
    context.fill();
    context.strokeStyle = "#eefbff";
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = "#dff6ff";
    context.beginPath();
    context.arc(this.x, this.y + 12, 8, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#eefbff";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(this.x + 15, this.y - 2);
    context.lineTo(this.x + 38, this.y - 2);
    context.stroke();

    drawSparkStar(context, this.x - 18, this.y - 16, 5, "#dff6ff");
    drawSparkStar(context, this.x + 20, this.y - 18, 4, "#dff6ff");
  }

  drawBomb(context) {
    const ratio = Math.min(1, this.fuseTimer / this.type.fuseTime);
    context.fillStyle = this.type.color;
    context.beginPath();
    context.arc(this.x, this.y, 25 + Math.sin(this.pulse * 2) * 2, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#ffd2a6";
    context.lineWidth = 3;
    context.stroke();

    context.fillStyle = "#fff0b8";
    context.beginPath();
    context.arc(this.x - 8, this.y - 8, 7, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "rgba(120, 45, 35, 0.5)";
    context.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      const a = i * Math.PI * 0.5 + this.pulse * 0.1;
      context.beginPath();
      context.moveTo(this.x + Math.cos(a) * 8, this.y + Math.sin(a) * 8);
      context.lineTo(this.x + Math.cos(a) * 22, this.y + Math.sin(a) * 22);
      context.stroke();
    }

    context.strokeStyle = "#ffd27b";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(this.x, this.y, 34, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
    context.stroke();
  }

  drawPrism(context) {
    const spin = this.pulse * 0.6;
    const prismGlow = context.createRadialGradient(this.x, this.y, 4, this.x, this.y, 46);
    prismGlow.addColorStop(0, "rgba(255, 214, 255, 0.48)");
    prismGlow.addColorStop(1, "rgba(215, 167, 255, 0)");
    context.fillStyle = prismGlow;
    context.beginPath();
    context.arc(this.x, this.y, 46, 0, Math.PI * 2);
    context.fill();

    context.save();
    context.translate(this.x, this.y);
    context.rotate(spin);
    context.fillStyle = this.type.color;
    context.beginPath();
    context.moveTo(0, -30);
    context.lineTo(26, 0);
    context.lineTo(0, 30);
    context.lineTo(-26, 0);
    context.closePath();
    context.fill();
    context.strokeStyle = "#fff6ff";
    context.lineWidth = 3;
    context.stroke();

    context.fillStyle = "rgba(255,255,255,0.36)";
    context.beginPath();
    context.moveTo(0, -24);
    context.lineTo(10, 0);
    context.lineTo(0, 18);
    context.lineTo(-8, 0);
    context.closePath();
    context.fill();
    context.restore();

    context.fillStyle = "#fff6ff";
    context.beginPath();
    context.arc(this.x, this.y, 11, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#ffd6ff";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(this.x + 15, this.y);
    context.lineTo(this.x + 40, this.y);
    context.stroke();
  }

  drawTrap(context) {
    context.fillStyle = "rgba(30, 82, 48, 0.35)";
    context.beginPath();
    context.ellipse(this.x, this.y + 13, 34, 16, 0, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "rgba(216, 255, 214, 0.85)";
    context.lineWidth = 4;
    context.beginPath();
    context.arc(this.x, this.y + 8, 24 + Math.sin(this.pulse) * 2, 0, Math.PI * 2);
    context.stroke();

    context.fillStyle = this.type.color;
    for (let i = 0; i < 5; i += 1) {
      const angle = -Math.PI * 0.15 + i * Math.PI * 0.18;
      context.beginPath();
      context.ellipse(
        this.x + Math.cos(angle) * 16,
        this.y + 8 + Math.sin(angle) * 8,
        8,
        18,
        angle,
        0,
        Math.PI * 2
      );
      context.fill();
    }

    context.fillStyle = "#f7fff9";
    context.beginPath();
    context.arc(this.x, this.y + 4, 8, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#77d46f";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(this.x, this.y + 4, 15 + Math.sin(this.pulse * 1.4) * 3, 0, Math.PI * 2);
    context.stroke();
  }

  drawBeacon(context) {
    const glow = context.createRadialGradient(this.x, this.y, 4, this.x, this.y, 42);
    glow.addColorStop(0, "rgba(247, 212, 108, 0.62)");
    glow.addColorStop(1, "rgba(247, 212, 108, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(this.x, this.y, 42, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#725d34";
    context.fillRect(this.x - 9, this.y - 4, 18, 34);

    context.fillStyle = this.type.color;
    context.beginPath();
    context.roundRect(this.x - 22, this.y - 30, 44, 34, 8);
    context.fill();
    context.strokeStyle = "#fff3bf";
    context.lineWidth = 2;
    context.stroke();

    context.strokeStyle = "#fff3bf";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(this.x, this.y - 13, 13 + Math.sin(this.pulse) * 2, 0, Math.PI * 2);
    context.stroke();

    context.fillStyle = "#fff7d2";
    context.beginPath();
    context.arc(this.x, this.y - 13, 8, 0, Math.PI * 2);
    context.fill();
  }

  drawHpBar(context) {
    if (this.hp >= this.maxHp) {
      return;
    }

    const w = 46;
    const h = 5;
    const x = this.x - w / 2;
    const y = this.y - 42;
    context.fillStyle = "rgba(0, 0, 0, 0.45)";
    context.fillRect(x, y, w, h);
    context.fillStyle = "#78f4d5";
    context.fillRect(x, y, w * Math.max(0, this.hp / this.maxHp), h);
  }
}

/**
 * Projectile 负责直线飞行、与同一路线敌人的碰撞和命中特效。
 */
class Projectile {
  constructor({ x, y, row, damage, speed, color, pierceHits, slowAmount, slowDuration }) {
    this.x = x;
    this.y = y;
    this.row = row;
    this.damage = damage;
    this.speed = speed;
    this.color = color;
    this.hitsRemaining = pierceHits || 1;
    this.hitEnemies = new Set();
    this.trail = [];
    this.slowAmount = slowAmount;
    this.slowDuration = slowDuration;
    this.radius = 7;
    this.markedForRemoval = false;
  }

  update(deltaTime, game) {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) {
      this.trail.shift();
    }
    this.x += this.speed * deltaTime;

    const target = game.enemies.find((enemy) => (
      enemy.row === this.row
      && !enemy.markedForRemoval
      && !this.hitEnemies.has(enemy)
      && this.x + this.radius >= enemy.left
      && this.x - this.radius <= enemy.right
      && Math.abs(this.y - enemy.y) < enemy.height / 2 + this.radius
    ));

    if (target) {
      this.hitEnemies.add(target);
      target.takeDamage(this.damage, game);
      if (this.slowAmount > 0) {
        target.applySlow(this.slowAmount, this.slowDuration);
      }
      game.createSpark(this.x, this.y, this.color);
      this.hitsRemaining -= 1;
      if (this.hitsRemaining <= 0) {
        this.markedForRemoval = true;
      }
    }

    if (this.x > GAME_WIDTH + 30) {
      this.markedForRemoval = true;
    }
  }

  draw(context) {
    context.save();
    for (let i = 0; i < this.trail.length; i += 1) {
      const point = this.trail[i];
      const alpha = (i + 1) / this.trail.length;
      context.globalAlpha = alpha * 0.36;
      context.fillStyle = this.color;
      context.beginPath();
      context.arc(point.x, point.y, this.radius * alpha, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    context.fillStyle = this.color;
    context.shadowColor = this.color;
    context.shadowBlur = 18;
    if (this.hitEnemies.size > 0 || this.hitsRemaining > 1) {
      context.beginPath();
      context.ellipse(this.x, this.y, this.radius + 5, this.radius, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#fff6ff";
      context.beginPath();
      context.arc(this.x + 2, this.y, 3, 0, Math.PI * 2);
      context.fill();
    } else {
      context.beginPath();
      context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
}

/**
 * Enemy 表示右侧入侵者，负责移动、攻击阻挡单位、受伤和减速状态。
 */
class Enemy {
  constructor(type, row, spawnX, laneY) {
    this.type = type;
    this.name = type.name;
    this.row = row;
    this.x = spawnX;
    this.y = laneY;
    this.width = type.isBoss ? 72 : 54;
    this.height = type.isBoss ? 70 : 58;
    this.maxHp = type.maxHp;
    this.hp = type.maxHp;
    this.baseSpeed = type.speed;
    this.attack = type.attack;
    this.attackInterval = type.attackInterval;
    this.attackTimer = 0;
    this.specialTimer = 0;
    this.slowTimer = 0;
    this.slowAmount = 0;
    this.shieldHp = type.shieldHp || 0;
    this.maxShieldHp = type.shieldHp || 0;
    this.hasSplit = false;
    this.markedForRemoval = false;
    this.reachedBase = false;
    this.step = Math.random() * Math.PI * 2;
  }

  get left() {
    return this.x - this.width / 2;
  }

  get right() {
    return this.x + this.width / 2;
  }

  get top() {
    return this.y - this.height / 2;
  }

  get bottom() {
    return this.y + this.height / 2;
  }

  update(deltaTime, game) {
    this.step += deltaTime * 6;
    if (this.slowTimer > 0) {
      this.slowTimer -= deltaTime;
      if (this.slowTimer <= 0) {
        this.slowAmount = 0;
      }
    }

    this.updateSpecial(deltaTime, game);

    const blocker = game.findBlockingDefender(this);
    if (blocker) {
      this.attackTimer += deltaTime;
      if (this.attackTimer >= this.attackInterval) {
        this.attackTimer = 0;
        blocker.takeDamage(this.attack);
        game.createSpark(blocker.x, blocker.y, "#ffb39d");
      }
      return;
    }

    this.attackTimer = this.attackInterval * 0.65;
    const currentSpeed = this.baseSpeed * (1 - this.slowAmount);
    this.x -= currentSpeed * deltaTime;

    if (this.left <= 4) {
      this.reachedBase = true;
      this.markedForRemoval = true;
      game.loseGame();
    }
  }

  updateSpecial(deltaTime, game) {
    if (this.type.role !== "mender") {
      return;
    }

    this.specialTimer += deltaTime;
    if (this.specialTimer < this.type.healInterval) {
      return;
    }

    this.specialTimer = 0;
    const targets = game.enemies.filter((enemy) => (
      enemy.row === this.row
      && !enemy.markedForRemoval
      && enemy.hp < enemy.maxHp
      && Math.abs(enemy.x - this.x) <= this.type.healRadius
    ));

    targets.forEach((enemy) => {
      enemy.heal(this.type.healAmount);
      game.createSpark(enemy.x, enemy.y - 18, this.type.accent);
    });

    if (targets.length > 0) {
      game.createFloatingText(this.x, this.y - 34, "修复", "#dfffee");
    }
  }

  takeDamage(amount, game = null) {
    let remainingDamage = amount;
    if (this.shieldHp > 0) {
      const blocked = Math.min(this.shieldHp, remainingDamage);
      this.shieldHp -= blocked;
      remainingDamage -= blocked;
      if (game) {
        game.createSpark(this.x, this.y - 8, "#9ddcff");
      }
    }

    if (remainingDamage <= 0) {
      return;
    }

    this.hp -= remainingDamage;
    if (this.hp <= 0) {
      if (game && this.type.splitInto && !this.hasSplit) {
        this.hasSplit = true;
        this.spawnSplitChildren(game);
      }
      this.markedForRemoval = true;
    }
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  spawnSplitChildren(game) {
    const split = this.type.splitInto;
    const childType = ENEMY_TYPES[split.type];
    if (!childType) {
      return;
    }

    for (let i = 0; i < split.count; i += 1) {
      const offset = (i - (split.count - 1) / 2) * split.xSpread;
      const child = new Enemy(childType, this.row, this.x + offset, this.y);
      child.hp = Math.max(30, Math.floor(child.maxHp * split.hpScale));
      game.enemies.push(child);
    }

    game.createExplosion(this.x, this.y, 58);
    game.createFloatingText(this.x, this.y - 34, "分裂", "#ffd6ff");
  }

  applySlow(amount, duration) {
    this.slowAmount = Math.max(this.slowAmount, amount);
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  draw(context) {
    context.save();
    context.translate(this.x, this.y + Math.sin(this.step) * 1.5);

    context.fillStyle = "rgba(0, 0, 0, 0.28)";
    context.beginPath();
    context.ellipse(0, this.height / 2 - 2, this.width * 0.45, 10, 0, 0, Math.PI * 2);
    context.fill();

    if (this.type.isBoss) {
      this.drawBoss(context);
    } else if (this.type.role === "mender") {
      this.drawMender(context);
    } else if (this.type.role === "shield") {
      this.drawShieldbearer(context);
    } else if (this.type.role === "splitter") {
      this.drawSplitter(context);
    } else {
      this.drawCommon(context);
    }

    if (this.slowTimer > 0) {
      context.strokeStyle = "rgba(157, 220, 255, 0.95)";
      context.lineWidth = 3;
      context.beginPath();
      context.arc(0, -2, this.width * 0.56, 0, Math.PI * 2);
      context.stroke();
    }

    this.drawHpBar(context);
    context.restore();
  }

  drawCommon(context) {
    if (this.type.id === "runner") {
      this.drawRunner(context);
      return;
    }
    if (this.type.id === "helmet") {
      this.drawHelmet(context);
      return;
    }
    if (this.type.id === "crusher") {
      this.drawCrusher(context);
      return;
    }

    context.fillStyle = this.type.color;
    context.beginPath();
    context.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 14);
    context.fill();

    context.fillStyle = "rgba(40, 48, 58, 0.55)";
    context.beginPath();
    context.moveTo(-this.width / 2 + 8, -20);
    context.quadraticCurveTo(-30, -34, -12, -29);
    context.quadraticCurveTo(0, -44, 13, -28);
    context.quadraticCurveTo(30, -35, this.width / 2 - 8, -18);
    context.closePath();
    context.fill();

    context.fillStyle = this.type.accent;
    context.fillRect(-this.width / 2 + 8, -this.height / 2 + 8, this.width - 16, 8);

    context.fillStyle = "#10151d";
    context.beginPath();
    context.arc(-8, -4, 4, 0, Math.PI * 2);
    context.arc(10, -4, 4, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "rgba(0, 0, 0, 0.4)";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(-10, 14);
    context.lineTo(12, 14);
    context.stroke();
  }

  drawHelmet(context) {
    context.fillStyle = this.type.color;
    context.beginPath();
    context.roundRect(-27, -26, 54, 56, 10);
    context.fill();

    context.fillStyle = this.type.accent;
    context.beginPath();
    context.roundRect(-24, -30, 48, 24, 8);
    context.fill();
    context.strokeStyle = "#d9e3ef";
    context.lineWidth = 3;
    context.stroke();

    context.fillStyle = "#10151d";
    context.beginPath();
    context.arc(-9, 2, 4, 0, Math.PI * 2);
    context.arc(10, 2, 4, 0, Math.PI * 2);
    context.fill();
  }

  drawRunner(context) {
    context.fillStyle = "rgba(144, 93, 209, 0.2)";
    context.beginPath();
    context.ellipse(14, 7, 26, 21, 0.2, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = this.type.color;
    context.beginPath();
    context.ellipse(0, 0, 23, 28, -0.12, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = this.type.accent;
    context.beginPath();
    context.moveTo(-18, -26);
    context.lineTo(0, -44);
    context.lineTo(18, -26);
    context.closePath();
    context.fill();

    context.strokeStyle = "#d2b5ff";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(-17, 24);
    context.lineTo(-31, 35);
    context.moveTo(13, 24);
    context.lineTo(31, 34);
    context.stroke();

    context.fillStyle = "#10151d";
    context.beginPath();
    context.arc(-7, -3, 4, 0, Math.PI * 2);
    context.arc(9, -3, 4, 0, Math.PI * 2);
    context.fill();
  }

  drawCrusher(context) {
    context.fillStyle = this.type.color;
    context.beginPath();
    context.roundRect(-32, -29, 64, 62, 12);
    context.fill();

    context.fillStyle = "#6f3e35";
    context.beginPath();
    context.moveTo(-28, -18);
    context.lineTo(-8, -34);
    context.lineTo(4, -18);
    context.lineTo(20, -34);
    context.lineTo(31, -12);
    context.lineTo(22, 25);
    context.lineTo(-22, 25);
    context.closePath();
    context.fill();

    context.fillStyle = this.type.accent;
    context.fillRect(-22, -10, 44, 8);

    context.fillStyle = "#10151d";
    context.beginPath();
    context.arc(-10, 4, 4, 0, Math.PI * 2);
    context.arc(12, 4, 4, 0, Math.PI * 2);
    context.fill();
  }

  drawMender(context) {
    const aura = context.createRadialGradient(0, -8, 4, 0, -8, 42);
    aura.addColorStop(0, "rgba(120, 244, 213, 0.35)");
    aura.addColorStop(1, "rgba(120, 244, 213, 0)");
    context.fillStyle = aura;
    context.beginPath();
    context.arc(0, -8, 42, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = this.type.color;
    context.beginPath();
    context.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 10);
    context.fill();
    context.strokeStyle = "rgba(223, 255, 238, 0.4)";
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = this.type.accent;
    context.beginPath();
    context.arc(0, -12, 15 + Math.sin(this.step) * 2, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#dfffee";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-12, -12);
    context.lineTo(12, -12);
    context.moveTo(0, -24);
    context.lineTo(0, 0);
    context.stroke();

    context.fillStyle = "#10151d";
    context.beginPath();
    context.arc(-10, 8, 4, 0, Math.PI * 2);
    context.arc(10, 8, 4, 0, Math.PI * 2);
    context.fill();
  }

  drawShieldbearer(context) {
    context.fillStyle = this.type.color;
    context.beginPath();
    context.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 8);
    context.fill();

    context.fillStyle = this.type.accent;
    context.beginPath();
    context.moveTo(0, -25);
    context.lineTo(24, -10);
    context.lineTo(16, 24);
    context.lineTo(0, 32);
    context.lineTo(-16, 24);
    context.lineTo(-24, -10);
    context.closePath();
    context.fill();
    context.strokeStyle = "#dff6ff";
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = "#10151d";
    context.beginPath();
    context.arc(-9, -4, 4, 0, Math.PI * 2);
    context.arc(9, -4, 4, 0, Math.PI * 2);
    context.fill();

    if (this.shieldHp > 0) {
      context.fillStyle = "rgba(157, 220, 255, 0.12)";
      context.beginPath();
      context.arc(0, 0, 36, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(157, 220, 255, 0.9)";
      context.lineWidth = 4;
      context.beginPath();
      context.arc(0, 0, 34, -Math.PI / 2, -Math.PI / 2 + (this.shieldHp / this.maxShieldHp) * Math.PI * 2);
      context.stroke();
    }
  }

  drawSplitter(context) {
    const wobble = Math.sin(this.step) * 2;
    context.fillStyle = this.type.color;
    context.beginPath();
    context.ellipse(0, wobble * 0.4, 29 + wobble, 27 - wobble * 0.3, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255, 214, 255, 0.42)";
    context.lineWidth = 2;
    context.stroke();

    context.strokeStyle = this.type.accent;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(0, -24);
    context.bezierCurveTo(-8, -8, 10, 8, 0, 25);
    context.stroke();

    context.fillStyle = "#ffd6ff";
    context.beginPath();
    context.arc(-10, -4, 4, 0, Math.PI * 2);
    context.arc(12, -3, 4, 0, Math.PI * 2);
    context.fill();
    drawSparkStar(context, -18, -18, 4, "rgba(255, 214, 255, 0.8)");
    drawSparkStar(context, 19, 15, 3, "rgba(255, 214, 255, 0.75)");
  }

  drawBoss(context) {
    const bossAura = context.createRadialGradient(0, 0, 8, 0, 0, 58);
    bossAura.addColorStop(0, "rgba(242, 212, 121, 0.18)");
    bossAura.addColorStop(1, "rgba(45, 31, 71, 0)");
    context.fillStyle = bossAura;
    context.beginPath();
    context.arc(0, 0, 58, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = this.type.color;
    context.beginPath();
    context.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 14);
    context.fill();
    context.strokeStyle = "rgba(242, 212, 121, 0.45)";
    context.lineWidth = 3;
    context.stroke();

    context.fillStyle = this.type.accent;
    context.beginPath();
    context.moveTo(-30, -30);
    context.lineTo(-12, -48);
    context.lineTo(-4, -30);
    context.lineTo(8, -50);
    context.lineTo(28, -30);
    context.closePath();
    context.fill();

    context.fillStyle = "#f2d479";
    context.beginPath();
    context.arc(-12, -6, 5, 0, Math.PI * 2);
    context.arc(14, -6, 5, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#120d1e";
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(-18, 18);
    context.lineTo(20, 18);
    context.stroke();
  }

  drawHpBar(context) {
    const w = this.type.isBoss ? 78 : 52;
    const h = this.type.isBoss ? 7 : 5;
    const x = -w / 2;
    const y = -this.height / 2 - 14;
    context.fillStyle = "rgba(0, 0, 0, 0.5)";
    context.fillRect(x, y, w, h);
    context.fillStyle = this.type.isBoss ? "#f7d46c" : "#ff6f7e";
    context.fillRect(x, y, w * Math.max(0, this.hp / this.maxHp), h);

    if (this.maxShieldHp > 0 && this.shieldHp > 0) {
      context.fillStyle = "#9ddcff";
      context.fillRect(x, y + h + 2, w * Math.max(0, this.shieldHp / this.maxShieldHp), 3);
    }
  }
}

/**
 * WaveManager 调度 10 个波次，并在波次结束后进入短暂间隔。
 */
class WaveManager {
  constructor(waves, enemyTypes, grid) {
    this.waves = waves;
    this.enemyTypes = enemyTypes;
    this.grid = grid;
    this.reset();
  }

  setWaves(waves) {
    this.waves = waves;
    this.reset();
  }

  reset() {
    this.currentWaveIndex = 0;
    this.waveStarted = false;
    this.waitingForClear = false;
    this.betweenWaveTimer = this.waves[0]?.delay || 0;
    this.spawnTasks = [];
    this.allWavesSpawned = false;
  }

  get currentWaveNumber() {
    return Math.min(this.currentWaveIndex + 1, this.waves.length);
  }

  get totalWaves() {
    return this.waves.length;
  }

  update(deltaTime, game) {
    if (this.allWavesSpawned) {
      return;
    }

    if (this.waitingForClear) {
      if (game.enemies.length === 0) {
        this.finishCurrentWave();
      }
      return;
    }

    if (!this.waveStarted) {
      this.betweenWaveTimer -= deltaTime;
      if (this.betweenWaveTimer <= 0) {
        this.startWave();
      }
      return;
    }

    this.spawnTasks.forEach((task) => {
      task.timer -= deltaTime;
      while (task.remaining > 0 && task.timer <= 0) {
        this.spawnEnemy(task.type, game);
        task.remaining -= 1;
        task.timer += task.every;
      }
    });

    this.spawnTasks = this.spawnTasks.filter((task) => task.remaining > 0);

    if (this.spawnTasks.length === 0) {
      this.waveStarted = false;
      this.waitingForClear = true;
    }
  }

  finishCurrentWave() {
    this.waitingForClear = false;
    this.currentWaveIndex += 1;

    if (this.currentWaveIndex >= this.waves.length) {
      this.allWavesSpawned = true;
    } else {
      this.betweenWaveTimer = this.waves[this.currentWaveIndex].delay;
    }
  }

  startWave() {
    const wave = this.waves[this.currentWaveIndex];
    this.waveStarted = true;
    this.spawnTasks = wave.spawns.map((spawn, index) => ({
      type: spawn.type,
      remaining: spawn.count,
      every: spawn.every,
      timer: (spawn.at || 0) + index * 0.65
    }));
  }

  spawnEnemy(typeId, game) {
    const enemyType = this.enemyTypes[typeId];
    const row = Math.floor(Math.random() * this.grid.rows);
    const rect = this.grid.getCellRect(row, this.grid.cols - 1);
    const enemy = new Enemy(enemyType, row, GAME_WIDTH + 48, rect.centerY);
    game.enemies.push(enemy);
  }
}

/**
 * UIManager 负责 DOM 卡片、资源显示、暂停重开按钮和胜负浮层。
 */
class UIManager {
  constructor(game) {
    this.game = game;
    this.cardButtons = new Map();
    this.createUnitCards();
    this.bindControls();
  }

  createUnitCards() {
    cardBarEl.innerHTML = "";
    DEFENDER_TYPES.forEach((type) => {
      const button = document.createElement("button");
      button.className = "unit-card";
      button.type = "button";
      button.dataset.unitId = type.id;
      button.title = `${type.name} · ${type.effectText} · ${type.cost} 能量晶`;
      button.setAttribute("aria-label", `${type.name}，${type.effectText}，消耗 ${type.cost} 能量晶`);
      button.innerHTML = `
        <span class="cooldown-fill"></span>
        <span class="unit-portrait">
          <canvas class="unit-icon" width="96" height="96" aria-hidden="true"></canvas>
          <span class="unit-cost"><span class="crystal-gem" aria-hidden="true"></span>${type.cost}</span>
        </span>
        <span class="unit-info">
          <span class="unit-name">${type.name}</span>
          <span class="unit-effect">${type.effectText}</span>
          <span class="unit-status">可放置</span>
        </span>
      `;

      this.drawUnitCardIcon(type, button.querySelector(".unit-icon"));

      button.addEventListener("click", () => {
        if (!this.game.canSelectDefender(type)) {
          return;
        }
        this.game.removeMode = false;
        this.game.selectDefender(type.id);
      });

      cardBarEl.appendChild(button);
      this.cardButtons.set(type.id, button);
    });
  }

  bindControls() {
    collectButtonEl.addEventListener("click", () => this.game.collectAllResources());
    pauseButtonEl.addEventListener("click", () => this.game.togglePause());
    removeButtonEl.addEventListener("click", () => this.game.toggleRemoveMode());
    menuButtonEl.addEventListener("click", () => this.game.openStartMenu());
    restartButtonEl.addEventListener("click", () => this.game.restart());
    overlayRestartButtonEl.addEventListener("click", () => this.game.restart());
    overlayNextButtonEl.addEventListener("click", () => this.game.startNextLevel());
    overlayMenuButtonEl.addEventListener("click", () => this.game.openLevelSelect());
    continueButtonEl.addEventListener("click", () => this.game.startHighestUnlockedLevel());
    openLevelSelectButtonEl.addEventListener("click", () => this.showLevelSelect());
    backToStartButtonEl.addEventListener("click", () => this.showStartMenu());
  }

  drawUnitCardIcon(type, iconCanvas) {
    if (!iconCanvas) {
      return;
    }

    const iconContext = iconCanvas.getContext("2d");
    const width = iconCanvas.width;
    const height = iconCanvas.height;
    const background = iconContext.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, "#354b5f");
    background.addColorStop(0.55, "#1f3440");
    background.addColorStop(1, "#17232d");
    iconContext.fillStyle = background;
    iconContext.fillRect(0, 0, width, height);

    const aura = iconContext.createRadialGradient(width * 0.46, height * 0.4, 4, width * 0.5, height * 0.5, width * 0.55);
    aura.addColorStop(0, `${type.color}b8`);
    aura.addColorStop(0.45, `${type.color}36`);
    aura.addColorStop(1, `${type.color}00`);
    iconContext.fillStyle = aura;
    iconContext.fillRect(0, 0, width, height);

    iconContext.globalAlpha = 0.72;
    drawSparkStar(iconContext, 17, 18, 4, "#ffffff");
    drawSparkStar(iconContext, 79, 23, 3, type.color);
    iconContext.globalAlpha = 1;

    const iconDefender = new Defender(type, -1, -1, {
      centerX: 0,
      centerY: 0,
      width: GRID_CONFIG.cellWidth,
      height: GRID_CONFIG.cellHeight
    });
    iconDefender.pulse = 1.1;
    iconDefender.fuseTimer = type.fuseTime ? type.fuseTime * 0.42 : 0;

    iconContext.save();
    iconContext.translate(width / 2, height / 2 + 3);
    iconContext.scale(0.9, 0.9);
    iconDefender.draw(iconContext);
    iconContext.restore();

    const sheen = iconContext.createLinearGradient(0, 0, width, height);
    sheen.addColorStop(0, "rgba(255,255,255,0.2)");
    sheen.addColorStop(0.32, "rgba(255,255,255,0)");
    sheen.addColorStop(1, "rgba(255,255,255,0.04)");
    iconContext.fillStyle = sheen;
    iconContext.fillRect(0, 0, width, height);
  }

  update() {
    crystalCountEl.textContent = Math.floor(this.game.resourceManager.crystals);
    waveLabelEl.textContent = `${this.game.waveManager.currentWaveNumber} / ${this.game.waveManager.totalWaves}`;
    levelLabelEl.textContent = `${this.game.currentLevel.number} / ${LEVELS.length}`;
    pauseButtonEl.textContent = this.game.state === STATE.PAUSED ? "继续" : "暂停";
    pauseButtonEl.disabled = this.game.state !== STATE.RUNNING && this.game.state !== STATE.PAUSED;
    pauseButtonEl.classList.toggle("active", this.game.state === STATE.PAUSED);
    restartButtonEl.disabled = this.game.state === STATE.READY;
    menuButtonEl.disabled = false;
    const collectableCount = this.game.resourceManager.getCollectableCount();
    collectButtonEl.disabled = this.game.state !== STATE.RUNNING
      || this.game.guardianRelic.casting
      || collectableCount === 0;
    collectButtonEl.dataset.tooltip = collectableCount > 0
      ? `一键收集 ${collectableCount} 个能量晶`
      : "暂无可收集能量";
    collectButtonEl.setAttribute(
      "aria-label",
      collectableCount > 0 ? `一键收集 ${collectableCount} 个能量晶` : "暂无可收集能量"
    );
    collectCountBadgeEl.textContent = collectableCount;
    collectCountBadgeEl.classList.toggle("hidden", collectableCount === 0);
    removeButtonEl.disabled = this.game.state !== STATE.RUNNING || this.game.guardianRelic.casting;
    removeButtonEl.classList.toggle("active", this.game.removeMode);
    removeButtonEl.dataset.tooltip = this.game.removeMode ? "取消移除守卫" : "移除守卫";
    removeButtonEl.setAttribute("aria-label", this.game.removeMode ? "取消移除守卫" : "移除守卫");
    removeButtonEl.setAttribute("aria-pressed", String(this.game.removeMode));

    this.cardButtons.forEach((button, unitId) => {
      const type = DEFENDER_TYPES.find((item) => item.id === unitId);
      const selected = this.game.selectedDefenderType && this.game.selectedDefenderType.id === unitId;
      const cooldown = this.game.getCardCooldown(unitId);
      const cooling = cooldown > 0;
      const affordable = this.game.resourceManager.canAfford(type.cost);
      const disabled = this.game.state !== STATE.RUNNING
        || this.game.guardianRelic.casting
        || cooling
        || !affordable;
      const status = button.querySelector(".unit-status");
      const cooldownFill = button.querySelector(".cooldown-fill");

      button.disabled = disabled;
      button.classList.toggle("selected", Boolean(selected) && !disabled);
      button.classList.toggle("disabled", disabled);
      button.classList.toggle("cooling", cooling);

      if (cooldownFill) {
        const cooldownRatio = type.cooldown ? Math.min(1, cooldown / type.cooldown) : 0;
        cooldownFill.style.transform = `scaleY(${cooldownRatio})`;
      }

      if (status) {
        if (this.game.state === STATE.PAUSED) {
          status.textContent = "暂停中";
        } else if (this.game.state === STATE.WON || this.game.state === STATE.LOST) {
          status.textContent = "本局结束";
        } else if (this.game.guardianRelic.casting) {
          status.textContent = "技能释放中";
        } else if (cooling) {
          status.textContent = `冷却 ${cooldown.toFixed(1)} 秒`;
        } else if (!affordable) {
          status.textContent = "能量不足";
        } else {
          status.textContent = "可放置";
        }
      }
    });
  }

  showMessage(title, text, mode = "") {
    messageTitleEl.textContent = title;
    messageTextEl.textContent = text;
    messageOverlayEl.classList.toggle("victory", mode === "victory");
    messageOverlayEl.classList.toggle("defeat", mode === "defeat");
    overlayNextButtonEl.classList.toggle("hidden", mode !== "victory" || !this.game.hasNextLevel());
    messageOverlayEl.classList.remove("hidden");
  }

  hideMessage() {
    messageOverlayEl.classList.remove("victory", "defeat");
    messageOverlayEl.classList.add("hidden");
  }

  showStartMenu() {
    this.updateProgressText();
    startMenuEl.classList.remove("hidden");
    levelSelectMenuEl.classList.add("hidden");
    menuOverlayEl.classList.remove("hidden");
  }

  showLevelSelect() {
    this.renderLevelCards();
    startMenuEl.classList.add("hidden");
    levelSelectMenuEl.classList.remove("hidden");
    menuOverlayEl.classList.remove("hidden");
  }

  hideMenus() {
    menuOverlayEl.classList.add("hidden");
  }

  updateProgressText() {
    const highest = this.game.progress.highestUnlocked;
    const nextLevel = LEVELS[Math.min(highest - 1, LEVELS.length - 1)];
    continueButtonEl.textContent = highest > 1 ? `继续：${nextLevel.name}` : "开始游戏";
    progressTextEl.textContent = `已解锁 ${highest} / ${LEVELS.length} 个关卡`;
  }

  renderLevelCards() {
    levelGridEl.innerHTML = "";

    LEVELS.forEach((level) => {
      const unlocked = this.game.isLevelUnlocked(level.number);
      const completed = this.game.isLevelCompleted(level.number);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "level-card";
      button.disabled = !unlocked;
      button.innerHTML = `
        <h3>${level.number}. ${level.name}</h3>
        <p>${level.description}</p>
        <div class="level-meta">
          <span class="level-chip">${level.subtitle}</span>
          <span class="level-chip">${level.difficulty}</span>
          <span class="level-chip">${level.waves.length} 波</span>
          <span class="level-chip">${completed ? "已通关" : unlocked ? "已解锁" : "未解锁"}</span>
        </div>
      `;

      button.addEventListener("click", () => {
        if (unlocked) {
          this.game.startLevel(level.number);
        }
      });

      levelGridEl.appendChild(button);
    });
  }
}

/**
 * ResourceManager 管理能量晶数值、自动增长、场上可点击资源对象。
 */
class ResourceManager {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset(level = LEVELS[0]) {
    this.crystals = level.initialCrystals;
    this.autoTimer = 0;
    this.autoInterval = level.resourceInterval;
    this.autoValue = level.resourceValue;
    this.resources = [];
  }

  canAfford(cost) {
    return this.crystals >= cost;
  }

  spend(cost) {
    if (!this.canAfford(cost)) {
      return false;
    }
    this.crystals -= cost;
    return true;
  }

  add(amount) {
    this.crystals += amount;
  }

  update(deltaTime) {
    this.autoTimer += deltaTime;
    if (this.autoTimer >= this.autoInterval) {
      this.autoTimer = 0;
      this.add(this.autoValue);
      this.spawnResource(
        110 + Math.random() * 660,
        40 + Math.random() * 26,
        15,
        7
      );
    }

    this.resources.forEach((resource) => resource.update(deltaTime));
    this.resources = this.resources.filter((resource) => !resource.collected);
  }

  spawnResource(x, y, value = 25, lifetime = 10) {
    this.resources.push(new Resource(x, y, value, lifetime));
  }

  collectAt(x, y) {
    const resource = this.resources.find((item) => item.contains(x, y));
    if (!resource) {
      return null;
    }
    resource.collected = true;
    this.add(resource.value);
    return { x: resource.x, y: resource.y, value: resource.value };
  }

  collectAll() {
    const collectedResources = this.resources.filter((resource) => !resource.collected);
    const total = collectedResources.reduce((sum, resource) => sum + resource.value, 0);
    const positions = collectedResources.map((resource) => ({ x: resource.x, y: resource.y }));

    collectedResources.forEach((resource) => {
      resource.collected = true;
    });

    if (total > 0) {
      this.add(total);
    }

    return { total, positions };
  }

  getCollectableCount() {
    return this.resources.filter((resource) => !resource.collected).length;
  }

  draw(context) {
    this.resources.forEach((resource) => resource.draw(context));
  }
}

/**
 * GuardianRelic 是左侧被守护的月核圣树，并管理全图净化技能及其演出。
 */
class GuardianRelic {
  constructor(config) {
    this.config = config;
    this.x = config.x;
    this.y = config.y;
    this.reset();
  }

  reset() {
    this.cooldownRemaining = 0;
    this.castTimer = 0;
    this.casting = false;
    this.impacted = false;
    this.hovered = false;
    this.pulse = 0;
    this.targetPoints = [];
    this.lastKillCount = 0;
  }

  contains(x, y) {
    const dx = (x - this.x) / 52;
    const dy = (y - this.y) / 124;
    return dx * dx + dy * dy <= 1;
  }

  activate(game) {
    if (game.state !== STATE.RUNNING || this.casting) {
      return false;
    }

    if (this.cooldownRemaining > 0) {
      game.createFloatingText(92, this.y - 58, `冷却 ${Math.ceil(this.cooldownRemaining)} 秒`, "#9ddcff");
      return false;
    }

    const livingEnemies = game.enemies.filter((enemy) => !enemy.markedForRemoval);
    if (livingEnemies.length === 0) {
      game.createSpark(this.x, this.y - 42, "#9ddcff");
      game.createFloatingText(92, this.y - 58, "暂无净化目标", "#dff6ff");
      return false;
    }

    if (!game.resourceManager.spend(this.config.cost)) {
      game.createSpark(this.x, this.y - 42, "#ff6f7e");
      game.createFloatingText(98, this.y - 58, `需要 ${this.config.cost} 能量晶`, "#ffb3bd");
      return false;
    }

    this.casting = true;
    this.castTimer = 0;
    this.impacted = false;
    this.lastKillCount = 0;
    this.targetPoints = livingEnemies.map((enemy) => ({ x: enemy.x, y: enemy.y }));
    game.selectedDefenderType = null;
    game.removeMode = false;
    game.createFloatingText(110, this.y - 66, `${this.config.skillName} 蓄能`, "#fff3bf");
    game.ui.update();
    return true;
  }

  update(deltaTime, game) {
    this.pulse += deltaTime * 2.6;
    if (!this.casting) {
      this.cooldownRemaining = Math.max(0, this.cooldownRemaining - deltaTime);
      return;
    }

    this.castTimer += deltaTime;
    if (!this.impacted && this.castTimer >= this.config.impactTime) {
      this.impacted = true;
      this.lastKillCount = 0;

      game.enemies.forEach((enemy) => {
        if (enemy.markedForRemoval) {
          return;
        }
        enemy.markedForRemoval = true;
        this.lastKillCount += 1;
        game.createSpark(enemy.x, enemy.y, enemy.type.accent || "#dffff7");
        game.createExplosion(enemy.x, enemy.y, 48);
      });
      game.projectiles.forEach((projectile) => {
        projectile.markedForRemoval = true;
      });
      game.createFloatingText(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2 + 72,
        `净化 ${this.lastKillCount} 个影军`,
        "#f7fff9"
      );
    }

    if (this.castTimer >= this.config.castDuration) {
      this.casting = false;
      this.castTimer = 0;
      this.cooldownRemaining = this.config.cooldown;
      this.targetPoints = [];
    }
  }

  getShakeOffset() {
    if (!this.casting || this.castTimer < this.config.impactTime) {
      return { x: 0, y: 0 };
    }

    const elapsed = this.castTimer - this.config.impactTime;
    const strength = Math.max(0, 1 - elapsed / 0.58) * 8;
    return {
      x: Math.sin(this.castTimer * 91) * strength,
      y: Math.cos(this.castTimer * 73) * strength * 0.65
    };
  }

  draw(context, game) {
    const canAfford = game.resourceManager.canAfford(this.config.cost);
    const hasTargets = game.enemies.some((enemy) => !enemy.markedForRemoval);
    const ready = game.state === STATE.RUNNING
      && !this.casting
      && this.cooldownRemaining <= 0
      && canAfford
      && hasTargets;
    const pulse = 1 + Math.sin(this.pulse * 2) * 0.06;

    context.save();
    if (this.hovered || ready || this.casting) {
      const glowRadius = this.casting ? 72 + Math.sin(this.pulse * 5) * 8 : 58;
      const glow = context.createRadialGradient(this.x, this.y - 35, 4, this.x, this.y - 35, glowRadius);
      glow.addColorStop(0, this.casting ? "rgba(255, 247, 190, 0.92)" : "rgba(120, 244, 213, 0.72)");
      glow.addColorStop(1, "rgba(120, 244, 213, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(this.x, this.y - 35, glowRadius, 0, Math.PI * 2);
      context.fill();
    }

    context.fillStyle = "rgba(8, 17, 24, 0.7)";
    context.beginPath();
    context.ellipse(this.x, this.y + 64, 30, 12, 0, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = "#4e8f72";
    context.lineWidth = 8;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(this.x, this.y + 58);
    context.bezierCurveTo(this.x - 7, this.y + 26, this.x + 8, this.y - 5, this.x, this.y - 36);
    context.stroke();

    context.strokeStyle = "#8dd0a3";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(this.x - 1, this.y + 28);
    context.quadraticCurveTo(this.x - 20, this.y + 12, this.x - 23, this.y - 7);
    context.moveTo(this.x + 2, this.y + 12);
    context.quadraticCurveTo(this.x + 20, this.y - 1, this.x + 22, this.y - 20);
    context.stroke();

    drawLeaf(context, this.x - 22, this.y + 4, 9, 18, -0.82, "#67c68a");
    drawLeaf(context, this.x + 22, this.y - 10, 9, 18, 0.72, "#86d6a0");
    drawLeaf(context, this.x - 13, this.y + 40, 8, 17, -1.04, "#4ea873");
    drawLeaf(context, this.x + 15, this.y + 38, 8, 17, 1.02, "#58b780");

    context.save();
    context.translate(this.x, this.y - 42);
    context.scale(pulse, pulse);
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6 + this.pulse * 0.08;
      drawLeaf(
        context,
        Math.cos(angle) * 18,
        Math.sin(angle) * 18,
        8,
        16,
        angle + Math.PI / 2,
        index % 2 === 0 ? "#78f4d5" : "#f7d46c"
      );
    }
    drawCrystal(context, 0, 0, 15, this.casting ? "#fff1a8" : "#78f4d5", "#ffffff");
    context.restore();

    context.strokeStyle = ready ? "rgba(247, 212, 108, 0.9)" : "rgba(157, 220, 255, 0.42)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(this.x, this.y - 42, 31 + Math.sin(this.pulse * 2) * 2, 0, Math.PI * 2);
    context.stroke();

    if (this.cooldownRemaining > 0) {
      const cooldownRatio = this.cooldownRemaining / this.config.cooldown;
      context.strokeStyle = "rgba(157, 220, 255, 0.92)";
      context.lineWidth = 4;
      context.beginPath();
      context.arc(
        this.x,
        this.y - 42,
        35,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * cooldownRatio
      );
      context.stroke();
    }

    context.fillStyle = "rgba(10, 20, 29, 0.92)";
    context.strokeStyle = this.hovered ? "rgba(247, 212, 108, 0.88)" : "rgba(120, 244, 213, 0.38)";
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(10, this.y + 76, 104, 56, 7);
    context.fill();
    context.stroke();

    context.fillStyle = "#f4f7fb";
    context.font = "700 12px Microsoft YaHei, sans-serif";
    context.textAlign = "center";
    context.fillText(this.config.name, this.x, this.y + 92);
    context.fillStyle = "#78f4d5";
    context.font = "700 13px Microsoft YaHei, sans-serif";
    context.fillText(`◆ ${this.config.cost}`, this.x, this.y + 110);

    let status = "未启用";
    if (game.state === STATE.PAUSED) {
      status = "已暂停";
    } else if (this.casting) {
      status = "释放中";
    } else if (this.cooldownRemaining > 0) {
      status = `${Math.ceil(this.cooldownRemaining)}秒`;
    } else if (!canAfford) {
      status = "能量不足";
    } else if (!hasTargets) {
      status = "等待目标";
    } else if (game.state === STATE.RUNNING) {
      status = "可释放";
    }
    context.fillStyle = ready ? "#fff3bf" : "#aeb9ca";
    context.font = "10px Microsoft YaHei, sans-serif";
    context.fillText(status, this.x, this.y + 126);
    context.restore();
  }

  drawSkillOverlay(context) {
    if (!this.casting) {
      return;
    }

    const charge = Math.min(1, this.castTimer / this.config.impactTime);
    const aftermath = Math.max(
      0,
      (this.castTimer - this.config.impactTime) / (this.config.castDuration - this.config.impactTime)
    );
    context.save();
    context.fillStyle = `rgba(3, 10, 18, ${0.14 + charge * 0.34})`;
    context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (!this.impacted) {
      context.save();
      context.globalCompositeOperation = "lighter";
      context.setLineDash([12, 15]);
      context.lineDashOffset = -this.castTimer * 120;
      this.targetPoints.forEach((target, index) => {
        context.strokeStyle = index % 2 === 0
          ? `rgba(120, 244, 213, ${0.16 + charge * 0.54})`
          : `rgba(247, 212, 108, ${0.12 + charge * 0.46})`;
        context.lineWidth = 1.5 + charge * 2;
        context.beginPath();
        context.moveTo(this.x, this.y - 42);
        context.quadraticCurveTo(
          GAME_WIDTH * 0.45,
          target.y - 80 - index * 5,
          target.x,
          target.y
        );
        context.stroke();
      });
      context.setLineDash([]);

      for (let ring = 0; ring < 4; ring += 1) {
        const phase = (charge + ring * 0.22) % 1;
        context.globalAlpha = 1 - phase;
        context.strokeStyle = ring % 2 === 0 ? "#78f4d5" : "#fff3bf";
        context.lineWidth = 3 - phase * 2;
        context.beginPath();
        context.arc(this.x, this.y - 42, 28 + phase * 330, 0, Math.PI * 2);
        context.stroke();
      }
      context.restore();
    } else {
      const sweep = 1 - Math.pow(1 - Math.min(1, aftermath * 1.35), 3);
      const shockX = this.x + sweep * (GAME_WIDTH - this.x + 170);
      const flashAlpha = Math.max(0, 0.94 - aftermath * 2.7);

      context.fillStyle = `rgba(238, 255, 248, ${flashAlpha})`;
      context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      context.save();
      context.globalCompositeOperation = "lighter";
      const sweepGradient = context.createLinearGradient(shockX - 190, 0, shockX + 70, 0);
      sweepGradient.addColorStop(0, "rgba(120, 244, 213, 0)");
      sweepGradient.addColorStop(0.58, `rgba(120, 244, 213, ${Math.max(0, 0.76 - aftermath * 0.35)})`);
      sweepGradient.addColorStop(0.82, `rgba(255, 247, 190, ${Math.max(0, 0.95 - aftermath * 0.4)})`);
      sweepGradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = sweepGradient;
      context.fillRect(shockX - 190, 0, 260, GAME_HEIGHT);

      context.globalAlpha = Math.max(0, 1 - aftermath);
      context.strokeStyle = "#f7fff9";
      context.lineWidth = 8 * (1 - aftermath) + 1;
      context.beginPath();
      context.arc(this.x, this.y - 42, 70 + sweep * 980, 0, Math.PI * 2);
      context.stroke();

      for (let index = 0; index < 34; index += 1) {
        const starX = ((index * 83 + aftermath * 430) % (GAME_WIDTH + 120)) - 60;
        const starY = 54 + ((index * 137) % (GAME_HEIGHT - 100));
        const size = 2 + (index % 5) * 0.8;
        context.globalAlpha = Math.max(0, 1 - aftermath) * (0.42 + (index % 3) * 0.2);
        drawSparkStar(context, starX, starY, size, index % 2 === 0 ? "#dffff7" : "#fff3bf");
      }
      context.restore();
    }

    const titleAlpha = this.impacted ? Math.max(0, 1 - aftermath * 1.6) : Math.min(1, charge * 1.7);
    context.globalAlpha = titleAlpha;
    context.fillStyle = this.impacted ? "#ffffff" : "#fff3bf";
    context.font = "700 44px Microsoft YaHei, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = this.impacted ? "#78f4d5" : "#f7d46c";
    context.shadowBlur = this.impacted ? 32 : 18;
    context.fillText(this.impacted ? this.config.skillName : "月核共鸣", GAME_WIDTH / 2, 112);
    context.restore();
  }
}

/**
 * Game 是主协调器，负责主循环、输入、实体更新、碰撞和胜负判断。
 */
class Game {
  constructor() {
    this.progress = loadProgress();
    this.currentLevel = LEVELS[0];
    this.grid = new Grid(GRID_CONFIG);
    this.waveManager = new WaveManager(this.currentLevel.waves, ENEMY_TYPES, this.grid);
    this.resourceManager = new ResourceManager(this);
    this.cardCooldowns = new Map();
    this.resetCardCooldowns();
    this.lastTimestamp = 0;
    this.state = STATE.READY;
    this.selectedDefenderType = null;
    this.removeMode = false;
    this.defenders = [];
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.guardianRelic = new GuardianRelic(GUARDIAN_RELIC_CONFIG);
    this.ui = new UIManager(this);

    this.bindCanvasInput();
    this.applyLevelSettings(this.currentLevel);
    this.ui.showStartMenu();
    this.ui.update();
    requestAnimationFrame((timestamp) => this.loop(timestamp));
  }

  applyLevelSettings(level) {
    this.currentLevel = level;
    this.selectedDefenderType = null;
    this.removeMode = false;
    this.defenders = [];
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.guardianRelic.reset();
    this.grid.hoverCell = null;
    this.waveManager.setWaves(level.waves);
    this.resourceManager.reset(level);
    this.resetCardCooldowns();
  }

  getLevelByNumber(levelNumber) {
    return LEVELS.find((level) => level.number === levelNumber) || LEVELS[0];
  }

  isLevelUnlocked(levelNumber) {
    return levelNumber <= this.progress.highestUnlocked;
  }

  isLevelCompleted(levelNumber) {
    return this.progress.completedLevels.includes(levelNumber);
  }

  hasNextLevel() {
    return this.currentLevel.number < LEVELS.length;
  }

  completeCurrentLevel() {
    const completed = new Set(this.progress.completedLevels);
    completed.add(this.currentLevel.number);
    this.progress.completedLevels = Array.from(completed).sort((a, b) => a - b);

    if (this.hasNextLevel()) {
      this.progress.highestUnlocked = Math.max(
        this.progress.highestUnlocked,
        this.currentLevel.number + 1
      );
    }

    saveProgress(this.progress);
  }

  startHighestUnlockedLevel() {
    this.startLevel(this.progress.highestUnlocked);
  }

  startNextLevel() {
    if (!this.hasNextLevel()) {
      return;
    }
    this.startLevel(this.currentLevel.number + 1);
  }

  startLevel(levelNumber) {
    if (!this.isLevelUnlocked(levelNumber)) {
      return;
    }

    const level = this.getLevelByNumber(levelNumber);
    this.state = STATE.RUNNING;
    this.applyLevelSettings(level);
    this.ui.hideMessage();
    this.ui.hideMenus();
    this.ui.update();
  }

  openStartMenu() {
    this.state = STATE.READY;
    this.selectedDefenderType = null;
    this.removeMode = false;
    this.ui.hideMessage();
    this.ui.showStartMenu();
    this.ui.update();
  }

  openLevelSelect() {
    this.state = STATE.READY;
    this.selectedDefenderType = null;
    this.removeMode = false;
    this.ui.hideMessage();
    this.ui.showLevelSelect();
    this.ui.update();
  }

  bindCanvasInput() {
    canvas.addEventListener("mousemove", (event) => {
      const point = this.getCanvasPoint(event);
      this.grid.updateHover(point.x, point.y);
      this.guardianRelic.hovered = this.guardianRelic.contains(point.x, point.y);
      canvas.style.cursor = this.guardianRelic.hovered ? "pointer" : "crosshair";
    });

    canvas.addEventListener("mouseleave", () => {
      this.grid.hoverCell = null;
      this.guardianRelic.hovered = false;
      canvas.style.cursor = "crosshair";
    });

    canvas.addEventListener("click", (event) => {
      if (this.state !== STATE.RUNNING) {
        return;
      }

      const point = this.getCanvasPoint(event);
      if (this.guardianRelic.casting) {
        return;
      }

      if (this.guardianRelic.contains(point.x, point.y)) {
        this.guardianRelic.activate(this);
        return;
      }

      const collectedResource = this.resourceManager.collectAt(point.x, point.y);
      if (collectedResource) {
        this.createSpark(collectedResource.x, collectedResource.y, "#78f4d5");
        this.createFloatingText(collectedResource.x, collectedResource.y - 18, `+${collectedResource.value}`, "#dfffee");
        this.ui.update();
        return;
      }

      const cell = this.grid.getCellAt(point.x, point.y);
      if (cell && this.removeMode) {
        this.removeDefender(cell.row, cell.col);
        return;
      }

      if (cell && this.selectedDefenderType) {
        this.placeDefender(cell.row, cell.col);
      }
    });
  }

  getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height
    };
  }

  loop(timestamp) {
    const deltaTime = Math.min(0.05, (timestamp - this.lastTimestamp) / 1000 || 0);
    this.lastTimestamp = timestamp;

    if (this.state === STATE.RUNNING) {
      this.update(deltaTime);
    }

    this.draw();
    this.ui.update();
    requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
  }

  update(deltaTime) {
    this.updateCardCooldowns(deltaTime);
    this.resourceManager.update(deltaTime);
    this.guardianRelic.update(deltaTime, this);

    if (this.guardianRelic.casting) {
      this.effects.forEach((effect) => {
        effect.age += deltaTime;
      });
      this.cleanupEntities();
      return;
    }

    this.waveManager.update(deltaTime, this);

    this.defenders.forEach((defender) => defender.update(deltaTime, this));
    this.projectiles.forEach((projectile) => projectile.update(deltaTime, this));
    this.enemies.forEach((enemy) => enemy.update(deltaTime, this));
    this.effects.forEach((effect) => {
      effect.age += deltaTime;
    });

    this.cleanupEntities();
    this.checkWinCondition();
  }

  cleanupEntities() {
    this.defenders = this.defenders.filter((defender) => !defender.markedForRemoval);
    this.projectiles = this.projectiles.filter((projectile) => !projectile.markedForRemoval);
    this.enemies = this.enemies.filter((enemy) => !enemy.markedForRemoval);
    this.effects = this.effects.filter((effect) => effect.age < effect.duration);
  }
  draw() {
    const shake = this.guardianRelic.getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);
    this.grid.draw(ctx, this);

    this.drawLaneWarning(ctx);
    this.guardianRelic.draw(ctx, this);
    this.defenders.forEach((defender) => defender.draw(ctx));
    this.projectiles.forEach((projectile) => projectile.draw(ctx));
    this.enemies.forEach((enemy) => enemy.draw(ctx));
    this.drawEffects(ctx);
    this.resourceManager.draw(ctx);
    this.drawWaveNotice(ctx);
    ctx.restore();

    this.guardianRelic.drawSkillOverlay(ctx);

    if (this.state === STATE.PAUSED) {
      this.drawPaused(ctx);
    }
  }

  drawLaneWarning(context) {
    context.save();
    const theme = this.currentLevel.theme;
    const rightEdge = this.grid.x + this.grid.width;
    const warningLeft = rightEdge + 16;
    const warningWidth = GAME_WIDTH - warningLeft;
    const labelX = warningLeft + warningWidth / 2;
    const labelY = Math.min(GAME_HEIGHT - 16, this.grid.y + this.grid.height + 22);

    context.fillStyle = "rgba(246, 240, 183, 0.08)";
    context.fillRect(warningLeft, this.grid.y, warningWidth, this.grid.height);

    context.strokeStyle = "rgba(244, 247, 251, 0.18)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(warningLeft + 10, this.grid.y + this.grid.height + 8);
    context.lineTo(GAME_WIDTH - 10, this.grid.y + this.grid.height + 8);
    context.stroke();

    context.fillStyle = "rgba(244, 247, 251, 0.62)";
    context.font = "13px Microsoft YaHei, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(theme.entryLabel, labelX, labelY);
    context.restore();
  }

  drawEffects(context) {
    context.save();
    this.effects.forEach((effect) => {
      const ratio = effect.age / effect.duration;
      if (effect.kind === "text") {
        context.globalAlpha = 1 - ratio;
        context.fillStyle = effect.color;
        context.font = "700 18px Microsoft YaHei, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.shadowColor = "rgba(0, 0, 0, 0.55)";
        context.shadowBlur = 8;
        context.fillText(effect.text, effect.x, effect.y - ratio * 28);
        return;
      }

      context.globalAlpha = 1 - ratio;
      context.strokeStyle = effect.color;
      context.lineWidth = effect.kind === "explosion" ? 5 : 3;
      context.beginPath();
      context.arc(effect.x, effect.y, effect.radius * ratio, 0, Math.PI * 2);
      context.stroke();

      if (effect.kind === "spark") {
        context.fillStyle = effect.color;
        for (let i = 0; i < 6; i += 1) {
          const angle = (Math.PI * 2 * i) / 6 + ratio * 1.5;
          const distance = 6 + ratio * effect.radius;
          context.beginPath();
          context.arc(
            effect.x + Math.cos(angle) * distance,
            effect.y + Math.sin(angle) * distance,
            Math.max(1, 4 * (1 - ratio)),
            0,
            Math.PI * 2
          );
          context.fill();
        }
      }

      if (effect.kind === "explosion") {
        context.fillStyle = "rgba(255, 210, 123, 0.16)";
        context.beginPath();
        context.arc(effect.x, effect.y, effect.radius * ratio * 0.72, 0, Math.PI * 2);
        context.fill();
      }
    });
    context.restore();
  }

  drawWaveNotice(context) {
    if (this.waveManager.allWavesSpawned || this.state !== STATE.RUNNING || this.guardianRelic.casting) {
      return;
    }

    let message = "";
    if (this.waveManager.waitingForClear) {
      message = `清空本波剩余敌人：${this.enemies.length}`;
    } else if (!this.waveManager.waveStarted) {
      const seconds = Math.ceil(Math.max(0, this.waveManager.betweenWaveTimer));
      message = `下一波将在 ${seconds} 秒后到来`;
    }

    if (!message) {
      return;
    }

    context.save();
    context.fillStyle = "rgba(10, 15, 24, 0.54)";
    context.fillRect(328, 18, 304, 42);
    context.strokeStyle = "rgba(120, 244, 213, 0.38)";
    context.strokeRect(328.5, 18.5, 303, 41);
    context.fillStyle = "#f4f7fb";
    context.font = "700 18px Microsoft YaHei, sans-serif";
    context.textAlign = "center";
    context.fillText(message, 480, 45);
    context.restore();
  }

  drawPaused(context) {
    context.save();
    context.fillStyle = "rgba(8, 12, 18, 0.48)";
    context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    context.fillStyle = "#f4f7fb";
    context.font = "700 42px Microsoft YaHei, sans-serif";
    context.textAlign = "center";
    context.fillText("已暂停", GAME_WIDTH / 2, GAME_HEIGHT / 2);
    context.restore();
  }

  selectDefender(typeId) {
    this.removeMode = false;
    this.selectedDefenderType = DEFENDER_TYPES.find((type) => type.id === typeId) || null;
  }

  canSelectDefender(type) {
    return (
      this.state === STATE.RUNNING
      && !this.guardianRelic.casting
      && this.resourceManager.canAfford(type.cost)
      && this.getCardCooldown(type.id) <= 0
    );
  }

  resetCardCooldowns() {
    DEFENDER_TYPES.forEach((type) => {
      this.cardCooldowns.set(type.id, 0);
    });
  }

  getCardCooldown(typeId) {
    return this.cardCooldowns.get(typeId) || 0;
  }

  startCardCooldown(type) {
    this.cardCooldowns.set(type.id, type.cooldown || 0);
  }

  updateCardCooldowns(deltaTime) {
    DEFENDER_TYPES.forEach((type) => {
      const current = this.getCardCooldown(type.id);
      if (current > 0) {
        this.cardCooldowns.set(type.id, Math.max(0, current - deltaTime));
      }
    });
  }

  toggleRemoveMode() {
    if (this.state !== STATE.RUNNING) {
      return;
    }
    this.removeMode = !this.removeMode;
    if (this.removeMode) {
      this.selectedDefenderType = null;
    }
  }

  collectAllResources() {
    if (this.state !== STATE.RUNNING) {
      return;
    }

    const collected = this.resourceManager.collectAll();
    if (collected.total <= 0) {
      this.createSpark(120, 44, "#78f4d5");
      this.createFloatingText(120, 48, "暂无能量", "#dfffee");
      return;
    }

    collected.positions.forEach((position) => {
      this.createSpark(position.x, position.y, "#78f4d5");
    });
    this.createFloatingText(126, 48, `+${collected.total}`, "#dfffee");
    this.ui.update();
  }

  placeDefender(row, col) {
    if (this.state === STATE.PAUSED || this.guardianRelic.casting) {
      return;
    }

    if (this.getDefenderAt(row, col) || !this.resourceManager.spend(this.selectedDefenderType.cost)) {
      this.createSpark(this.grid.getCellRect(row, col).centerX, this.grid.getCellRect(row, col).centerY, "#ff6f7e");
      return;
    }

    const rect = this.grid.getCellRect(row, col);
    const placedType = this.selectedDefenderType;
    this.defenders.push(new Defender(placedType, row, col, rect));
    this.startCardCooldown(placedType);
    this.createSpark(rect.centerX, rect.centerY, "#78f4d5");
    this.selectedDefenderType = null;
  }

  removeDefender(row, col) {
    if (this.state === STATE.PAUSED || this.guardianRelic.casting) {
      return;
    }

    const defender = this.getDefenderAt(row, col);
    const rect = this.grid.getCellRect(row, col);
    if (!defender) {
      this.createSpark(rect.centerX, rect.centerY, "#ff6f7e");
      return;
    }

    defender.markedForRemoval = true;
    this.resourceManager.add(Math.floor(defender.type.cost * 0.25));
    this.createSpark(defender.x, defender.y, "#f7d46c");
  }

  getDefenderAt(row, col) {
    return this.defenders.find((defender) => defender.row === row && defender.col === col && !defender.markedForRemoval);
  }

  hasEnemyInLane(row, x) {
    return this.enemies.some((enemy) => enemy.row === row && enemy.x > x && !enemy.markedForRemoval);
  }

  getAttackIntervalMultiplier(defender) {
    const beacon = this.defenders.find((candidate) => (
      candidate.type.role === "beacon"
      && candidate.row === defender.row
      && candidate !== defender
      && !candidate.markedForRemoval
      && Math.abs(candidate.col - defender.col) <= candidate.type.boostRange
    ));

    return beacon ? beacon.type.attackSpeedMultiplier : 1;
  }

  healDefendersInRow(beacon) {
    let healedAny = false;
    this.defenders.forEach((defender) => {
      if (
        defender.row === beacon.row
        && defender !== beacon
        && !defender.markedForRemoval
        && Math.abs(defender.col - beacon.col) <= beacon.type.boostRange
        && defender.hp < defender.maxHp
      ) {
        defender.hp = Math.min(defender.maxHp, defender.hp + beacon.type.healAmount);
        this.createSpark(defender.x, defender.y - 12, beacon.type.color);
        healedAny = true;
      }
    });

    if (healedAny) {
      this.createFloatingText(beacon.x, beacon.y - 34, "回声修复", "#fff3bf");
    } else {
      this.createSpark(beacon.x, beacon.y - 16, beacon.type.color);
    }
  }

  findBlockingDefender(enemy) {
    return this.defenders.find((defender) => (
      defender.row === enemy.row
      && !defender.markedForRemoval
      && enemy.left <= defender.right - 6
      && enemy.right >= defender.left + 4
    ));
  }

  createSpark(x, y, color) {
    this.effects.push({
      kind: "spark",
      x,
      y,
      radius: 26,
      color,
      age: 0,
      duration: 0.35
    });
  }

  createFloatingText(x, y, text, color) {
    this.effects.push({
      kind: "text",
      x,
      y,
      text,
      color,
      age: 0,
      duration: 0.9
    });
  }

  createExplosion(x, y, radius) {
    this.effects.push({
      kind: "explosion",
      x,
      y,
      radius,
      color: "#ffd27b",
      age: 0,
      duration: 0.55
    });
  }

  loseGame() {
    if (this.state === STATE.WON || this.state === STATE.LOST) {
      return;
    }
    this.state = STATE.LOST;
    this.selectedDefenderType = null;
    this.removeMode = false;
    this.ui.showMessage(
      "防线被突破",
      `${this.currentLevel.name} 的防线被突破。你坚持到了第 ${this.waveManager.currentWaveNumber} 波，调整布局后再试一次。`,
      "defeat"
    );
  }

  checkWinCondition() {
    if (
      this.waveManager.allWavesSpawned
      && this.enemies.length === 0
      && this.state === STATE.RUNNING
    ) {
      this.state = STATE.WON;
      this.completeCurrentLevel();
      this.selectedDefenderType = null;
      this.removeMode = false;
      const unlockText = this.hasNextLevel()
        ? `下一关「${this.getLevelByNumber(this.currentLevel.number + 1).name}」已解锁。`
        : "全部关卡已经通关。";
      this.ui.showMessage(
        "守卫成功",
        `你清空了「${this.currentLevel.name}」的全部 ${this.waveManager.totalWaves} 波进攻。${unlockText}`,
        "victory"
      );
    }
  }

  togglePause() {
    if (this.state !== STATE.RUNNING && this.state !== STATE.PAUSED) {
      return;
    }
    this.state = this.state === STATE.PAUSED ? STATE.RUNNING : STATE.PAUSED;
  }

  restart() {
    this.state = STATE.RUNNING;
    this.applyLevelSettings(this.currentLevel);
    this.ui.hideMessage();
    this.ui.hideMenus();
    this.ui.update();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  new Game();
});
