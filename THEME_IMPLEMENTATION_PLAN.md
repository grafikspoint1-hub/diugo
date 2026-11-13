# MY DIU Coastal Theme Implementation Plan

## Frontend audit

The existing website is a Next.js 15 / React 19 app with server-rendered pages and client components. It already has reusable class-based styling across `globals.css`, `overrides.css`, `commerce.css`, `category-highlights.css`, `category-feed.css`, and `emergency.css`. Existing routes and API calls will be preserved.

Current issues found:

- Theme variables are declared in multiple files; the later green/coral override wins over the earlier ocean palette.
- Body typography is Arial and headings do not have a consistent display family.
- Header links disappear below 800px without a replacement mobile navigation.
- Cards, forms, buttons, empty states, and feature sections use several unrelated radius, shadow, and color values.
- The homepage already has the requested structural building blocks, but live-data sections correctly render empty states because the API/database is unavailable.
- Existing sample content is explicitly labelled and must remain visibly non-live until verified API content is available.

## Design tokens

The new theme layer will centralize the requested brand colors, typography stacks, spacing, radii, shadows, focus rings, and responsive breakpoints. The exact colors are:

`#07334A`, `#006B83`, `#079DB9`, `#D8EFF5`, `#F3F8FA`, `#FFFFFF`, `#FFF1D5`, `#FFBC70`, `#123447`, `#66808D`, `#DCE8ED`, `#188B67`, and `#D94B4B`.

## Implementation sequence

1. Add a final `theme.css` layer and load it after existing feature styles.
2. Normalize global body, headings, links, focus states, buttons, cards, forms, sections, and empty states.
3. Restyle the sticky header, hero, search, categories, feed rails, CTAs, footer, account, commerce, classifieds, emergency, and admin surfaces through existing class names.
4. Add a compact mobile navigation row without changing route behavior.
5. Keep all API calls, route paths, sample disclaimers, loading states, and empty states intact.
6. Verify TypeScript, production build, and browser preview at desktop/mobile widths.

## Acceptance criteria

- No backend, Prisma, API contract, or route changes.
- All requested brand colors are represented through centralized tokens.
- Ocean/deep-teal actions have accessible contrast; sunset gold is reserved for highlights.
- Responsive layout remains usable at mobile, tablet, and desktop widths.
- No blank live-content sections are introduced.
- Existing sample content remains explicitly marked as preview-only.
