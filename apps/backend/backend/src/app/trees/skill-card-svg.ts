const FONT = "'Segoe UI','Ubuntu','DejaVu Sans',Helvetica,Arial,sans-serif";

const CAT_COLORS: Record<string, [string, string]> = {
    language: ['#7ee787', '#1a7f37'], frontend: ['#79c0ff', '#0969da'],
    backend:  ['#d2a8ff', '#6639ba'], database: ['#ffa657', '#bc4c00'],
    devops:   ['#ff7b72', '#cf222e'], mobile:   ['#7ee787', '#1a7f37'],
    testing:  ['#e3b341', '#7d4e00'], ml:       ['#bc8cff', '#6639ba'],
    tooling:  ['#8b949e', '#57606a'],
};

const CAT_ORDER = ['language', 'frontend', 'backend', 'database', 'devops', 'mobile', 'testing', 'ml', 'tooling'];
const CAT_LABELS: Record<string, string> = {
    language: 'Languages', frontend: 'Frontend', backend: 'Backend',
    database: 'Database', devops: 'DevOps', mobile: 'Mobile',
    testing: 'Testing', ml: 'ML / AI', tooling: 'Tooling',
};

export function buildSkillCardSvg(
    displayHandle: string,
    skills: Array<{ title: string; category: string }>,
    totalCount: number,
    repoCount: number,
    theme: 'dark' | 'light' = 'dark',
): string {
    const W = 495;
    const ML = 16;
    const MR = 16;
    const HEADER_H = 66;
    const ROW_H = 30;
    const SKILLS_TOP_PAD = 10;
    const SKILLS_BOT_PAD = 10;
    const FOOTER_H = 30;
    const CAT_W = 78;
    const SX = ML + CAT_W + 4;    // 98 — where pills start
    const MAX_SX = W - MR;         // 479
    const PILL_PX = 8;             // pill horizontal padding
    const PILL_H = 22;
    const PILL_RX = 11;
    const DOT_R = 3;
    const DOT_TEXT_GAP = 4;
    const PILL_GAP = 8;
    const FONT_W = 6.5;

    const esc = (s: string) => s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    // pill_w: PILL_PX + dot_diam + DOT_TEXT_GAP + text + PILL_PX
    const pillW = (name: string) => PILL_PX + DOT_R * 2 + DOT_TEXT_GAP + Math.ceil(name.length * FONT_W) + PILL_PX;

    const dark = theme !== 'light';
    const c = dark
        ? { bg: '#0d1117', bg2: '#161b22', border: '#30363d', text: '#e6edf3', muted: '#8b949e', dim: '#484f58', accent: '#58a6ff', verified: '#3fb950', divider: '#21262d' }
        : { bg: '#ffffff', bg2: '#f6f8fa', border: '#d0d7de', text: '#1f2328', muted: '#636c76', dim: '#8c959f', accent: '#0969da', verified: '#1a7f37', divider: '#eaeef2' };

    const catColor = (cat: string) => (CAT_COLORS[cat] ?? CAT_COLORS['tooling'])[dark ? 0 : 1];

    const catMap = new Map<string, string[]>();
    for (const s of skills) {
        const cat = s.category || 'tooling';
        if (!catMap.has(cat)) catMap.set(cat, []);
        catMap.get(cat)!.push(s.title);
    }

    const rows = CAT_ORDER
        .filter(cat => catMap.has(cat))
        .slice(0, 6)
        .map(cat => {
            const names = catMap.get(cat)!;
            const fit: string[] = [];
            let x = SX;
            for (let i = 0; i < names.length; i++) {
                const pw = pillW(names[i]);
                const overflowReserve = (names.length - i - 1) > 0 ? 32 : 0;
                if (fit.length > 0 && x + pw + overflowReserve > MAX_SX - 4) {
                    return { cat, fit, overflow: names.length - i };
                }
                fit.push(names[i]);
                x += pw + PILL_GAP;
            }
            return { cat, fit, overflow: 0 };
        });

    const hasSkills = rows.length > 0;
    const skillsH = SKILLS_TOP_PAD + (hasSkills ? rows.length : 1) * ROW_H + SKILLS_BOT_PAD;
    const totalH = HEADER_H + skillsH + FOOTER_H;

    const tx = (x: number, y: number, content: string, size: number, fill: string, opts: { a?: string; w?: string; s?: string } = {}) =>
        `<text x="${x}" y="${y}" font-size="${size}" font-family="${FONT}" fill="${fill}"${opts.a ? ` text-anchor="${opts.a}"` : ''}${opts.w ? ` font-weight="${opts.w}"` : ''}${opts.s ? ` letter-spacing="${opts.s}"` : ''}>${esc(content)}</text>`;

    const parts: string[] = [];

    // Gradient defs (accent divider + verified chip)
    const [g1, g2, g3] = dark
        ? ['#58a6ff', '#bc8cff', '#3fb950']
        : ['#0969da', '#8250df', '#1a7f37'];
    parts.push(`<defs>
  <linearGradient id="ag" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${g1}"/>
    <stop offset="55%" stop-color="${g2}"/>
    <stop offset="100%" stop-color="${g3}"/>
  </linearGradient>
</defs>`);

    // Card BG + border
    parts.push(`<rect width="${W}" height="${totalH}" rx="6" fill="${c.bg}" stroke="${c.border}" stroke-width="1"/>`);

    // Header BG
    parts.push(`<rect width="${W}" height="${HEADER_H}" rx="6" fill="${c.bg2}"/>`);
    parts.push(`<rect y="${HEADER_H - 6}" width="${W}" height="6" fill="${c.bg2}"/>`);

    // Gradient divider (replaces plain line)
    parts.push(`<rect x="${ML}" y="${HEADER_H}" width="${W - ML - MR}" height="1" fill="url(#ag)"/>`);

    // Avatar
    const ACX = ML + 18, ACY = 33;
    parts.push(`<circle cx="${ACX}" cy="${ACY}" r="18" fill="${dark ? '#21262d' : '#e8ecef'}" stroke="${c.border}" stroke-width="1"/>`);
    parts.push(tx(ACX, ACY + 6, displayHandle[0].toUpperCase(), 15, c.accent, { a: 'middle', w: '700' }));

    // Handle + subtitle
    const TX_X = ACX + 18 + 10;
    parts.push(tx(TX_X, 27, `@${displayHandle}`, 15, c.accent, { w: '600' }));
    parts.push(tx(TX_X, 45, 'dev stack', 10, c.muted));

    // Verified chip (right side)
    const RX = W - MR;
    const chipText = `${totalCount} skills`;
    const chipW = Math.ceil(chipText.length * 6.5) + 20;
    const chipX = RX - chipW;
    const chipY = 14;
    parts.push(`<rect x="${chipX}" y="${chipY}" width="${chipW}" height="22" rx="11" fill="${c.verified}" fill-opacity="${dark ? '0.12' : '0.1'}" stroke="${c.verified}" stroke-width="0.5" stroke-opacity="0.6"/>`);
    parts.push(tx(chipX + chipW / 2, chipY + 15, chipText, 11, c.verified, { a: 'middle', w: '600' }));
    if (repoCount > 0) {
        parts.push(tx(RX, 52, `across ${repoCount} repos`, 10, c.muted, { a: 'end' }));
    }

    // Skill rows with pills
    if (hasSkills) {
        let rowY = HEADER_H + SKILLS_TOP_PAD;
        for (const { cat, fit, overflow } of rows) {
            const color = catColor(cat);
            const cy = rowY + ROW_H / 2;
            const textBaseline = Math.round(cy + 4);
            const pillY = Math.round(cy - PILL_H / 2);

            // Category label
            parts.push(tx(ML, textBaseline - 1, CAT_LABELS[cat] ?? cat, 9, color, { w: '600', s: '0.4' }));

            let sx = SX;
            for (const name of fit) {
                const pw = pillW(name);
                const dotCx = sx + PILL_PX + DOT_R;
                const textX = dotCx + DOT_R + DOT_TEXT_GAP;

                // Pill background
                parts.push(`<rect x="${sx}" y="${pillY}" width="${pw}" height="${PILL_H}" rx="${PILL_RX}" fill="${color}" fill-opacity="${dark ? '0.13' : '0.09'}"/>`);
                // Dot
                parts.push(`<circle cx="${Math.round(dotCx)}" cy="${Math.round(cy)}" r="${DOT_R}" fill="${color}"/>`);
                // Name
                parts.push(tx(Math.round(textX), textBaseline, name, 11, color));

                sx += pw + PILL_GAP;
            }

            if (overflow > 0) {
                parts.push(tx(Math.round(sx + 2), textBaseline, `+${overflow}`, 10, c.muted));
            }

            rowY += ROW_H;
        }
    } else {
        const cy = HEADER_H + SKILLS_TOP_PAD + ROW_H / 2;
        parts.push(tx(ML, Math.round(cy + 4), 'No stack yet — add skills to your profile on devmap.sh', 11, c.muted));
    }

    // Footer
    const footerLineY = totalH - FOOTER_H;
    parts.push(`<rect x="${ML}" y="${footerLineY}" width="${W - ML - MR}" height="1" fill="${c.divider}"/>`);
    parts.push(tx(ML, totalH - 11, `devmap.sh/u/${displayHandle}`, 10, c.muted));
    parts.push(tx(RX, totalH - 11, 'devmap.sh', 10, c.dim, { a: 'end' }));

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${totalH}" role="img" aria-label="DevMap skill card for @${esc(displayHandle)}">
  <title>@${esc(displayHandle)} — ${totalCount} skills | DevMap</title>
  ${parts.join('\n  ')}
</svg>`;
}
