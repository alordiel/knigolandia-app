# Knigolandia app — design

Reference screens: `docs/design/*.dc.html` (HTML mockups; read colours/sizes from inline styles).
Main.dc.html (Home), Drawer.dc.html, Review.dc.html, Offline.dc.html, Library.dc.html, Settings.dc.html, Tablet.dc.html (iPad home), TabletReview.dc.html (iPad review).

## Colours

### Light
| token | value | use |
|---|---|---|
| background | #F7F6F2 | screen background |
| surface | #FFFFFF | cards, drawer, review screen |
| text | #1C1F1E | primary text |
| textSecondary | #4A4D4B | author, secondary |
| textMuted | #5E615F | meta, labels |
| border | #C9C6BC | outline buttons |
| divider | #ECEAE3 | separators, chips |
| accent | #1F5C4A | primary buttons, active tab, links |
| accentSoft | #E4EFEA | active drawer item / chip bg |
| accentText | #17463A | text on accentSoft |
| star | #C8871E | filled star |
| starEmpty | #D9D4C7 | empty star |
| danger | #9B2C2C | destructive action |

### Dark
| token | value |
|---|---|
| background | #161817 |
| text | #E8E6E0 |
| textMuted | #A9A7A0 |
| quote | #C9C6BC |
| divider | #4A4D4B |
| link / accent | #8CCBB4 |
| star | #E3A43C |
| starEmpty | #4A4D4B |
| offlineBanner bg / text | #3A2E17 / #F2D9A6 |

## Typography
- Display + reading: **Literata** (500, 700) — `@expo-google-fonts/literata`
- UI: **IBM Plex Sans** (400, 500, 600) — `@expo-google-fonts/ibm-plex-sans`

| style | font | size / line-height |
|---|---|---|
| App title | Literata 700 | 22 |
| Review title (phone / iPad) | Literata 700 | 23 / 30, lh 1.28 |
| Card headline | Literata 700 | 16 (iPad 18), lh 1.3 |
| Section title | Literata 700 | 18 (iPad 22) |
| Review body (phone / iPad) | Literata 400 | 17 / 19, lh 1.65–1.7 |
| Body UI | Plex 400–500 | 15 |
| Meta | Plex 400 | 12–13 |
| Section label | Plex 600 | 12, letter-spacing 0.6, uppercase |

## Spacing & shape
- Screen padding 16 (review 20, iPad 24)
- Card: radius 12, padding 12 (iPad 14), gap 14, shadow `0 1 2 rgba(28,31,30,0.06)`
- Cover radius 4; list cover 72×108 (iPad 96×144), detail cover 104×156 (iPad 140×210), related row 104×156 (iPad 128×192)
- Pills / tabs: height 44, radius 22
- Chips: radius 8, padding 6×12
- Touch targets ≥ 44

## Components
- **BookCard**: cover · headline · author · "Превод: …" · StarRating · genre chip · "N мин" · offline badge (download icon + "офлайн", accent)
- **StarRating**: 5 stars, halves via clipped overlay; number after, comma decimal ("4,5"); sizes 14 (card) / 16 (detail) / 20 (iPad detail)
- **CategoryTabs**: two pill buttons, active = accent fill
- **GenreChips**: horizontal scroll, active = accentSoft
- **ActionBar** (review): 3 equal buttons — Отметнато (filled accent when active), Желания, За по-късно
- **RelatedRow**: section title + horizontal ScrollView of cover + title + author
- **OfflineBanner**: rounded, warm amber on dark
- **Drawer**: white, 304 wide; section labels; active item accentSoft; counts right-aligned
- **Settings**: grouped white rounded sections; segmented theme control; switch; text size stepper

## Icons
Stroke icons, 2px, rounded caps (lucide-style): menu, search, back, share, bookmark, heart, download, wifi-off, check, sliders.

## iPad
Same as phone. Home = 2-column card grid (max-width ~1100). Review = centred column, max-width 800.
