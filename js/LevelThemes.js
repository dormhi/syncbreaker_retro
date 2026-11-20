/* =========================================
   LevelThemes.js — Per-Level Visual Themes
   Unique neon palettes, code tags, icons, particles, backgrounds
   CG Concept: Themed rendering, color palettes
   ========================================= */

const LEVEL_THEMES = {

    // Level 1: CLEAR_LOGS — Terminal emerald, binary data rain
    1: {
        codeTag: 'LOG_01',
        icon: '📄', iconSize: 22,
        zoneColor: '#22c55e',
        accentSecondary: '#34d399',
        zoneBg: 'rgba(34,197,94,0.18)',
        barGlow: '#22c55e',
        indicatorColor: '#4ade80',
        particleSymbols: ['0', '1', '{', '}'],
        hitWords: { perfect: 'PURGED', good: 'CLEARED', miss: 'ERROR' },
        hitColors: { perfect: '#22c55e', good: '#4ade80', miss: '#ef4444' },
        soundType: 'sine', soundFreq: 600,
        bgType: 'binary',
        bgColor: '#22c55e',
        bgChars: '01001101010011100101001',
    },

    // Level 2: CLOSE_PORTS — Amber gold, scanning port lines
    2: {
        codeTag: 'PRT_02',
        icon: '🚪', iconSize: 22,
        zoneColor: '#f59e0b',
        accentSecondary: '#fbbf24',
        zoneBg: 'rgba(245,158,11,0.18)',
        barGlow: '#f59e0b',
        indicatorColor: '#fbbf24',
        particleSymbols: ['▮', '█', '▬', '|'],
        hitWords: { perfect: 'SEALED', good: 'CLOSED', miss: 'BREACH' },
        hitColors: { perfect: '#f59e0b', good: '#fbbf24', miss: '#ef4444' },
        soundType: 'square', soundFreq: 400,
        bgType: 'scanlines',
        bgColor: '#f59e0b',
    },

    // Level 3: REMOVE_MALWARE — Crimson neon, floating threats
    3: {
        codeTag: 'MAL_03',
        icon: '☠', iconSize: 22,
        zoneColor: '#ef4444',
        accentSecondary: '#fb7185',
        zoneBg: 'rgba(239,68,68,0.18)',
        barGlow: '#ef4444',
        indicatorColor: '#f87171',
        particleSymbols: ['☠', '✕', '×', '⚠'],
        hitWords: { perfect: 'DESTROYED', good: 'REMOVED', miss: 'INFECTED' },
        hitColors: { perfect: '#ef4444', good: '#f87171', miss: '#7f1d1d' },
        soundType: 'sawtooth', soundFreq: 300,
        bgType: 'virus',
        bgColor: '#ef4444',
        bgChars: '☠🐛⚠',
    },

    // Level 4: RESET_CREDS — Electric cyan, falling cipher chars
    4: {
        codeTag: 'CRD_04',
        icon: '🔑', iconSize: 20,
        zoneColor: '#06b6d4',
        accentSecondary: '#38bdf8',
        zoneBg: 'rgba(6,182,212,0.18)',
        barGlow: '#06b6d4',
        indicatorColor: '#38bdf8',
        particleSymbols: ['*', '#', '@', '&'],
        hitWords: { perfect: 'RESET', good: 'CHANGED', miss: 'LEAKED' },
        hitColors: { perfect: '#06b6d4', good: '#22d3ee', miss: '#ef4444' },
        soundType: 'sine', soundFreq: 700,
        bgType: 'password',
        bgColor: '#06b6d4',
        bgChars: '***•••●●●',
    },

    // Level 5: FIREWALL — Solar orange, rising embers
    5: {
        codeTag: 'FWL_05',
        icon: '🔥', iconSize: 22,
        zoneColor: '#f97316',
        accentSecondary: '#fb923c',
        zoneBg: 'rgba(249,115,22,0.18)',
        barGlow: '#f97316',
        indicatorColor: '#fb923c',
        particleSymbols: ['█', '▓', '░', '■'],
        hitWords: { perfect: 'FORTIFIED', good: 'BUILT', miss: 'BREACHED' },
        hitColors: { perfect: '#f97316', good: '#fb923c', miss: '#ef4444' },
        soundType: 'triangle', soundFreq: 200,
        bgType: 'embers',
        bgColor: '#f97316',
    },

    // Level 6: CUT_ACCESS — Ultraviolet, electric arcs
    6: {
        codeTag: 'CUT_06',
        icon: '⚡', iconSize: 22,
        zoneColor: '#a855f7',
        accentSecondary: '#c084fc',
        zoneBg: 'rgba(168,85,247,0.18)',
        barGlow: '#a855f7',
        indicatorColor: '#c084fc',
        particleSymbols: ['⚡', '✂', '—', '~'],
        hitWords: { perfect: 'SEVERED', good: 'CUT', miss: 'LINKED' },
        hitColors: { perfect: '#a855f7', good: '#c084fc', miss: '#ef4444' },
        soundType: 'square', soundFreq: 500,
        bgType: 'electric',
        bgColor: '#a855f7',
    },

    // Endless mode — Astral gold & cyan
    999: {
        codeTag: 'INF_99',
        icon: '∞', iconSize: 22,
        zoneColor: '#f59e0b',
        accentSecondary: '#38bdf8',
        zoneBg: 'rgba(245,158,11,0.18)',
        barGlow: '#f59e0b',
        indicatorColor: '#fbbf24',
        particleSymbols: ['∞', '◆', '●', '▲'],
        hitWords: { perfect: 'PERFECT', good: 'GOOD', miss: 'MISS' },
        hitColors: { perfect: '#f59e0b', good: '#fbbf24', miss: '#ef4444' },
        soundType: 'sine', soundFreq: 500,
        bgType: 'binary',
        bgColor: '#f59e0b',
        bgChars: '∞01∞10∞11∞00',
    }
};

const DEFAULT_THEME = LEVEL_THEMES[1];

function getLevelTheme(levelId) {
    return LEVEL_THEMES[levelId] || DEFAULT_THEME;
}
