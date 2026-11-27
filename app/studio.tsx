'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Clock3,
  Link2,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowRight,
  Check,
  X,
  Image as ImageIcon,
  Settings2,
  Download,
  Upload,
  Flower2,
  LogOut,
  CheckCircle2,
  RefreshCw,
  Copy,
  LockKeyhole,
  Sparkles,
  CircleHelp,
  ExternalLink,
  Bell,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Palette,
  RotateCcw,
} from 'lucide-react';

type Slot = {
  id: string;
  date: string;
  time: string;
  status: string;
  customer?: string;
  phone?: string;
  note?: string;
  booking_id?: string;
};

type Shop = {
  id: string;
  name: string;
  description: string;
  theme?: string | null;
};

type ThemeColors = {
  primary: string;
  accent: string;
  bg: string;
};

type ThemeSlotKey = keyof ThemeColors;
type TabKey = 'calendar' | 'requests' | 'poster' | 'settings';
type ApiPayload = Record<string, unknown>;
type ApiResponse = {
  error?: string;
  shop?: Shop | null;
  slots?: Slot[];
  bookingId?: string;
  theme?: string;
};

const DEFAULT_THEME: ThemeColors = {
  primary: '#1f4d3a',
  accent: '#f2bac9',
  bg: '#faf6ee',
};

const THEME_PRESETS: { name: string; subtitle: string; colors: ThemeColors }[] = [
  {
    name: '松綠薔薇（預設）',
    subtitle: '復古俱樂部松綠 × 嫩粉紅',
    colors: { primary: '#1f4d3a', accent: '#f2bac9', bg: '#faf6ee' },
  },
  {
    name: '濃縮拿鐵',
    subtitle: '韓系溫柔可可 × 燕麥奶杏',
    colors: { primary: '#523a28', accent: '#e8c5b0', bg: '#fbf7f2' },
  },
  {
    name: '午夜奶油',
    subtitle: '摩登皇家藍 × 奶油鵝黃',
    colors: { primary: '#1e325c', accent: '#f3d97d', bg: '#f8f7f2' },
  },
  {
    name: '勃艮第玫瑰',
    subtitle: '法式酒紅 × 乾燥玫瑰粉',
    colors: { primary: '#5e2129', accent: '#f2c2cb', bg: '#faf5f5' },
  },
  {
    name: '宇治焙茶',
    subtitle: '日系抹茶綠 × 暖杏奶茶',
    colors: { primary: '#38523f', accent: '#e6cca5', bg: '#f9f6ef' },
  },
  {
    name: '暮光紫羅蘭',
    subtitle: '優雅深梅紫 × 薰衣草粉',
    colors: { primary: '#3b2854', accent: '#dec4f2', bg: '#f9f6fc' },
  },
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return [31, 77, 58];
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'))
      .join('')
  );
}

function mixHex(hex1: string, hex2: string, weight1: number): string {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const w = clamp(weight1, 0, 1);
  return rgbToHex(
    r1 * w + r2 * (1 - w),
    g1 * w + g2 * (1 - w),
    b1 * w + b2 * (1 - w),
  );
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  const hn = ((h % 360) + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hn < 60) [r, g, b] = [c, x, 0];
  else if (hn < 120) [r, g, b] = [x, c, 0];
  else if (hn < 180) [r, g, b] = [0, c, x];
  else if (hn < 240) [r, g, b] = [0, x, c];
  else if (hn < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function hexToHsv(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)];
}

function hsvToHex(h: number, s: number, v: number): string {
  const hn = ((h % 360) + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const vn = clamp(v, 0, 100) / 100;
  const c = vn * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = vn - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hn < 60) [r, g, b] = [c, x, 0];
  else if (hn < 120) [r, g, b] = [x, c, 0];
  else if (hn < 180) [r, g, b] = [0, c, x];
  else if (hn < 240) [r, g, b] = [0, x, c];
  else if (hn < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function derivePalette(theme: ThemeColors) {
  const [ph, ps, pl] = rgbToHsl(...hexToRgb(theme.primary));
  const [ah, as, al] = rgbToHsl(...hexToRgb(theme.accent));

  const green = theme.primary;
  const greenHover = hslToHex(ph, ps, clamp(pl - 7, 8, 85));
  const greenMid = hslToHex(ph, clamp(ps, 25, 80), clamp(pl + 11, 24, 62));
  const greenSoft = mixHex(theme.primary, '#ffffff', 0.13);
  const greenDarkest = hslToHex(ph, clamp(ps + 5, 25, 85), clamp(pl - 8, 10, 22));

  const pink = theme.accent;
  const pinkHover = hslToHex(ah, clamp(as + 6, 20, 95), clamp(al - 7, 18, 88));
  const pinkSoft = mixHex(theme.accent, '#ffffff', 0.18);
  const pinkBorder = mixHex(theme.accent, '#ffffff', 0.45);
  const pinkDeep = hslToHex(ah, clamp(as + 15, 48, 85), clamp(al, 30, 40));

  const cream = theme.bg;
  const bg = mixHex(theme.primary, theme.bg, 0.045);
  const ink = hslToHex(ph, clamp(ps, 18, 38), 13);
  const muted = hslToHex(ph, clamp(ps, 8, 18), 44);
  const border = mixHex(theme.primary, '#edf0ee', 0.1);

  return {
    '--green': green,
    '--green-hover': greenHover,
    '--green-mid': greenMid,
    '--green-soft': greenSoft,
    '--green-darkest': greenDarkest,
    '--pink': pink,
    '--pink-hover': pinkHover,
    '--pink-soft': pinkSoft,
    '--pink-border': pinkBorder,
    '--pink-deep': pinkDeep,
    '--cream': cream,
    '--bg': bg,
    '--ink': ink,
    '--muted': muted,
    '--border': border,
  };
}

function applyThemeToDocument(theme: ThemeColors) {
  if (typeof document === 'undefined') return;
  const vars = derivePalette(theme);
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => {
    root.style.setProperty(k, v);
  });
}

function parseShopTheme(raw?: string | null): ThemeColors {
  if (!raw) return DEFAULT_THEME;
  try {
    const parsed = JSON.parse(raw) as Partial<ThemeColors>;
    if (
      parsed &&
      typeof parsed.primary === 'string' &&
      /^#[0-9a-fA-F]{6}$/.test(parsed.primary) &&
      typeof parsed.accent === 'string' &&
      /^#[0-9a-fA-F]{6}$/.test(parsed.accent) &&
      typeof parsed.bg === 'string' &&
      /^#[0-9a-fA-F]{6}$/.test(parsed.bg)
    ) {
      return {
        primary: parsed.primary.toLowerCase(),
        accent: parsed.accent.toLowerCase(),
        bg: parsed.bg.toLowerCase(),
      };
    }
  } catch {}
  return DEFAULT_THEME;
}

const statuses: Record<string, string> = {
  open: '可預約',
  pending: '待確認',
  booked: '已預約',
  closed: '未開放',
};

const tabBreadcrumbLabels: Record<TabKey, string> = {
  calendar: '預約月曆總覽',
  requests: '預約申請與紀錄',
  poster: 'IG 空檔時刻表',
  settings: '工作室品牌設定',
};

const tabHeadings: Record<TabKey, string> = {
  calendar: '把每個美好時刻，安排妥當。',
  requests: '每一份期待，都值得回應。',
  poster: '你的空檔，也可以很好看。',
  settings: '讓客人一眼認出你。',
};

const tabDescriptions: Record<TabKey, string> = {
  calendar: '預約、空檔與日常，在這裡一目了然。',
  requests: '確認客人的預約，讓下一次相遇如期而至。',
  poster: '選一張喜歡的照片，讓月曆成為下一篇貼文。',
  settings: '設定工作室資訊、專屬預約連結與品牌主題配色。',
};

const actionMessages: Record<string, string> = {
  confirm: '預約已確認，請聯繫客人告知結果',
  reject: '已婉拒並重新開放時段，請聯繫客人',
  close: '時段已關閉',
  reopen: '時段已重新開放',
  cancel: '預約已取消，請聯繫客人',
};

const twNow = () => new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 16);
const dateNow = () => twNow().slice(0, 10);
const monthLabel = (m: string) => `${m.slice(0, 4)} 年 ${Number(m.slice(5))} 月`;
const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

function days(m: string) {
  const [y, mo] = m.split('-').map(Number);
  const start = new Date(y, mo - 1, 1).getDay();
  const count = new Date(y, mo, 0).getDate();
  return Array.from({ length: Math.ceil((start + count) / 7) * 7 }, (_, i) =>
    i >= start && i < start + count
      ? `${m}-${String(i - start + 1).padStart(2, '0')}`
      : '',
  );
}

function changeMonth(m: string, d: number) {
  const [y, mo] = m.split('-').map(Number);
  const dt = new Date(y, mo - 1 + d, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

function Brand() {
  return (
    <Link className="brand" href="/">
      <span className="brand-mark">
        <span />
      </span>
      <span>
        GOODTIME<small>BOOKING STUDIO</small>
      </span>
      <ChevronDown size={15} className="brand-chevron" />
    </Link>
  );
}

async function api(body: ApiPayload): Promise<ApiResponse> {
  const r = await fetch('/api/studio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = (await r.json()) as ApiResponse;
  if (!r.ok) throw Error(j.error || '連線失敗');
  return j;
}

function MonthSwitch({
  month,
  setMonth,
}: {
  month: string;
  setMonth: (s: string) => void;
}) {
  return (
    <div className="month-switch">
      <button
        type="button"
        className="icon-btn"
        aria-label="上個月"
        onClick={() => setMonth(changeMonth(month, -1))}
      >
        <ChevronLeft size={16} />
      </button>
      <h2>{monthLabel(month)}</h2>
      <button
        type="button"
        className="icon-btn"
        aria-label="下個月"
        onClick={() => setMonth(changeMonth(month, 1))}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function Calendar({
  month,
  slots,
  selected,
  onSelect,
  customer = false,
}: {
  month: string;
  slots: Slot[];
  selected: string;
  onSelect: (s: string) => void;
  customer?: boolean;
}) {
  const now = twNow();
  const today = dateNow();
  return (
    <div className={'calendar ' + (customer ? 'customer-calendar' : '')}>
      <div className="weekdays">
        {weekdays.map((d) => (
          <span key={d}>週{d}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {days(month).map((d, i) => {
          if (!d) return <div className="day blank" key={'blank' + i} />;
          const list = slots.filter((s) => s.date === d);
          const open = list.filter(
            (s) => s.status === 'open' && s.date + 'T' + s.time > now,
          );
          return (
            <button
              type="button"
              key={d}
              className={`day ${d === selected ? 'selected' : ''} ${d === today ? 'today' : ''} ${d < today ? 'past' : ''}`}
              onClick={() => onSelect(d)}
              aria-label={`${d}，${open.length} 個可預約時段`}
              aria-pressed={d === selected}
            >
              <span className="day-number">
                {Number(d.slice(8))}
                {d === today && <i>今天</i>}
              </span>
              <div className="day-slots">
                {list.slice(0, 3).map((s) => (
                  <span key={s.id} className={`calendar-slot ${s.status}`}>
                    <b />
                    {s.time}
                    <em>
                      {customer
                        ? statuses[s.status]
                        : s.customer || statuses[s.status]}
                    </em>
                  </span>
                ))}
                {list.length > 3 && (
                  <span className="more">+{list.length - 3} 時段</span>
                )}
                {!list.length && <span className="no-slot">未開放</span>}
              </div>
              <div className="mobile-dots">
                {list.slice(0, 4).map((s) => (
                  <i key={s.id} className={s.status} />
                ))}
                {open.length > 0 && <small>{open.length} 空檔</small>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Welcome() {
  return (
    <div className="welcome">
      <header>
        <Brand />
      </header>
      <div className="stripe-banner">
        <div className="welcome-hero-frame">
          <main className="welcome-main">
            <div>
              <h1>
                把時間留給美好，
                <br />
                把預約交給<span>GOODTIME</span>！
              </h1>
              <p>
                從客人的下一次預約，到你的下一篇貼文。
                <br />
                讓工作室的每一個空檔，都剛剛好。
              </p>
              <div className="welcome-cta-group">
                <a
                  className="btn primary large"
                  href="/signin-with-chatgpt?return_to=%2F"
                  target="_top"
                >
                  建立我的工作室 <ArrowRight size={18} />
                </a>
                <a
                  className="btn pink-btn large"
                  href="/signin-with-chatgpt?return_to=%2F"
                  target="_top"
                >
                  登入管理後台
                </a>
              </div>
              <div className="welcome-features">
                <span>
                  <CalendarDays size={16} /> 預約自動同步
                </span>
                <span>
                  <ImageIcon size={16} /> 空檔一鍵成圖
                </span>
                <span>
                  <Link2 size={16} /> 專屬預約連結
                </span>
              </div>
            </div>
            <div className="welcome-art">
              <div className="art-arch">
                <Flower2 size={140} strokeWidth={0.8} />
                <span>
                  Helping You
                  <br />
                  <i>BUILD, GROW &amp; THRIVE.</i>
                </span>
              </div>
            </div>
          </main>
        </div>
      </div>
      <div className="ribbon-ticker">
        <span>
          從空檔到見面，中間只差一個預約連結｜From an open slot to “See you then!” — all it takes is one booking link.
        </span>
      </div>
    </div>
  );
}

export default function Studio({
  signedIn,
  shopId,
}: {
  signedIn: boolean;
  shopId?: string;
}) {
  const customer = !!shopId;
  const [month, setMonth] = useState(() => dateNow().slice(0, 7));
  const [selected, setSelected] = useState(() => dateNow());
  const [shop, setShop] = useState<Shop | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState<TabKey>('calendar');
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(false);
  const [timeInput, setTimeInput] = useState('10:00, 14:00, 16:00');
  const [newName, setNewName] = useState('我的美甲工作室');
  const [pick, setPick] = useState<Slot | null>(null);
  const [success, setSuccess] = useState<{ bookingId: string } | null>(null);
  const [lastSync, setLastSync] = useState('');
  const [requestFilter, setRequestFilter] = useState('pending');
  const [theme, setTheme] = useState<ThemeColors>(DEFAULT_THEME);

  const loading = useRef(false);
  const monthRef = useRef(month);
  const editingThemeRef = useRef(false);

  useEffect(() => {
    const cacheKey = `goodtime_theme_${shopId || 'owner'}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = parseShopTheme(cached);
        applyThemeToDocument(parsed);
      }
    } catch {}
  }, [shopId]);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const refresh = useCallback(async () => {
    if (!signedIn && !customer) return;
    if (loading.current) return;
    loading.current = true;
    try {
      const r = await fetch(
        `/api/studio?month=${month}${customer ? '&shop=' + encodeURIComponent(shopId!) : ''}`,
        { cache: 'no-store' },
      );
      const j = (await r.json()) as {
        error?: string;
        shop: Shop | null;
        slots: Slot[];
      };
      if (!r.ok) throw Error(j.error || '讀取失敗');
      if (monthRef.current !== month) return;
      setShop(j.shop);
      setSlots(j.slots);
      if (j.shop && !editingThemeRef.current) {
        const nextTheme = parseShopTheme(j.shop.theme);
        setTheme((prev) =>
          prev.primary === nextTheme.primary &&
          prev.accent === nextTheme.accent &&
          prev.bg === nextTheme.bg
            ? prev
            : nextTheme,
        );
        try {
          localStorage.setItem(
            `goodtime_theme_${shopId || 'owner'}`,
            JSON.stringify(nextTheme),
          );
        } catch {}
      }
      setError('');
      setLoaded(true);
      setLastSync(
        new Date().toLocaleTimeString('zh-TW', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Taipei',
        }),
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '連線失敗');
    } finally {
      loading.current = false;
    }
  }, [month, customer, shopId, signedIn]);

  useEffect(() => {
    monthRef.current = month;
    const initId = setTimeout(() => {
      void refresh();
    }, 0);
    const id = setInterval(() => {
      void refresh();
    }, 5000);
    const focus = () => {
      void refresh();
    };
    window.addEventListener('focus', focus);
    return () => {
      clearTimeout(initId);
      clearInterval(id);
      window.removeEventListener('focus', focus);
    };
  }, [refresh, month]);

  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(''), 4500);
      return () => clearTimeout(id);
    }
  }, [toast]);

  async function act(body: ApiPayload, msg: string) {
    setBusy(true);
    try {
      const data = await api(body);
      await refresh();
      setToast(msg);
      return data;
    } catch (e: unknown) {
      setToast(e instanceof Error ? e.message : '操作失敗');
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    const url = location.origin + '/book/' + shop?.id;
    try {
      await navigator.clipboard.writeText(url);
      setToast('專屬預約連結已複製');
    } catch {
      window.prompt('複製專屬預約連結', url);
    }
  }

  function editMonth(m: string) {
    monthRef.current = m;
    setMonth(m);
    if (!selected.startsWith(m)) {
      setSelected(m === dateNow().slice(0, 7) ? dateNow() : m + '-01');
    }
  }

  if (!signedIn && !customer) return <Welcome />;

  const now = twNow();
  const selectedSlots = slots.filter((s) => s.date === selected);
  const futureOpen = slots.filter(
    (s) => s.status === 'open' && s.date + 'T' + s.time > now,
  );
  const pending = slots.filter((s) => s.status === 'pending');
  const booked = slots.filter((s) => s.status === 'booked');

  const notice = (
    <>
      {error && (
        <div className="error" role="alert">
          {error}
          <button type="button" onClick={() => void refresh()}>
            重新連線
          </button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </>
  );

  if (!loaded) {
    return (
      <div className="loading-page">
        <Brand />
        {error ? (
          notice
        ) : (
          <p>
            <RefreshCw className="spin" size={20} /> 正在整理你的時光…
          </p>
        )}
      </div>
    );
  }

  if (!shop && !customer) {
    return (
      <div className="onboarding">
        <Brand />
        {notice}
        <div className="setup-card">
          <span className="eyebrow">WELCOME TO YOUR LITTLE STUDIO</span>
          <Flower2 size={52} strokeWidth={1.2} />
          <h1>
            美好的開始，
            <br />
            從你的工作室名字開始。
          </h1>
          <p>建立後就有專屬預約連結。你可以隨時更改店名。</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await act(
                  { action: 'create', name: newName },
                  '工作室已建立，來新增第一個時段吧',
                );
              } catch {}
            }}
          >
            <label>
              工作室名稱
              <input
                maxLength={50}
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>
            <button type="submit" className="btn primary" disabled={busy}>
              建立工作室 <ArrowRight size={18} />
            </button>
          </form>
          <small>各帳號的工作室獨立管理，客人的資料不會公開。</small>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="loading-page">
        <Brand />
        <h1>找不到這間工作室</h1>
        <p>請確認預約連結是否完整，或向老闆取得新的連結。</p>
      </div>
    );
  }

  if (customer) {
    return (
      <div className="booking-page">
        {notice}
        <header>
          <Brand />
          <span className="booking-label">
            <LockKeyhole size={14} /> 專屬預約頁
          </span>
        </header>
        <div className="booking-hero">
          <div className="booking-hero-inner">
            <span className="eyebrow">A MOMENT JUST FOR YOU</span>
            <h1>{shop.name}</h1>
            <p>{shop.description}</p>
            <span className="subtle-chip">
              選擇時間 · 留下資料 · 等待店家確認
            </span>
          </div>
        </div>
        <div className="ribbon-ticker">
          <span>
            {shop.name} ✿ ONLINE BOOKING ✿ 選擇理想時段・為自己留一點美好時光 ✿{' '}
            {shop.name} ✿ ONLINE BOOKING
          </span>
        </div>
        <main className="booking-layout">
          <section className="card booking-calendar">
            <div className="section-top">
              <div>
                <span className="step">01</span>
                <h2>選一個剛剛好的日子</h2>
              </div>
              <MonthSwitch month={month} setMonth={editMonth} />
            </div>
            <Calendar
              month={month}
              slots={slots}
              selected={selected}
              onSelect={setSelected}
              customer
            />
            <div className="legend">
              <span>
                <i className="open" />
                可預約
              </span>
              <span>
                <i className="pending" />
                待確認
              </span>
              <span>
                <i className="booked" />
                已預約
              </span>
              <span>
                <i className="closed" />
                未開放
              </span>
            </div>
          </section>
          <aside className="card booking-times">
            <span className="step">02</span>
            <h2>
              {Number(selected.slice(5, 7))} 月 {Number(selected.slice(8))} 日
            </h2>
            <p className="muted">選擇你想預約的時間</p>
            <div className="time-choices">
              {selectedSlots.map((s) => {
                const expired = s.date + 'T' + s.time <= now;
                return (
                  <button
                    type="button"
                    className="time-choice"
                    disabled={s.status !== 'open' || expired}
                    key={s.id}
                    onClick={() => {
                      setPick(s);
                      setSuccess(null);
                    }}
                  >
                    <b>{s.time}</b>
                    <span>{expired ? '已過期' : statuses[s.status]}</span>
                    {s.status === 'open' && !expired && (
                      <ArrowUpRight size={15} />
                    )}
                  </button>
                );
              })}
            </div>
            {!selectedSlots.length && (
              <div className="empty">
                <CalendarDays size={30} />
                <p>這天還沒有開放時段</p>
                <small>看看其他日期，找到你的美好時光。</small>
              </div>
            )}
            <div className="booking-tip">
              <CircleHelp size={18} />
              <p>
                送出後會先保留時段，待店家確認後才正式成立。店家將透過你留下的電話聯繫。
              </p>
            </div>
            <small className="sync">
              <span className="green-dot" /> {lastSync} 更新 · 每 5 秒同步
            </small>
          </aside>
        </main>
        <footer>由 GOODTIME BOOKING STUDIO 提供預約服務</footer>
        {pick && (
          <Modal
            title={
              success ? '預約申請已送出' : '留下資料，為你保留時間'
            }
            onClose={() => {
              setPick(null);
              setSuccess(null);
            }}
          >
            {success ? (
              <div className="success">
                <CheckCircle2 size={52} />
                <h3>期待與你相遇。</h3>
                <p>
                  {shop.name}
                  <br />
                  {pick.date} · {pick.time}
                </p>
                <span className="status pending">待店家確認</span>
                <p>請保留此畫面。店家確認後會透過電話聯繫你。</p>
                <small>
                  申請編號 {success.bookingId.slice(0, 8).toUpperCase()}
                </small>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    setPick(null);
                    setSuccess(null);
                  }}
                >
                  完成
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  try {
                    const j = await act(
                      {
                        action: 'book',
                        shopId: shop.id,
                        slotId: pick.id,
                        name: f.get('name'),
                        phone: f.get('phone'),
                        note: f.get('note'),
                      },
                      '已送出預約申請',
                    );
                    if (j.bookingId) setSuccess({ bookingId: j.bookingId });
                  } catch {
                    await refresh();
                  }
                }}
              >
                <div className="booking-summary">
                  <CalendarDays size={20} />
                  {pick.date} <strong>{pick.time}</strong>
                </div>
                <label>
                  姓名
                  <input
                    name="name"
                    required
                    maxLength={40}
                    autoComplete="name"
                    placeholder="請輸入你的姓名"
                  />
                </label>
                <label>
                  聯絡電話
                  <input
                    name="phone"
                    required
                    type="tel"
                    autoComplete="tel"
                    maxLength={25}
                    pattern="[+0-9()\-\s]{7,25}"
                    placeholder="09xx xxx xxx"
                  />
                </label>
                <label>
                  備註 <span>選填</span>
                  <textarea
                    name="note"
                    maxLength={500}
                    placeholder="想做的款式、是否需要卸甲，或想告訴店家的事"
                  />
                </label>
                <p className="privacy">
                  聯絡資料僅提供此工作室處理預約，不會公開顯示。送出後仍需等待店家確認。
                </p>
                <button type="submit" disabled={busy} className="btn primary">
                  {busy ? '送出中…' : '送出預約申請'}
                  <ArrowRight size={17} />
                </button>
              </form>
            )}
          </Modal>
        )}
      </div>
    );
  }

  const navItems: { id: TabKey; name: string; icon: typeof CalendarDays }[] = [
    { id: 'calendar', name: '預約月曆', icon: CalendarDays },
    { id: 'requests', name: '預約管理', icon: Clock3 },
    { id: 'poster', name: '空檔製圖', icon: ImageIcon },
    { id: 'settings', name: '工作室設定', icon: Settings2 },
  ];

  return (
    <div className="app-shell">
      {notice}
      <aside className="sidebar">
        <Brand />
        <div className="nav-heading">MAIN MENU</div>
        <nav>
          {navItems.map((n) => (
            <button
              type="button"
              key={n.id}
              onClick={() => setTab(n.id)}
              className={tab === n.id ? 'active' : ''}
            >
              <n.icon size={18} />
              {n.name}
              {n.id === 'requests' && pending.length > 0 && (
                <b className="nav-count">{pending.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="nav-heading others-heading">OTHERS</div>
        <div className="sidebar-others">
          <button type="button" onClick={copyLink}>
            <Link2 size={17} />
            複製預約連結
          </button>
          <a href={'/book/' + shop.id} target="_blank" rel="noreferrer">
            <ExternalLink size={17} />
            客人預約頁
          </a>
          <a href="/signout-with-chatgpt?return_to=%2F" target="_top">
            <LogOut size={17} />
            登出帳號
          </a>
        </div>
        <div className="sidebar-bottom">
          <div className="little-note">
            <Flower2 size={24} strokeWidth={1.2} />
            <p>
              留一點時間，
              <br />
              給喜歡的日常。
            </p>
            <small>MAKE ROOM FOR GOOD THINGS</small>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-welcome">
            <strong>Welcome, {shop.name}!</strong>
            <div className="breadcrumb">
              我的工作室 <span>·</span> <b>{tabBreadcrumbLabels[tab]}</b>{' '}
              <span>·</span> <i>即時掌握你的工作室預約與美好日常</i>
            </div>
          </div>
          <div className="topbar-right">
            <span className="sync">
              <span className="green-dot" />
              {error ? '連線中斷' : '雲端已同步'}
            </span>
            <button
              type="button"
              className="circle-icon-btn"
              onClick={copyLink}
              title="複製預約連結"
              aria-label="複製預約連結"
            >
              <Copy size={16} />
            </button>
            <a
              className="circle-icon-btn"
              href={'/book/' + shop.id}
              target="_blank"
              rel="noreferrer"
              title="開啟客人預約頁"
              aria-label="開啟客人預約頁"
            >
              <ExternalLink size={16} />
            </a>
            <button
              type="button"
              className="circle-icon-btn has-dot"
              onClick={() => {
                setRequestFilter('pending');
                setTab('requests');
              }}
              title="查看待確認預約"
              aria-label="查看待確認預約"
            >
              <Bell size={16} />
            </button>
            <div className="studio-badge">
              <span className="avatar">{shop.name.slice(0, 1)}</span>
              <div>
                <b>{shop.name}</b>
                <small>獨立工作室</small>
              </div>
            </div>
          </div>
        </header>
        <main className="workspace">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {tab === 'poster'
                  ? 'FROM YOUR CALENDAR · TO YOUR FEED'
                  : 'STUDIO INSIGHTS DASHBOARD'}
              </span>
              <h1>{tabHeadings[tab]}</h1>
              <p>{tabDescriptions[tab]}</p>
            </div>
            <div className="heading-actions">
              <div
                className="search-pill"
                onClick={() => setTab('requests')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setTab('requests');
                }}
              >
                <span>
                  {monthLabel(month)} · 共 {slots.length} 個時段紀錄
                </span>
                <Search size={15} />
              </div>
              {tab === 'calendar' ? (
                <>
                  <button type="button" className="btn" onClick={copyLink}>
                    <Link2 size={16} />
                    複製預約連結
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => setModal(true)}
                  >
                    <Plus size={17} />
                    新增時段
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setTab('calendar')}
                >
                  <SlidersHorizontal size={15} />
                  返回月曆
                </button>
              )}
            </div>
          </div>

          {tab === 'calendar' && (
            <>
              <div className="stats">
                <div className="stat-card">
                  <div className="stat-col-left">
                    <span>
                      本月已確認
                      <br />
                      預約筆數
                    </span>
                    <i className="stat-arrow up">↑</i>
                  </div>
                  <strong>
                    {booked.length.toString().padStart(2, '0')}
                    <small>筆預約</small>
                  </strong>
                  <div className="stat-col-right">
                    <em className="stat-badge green">已確認</em>
                    <p>本月累計</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="stat-card"
                  onClick={() => {
                    setRequestFilter('pending');
                    setTab('requests');
                  }}
                >
                  <div className="stat-col-left">
                    <span>
                      等待你的
                      <br />
                      確認申請
                    </span>
                    <i className="stat-arrow pink">↓</i>
                  </div>
                  <strong>
                    {pending.length.toString().padStart(2, '0')}
                    <small>筆申請</small>
                  </strong>
                  <div className="stat-col-right">
                    <em className="stat-badge pink">
                      {pending.length ? `+${pending.length} 待辦` : '0 待辦'}
                    </em>
                    <p>點擊處理</p>
                  </div>
                </button>
                <div className="stat-card">
                  <div className="stat-col-left">
                    <span>
                      本月可預約
                      <br />
                      開放空檔
                    </span>
                    <i className="stat-arrow up">↑</i>
                  </div>
                  <strong>
                    {futureOpen.length.toString().padStart(2, '0')}
                    <small>個時段</small>
                  </strong>
                  <div className="stat-col-right">
                    <em className="stat-badge green">開放中</em>
                    <p>即時同步</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="poster-promo"
                  onClick={() => setTab('poster')}
                >
                  <div className="promo-left">
                    <span>
                      Available Studio Poster <Sparkles size={14} />
                    </span>
                    <strong>
                      一鍵製作
                      <br />
                      IG 時刻表 <ArrowUpRight size={18} />
                    </strong>
                    <p>
                      本月共有 <b>{futureOpen.length} 個空檔</b> 可匯出成貼文
                    </p>
                  </div>
                  <div className="mini-poster">
                    <Flower2 size={22} strokeWidth={1.3} />
                    <b>{month.slice(5)}</b>
                    <span>AVAILABILITY</span>
                    <div>
                      · · · · · · ·<br />· · · · · · ·
                    </div>
                  </div>
                </button>
              </div>

              <div className="calendar-layout">
                <section className="card calendar-card">
                  <div className="calendar-toolbar">
                    <MonthSwitch month={month} setMonth={editMonth} />
                    <div className="toolbar-end">
                      <button
                        type="button"
                        className="text-btn"
                        onClick={() => {
                          editMonth(dateNow().slice(0, 7));
                          setSelected(dateNow());
                        }}
                      >
                        回到今天
                      </button>
                      <span className="view-pill">{monthLabel(month)}</span>
                    </div>
                  </div>
                  <div className="legend">
                    <span>
                      <i className="open" />
                      可預約
                    </span>
                    <span>
                      <i className="pending" />
                      待確認
                    </span>
                    <span>
                      <i className="booked" />
                      已預約
                    </span>
                    <span>
                      <i className="closed" />
                      未開放
                    </span>
                  </div>
                  <Calendar
                    month={month}
                    slots={slots}
                    selected={selected}
                    onSelect={setSelected}
                  />
                  <div className="calendar-footer">
                    <span>
                      <Clock3 size={13} /> 台北時間 GMT+8
                    </span>
                    <span>點選日期，管理當日時段</span>
                  </div>
                </section>

                <aside className="card day-panel">
                  <div className="day-panel-title">
                    <span className="eyebrow">YOUR DAILY SCHEDULE</span>
                    <h2>
                      {Number(selected.slice(5, 7))} 月{' '}
                      {Number(selected.slice(8))} 日{' '}
                      <small>
                        星期
                        {weekdays[new Date(selected + 'T12:00:00').getDay()]}
                      </small>
                    </h2>
                    <p>
                      {selectedSlots.length} 個時段 ·{' '}
                      {
                        selectedSlots.filter((s) => s.status === 'pending')
                          .length
                      }{' '}
                      筆待確認
                    </p>
                  </div>
                  <div className="slot-list">
                    {selectedSlots.length ? (
                      selectedSlots.map((s) => (
                        <SlotRow key={s.id} slot={s} busy={busy} act={act} />
                      ))
                    ) : (
                      <div className="empty">
                        <CalendarDays size={32} strokeWidth={1.2} />
                        <p>GOODTIME，從這一天開始。</p>
                        <small>新增你可以接待客人的時間。</small>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn dashed"
                    onClick={() => setModal(true)}
                  >
                    <Plus size={16} />
                    為這天新增時段
                  </button>
                  <div className="panel-note">
                    <Sparkles size={15} />
                    <p>
                      客人送出預約後，這裡會自動更新。確認前，時段也會為他保留。
                    </p>
                  </div>
                </aside>
              </div>
            </>
          )}

          {tab === 'requests' && (
            <>
              <div className="stats requests-stats">
                <div className="stat-card">
                  <div className="stat-col-left">
                    <span>
                      待確認
                      <br />
                      預約申請
                    </span>
                    <i className="stat-arrow pink">↓</i>
                  </div>
                  <strong>
                    {pending.length.toString().padStart(2, '0')}
                    <small>筆待確認</small>
                  </strong>
                  <div className="stat-col-right">
                    <em className="stat-badge pink">優先處理</em>
                    <p>當月統計</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-col-left">
                    <span>
                      已確認
                      <br />
                      預約總數
                    </span>
                    <i className="stat-arrow up">↑</i>
                  </div>
                  <strong>
                    {booked.length.toString().padStart(2, '0')}
                    <small>筆已確認</small>
                  </strong>
                  <div className="stat-col-right">
                    <em className="stat-badge green">已安排</em>
                    <p>當月統計</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-col-left">
                    <span>
                      尚可預約
                      <br />
                      開放時段
                    </span>
                    <i className="stat-arrow up">↑</i>
                  </div>
                  <strong>
                    {futureOpen.length.toString().padStart(2, '0')}
                    <small>個空檔</small>
                  </strong>
                  <div className="stat-col-right">
                    <em className="stat-badge green">開放中</em>
                    <p>當月統計</p>
                  </div>
                </div>
              </div>

              <section className="card requests">
                <div className="requests-top">
                  <div>
                    <h3>Recent Booking Activity · 預約與時段明細</h3>
                    <p className="muted">
                      集中檢視並確認客人的預約申請，點選右側按鈕即可更新時段狀態。
                    </p>
                  </div>
                  <div className="requests-controls">
                    <div className="filters">
                      {['pending', 'booked', 'all'].map((s) => (
                        <button
                          type="button"
                          className={requestFilter === s ? 'active' : ''}
                          key={s}
                          onClick={() => setRequestFilter(s)}
                        >
                          {s === 'all' ? '全部時段' : statuses[s]}
                        </button>
                      ))}
                    </div>
                    <MonthSwitch month={month} setMonth={editMonth} />
                  </div>
                </div>
                <div className="table-header">
                  <span>日期與時間</span>
                  <span>客人 / 時段說明</span>
                  <span>聯絡電話</span>
                  <span>備註內容</span>
                  <span>目前狀態</span>
                  <span>操作管理</span>
                </div>
                <div className="request-list">
                  {slots
                    .filter(
                      (s) =>
                        requestFilter === 'all' || s.status === requestFilter,
                    )
                    .map((s) => (
                      <div className="request-item" key={s.id}>
                        <span className="request-date">{s.date}</span>
                        <SlotRow slot={s} busy={busy} act={act} />
                      </div>
                    ))}
                  {!slots.some(
                    (s) =>
                      requestFilter === 'all' || s.status === requestFilter,
                  ) && (
                    <div className="empty">
                      <CheckCircle2 size={36} strokeWidth={1.2} />
                      <h3>
                        目前沒有
                        {requestFilter === 'all'
                          ? '時段'
                          : statuses[requestFilter] + '預約'}
                      </h3>
                      <p>新增開放時段並分享連結，就能開始接收預約。</p>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {tab === 'poster' && (
            <Poster
              shop={shop}
              month={month}
              setMonth={editMonth}
              slots={slots}
              theme={theme}
              notify={setToast}
            />
          )}

          {tab === 'settings' && (
            <div className="settings-grid">
              <ThemeStudioCard
                theme={theme}
                setTheme={setTheme}
                busy={busy}
                onEditingChange={(editing) => {
                  editingThemeRef.current = editing;
                }}
                onSave={async (nextTheme) => {
                  editingThemeRef.current = false;
                  await act(
                    { action: 'theme', theme: nextTheme },
                    '品牌配色已儲存，客人預約頁與製圖已同步更新',
                  );
                  try {
                    localStorage.setItem(
                      `goodtime_theme_${shopId || 'owner'}`,
                      JSON.stringify(nextTheme),
                    );
                  } catch {}
                }}
              />

              <section className="card settings-card">
                <span className="eyebrow">STUDIO PROFILE</span>
                <h2>工作室資訊</h2>
                <p className="muted">這些內容會顯示在客人的專屬預約頁。</p>
                <form
                  key={shop.name + shop.description}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    try {
                      await act(
                        {
                          action: 'settings',
                          name: f.get('name'),
                          description: f.get('description'),
                        },
                        '工作室資訊已儲存',
                      );
                    } catch {}
                  }}
                >
                  <label>
                    工作室名稱
                    <input
                      name="name"
                      defaultValue={shop.name}
                      maxLength={50}
                      required
                    />
                  </label>
                  <label>
                    給客人的一句話
                    <textarea
                      name="description"
                      defaultValue={shop.description}
                      maxLength={200}
                    />
                  </label>
                  <button type="submit" className="btn primary" disabled={busy}>
                    儲存變更 <Check size={16} />
                  </button>
                </form>
              </section>
              <section className="card settings-card">
                <span className="eyebrow">BOOKING LINK &amp; ACCESS</span>
                <h2>你的專屬預約連結</h2>
                <p className="muted">
                  把連結放在 IG 個人簡介，或直接傳給客人。所有預約都會進入這間工作室。
                </p>
                <div className="link-preview">
                  {typeof window !== 'undefined' ? location.origin : ''}/book/
                  {shop.id}
                </div>
                <button type="button" className="btn primary" onClick={copyLink}>
                  <Copy size={16} />
                  複製連結
                </button>
                <a
                  className="btn pink-btn"
                  href={'/book/' + shop.id}
                  target="_blank"
                  rel="noreferrer"
                >
                  開啟預約頁 <ExternalLink size={16} />
                </a>
                <div className="panel-note">
                  <LockKeyhole size={18} />
                  <p>
                    只有目前登入的老闆帳號可管理此工作室。客人只能看到時段狀態。
                  </p>
                </div>
                <a
                  className="btn"
                  href="/signout-with-chatgpt?return_to=%2F"
                  target="_top"
                >
                  <LogOut size={16} />
                  登出帳號
                </a>
              </section>
            </div>
          )}

          <div className="workspace-footer">
            <span>GOODTIME，讓經營多一點從容。</span>
            <span>GOODTIME · BOOKING STUDIO</span>
          </div>
        </main>
      </div>

      {modal && (
        <Modal title="新增開放時段" onClose={() => setModal(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await act(
                  {
                    action: 'add',
                    date: selected,
                    times: timeInput.split(/[,，\s]+/).filter(Boolean),
                  },
                  '開放時段已新增',
                );
                setModal(false);
              } catch {}
            }}
          >
            <p className="muted">只需開始時間，每個時間點接受一位客人。</p>
            <label>
              日期
              <input
                type="date"
                min={dateNow()}
                value={selected}
                required
                onChange={(e) => {
                  const val = e.target.value;
                  setSelected(val);
                  if (val) {
                    const nextMonth = val.slice(0, 7);
                    monthRef.current = nextMonth;
                    setMonth(nextMonth);
                  }
                }}
              />
            </label>
            <label>
              開放時間
              <textarea
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                placeholder="10:00, 14:00, 16:00"
                required
              />
              <small>
                以逗號或換行分隔，採 24 小時制。重複時間會自動略過。
              </small>
            </label>
            <div className="quick-times">
              {['10:00', '12:00', '14:00', '16:00', '18:00'].map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() =>
                    setTimeInput((v) => (v.trim() ? v + ', ' + t : t))
                  }
                >
                  + {t}
                </button>
              ))}
            </div>
            <p className="privacy">
              時間間隔由你安排，系統不會自動計算服務時長。
            </p>
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? '新增中…' : '新增開放時段'}
              <Plus size={17} />
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ThemeStudioCard({
  theme,
  setTheme,
  busy,
  onEditingChange,
  onSave,
}: {
  theme: ThemeColors;
  setTheme: (t: ThemeColors) => void;
  busy: boolean;
  onEditingChange: (editing: boolean) => void;
  onSave: (t: ThemeColors) => Promise<void>;
}) {
  const [activeSlot, setActiveSlot] = useState<ThemeSlotKey>('primary');
  const currentHex = theme[activeSlot];
  const [hsv, setHsv] = useState<[number, number, number]>(() =>
    hexToHsv(currentHex),
  );
  const [hexDraft, setHexDraft] = useState(currentHex);
  const boardRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  function selectSlot(slot: ThemeSlotKey) {
    setActiveSlot(slot);
    setHsv(hexToHsv(theme[slot]));
    setHexDraft(theme[slot]);
  }

  function updateActiveColor(nextHex: string, nextHsv?: [number, number, number]) {
    onEditingChange(true);
    const normalized = nextHex.toLowerCase();
    const updated = { ...theme, [activeSlot]: normalized };
    setTheme(updated);
    setHexDraft(normalized);
    if (nextHsv) setHsv(nextHsv);
  }

  function updateFromBoardEvent(clientX: number, clientY: number) {
    const el = boardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const s = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const v = clamp(100 - ((clientY - rect.top) / rect.height) * 100, 0, 100);
    const nextHsv: [number, number, number] = [
      hsv[0],
      Math.round(s),
      Math.round(v),
    ];
    const nextHex = hsvToHex(nextHsv[0], nextHsv[1], nextHsv[2]);
    updateActiveColor(nextHex, nextHsv);
  }

  function applyWholeTheme(next: ThemeColors) {
    onEditingChange(true);
    setTheme(next);
    setHsv(hexToHsv(next[activeSlot]));
    setHexDraft(next[activeSlot]);
  }

  const slotLabels: { key: ThemeSlotKey; label: string; desc: string }[] = [
    { key: 'primary', label: '① 主色調', desc: '主按鈕・選單・表頭' },
    { key: 'accent', label: '② 點綴色', desc: '標籤・徽章・條紋' },
    { key: 'bg', label: '③ 背景底色', desc: '工作區・預約頁底色' },
  ];

  const derived = derivePalette(theme);

  return (
    <section className="card settings-card theme-studio-card">
      <span className="eyebrow">BRAND COLOR PALETTE · 品牌主題調色盤</span>
      <h2>自訂工作室專屬配色</h2>
      <p className="muted">
        點選下方 3 個核心色槽並拖曳調色盤，系統會自動推算深淺延伸色，並同步套用至管理後台、客人預約頁與 IG 空檔時刻表。
      </p>

      <div className="theme-studio-layout">
        <div>
          <div className="theme-slots">
            {slotLabels.map((s) => (
              <button
                type="button"
                key={s.key}
                className={`theme-slot-btn ${activeSlot === s.key ? 'active' : ''}`}
                onClick={() => selectSlot(s.key)}
              >
                <span
                  className="theme-slot-swatch"
                  style={{ background: theme[s.key] }}
                />
                <span className="theme-slot-meta">
                  <strong>{s.label}</strong>
                  <small>{theme[s.key]}</small>
                </span>
              </button>
            ))}
          </div>

          <div className="palette-box-wrap">
            <div
              ref={boardRef}
              className="sv-board"
              style={{
                background: `linear-gradient(to top, #000000, transparent), linear-gradient(to right, #ffffff, hsl(${hsv[0]}, 100%, 50%))`,
              }}
              onPointerDown={(e) => {
                draggingRef.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                updateFromBoardEvent(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (!draggingRef.current) return;
                updateFromBoardEvent(e.clientX, e.clientY);
              }}
              onPointerUp={() => {
                draggingRef.current = false;
              }}
            >
              <span
                className="sv-thumb"
                style={{
                  left: `${hsv[1]}%`,
                  top: `${100 - hsv[2]}%`,
                  background: currentHex,
                }}
              />
            </div>

            <div className="hue-slider-row">
              <Palette size={16} />
              <input
                type="range"
                className="hue-slider"
                min="0"
                max="360"
                value={hsv[0]}
                aria-label="色相滑桿"
                onChange={(e) => {
                  const nextHue = +e.target.value;
                  const nextHsv: [number, number, number] = [
                    nextHue,
                    hsv[1],
                    hsv[2],
                  ];
                  const nextHex = hsvToHex(nextHue, hsv[1], hsv[2]);
                  updateActiveColor(nextHex, nextHsv);
                }}
              />
            </div>

            <div className="hex-input-row">
              <span>HEX 色碼</span>
              <input
                type="text"
                maxLength={7}
                value={hexDraft}
                onChange={(e) => {
                  const val = e.target.value;
                  setHexDraft(val);
                  if (/^#[0-9a-fA-F]{6}$/.test(val.trim())) {
                    const clean = val.trim().toLowerCase();
                    updateActiveColor(clean, hexToHsv(clean));
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="preset-section">
          <h4>官方精選主題包（一鍵套用）</h4>
          <div className="preset-list">
            {THEME_PRESETS.map((p) => (
              <button
                type="button"
                key={p.name}
                className="preset-pill"
                onClick={() => applyWholeTheme(p.colors)}
              >
                <span className="preset-dots">
                  <i style={{ background: p.colors.primary }} />
                  <i style={{ background: p.colors.accent }} />
                  <i style={{ background: p.colors.bg }} />
                </span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>

          <div className="derived-preview-box">
            <small>系統自動衍生色階預覽（全站即時連動）</small>
            <div className="derived-chips">
              <span
                style={{
                  background: derived['--green'],
                  color: '#ffffff',
                }}
              >
                主按鈕 / 已預約
              </span>
              <span
                style={{
                  background: derived['--green-soft'],
                  color: derived['--green'],
                }}
              >
                可預約空檔
              </span>
              <span
                style={{
                  background: derived['--pink'],
                  color: derived['--green'],
                }}
              >
                點綴徽章 / 次按鈕
              </span>
              <span
                style={{
                  background: derived['--pink-soft'],
                  color: derived['--pink-deep'],
                  border: `1px solid ${derived['--pink']}`,
                }}
              >
                待確認申請
              </span>
              <span
                style={{
                  background: derived['--green-darkest'],
                  color: '#ffffff',
                }}
              >
                列表深色表頭
              </span>
            </div>
          </div>

          <div className="theme-actions">
            <button
              type="button"
              className="btn primary"
              disabled={busy}
              onClick={() => void onSave(theme)}
            >
              儲存品牌配色 <Check size={16} />
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => applyWholeTheme(DEFAULT_THEME)}
            >
              <RotateCcw size={15} />
              重置為預設（松綠薔薇）
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SlotRow({
  slot: s,
  busy,
  act,
}: {
  slot: Slot;
  busy: boolean;
  act: (b: ApiPayload, m: string) => Promise<ApiResponse>;
}) {
  async function go(action: string) {
    if (
      action === 'cancel' &&
      !confirm('確定取消這筆已確認預約並重新開放時段？請另行通知客人。')
    ) {
      return;
    }
    try {
      await act({ action, slotId: s.id }, actionMessages[action] || '已更新');
    } catch {}
  }

  return (
    <div className={'slot-row ' + s.status}>
      <div className="slot-top">
        <div className="slot-time-badge">
          <span className={'slot-avatar ' + s.status}>
            {s.customer ? s.customer.slice(0, 1) : s.time.slice(0, 2)}
          </span>
          <div>
            <strong>{s.time}</strong>
            <small className="slot-date-inline">{s.date}</small>
          </div>
        </div>
        <span className={'status ' + s.status}>{statuses[s.status]}</span>
      </div>
      <div className="slot-main-info">
        {s.customer ? (
          <>
            <h3>{s.customer}</h3>
            <a className="phone" href={'tel:' + s.phone}>
              {s.phone}
            </a>
            {s.note ? (
              <p className="customer-note">{s.note}</p>
            ) : (
              <p className="customer-note muted-note">無備註事項</p>
            )}
          </>
        ) : (
          <>
            <p className="slot-description">
              {s.status === 'open'
                ? '等待下一個美好的預約'
                : '這個時段暫不接受預約'}
            </p>
            <span className="phone">—</span>
            <p className="customer-note muted-note">尚未有客人預約</p>
          </>
        )}
      </div>
      <div className="slot-status-col">
        <span className={'status ' + s.status}>{statuses[s.status]}</span>
      </div>
      <div className="slot-actions">
        {s.status === 'pending' ? (
          <>
            <button
              type="button"
              disabled={busy}
              className="confirm-btn"
              onClick={() => void go('confirm')}
            >
              <Check size={14} />
              接受預約
            </button>
            <button
              type="button"
              disabled={busy}
              className="reject-btn"
              onClick={() => void go('reject')}
            >
              婉拒
            </button>
          </>
        ) : s.status === 'open' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void go('close')}
          >
            關閉時段
          </button>
        ) : s.status === 'closed' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void go('reopen')}
          >
            重新開放
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void go('cancel')}
          >
            取消預約
          </button>
        )}
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => {
      d?.close();
    };
  }, []);
  return (
    <dialog
      className="modal"
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="關閉"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

function Poster({
  shop,
  month,
  setMonth,
  slots,
  theme,
  notify,
}: {
  shop: Shop;
  month: string;
  setMonth: (m: string) => void;
  slots: Slot[];
  theme: ThemeColors;
  notify: (s: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [opacity, setOpacity] = useState(84);
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);
  const [tone, setTone] = useState('cream');

  const now = twNow();
  const available = slots.filter(
    (s) => s.status === 'open' && s.date + 'T' + s.time > now,
  );

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const currentNow = twNow();
    const openSlots = slots.filter(
      (s) => s.status === 'open' && s.date + 'T' + s.time > currentNow,
    );
    const derived = derivePalette(theme);
    const dark = tone === 'cocoa';
    const ink = dark ? theme.bg : theme.primary;
    const accent = dark ? theme.accent : derived['--pink-deep'];
    const [pr, pg, pb] = hexToRgb(theme.primary);
    const [br, bgG, bb] = hexToRgb(theme.bg);
    const [ar, ag, ab] = hexToRgb(theme.accent);

    ctx.fillStyle = dark ? theme.primary : theme.bg;
    ctx.fillRect(0, 0, 1080, 1350);

    if (photo) {
      const scale = Math.max(1080 / photo.width, 1350 / photo.height);
      ctx.drawImage(
        photo,
        ((1080 - photo.width * scale) * posX) / 100,
        ((1350 - photo.height * scale) * posY) / 100,
        photo.width * scale,
        photo.height * scale,
      );
    } else {
      ctx.fillStyle = dark ? derived['--green-mid'] : theme.accent;
      for (let i = 0; i < 27; i += 2) {
        ctx.globalAlpha = dark ? 0.22 : 0.28;
        ctx.fillRect(i * 40, 0, 40, 1350);
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = dark
      ? `rgba(${pr},${pg},${pb},${opacity / 100})`
      : `rgba(${br},${bgG},${bb},${opacity / 100})`;
    ctx.fillRect(42, 42, 996, 1266);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(58, 58, 964, 1234);

    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.font = '600 20px sans-serif';
    ctx.fillText(
      'M A K E   R O O M   F O R   B E A U T I F U L   T H I N G S',
      540,
      105,
    );

    ctx.font = '600 38px serif';
    let title = shop.name;
    while (ctx.measureText(title).width > 860 && title.length > 1) {
      title = title.slice(0, -2) + '…';
    }
    ctx.fillText(title, 540, 165);

    ctx.font = 'italic 96px Georgia, serif';
    ctx.fillStyle = accent;
    ctx.fillText(month.slice(5), 540, 265);

    ctx.fillStyle = ink;
    ctx.font = '500 23px sans-serif';
    ctx.fillText(
      `${month.slice(0, 4)}  ·  ${Number(month.slice(5))} 月可預約時段`,
      540,
      315,
    );

    const cells = days(month);
    const rows = cells.length / 7;
    const x = 84;
    const y = 390;
    const w = 912 / 7;
    const h = 700 / rows;

    ctx.font = '600 21px sans-serif';
    weekdays.forEach((v, i) => ctx.fillText(v, x + w * (i + 0.5), 364));
    ctx.strokeStyle = dark
      ? `rgba(${ar},${ag},${ab},.32)`
      : `rgba(${pr},${pg},${pb},.2)`;
    ctx.lineWidth = 1.5;

    cells.forEach((date, i) => {
      const cx = x + (i % 7) * w;
      const cy = y + Math.floor(i / 7) * h;
      ctx.strokeRect(cx, cy, w, h);
      if (!date) return;
      ctx.fillStyle = ink;
      ctx.textAlign = 'left';
      ctx.font = '600 22px Georgia,serif';
      ctx.fillText(String(Number(date.slice(8))), cx + 12, cy + 28);
      const a = openSlots.filter((s) => s.date === date);
      if (a.length) {
        const cols = a.length > 12 ? 3 : 2;
        const lines = Math.ceil(a.length / cols);
        const font = a.length > 12 ? 13 : 18;
        const lineH = Math.min(25, (h - 45) / Math.max(lines, 1));
        ctx.font = `600 ${font}px sans-serif`;
        ctx.textAlign = 'center';
        a.forEach((s, j) =>
          ctx.fillText(
            s.time,
            cx + (w / cols) * ((j % cols) + 0.5),
            cy + 52 + Math.floor(j / cols) * lineH,
          ),
        );
      } else {
        ctx.globalAlpha = 0.45;
        ctx.font = '17px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('—', cx + w / 2, cy + h / 2 + 10);
        ctx.globalAlpha = 1;
      }
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = ink;
    ctx.font = '600 24px serif';
    ctx.fillText('為喜歡的自己，留一點時間。', 540, 1158);
    ctx.font = '19px sans-serif';
    ctx.fillText('最新空檔請至工作室專屬連結查看・預約需經店家確認', 540, 1204);
    ctx.font = '600 15px sans-serif';
    ctx.fillStyle = accent;
    ctx.fillText(`更新於 ${dateNow()}  ·  GOODTIME`, 540, 1260);
  }, [photo, opacity, posX, posY, tone, month, slots, shop.name, theme]);

  async function upload(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return notify('請選擇圖片檔案');
    if (file.size > 15 * 1024 * 1024) return notify('請選擇 15 MB 以下的圖片');
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      setPhoto(img);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      notify('無法讀取圖片，請使用 JPG、PNG 或 WebP');
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function download() {
    canvas.current?.toBlob((blob) => {
      if (!blob) return notify('圖片產生失敗，請重試');
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = `${shop.name}-${month}-可預約時刻表.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      notify('IG 時刻表已產生，請查看下載項目');
    }, 'image/png');
  }

  return (
    <div className="poster-layout">
      <section className="card poster-controls">
        <span className="eyebrow">MAKE IT YOURS</span>
        <h2>設計你的時刻表</h2>
        <label>01 · 選擇月份</label>
        <MonthSwitch month={month} setMonth={setMonth} />
        <p className="poster-count">
          本月有 <b>{available.length}</b> 個可預約時段，將自動帶入圖片。
        </p>
        <label>02 · 放入喜歡的背景照片</label>
        <label className="upload">
          <Upload size={24} />
          <b>{photo ? '更換背景照片' : '上傳背景照片'}</b>
          <span>JPG、PNG、WebP · 最大 15 MB</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => void upload(e.target.files?.[0])}
          />
        </label>
        {photo && (
          <>
            <button
              type="button"
              className="text-btn"
              onClick={() => setPhoto(null)}
            >
              移除照片
            </button>
            <label>
              左右位置{' '}
              <input
                type="range"
                min="0"
                max="100"
                value={posX}
                onChange={(e) => setPosX(+e.target.value)}
              />
            </label>
            <label>
              上下位置{' '}
              <input
                type="range"
                min="0"
                max="100"
                value={posY}
                onChange={(e) => setPosY(+e.target.value)}
              />
            </label>
          </>
        )}
        <label>03 · 配色與背景明暗</label>
        <div className="tone-options">
          <button
            type="button"
            onClick={() => setTone('cream')}
            className={tone === 'cream' ? 'active' : ''}
          >
            <i />
            淺底奶油
          </button>
          <button
            type="button"
            onClick={() => setTone('cocoa')}
            className={tone === 'cocoa' ? 'active' : ''}
          >
            <i />
            深底主題
          </button>
        </div>
        <label className="range-label">
          文字底色遮罩 <span>{opacity}%</span>
          <input
            type="range"
            min="30"
            max="95"
            value={opacity}
            onChange={(e) => setOpacity(+e.target.value)}
          />
        </label>
        <button type="button" className="btn primary" onClick={download}>
          <Download size={17} />
          下載 IG 貼文圖片
        </button>
        <small className="export-note">PNG · 1080 × 1350 px · 4:5 直式</small>
        <div className="panel-note">
          <CircleHelp size={17} />
          <p>
            下載的是當下空檔。預約有變動時，記得重新產圖。背景照片僅在這次編輯使用，不會上傳雲端。
          </p>
        </div>
      </section>
      <section className="poster-stage">
        <div className="preview-heading">
          <span>
            <span className="green-dot" />
            即時預覽
          </span>
          <small>INSTAGRAM POST · 4:5</small>
        </div>
        <canvas
          ref={canvas}
          width={1080}
          height={1350}
          aria-label={`${month} 可預約時刻表預覽`}
        />
        <p>讓每一個空檔，都帶著你的風格。</p>
      </section>
    </div>
  );
}
