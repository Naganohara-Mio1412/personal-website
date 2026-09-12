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
    context.fillRect(0, 0, GAME_WIDTH, GAME_HE…15425 tokens truncated…? "#78f4d5" : "#fff3bf";
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
