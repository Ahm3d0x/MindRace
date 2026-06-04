# Mind Race — UI Design Reference v2.0
> Mobile-First · Complete Visual & Interaction Design Specification

---

## CRITICAL PRINCIPLE: Mobile Is The Primary Platform

Every layout in this document is designed for **mobile first**.
Desktop is an enhancement, not the baseline.

**Primary target:**
- Screen width: 390px (iPhone 14 Pro) — design everything here first
- Screen height: 844px (with safe area insets)
- One-thumb reachability: all primary actions in the **bottom 60%** of the screen
- **Zero scroll on any active game screen** — game board, lobby, and match screens must fit 100% within the viewport with no overflow

**The golden rule:**
> If it requires scrolling during a live game, it's wrong.

---

## 0. Design Philosophy

Mind Race is **not** an educational platform.
Mind Race is a **Knowledge Arena** — a competitive, high-stakes, emotionally charged battleground where intelligence is the weapon.

Every screen must communicate: **Power · Tension · Prestige · Speed**

Reference points: **Valorant Mobile**, **Clash Royale**, **Brawl Stars**, **PUBG Mobile UI**, televised quiz shows — not Kahoot, not Google Forms.

> The player enters an **Arena of Knowledge**, not an exam room.

---

## 1. Design System

### 1.1 Color Palette

```css
/* Core Backgrounds */
--bg-void:        #05060F;              /* Near-black base */
--bg-surface:     #0B0D1A;             /* Cards, panels */
--bg-elevated:    #111528;             /* Modals, active states */
--bg-glass:       rgba(255,255,255,0.04); /* Glassmorphism */

/* Primary Accent — Electric Cyan */
--cyan-glow:      #00F5FF;
--cyan-mid:       #00C8D4;
--cyan-dim:       #007A82;

/* Secondary Accent — Plasma Gold */
--gold-bright:    #FFD700;
--gold-mid:       #C9A227;
--gold-dim:       #6B5300;

/* Team Colors */
--team-alpha:     #00F5FF;   /* Cyan — Team A */
--team-beta:      #FF4D6D;   /* Crimson — Team B */

/* Status */
--correct:        #00FF87;
--wrong:          #FF3B5C;
--warning:        #FFB800;
--neutral:        #6B7FBE;

/* Text */
--text-primary:   #F0F4FF;
--text-secondary: #8A93C0;
--text-muted:     #3D4470;
```

### 1.2 Typography

```css
/* Display — aggressive, condensed */
--font-display: 'Rajdhani', 'Barlow Condensed', sans-serif;
/* Weights: 700 headers, 600 labels */

/* UI / Body — clean, technical */
--font-ui: 'DM Mono', 'IBM Plex Mono', monospace;
/* Weights: 400 body, 500 labels */

/* Score Numbers — ultra-bold */
--font-score: 'Russo One', 'Anton', sans-serif;
```

**Mobile-First Type Scale:**

| Token | Mobile | Tablet | Desktop | Usage |
|---|---|---|---|---|
| `--text-hero` | 48px | 64px | 80px | Match intro titles |
| `--text-display` | 28px | 36px | 48px | Screen headings |
| `--text-title` | 20px | 24px | 32px | Card titles, team names |
| `--text-large` | 16px | 18px | 22px | Question text |
| `--text-body` | 13px | 14px | 15px | UI labels |
| `--text-caption` | 10px | 11px | 12px | Metadata |

> All sizes use `clamp()` for fluid scaling:
> `--text-large: clamp(16px, 4vw, 22px);`

### 1.3 Spacing — Mobile-First Base Unit: 4px

```css
--space-xs:   4px    /* tight internal padding */
--space-sm:   8px    /* between related items */
--space-md:  12px    /* card internal padding (mobile) */
--space-lg:  16px    /* section gaps */
--space-xl:  24px    /* screen padding */
--space-2xl: 40px    /* major separations */
```

Mobile screen padding: `16px` left/right (safe areas respected via `env(safe-area-inset-*)`).

### 1.4 Border Radius

```css
--radius-sm:   6px
--radius-md:  10px
--radius-lg:  16px
--radius-xl:  20px
--radius-pill: 9999px
```

Higher radius on mobile feels native and tactile.

### 1.5 Glow System

```css
--glow-cyan:    0 0 10px rgba(0,245,255,0.4), 0 0 30px rgba(0,245,255,0.12);
--glow-gold:    0 0 10px rgba(255,215,0,0.5), 0 0 28px rgba(255,215,0,0.18);
--glow-correct: 0 0 16px rgba(0,255,135,0.55);
--glow-wrong:   0 0 16px rgba(255,59,92,0.55);
--border-glow:  1px solid rgba(0,245,255,0.15);
```

> On mobile, reduce glow blur radii by 30% to save GPU — use the smaller value in the shorthand.

### 1.6 Glass Morphism Panels

```css
.panel {
  background: var(--bg-glass);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: var(--radius-lg);
}
/* On low-end devices: degrade gracefully to --bg-surface, no blur */
@media (prefers-reduced-motion: reduce) {
  .panel { backdrop-filter: none; background: var(--bg-surface); }
}
```

### 1.7 Safe Area & Viewport Rules

```css
/* Apply to root container on every screen */
.screen {
  width: 100%;
  height: 100dvh;               /* dynamic viewport height — handles mobile browser chrome */
  display: flex;
  flex-direction: column;
  overflow: hidden;              /* NO SCROLL on game screens */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  box-sizing: border-box;
}
```

> **Every game screen uses `height: 100dvh` + `overflow: hidden`.** Content must be sized to fit, not overflow.

### 1.8 Touch Target Rules

| Element | Minimum Touch Target |
|---|---|
| Any tappable icon | 44×44px |
| Buzzer button | 80×80px minimum |
| Answer cards | Full width, min 56px height |
| Bottom nav items | Full tab width, 56px height |
| Power-up cards | 56×72px minimum |
| Close / back buttons | 44×44px |

All touch targets have `touch-action: manipulation` to remove 300ms tap delay.

### 1.9 Background System

Every screen: layered background, never plain color.

**Layer Stack (bottom → top):**
1. `--bg-void` solid fill
2. Perspective grid — 1px lines, 4% opacity, mobile uses wider grid spacing (32px vs 20px desktop)
3. Particle layer — canvas-based, max 25 particles on mobile (vs 60 on desktop)
4. Vignette — radial gradient, transparent center → dark edges
5. Noise — 2% grain texture overlay

**Performance note:** On mobile, particles use `requestAnimationFrame` with a 30fps cap. Grid and noise are static SVG/CSS, never JS-animated.

---

## 2. Screen Specifications

> All wireframes show **mobile (390px wide)** as primary layout.
> Desktop variations are noted as "↗ Desktop:" addendums.

---

### 2.1 Main Screen (Home)

**No scroll. Fits entirely in one viewport.**

#### Mobile Layout (390×844px)

```
┌─────────────────────────┐  ← status bar (safe area)
│ [👤 LVL 12 ████░] [🔔]  │  ← Top Bar     (52px)
├─────────────────────────┤
│                         │
│   [Circuit BG animated] │
│                         │
│      TITAN III  🏆       │  ← Rank display  (40px)
│                         │
│   ╔═══════════════════╗  │
│   ║      PLAY         ║  │  ← Hero CTA     (64px)
│   ╚═══════════════════╝  │
│                         │
│  ┌──────┐  ┌──────┐     │
│  │ SOLO │  │ MULTI│     │  ← Mode grid    (80px)
│  └──────┘  └──────┘     │
│  ┌────────┐  ┌──────┐   │
│  │ TOURNA │  │CUSTOM│   │
│  └────────┘  └──────┘   │
│                         │
├─────────────────────────┤
│ [🎒][🛒][⚔️][🏰][🏆]     │  ← Bottom Nav   (56px + safe area)
└─────────────────────────┘
```

**Height budget (844px total):**
- Safe area top: ~44px
- Top bar: 52px
- Hero area (rank + PLAY + modes): ~580px
- Bottom nav: 56px
- Safe area bottom: ~34px
- **Total: ~766px → fits with ~78px breathing room**

#### Component Details

**Top Bar (52px height)**
- Left: Avatar 36px circle (rank-colored glow ring) + "LVL 12" chip + XP bar 80px wide, 4px tall
- Right: Notification bell (44×44px tap target)
- Rank display sits below top bar, centered, not in top bar (saves horizontal space)

**PLAY Button**
- Width: 100% minus 32px (fills screen width)
- Height: 64px
- Style: `linear-gradient(135deg, #00F5FF, #007AFF)`, text `--bg-void` color
- Font: `--font-display`, 28px, 700, letter-spacing 3px
- Idle: pulse glow animation (2s loop)
- Tap: scale 0.96, vibration via `navigator.vibrate(40)`, haptic feedback

**Mode Grid**
- 2×2 grid, `gap: 10px`
- Each card: `(screenWidth - 32px - 10px) / 2` wide = ~174px, height 72px
- Icon: 28px, label: 13px `--font-display` 600
- No hover states on mobile — use `:active` scale 0.94 instead

**Bottom Navigation (56px + safe area)**
- 5 tabs: Inventory / Store / Battle Pass / Guild / Leaderboard
- Icon only on mobile (no labels to save space), label appears as tooltip on long-press
- Active tab: icon glows `--cyan-glow`, small 4px dot indicator below icon
- Tab width: 20% each (78px), tap target full height

↗ **Desktop:** Top bar expands to include rank + coins inline. Mode grid becomes a horizontal row. Bottom nav becomes a left sidebar.

---

### 2.2 Lobby Screen

**No scroll. Player cards must not overflow.**

#### Mobile Layout

```
┌─────────────────────────┐
│ ← [Room Name]   ⚙️       │  ← Header bar (48px)
├─────────────────────────┤
│   TEAM A    vs  TEAM B  │  ← Team labels (24px)
├──────────────┬──────────┤
│ [Card]       │ [Card]   │  ← Player cards (2-col)
│ [Card]       │ [Card]   │     each card: full col width
│ [Empty…]     │ [Empty…] │     height: ~96px
├─────────────────────────┤
│  MODE: Team Battle 2v2  │  ← Match info (32px)
│  CATEGORY: Science 50%  │
├─────────────────────────┤
│  Code: XKRM  [COPY 📋]  │  ← Room code (40px)
├─────────────────────────┤
│  [LEAVE]    [READY UP ✓]│  ← Action bar (56px + safe area)
└─────────────────────────┘
```

**Height budget:**
- Header: 48px, Team labels: 24px, Cards area: ~300px (3 rows × 96px + gaps)
- Match info: 56px, Room code: 40px, Actions: 56px + 34px safe area
- **Total: ~558px → fits within 844px with ~286px available. Use this breathing room for taller cards or larger avatars.**

#### Player Card (Mobile)

```
┌───────────────────────────────────┐
│ [Avatar 40px] Ahmed        READY ✓ │
│               TITAN III           │
│               ⚗️ Scientist          │
└───────────────────────────────────┘
```
- Height: 72px (compact, no XP bar on lobby card)
- Avatar: 40px with rank glow ring
- Name: `--font-display` 15px 700
- Rank: `--text-secondary` 11px
- Badge: single equipped badge, icon + name 10px
- Ready indicator: right-aligned, green checkmark when ready, amber pulsing dot when not
- Empty slot: dashed border, "Waiting…" 12px centered, opacity 50%

↗ **Desktop:** Cards display in full detail with XP bar, 3 per column visible simultaneously.

---

### 2.3 Match Intro Cinematic

Full-screen overlay. No interactive elements — pure cinematic sequence.

**Sequence (3.5s total, non-skippable first time, skippable thereafter):**

1. **Blackout** (0–0.3s): pure `--bg-void`
2. **Team A** (0.3–1.2s): name slams from left, 48px `--font-display` 700, `--team-alpha` color flood from left 40% opacity. Player avatars appear in a row below, staggered 80ms each.
3. **VS** (1.2–1.6s): "VS" explodes from center, `--font-score` 80px `--gold-bright`, scale 2.0→1.0 with chromatic aberration frame
4. **Team B** (1.6–2.5s): mirror of Team A from right, `--team-beta` flood
5. **Lock-in** (2.5–3.5s): both panels compress to edges, game board materializes in center, particle explosion, crowd cheer peaks
6. **"ROUND 1 · BEGIN"** banner drops in, glitch effect, 300ms, then game starts

**Mobile-specific:** Use `transform: translateZ(0)` on all animated layers for GPU compositing. Avoid animating width/height — use `transform: scaleX()` instead.

---

### 2.4 Game Board — THE MOST CRITICAL SCREEN

**Absolute rule: zero scroll, zero overflow. Everything visible at once.**

#### Mobile Layout (390×844px) — Height Budget Allocation

```
┌─────────────────────────┐  ← safe area top (~44px)
│ [TEAM A]  [⏱ TIMER] [TEAM B] │  ← HUD Bar        52px
├─────────────────────────┤
│ [❓ Science]             │
│                         │
│  Question text here     │  ← Question Zone  ~180px
│  (max 3 lines on mobile)│
│                         │
├─────────────────────────┤
│ ┌─────────┐ ┌─────────┐ │
│ │    A    │ │    B    │ │  ← Answer Zone    ~220px
│ └─────────┘ └─────────┘ │    (2×2 grid)
│ ┌─────────┐ ┌─────────┐ │
│ │    C    │ │    D    │ │
│ └─────────┘ └─────────┘ │
├─────────────────────────┤
│  [⚡][❄][🛡]  [BUZZER]  │  ← Action Bar     ~80px
└─────────────────────────┘  ← safe area bottom (~34px)
```

**Exact pixel budget:**
- Safe top: 44px
- HUD bar: 52px
- Question zone: 180px
- Answer zone: 220px (4 cards in 2×2, each ~100px tall with 8px gap)
- Action bar: 80px
- Safe bottom: 34px
- **Total: 610px of 844px → 234px of flex breathing room distributed between zones**

> Use `flex: 1` on question zone and `flex: 0 0 auto` on everything else so question zone absorbs extra height naturally.

---

#### 2.4.1 HUD Bar (52px)

```
┌──────────────┬──────────────┬──────────────┐
│ TEAM A       │   ⏱  12      │      TEAM B  │
│ 240 pts      │  R2 / Q4     │      180 pts │
│ ❤❤❤  [⚡][❄] │              │  [🛡][?]  ❤❤ │
└──────────────┴──────────────┴──────────────┘
```

**Left panel (Team A):** 38% width
- Team name: 11px `--font-display` 600, `--team-alpha` color
- Score: `--font-score` 22px, white, tight line-height
- Lives: heart icons 12px each, inline row
- Active power-ups: icon chips 18×18px, max 2 visible, "+N" badge if more

**Center panel:** 24% width
- Timer: circular arc, 44×44px, `--font-score` 18px number inside
  - Normal: `--cyan-glow` arc stroke
  - Last 5s: arc turns `--wrong`, number turns red, pulse animation
  - Last 3s: entire HUD bar flashes red border, 1Hz
- Round / Question counter: 9px `--text-secondary`, below timer

**Right panel (Team B):** 38% width, mirrored left panel

↗ **Desktop HUD:** Each team panel is 30% screen width, center is 40%, all elements larger.

---

#### 2.4.2 Question Zone (180px flex)

- Outer panel: `--bg-glass` with `--border-glow`
- Internal padding: 12px
- Category chip: top-left, pill style, 10px `--font-ui`, `--cyan-mid` text, `--bg-elevated` bg
- Question text: `--font-display` 700, `clamp(15px, 4vw, 20px)`, max 4 lines before text truncates with "…" (never overflow)
- For image questions: image takes 60% of zone height, question text below
- For code questions: monospace block, 11px, max 6 lines, horizontal scroll allowed within block (not full screen scroll)
- Question number: top-right, 10px `--text-muted`

**Adaptive text sizing rules:**
```
Question length < 60 chars  → 20px
Question length 60–120 chars → 17px
Question length > 120 chars  → 14px (with expand tap to show full)
```

---

#### 2.4.3 Answer Zone (220px fixed)

**Multiple Choice (2×2 grid — default)**

```
┌──────────────┐  ┌──────────────┐
│ A  [Answer]  │  │ B  [Answer]  │
└──────────────┘  └──────────────┘
┌──────────────┐  ┌──────────────┐
│ C  [Answer]  │  │ D  [Answer]  │
└──────────────┘  └──────────────┘
```
- Card width: `(100% - 8px) / 2` = ~191px
- Card height: `(220px - 8px) / 2` = ~106px
- Letter badge: 24×24px pill, `--bg-elevated`, `--text-secondary`, top-left corner
- Answer text: `--font-display` 13px 600, centered, 2-line max
- Tap states:
  - `:active` → scale 0.95 + 80ms `--ease-snappy`
  - Selected → border `--cyan-glow`, background `rgba(0,245,255,0.08)`
  - Correct → border + bg flash `--correct`, ✓ icon replaces letter badge, no shake
  - Wrong → border + bg flash `--wrong`, ✗ icon, device vibration `navigator.vibrate([50,30,50])`
  - Other cards fade to 40% opacity after answer reveal

**True / False**
```
┌───────────────────────────────────┐
│  ✓   TRUE                         │
└───────────────────────────────────┘
┌───────────────────────────────────┐
│  ✕   FALSE                        │
└───────────────────────────────────┘
```
- 2 cards stacked, each `(220px - 8px) / 2` = 106px tall, full width
- TRUE: left accent `--correct`, icon 32px
- FALSE: left accent `--wrong`, icon 32px

**Ordering Question**
- Items as vertical drag cards, each 44px tall, max 5 items = 220px + gaps
- If more than 5 items: scroll allowed only within answer zone (not full screen)
- Drag handle: left side 32×44px grab zone, `⣿` icon `--text-muted`
- Dragging: item elevates with shadow, other items shift smoothly

**Matching Question**
- Two columns: 48% each, 4% gap
- Left column: items (tap to select)
- Right column: answers (tap to match)
- Connecting line drawn with SVG overlay: 2px neon line, color cycles per pair
- On small screens: if items overflow 220px, show "Scroll to see all" fade at bottom within answer zone only

**Fill in the Blank**
- Single wide input field, full width, 56px tall
- Underline style, no box border
- `--font-display` 18px, cyan caret, placeholder `--text-muted`
- Virtual keyboard considered: when keyboard opens, the whole screen shifts up using `window.visualViewport` listener. HUD bar stays visible, answer zone compresses, BUZZER moves above keyboard.

---

#### 2.4.4 Action Bar (80px)

```
┌─────────────────────────────────────┐
│  [⚡ Joker] [❄ Freeze] [🛡 Shield]  ●BUZZ●  │
└─────────────────────────────────────┘
```

**Power-up strip (left side of buzzer):**
- Power-up cards: 48×60px each, max 3 visible, horizontally arranged
- Excess (4+): a `+N` chip opens a bottom sheet on tap
- Each card: icon 24px centered, name 8px below, cooldown arc overlay, `--bg-surface` bg
- Tap: card activates with animation (see Section 4.3)

**Buzzer Button:**
- Size: 72×72px circle
- Position: right-aligned, vertically centered in action bar
- Default: `--bg-elevated`, `--cyan-glow` border 2px, "BUZZ" label 11px
- Tap: scale 0.88 → spring back, radial shockwave, haptic `navigator.vibrate(80)`
- Buzzed (by current player): button shows player name, turns `--cyan-glow` filled
- Buzzed (by other player): button grays out, shows who buzzed

↗ **Desktop:** Action bar stretches horizontally. Power-ups right side, buzzer center, team consultation controls left.

---

### 2.5 Team Consultation UI (mobile)

**Trigger:** After captain buzzes, a bottom sheet slides up.

**Bottom Sheet design (slides from bottom, covers 55% of screen height):**
```
┌──────────────────────────────┐
│ ▬ [drag handle]               │
│ TEAM VOTE  ⏱ 8s  ████████░░  │
├──────────────────────────────┤
│ 👤 Ahmed    → [A] [B] [C] [D] │
│ 👤 Ali      → [A] ✓           │
│ 👤 Sara     → [A] [B] [C] [D] │
│ 👤 Mohammed  ● thinking…      │
├──────────────────────────────┤
│  CAPTAIN CONFIRMS:            │
│  [A]  [B]  [C]  [D]          │
└──────────────────────────────┘
```
- Sheet background: `--bg-surface` + `--panel` blur
- Drag handle: 40px wide 4px tall pill, centered top
- Timer: linear progress bar across full width, turns red last 3s
- Player rows: 44px height each, avatar 28px, name 13px, vote pills 32×28px
- Voted option: fills with `--cyan-mid`
- Captain confirm buttons: 56px tall, full row, 4 equal columns
- Bottom sheet does NOT cover the question zone entirely — question stays partially visible at top

---

### 2.6 Score Animation System

**+N Fly-up:**
- Originates from center of tapped answer card
- `--font-score` 28px, `--correct` color
- Moves up 60px, fades out over 700ms
- 4–6 spark particles radiate from origin

**Combo Display (top center, above HUD):**
- Appears as a notification banner that slides down then retreats

| Streak | Label | Size | Effect |
|---|---|---|---|
| 3 | 🔥 HOT STREAK | 14px | Amber, flame emoji animation |
| 5 | ⚡ KNOWLEDGE MASTER | 14px | Cyan lightning, glow |
| 8 | 💥 UNSTOPPABLE | 16px | Screen edge flash, gold |
| 10+ | 👑 MIND OVERLORD | 18px | Gold rain, haptic pattern |

- Banner height: 32px, slides in over HUD from top in 200ms, stays 1.5s, slides out
- Does NOT cover game content — animates in the top safe area

**Combo break:** Banner shatters (clip-path animation), haptic `vibrate([30,20,30,20,60])`, resets

---

### 2.7 Power-Up Activation Animations

All animations are overlays that do not interrupt game flow. Max duration: 800ms.

| Power-Up | Mobile Animation |
|---|---|
| **Joker** 🃏 | Card flips up from action bar, lands center screen for 400ms, glows, disappears |
| **Freeze** ❄️ | Opponent's HUD panel gets ice overlay (CSS filter: hue-rotate + blur), timer visually freezes |
| **Shield** 🛡 | Brief hex shield materializes around player's HUD panel, absorbs hit |
| **Reveal Hint** 💡 | One wrong answer dims with ✕, animated 200ms |
| **Double Chance** 🎯 | Second ring appears on chosen card, "2ND" badge |
| **Steal** 🪝 | Hook flies from action bar to opponent panel (CSS translate across screen) |
| **Time Boost** ⏱ | "+10s" flies into timer arc, arc refills |
| **Point Multiplier** ✨ | "×2" badge snaps onto score with sparkle |
| **Category Swap** 🔄 | Category chip spins 360°, new category appears |
| **Skip** ⏭ | Question card slides off-screen right, next loads from left |
| **Block** 🚫 | Red barrier slams over opponent's power-up strip |

---

### 2.8 End Game Screen

**Sequence — each step fills full screen, auto-advances or tap to continue:**

**Step 1: Result (2s)**
- VICTORY: `--correct` colored "VICTORY" 56px, full screen confetti via canvas (max 80 particles on mobile), haptic `vibrate([100,50,100,50,200])`
- DEFEAT: dim red "DEFEAT" 48px, slow particle fall, no haptic

**Step 2: MVP Spotlight (2.5s)**
- Dark full screen, single player card 200px centered with spotlight conic-gradient
- "MVP" badge 32px gold, player avatar 80px with animated rank ring
- One key stat below: e.g., "12 correct · 8.3s avg"

**Step 3: Stats (swipeable — each team/player is a swipe card)**
- Full-screen card, top: round summary stats
- Player rows below, each 52px tall
- Horizontal swipe between Team A stats → Team B stats → head-to-head
- Swipe indicator dots at bottom

**Step 4: Rewards (auto-animated)**
- Coins count up: number increments from 0 to earned amount in 1.2s
- XP bar fills in 800ms with overshoot
- Rank-up: if triggered, full-screen rank-up animation (glitch → new rank badge pops in with gold explosion)

**Step 5: Actions (persistent bottom bar)**
- Full-width "PLAY AGAIN" button (64px)
- Below: two 50% buttons — "SHARE" and "REPLAY"
- Above: any badge unlocks displayed as flip cards

---

### 2.9 Tournament Bracket Screen

**Mobile: vertical bracket (top → bottom), not horizontal.**

```
QUARTER FINALS
┌──────────┐  ┌──────────┐
│ Team A   │  │ Team C   │
│ ── vs ── │  │ ── vs ── │
│ Team B   │  │ Team D   │
└────┬─────┘  └────┬─────┘
     │              │
SEMI FINALS         │
     └──────┬───────┘
        ┌───┴────┐
        │ Team A │
        │ ─ vs ─ │
        │ Team C │
        └───┬────┘
            │
         FINAL 🏆
```

- Each match node: 160px wide, 64px tall card
- Winner card: `--gold-bright` border, dim losing team card
- LIVE match: pulsing `--wrong` border + "LIVE" badge 8px
- Connector lines: 2px `--cyan-dim`, win animation: particle travels up the line
- Bracket horizontally centered, zoom-pinch supported for 16+ team brackets
- Current player's team: cyan border regardless of win/loss

↗ **Desktop:** Horizontal bracket (left → right), all nodes visible simultaneously.

---

### 2.10 Player Profile Screen

**Mobile: compact hero + tabbed sections — NO long scroll on main view.**

```
┌─────────────────────────┐
│ ←  Ahmed Al-Rashidi  ···│  ← header (48px)
├─────────────────────────┤
│  [Avatar 72px]           │
│  TITAN III  🏆           │
│  "The Scientist"         │  ← Hero block (150px)
│  [🏅][🔬][📜][⚡][···]   │  ← badges scrollable row
├─────────────────────────┤
│ [STATS] [HISTORY] [EQUIP]│  ← Tab bar (44px)
├─────────────────────────┤
│                         │
│  Win Rate      73%      │
│  Correct Rate  88%      │  ← Tab Content   (fills remaining height)
│  Avg Time      4.2s     │
│  Best:  ⚗️ Science       │
│  Worst: 🎵 Music         │
│  Fastest Answer: 0.8s   │
│  Tournaments Won: 3     │
│                         │
└─────────────────────────┘
```

- Avatar: 72px, animated rotating rank-color border
- Badges row: horizontal scroll, 36×36px each, no text label (tooltip on long-press)
- Tab content: fills remaining viewport height, scrollable only within the tab pane (not full page)
- Stats: 2-column grid of stat tiles, each 40px tall
- Match history tab: virtualized list (only renders visible rows), each row 52px

---

### 2.11 Battle Pass Screen

**Mobile: vertical tier track — scrollable horizontally within a 120px tall strip.**

```
SEASON 3 — THE DIGITAL STORM
[Progress: Level 34 / 100]  ████████████░░░░░░░

← Scroll tiers → [L30][L35][L40*][L45][L50] →
                              ↑ you are here

[CLAIM REWARD] button if unclaimed
```

**Tier strip (120px tall):**
- Each tier node: 56px hexagon
- 5–6 nodes visible at once, horizontal scroll with snap
- Current node: glowing avatar puck on top of it
- Reward preview: tapping a node opens a bottom sheet (not full screen) with item preview + lock/unlock state

**Above strip:** season name banner (48px) + current level + progress bar

**Below strip:** two panels side by side — Free rewards / Premium rewards for selected tier

↗ **Desktop:** Horizontal scroll tier track at page center with both tracks fully visible.

---

### 2.12 Store Screen

**Mobile: tab → grid, no hero billboard (saves space).**

```
┌─────────────────────────┐
│  STORE            💰 340 │  ← header
├─────────────────────────┤
│ [Avatars][Skins][Titles] │  ← category scroll tabs (48px)
│ [Frames][Bundles]        │
├─────────────────────────┤
│ ┌───────┐  ┌───────┐   │
│ │ item  │  │ item  │   │  ← 2-column grid
│ │       │  │       │   │    each item: ~170px tall
│ │ 🪙 80 │  │ 🎟 1  │   │
│ └───────┘  └───────┘   │
│ ┌───────┐  ┌───────┐   │
│ │  ...  │  │  ...  │   │
│ └───────┘  └───────┘   │
└─────────────────────────┘
(grid scrolls within screen, not full page scroll)
```

- 2-column grid (vs desktop 3-column)
- Item card: `--bg-surface`, rounded `--radius-lg`, preview image top, name + price bottom
- "NEW" badge: pulsing cyan dot top-right of card
- "LIMITED" badge: amber top-right with hours countdown
- Purchase: tapping opens a bottom sheet — item preview (120px), name, price, balance check, "BUY" button 56px tall

---

### 2.13 Spectator Mode

**Mobile-specific layout — landscape orientation preferred, portrait fallback.**

**Portrait (390×844px):**
```
┌─────────────────────────┐
│ [LIVE] Room · R2 Q3 ⏱9  │  ← info bar (40px)
├─────────────────────────┤
│                         │
│    [compressed game     │
│     board — no buzzer,  │  ← game view (500px)
│     answer selections   │
│     shown as color fill]│
│                         │
├─────────────────────────┤
│ [👏][🔥][🤯][💀]  [💬]  │  ← reaction bar (56px)
└─────────────────────────┘
```
- Game board in spectator: answer cards show real-time player selection overlays (% of players who chose each option fills the card)
- Reactions: tapping sends a floating emoji that drifts up the right edge (like TikTok/YouTube Live), max 3 concurrent on screen at once to avoid clutter
- Chat: collapsed by default, "💬 12" badge opens a bottom sheet overlay

---

## 3. Navigation Architecture

### 3.1 Primary Navigation

**Bottom Tab Bar (persistent, except during active game):**
| Tab | Icon | Label |
|---|---|---|
| Home | 🏠 | Home |
| Store | 🛒 | Store |
| Battle Pass | ⚔️ | Pass |
| Guild | 🏰 | Guild |
| Leaderboard | 🏆 | Rank |

During **active game only:** bottom bar is hidden. Back navigation is locked (requires confirm dialog to forfeit).

### 3.2 Screen Flow

```
Home
├── PLAY → Mode Select → Matchmaking → Lobby → Match Intro → Game Board → End Game → Home
├── Solo → Difficulty → Game Board → End Game → Home
├── Tournament → Tournament Hub → Bracket → Lobby → Game Board
└── Custom Room → Create/Join → Lobby → …

Home (bottom nav)
├── Store
├── Battle Pass
├── Guild
└── Leaderboard → Player Profile (tap player)
```

### 3.3 Transition Animations

- **Screen push forward:** slide left + fade in, 280ms `--ease-snappy`
- **Screen pop back:** slide right + fade out, 250ms
- **Bottom sheet open:** slide up from bottom, 320ms `--ease-spring`
- **Bottom sheet close:** slide down, 220ms `--ease-sharp`
- **Tab switch:** cross-fade only (no slide), 160ms — preserves perceived stability
- **Game board enter:** scale from 0.95 + fade in, 350ms — feels like "zooming into the arena"

---

## 4. Animation & Motion System

### 4.1 Timing Curves

```css
--ease-snappy: cubic-bezier(0.25, 0.46, 0.45, 0.94);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1.0);
--ease-sharp:  cubic-bezier(0.4, 0.0, 0.2, 1.0);
--ease-glitch: steps(4, end);
```

### 4.2 Durations

| Interaction | Duration |
|---|---|
| Button tap | 80–100ms |
| Card select | 120ms |
| Bottom sheet | 300ms |
| Screen transition | 280ms |
| Score fly-up | 700ms |
| Match intro | 3500ms |
| Rank-up | 1800ms |

### 4.3 Mobile Performance Rules

- Animate **only** `transform` and `opacity` — never `width`, `height`, `top`, `left`, `margin`
- All animated elements: `will-change: transform` + `transform: translateZ(0)` for GPU compositing
- Particle canvas: 30fps cap on mobile (`setInterval(draw, 33)` or RAF with delta)
- Backdrop-filter: only on panels that are always visible. Never on frequently-appearing/disappearing elements.
- Heavy animations (rank-up, match intro): disable if `prefers-reduced-motion: reduce` is set
- Test on a mid-range Android device (e.g., Snapdragon 665) — not just iPhone

### 4.4 Haptic Feedback Map

```js
// Map of events to vibration patterns
const haptics = {
  tap:           [30],
  answer_select: [40],
  correct:       [80],
  wrong:         [50, 30, 50],
  buzz:          [80],
  rank_up:       [100, 50, 100, 50, 200],
  combo_break:   [30, 20, 30, 20, 60],
  combo_3:       [60],
  victory:       [100, 50, 100, 50, 200],
  defeat:        [200],
};
// Always wrap in try-catch — vibrate not supported on iOS
```

---

## 5. Sound Design Reference

| Event | Character | Duration |
|---|---|---|
| Buzzer press | Hard electronic click | 80ms |
| Correct answer | Rising chime | 600ms |
| Wrong answer | Descending buzz | 400ms |
| Countdown tick (last 5s) | Metronome, louder each second | Per second |
| Final second | Deep pulse + pitch shift | 1000ms |
| Round start | Fanfare sting | 1200ms |
| Round end | Resolution chord | 1500ms |
| Victory | Triumph music sting | 4000ms |
| Defeat | Short, somber | 1500ms |
| Rank up | Ascending electronic fanfare | 2500ms |
| Combo tier | Escalates per tier | 500ms |
| Sudden death | Heartbeat loop + tension strings | Loop |
| Badge unlock | Shimmer notification | 800ms |
| Audience cheer | Crowd wave (spectator/streamer mode) | Loop |

**Rules:**
- Master volume + SFX / Music / Haptics toggles (saved to localStorage)
- No audio plays without a matching visual cue
- Sudden Death replaces background music entirely
- 2+ variations per repeated SFX to avoid fatigue

---

## 6. Accessibility

- Color states (correct/wrong) always paired with icon + text — never color alone
- Body text contrast ratio: minimum 4.5:1
- Large text (18px+ or 14px+ bold): minimum 3:1
- All `prefers-reduced-motion` states defined — game still playable with animations disabled
- Focus rings: `box-shadow: 0 0 0 2px var(--cyan-glow)` — used for keyboard/switch navigation
- Screen reader labels on all icon-only buttons: `aria-label` required
- Minimum font size: 10px — never smaller
- No critical information conveyed by animation alone

---

## 7. Breakpoint Reference

| Breakpoint | Width | Strategy |
|---|---|---|
| **Mobile S** | 360px | Baseline — tighten padding to 12px, reduce font sizes |
| **Mobile M** | 390px | **Primary design target** |
| **Mobile L** | 430px | Same as 390, slightly more breathing room |
| **Tablet** | 768px | 2-column layouts unlock, game board side-by-side panels |
| **Desktop** | 1280px | Full desktop layout — left nav, expanded HUD |
| **TV/Wide** | 1920px+ | Stretch to max-width container 1440px, centered |

**Rule:** Design for 360px → test at 390px → enhance at 768px+.

---

## 8. Component Library Summary

| Component | Mobile Spec | Key Note |
|---|---|---|
| Button (Primary) | Full-width, 56px tall | Use sparingly — max 1 primary per screen |
| Button (Secondary) | 50% width, 48px tall | |
| Button (Icon-only) | 44×44px minimum | Always has `aria-label` |
| Answer Card | 50% width or full width, min 56px | Tap state scales 0.94 |
| Player Card (lobby) | Full column width, 72px tall | Compact: avatar + name + rank only |
| Power-up Card | 48×60px | Cooldown arc overlay |
| Bottom Sheet | 55–90% screen height | Drag handle required |
| Bottom Nav | 56px + safe area | Icon only on mobile |
| Tab Bar | 44px height | Horizontal scroll if 5+ tabs |
| HUD Panel (team) | 38% of screen width | Score large, lives small |
| Timer (circular) | 44×44px | Stroke color reactive |
| Score Fly-up | Absolute positioned | GPU-only transform |
| Combo Banner | Slides into top safe area | 32px max height |
| Notification Toast | Top of screen, 48px | Auto-dismiss 3s |
| Badge | 36×36px (list) / 48×48px (unlock) | Hexagon shape |
| Avatar | 28 / 36 / 48 / 72px sizes | Rank ring always present |
| Rank Badge | Icon + text chip | Unique SVG per rank |
| Progress Bar | 4px height (XP), 6px (BP) | Animated fill on mount |

---

## 9. Agent Checklist — Mobile-First Verification

Before finalizing any screen:

**Layout:**
- [ ] Screen uses `height: 100dvh` + `overflow: hidden`
- [ ] All content visible without scrolling (game screens)
- [ ] Safe area insets applied via `env(safe-area-inset-*)`
- [ ] Tested at 360px width — nothing overflows
- [ ] Primary actions in bottom 60% of screen

**Touch:**
- [ ] All tap targets ≥ 44×44px (buzzer ≥ 80×80px)
- [ ] `touch-action: manipulation` on all interactive elements
- [ ] `:active` press state defined (not `:hover`) for mobile
- [ ] Haptic feedback implemented where specified

**Performance:**
- [ ] Only `transform` + `opacity` animated
- [ ] `will-change: transform` on animated elements
- [ ] Particle count capped (≤ 25 on mobile)
- [ ] No backdrop-filter on frequently toggled elements

**Design:**
- [ ] Background uses layered system (Section 1.9)
- [ ] All text uses correct font tokens
- [ ] Glow uses defined variables only
- [ ] No educational/classroom aesthetics
- [ ] Timer reacts to last 5 seconds correctly
- [ ] Score changes animate with fly-up numbers

**Accessibility:**
- [ ] Correct/wrong states have icon + text, not color alone
- [ ] `prefers-reduced-motion` respected
- [ ] All icon-only buttons have `aria-label`
- [ ] Contrast ratios meet minimums

---

*Mind Race UI Design Reference — v2.0 — Mobile-First — for agent use*
