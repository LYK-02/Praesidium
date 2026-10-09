# Praesidium — Design System: Minimalist Dark

Philosophy: **Atmospheric depth.** Layered slate darks, one warm amber accent, soft ambient glows, glass cards, generous space. Calm, premium, focused — like Linear/Raycast at night. For a *data-dense ops tool*, keep the atmosphere but prioritise legibility: glow is seasoning, not the meal.

## 1. Tokens
```css
:root {
  /* Surfaces (3+ layers, never pure black) */
  --background: #0A0A0F;
  --background-alt: #12121A;
  --muted: #1A1A24;            /* solid card */
  --card: rgba(26,26,36,.6);   /* glass card */

  /* Text */
  --foreground: #FAFAFA;
  --muted-foreground: #71717A;

  /* Accent (interactive + focus only) */
  --accent: #F59E0B;
  --accent-foreground: #0A0A0F;
  --accent-muted: rgba(245,158,11,.15);
  --ring: #F59E0B;

  /* Borders */
  --border: rgba(255,255,255,.08);
  --border-hover: rgba(255,255,255,.15);

  /* Semantic status (Praesidium-specific, softened for dark) */
  --win: #34D399;        --win-muted: rgba(52,211,153,.14);
  --loss: #F87171;       --loss-muted: rgba(248,113,113,.14);
  --review: #F59E0B;     --review-muted: rgba(245,158,11,.14);
  --neutral: #A1A1AA;    --neutral-muted: rgba(161,161,170,.14);

  /* Radius */
  --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px;

  /* Elevation + glow */
  --shadow-md: 0 4px 6px rgba(0,0,0,.3);
  --shadow-lg: 0 10px 15px rgba(0,0,0,.3);
  --glow-sm: 0 0 20px rgba(245,158,11,.15);
  --glow-md: 0 0 40px rgba(245,158,11,.2);
  --glow-btn: 0 0 20px rgba(245,158,11,.4);
  --border-glow: 0 0 0 1px rgba(245,158,11,.3), 0 0 20px rgba(245,158,11,.15);
}
```
**Rule:** amber means "interactive or focused". Win/loss colours mean outcome. Don't mix the roles.

## 2. Typography
| Role | Font | Use |
|---|---|---|
| Display | Space Grotesk | Page titles, stat numbers |
| Body | Inter | UI text |
| Mono | JetBrains Mono | IDs, amounts, timestamps, agent logs, labels |

Scale: xs 12 · sm 14 · base 16 · lg 18 · xl 20 · 2xl 24 · 3xl 32 · 4xl 40 · 5xl 56.
Tracking: headlines `tracking-tight`; mono labels `tracking-wide`. Hierarchy via size/weight, not colour. App screens mostly use sm–2xl; reserve 4xl+ for the login/landing hero.

## 3. Layout
- App shell: left nav (collapsible, 240px) + top bar (sandbox pill, user) + content `max-w-7xl px-6 md:px-8`.
- Landing/login: `max-w-6xl`, sections `py-24 md:py-32`.
- Dashboard rhythm: gap-6; cards float on space, don't touch edges.
- Background: fixed ambient amber orbs (opacity .02–.04, blur 100–150px, smaller on mobile) + noise overlay (.015).
- Responsive: nav → hamburger < md; grid → card list < md; touch targets ≥ 44px.

## 4. Components
**Button (primary):** amber bg, dark text, `rounded-lg h-11 px-6 font-medium`; hover `brightness-110 + var(--glow-btn)`; active `scale-[.98]`; focus-visible ring 2px amber + offset.
**Secondary:** transparent, 1px `rgba(255,255,255,.15)` border, hover `bg-white/5`. **Ghost:** no border, hover `bg-white/5`. **Destructive (Accept claim):** secondary style with `--loss` text/border — never amber.
**Card (glass):** `--card`, `backdrop-blur(8px)`, 1px `--border`, `rounded-lg`, 300ms transition. Interactive hover: border-hover + `scale-[1.01]` (use 1.01–1.02 on small cards only; **no scale on the grid or large panels**).
**Highlighted card:** amber border glow (use for "needs your approval").
**Input:** glass bg, `h-11`, focus `border-amber-500/50 ring-2 ring-amber-500/20`.
**Badge/status pill:** mono xs uppercase, `rounded-full`, muted bg + semantic text, **always icon + label**:
| State | Style |
|---|---|
| Needs response | review (amber) + clock icon |
| Agent working | neutral + pulsing amber dot |
| Awaiting approval | highlighted amber border |
| Submitted / Under review | neutral + upload icon |
| Won / Resolved in favour | win + check |
| Lost / Accepted | loss + x |
**Win-probability bar:** 4px track, fill `--win` ≥ .7, `--review` .4–.7, `--loss` < .4; numeric % in mono beside it.
**Toast:** glass card, bottom-right, 4s, `aria-live="polite"`.
**Icons:** lucide, `strokeWidth={1.5}`, `text-zinc-400`; accent state `text-amber-500`.

## 5. AG Grid theming
Use the Theming API; match tokens:
```ts
import { themeQuartz } from 'ag-grid-community';
export const pdGridTheme = themeQuartz.withParams({
  backgroundColor: '#12121A',
  foregroundColor: '#FAFAFA',
  headerBackgroundColor: '#0A0A0F',
  headerTextColor: '#71717A',
  borderColor: 'rgba(255,255,255,0.08)',
  rowHoverColor: 'rgba(255,255,255,0.04)',
  selectedRowBackgroundColor: 'rgba(245,158,11,0.10)',
  accentColor: '#F59E0B',
  fontFamily: 'Inter, system-ui, sans-serif',
  headerFontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 14,
  rowHeight: 52,
  headerHeight: 44,
  borderRadius: 12,
  wrapperBorderRadius: 12,
});
```
- Mono font for ID/amount/deadline cells; right-align amounts.
- Cell renderers for status pill, win-probability bar, deadline countdown (turns `--loss` < 24h).
- Stable `getRowId`, keyboard navigation on, row click → detail.
- Floating filters subtle; no heavy borders.

## 6. Screens
1. **Login:** centered glass card, ambient orb, wordmark, one amber CTA.
2. **Dashboard:** 4 stat cards (Open disputes · Recovered revenue · Win rate (est.) · Hours saved) → deadline urgency strip → AG Grid.
3. **Dispute detail (hero):** 3 columns ≥ lg — *Facts* | *Evidence timeline* (vertical line with amber glow dot for current step) | *Agent reasoning* (mono stream, citations as inline chips, decision card, approve/accept buttons). Stack on mobile.
4. **Audit log:** grid with expandable JSON row (redacted).
5. **Settings:** thresholds, auto-mode toggle (warns about autonomy), sandbox status.

## 7. Motion
- 200ms ease-out (buttons), 300ms (cards). Gentle fades and soft glows.
- Agent stream: lines fade in; current step has pulsing amber dot.
- Status change: 300ms cross-fade + brief glow on the row.
- **No** bounce or dramatic transforms. Honour `prefers-reduced-motion` (disable scale/pulse, keep fades ≤ 100ms).

## 8. Accessibility
- Text contrast: foreground on background 18.4:1; muted 4.9:1 (AA). Don't use muted for critical info.
- Visible amber `focus-visible` rings on every interactive element.
- Status never by colour alone; ARIA live region for agent stream; grid has accessible names; dialogs trap focus.
- Minimum touch target 44px.

## 9. Tailwind mapping (sketch)
```ts
// tailwind.config.ts
theme: { extend: {
  colors: {
    background:'var(--background)', alt:'var(--background-alt)', muted:'var(--muted)',
    foreground:'var(--foreground)', 'muted-foreground':'var(--muted-foreground)',
    accent:{ DEFAULT:'var(--accent)', foreground:'var(--accent-foreground)' },
    win:'var(--win)', loss:'var(--loss)', review:'var(--review)',
  },
  fontFamily:{ display:['Space Grotesk','system-ui'], sans:['Inter','system-ui'], mono:['JetBrains Mono','monospace'] },
  boxShadow:{ 'glow-btn':'var(--glow-btn)', 'glow-sm':'var(--glow-sm)', 'border-glow':'var(--border-glow)' },
  borderRadius:{ lg:'12px', md:'8px', sm:'6px' },
}}
```

## 10. Do / Don't
**Do:** layer darks, use amber sparingly, keep borders at 8–15% white, give data room, let numbers (mono) be the heroes.
**Don't:** pure black, blue gradients, harsh white-on-black contrast blocks, heavy borders, glow on every element, scale-animating the data grid.
