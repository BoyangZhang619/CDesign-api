/**
 * 像素头像编解码服务
 *
 * 格式: 每像素 1 个 hex 字符 (0-F)，按行连续排列，无分隔符
 * 分辨率: 16×16 / 32×32 / 64×64 / 128×128
 */

// ── 16 色调色板 ─────────────────────────────────────────────
// 索引 → CSS rgba 字符串
const PALETTE: Record<string, string> = {
  '0': 'transparent',
  '1': '#262626',
  '2': '#FFFFFF',
  '3': '#0095F6',
  '4': '#ED4956',
  '5': '#78C850',
  '6': '#F7B955',
  '7': '#833AB4',
  '8': '#F58529',
  '9': '#DD2A7B',
  'A': '#405DE6',
  'B': '#5851DB',
  'C': '#FD1D1D',
  'D': '#F77737',
  'E': '#F5F5F5',
  'F': '#8E8E8E',
};

/** 调色板颜色数量 */
const PALETTE_SIZE = 16;

/** 有效的分辨率等级 */
export const AVATAR_LEVELS = [16, 32, 64, 128] as const;
export type AvatarLevel = (typeof AVATAR_LEVELS)[number];

// ── 编解码 ──────────────────────────────────────────────────

/**
 * 将像素数据解码为 RGBA 数组，可直接写入 Canvas ImageData
 * @returns 长度为 level*level 的字符串数组，每元素为 CSS 颜色
 */
export function decodePixels(
  pixelData: string,
  level: AvatarLevel
): string[] {
  const result: string[] = [];
  const chars = pixelData.split('');
  const total = level * level;

  for (let i = 0; i < total; i++) {
    const ch = (chars[i] || '0').toUpperCase();
    result.push(PALETTE[ch] || 'transparent');
  }
  return result;
}

/**
 * 验证并规范化像素数据
 */
export function validatePixelData(
  pixelData: string,
  level: AvatarLevel
): boolean {
  const expected = level * level;
  if (pixelData.length !== expected) return false;
  return /^[0-9A-Fa-f]+$/.test(pixelData);
}

/**
 * 将像素数据渲染到 Canvas，返回 Data URL
 * 服务端无需 DOM — 仅用于 API 返回 PNG buffer 的场景
 */
export function renderToDataURL(
  pixelData: string,
  level: AvatarLevel,
  scale: number = 1
): string {
  const size = level * scale;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const colors = decodePixels(pixelData, level);

  for (let y = 0; y < level; y++) {
    for (let x = 0; x < level; x++) {
      const color = colors[y * level + x];
      if (color === 'transparent') continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }

  return canvas.toDataURL('image/png');
}

// ── 默认头像生成器 ──────────────────────────────────────────

type PixelGrid = string[][];

/** 创建空白网格 (全透明) */
function emptyGrid(level: AvatarLevel): PixelGrid {
  return Array.from({ length: level }, () => Array(level).fill('0'));
}

/** 填充矩形区域 */
function fillRect(grid: PixelGrid, x: number, y: number, w: number, h: number, color: string) {
  for (let dy = y; dy < y + h && dy < grid.length; dy++) {
    for (let dx = x; dx < x + w && dx < grid[0].length; dx++) {
      grid[dy][dx] = color;
    }
  }
}

/** 填充圆形区域 */
function fillCircle(grid: PixelGrid, cx: number, cy: number, r: number, color: string) {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r * r) {
        grid[y][x] = color;
      }
    }
  }
}

/** 水平镜像 */
function mirrorH(grid: PixelGrid): PixelGrid {
  const h = grid.length, w = grid[0].length;
  return grid.map(row => [...row].reverse());
}

/** 网格 → hex 字符串 */
function gridToString(grid: PixelGrid): string {
  return grid.map(row => row.join('')).join('');
}

/**
 * 生成一批系统默认头像 (16×16)
 * 返回 12 个不同的 hex 字符串
 */
export function generateDefaultAvatars(): string[] {
  const level: AvatarLevel = 16;
  const avatars: string[] = [];

  // 1. 笑脸
  const smile = emptyGrid(level);
  fillCircle(smile, 8, 8, 7, '6');       // 黄色圆脸
  fillCircle(smile, 5, 6, 1.5, '1');      // 左眼
  fillCircle(smile, 11, 6, 1.5, '1');     // 右眼
  fillRect(smile, 5, 10, 7, 2, '1');      // 嘴
  fillRect(smile, 5, 9, 7, 1, '6');       // 遮嘴
  avatars.push(gridToString(smile));

  // 2. 猫脸
  const cat = emptyGrid(level);
  fillCircle(cat, 8, 8, 7, 'E');
  fillRect(cat, 3, 1, 3, 3, 'E');         // 左耳
  fillRect(cat, 10, 1, 3, 3, 'E');        // 右耳
  fillCircle(cat, 4, 4, 1.5, '1');
  fillCircle(cat, 11, 4, 1.5, '1');
  fillCircle(cat, 7, 9, 1, '9');          // 鼻子
  fillRect(cat, 6, 10, 4, 1, '1');        // 嘴
  avatars.push(gridToString(cat));

  // 3. 太阳
  const sun = emptyGrid(level);
  fillCircle(sun, 8, 8, 4, '6');
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const sx = Math.round(8 + Math.cos(angle) * 6);
    const sy = Math.round(8 + Math.sin(angle) * 6);
    if (sx >= 0 && sx < level && sy >= 0 && sy < level) {
      sun[sy][sx] = '8';
    }
  }
  avatars.push(gridToString(sun));

  // 4. 爱心
  const heart = emptyGrid(level);
  fillRect(heart, 3, 4, 5, 6, '4');      // 左半
  fillRect(heart, 8, 4, 5, 6, '4');      // 右半
  fillRect(heart, 6, 3, 4, 1, '4');      // 顶部连接
  fillRect(heart, 4, 2, 3, 2, '4');      // 左上弧
  fillRect(heart, 9, 2, 3, 2, '4');      // 右上弧
  fillRect(heart, 5, 9, 2, 3, '4');      // 左下尖
  fillRect(heart, 9, 9, 2, 3, '4');      // 右下尖
  fillRect(heart, 7, 5, 2, 4, '4');      // 中间填充
  fillRect(heart, 6, 6, 4, 2, '4');
  avatars.push(gridToString(heart));

  // 5. 钻石 (菱形)
  const diamond = emptyGrid(level);
  for (let y = 0; y < level; y++) {
    const mid = Math.abs(y - 7.5);
    const w = Math.round(7.5 - mid);
    if (w > 0) {
      fillRect(diamond, 8 - w, y, w * 2, 1, '3');
    }
  }
  avatars.push(gridToString(diamond));

  // 6. 星形
  const star = emptyGrid(level);
  fillRect(star, 7, 1, 2, 5, '6');       // 顶角
  fillRect(star, 7, 10, 2, 5, '6');      // 底角
  fillRect(star, 1, 6, 5, 2, '6');       // 左角
  fillRect(star, 10, 6, 5, 2, '6');      // 右角
  fillCircle(star, 8, 8, 2, '6');        // 中心
  avatars.push(gridToString(star));

  // 7. 蘑菇
  const mushroom = emptyGrid(level);
  fillCircle(mushroom, 8, 5, 5, '4');     // 红帽
  fillRect(mushroom, 6, 0, 4, 4, '4');    // 帽顶
  fillRect(mushroom, 6, 5, 4, 8, 'E');    // 白色菌柄
  fillCircle(mushroom, 4, 4, 1.5, '2');   // 白斑点
  fillCircle(mushroom, 11, 3, 1, '2');
  avatars.push(gridToString(mushroom));

  // 8. 幽灵
  const ghost = emptyGrid(level);
  fillCircle(ghost, 8, 5, 5, 'E');        // 白身体
  fillRect(ghost, 4, 6, 8, 8, 'E');       // 身体下延
  fillCircle(ghost, 6, 5, 1.5, '1');      // 眼睛
  fillCircle(ghost, 10, 5, 1.5, '1');
  fillRect(ghost, 4, 13, 3, 2, 'E');       // 底部波浪
  fillRect(ghost, 9, 13, 3, 2, 'E');
  avatars.push(gridToString(ghost));

  // 9. 树
  const tree = emptyGrid(level);
  fillRect(tree, 7, 8, 2, 7, 'D');         // 棕色树干
  fillCircle(tree, 8, 5, 5, '5');          // 绿色树冠
  fillCircle(tree, 5, 7, 3, '5');
  fillCircle(tree, 11, 7, 3, '5');
  avatars.push(gridToString(tree));

  // 10. 机器人
  const robot = emptyGrid(level);
  fillRect(robot, 4, 2, 8, 7, 'E');        // 头
  fillCircle(robot, 6, 5, 1.5, '3');       // 眼
  fillCircle(robot, 10, 5, 1.5, '3');
  fillRect(robot, 6, 9, 4, 6, 'E');        // 身体
  fillRect(robot, 7, 6, 2, 1, '1');        // 嘴
  avatars.push(gridToString(robot));

  // 11. 盾牌
  const shield = emptyGrid(level);
  fillRect(shield, 4, 1, 8, 5, '3');       // 顶横条
  fillRect(shield, 5, 6, 6, 2, '3');
  fillRect(shield, 6, 8, 4, 3, '3');
  fillRect(shield, 7, 11, 2, 4, '3');     // 底尖
  avatars.push(gridToString(shield));

  // 12. 火焰
  const flame = emptyGrid(level);
  fillRect(flame, 5, 12, 2, 3, '8');       // 底部
  fillRect(flame, 6, 10, 4, 2, '8');
  fillRect(flame, 5, 8, 6, 2, '8');
  fillRect(flame, 5, 7, 6, 1, 'D');
  fillRect(flame, 6, 5, 4, 2, 'D');
  fillRect(flame, 7, 3, 2, 3, '6');       // 火尖
  fillRect(flame, 7, 1, 2, 2, 'C');
  avatars.push(gridToString(flame));

  return avatars;
}

// ── Canvas 工具 (Node.js 环境使用) ───────────────────────────
function createCanvas(w: number, h: number) {
  // 简单的纯数据 canvas 实现，不依赖 DOM
  let fillStyle = '';
  const buffer: string[][] = Array.from({ length: h }, () => Array(w).fill('transparent'));

  return {
    getContext(_: string) {
      return {
        set fillStyle(c: string) { fillStyle = c; },
        fillRect(x: number, y: number, rw: number, rh: number) {
          for (let dy = y; dy < y + rh && dy < h; dy++) {
            for (let dx = x; dx < x + rw && dx < w; dx++) {
              buffer[dy][dx] = fillStyle;
            }
          }
        },
      };
    },
    toDataURL(_: string): string {
      // 生成简单的 PNG 等价物：SVG data URL
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const c = buffer[y][x];
          if (c !== 'transparent') {
            svg += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`;
          }
        }
      }
      svg += '</svg>';
      return `data:image/svg+xml,${encodeURIComponent(svg)}`;
    },
  };
}

export { PALETTE, PALETTE_SIZE };
