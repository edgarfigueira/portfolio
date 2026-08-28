# Edgar Figueira — Scientific Portfolio V7.5.0 (Pages CMS-ready)

This version keeps the V6.2 visual design but separates **content from JavaScript logic** so the repository can be managed with Pages CMS.

## What changed

Editable content is now stored in `data/`:

- `data/profile.json` — profile links, homepage settings, Highlights and metrics
- `data/works.json` — scientific works, BBox, methods, findings and work images
- `data/regions.json` — study-region labels, bounding boxes and polygon vertices
- `data/gallery.json` — Field Atlas images and multilingual captions
- `data/mobility.json` — grants, funding, international training received and research stays
- `data/training.json` — training, workshops and sessions delivered as trainer/co-trainer
- `data/terminology.json` — multilingual geomorphological terminology
- `data/ui-translations.json` — interface text, accessibility labels and page metadata in PT / EN / ES / DE / FR / IT / NO / ZH
- `data/cv.json` — education, professional experience, organisations, technologies and scientific identifiers
- `data/research.json` — research framework, research lines, methods and page links

`js/` now contains only rendering and interaction logic. `js/data-loader.js` loads the JSON files and exposes them to the existing site.

## Multilingual content

Narrative fields in works, mobility and gallery captions are stored as language objects. Example:

```json
{
  "pt": "Descrição em português",
  "en": "English description",
  "es": "",
  "de": "",
  "fr": "",
  "it": "",
  "no": "",
  "zh": ""
}
```

If the selected language is empty, the site falls back to English and then Portuguese. This lets you progressively complete translations without breaking the site.

## Bounding boxes

Works now store BBox values with named fields instead of an anonymous array:

```json
"bbox": {
  "south": 41.565,
  "west": -8.145,
  "north": 41.725,
  "east": -7.920
}
```

The runtime still converts this to Leaflet bounds automatically.

## Adding Atlas photos manually

1. Put the image in `assets/gallery/`.
2. Add an item to `data/gallery.json`.
3. Use `ratio: "auto"` unless you want to force portrait or landscape.

When Pages CMS is enabled, this becomes an image picker/uploader in the CMS.

## Pages CMS

A ready-to-use `.pages.yml` is included at the repository root. It exposes:

- Profile & homepage
- Scientific works
- Study regions, bounding boxes and polygon vertices
- Research page content and repeatable research lines/methods
- CV education, professional experience and scientific identifiers
- Field Atlas
- Funding & mobility
- Training & teaching
- Geomorphological terminology
- Interface translations

The CMS configuration defines an **All site assets & media** source rooted at `assets/`, plus dedicated profile and Field Atlas image sources. Files in nested `assets/` folders can therefore be browsed and managed from Pages CMS. An **Advanced site files** group also exposes the HTML, CSS and JavaScript files through the Pages CMS code editor when a structural change is required.

## Local testing

**Do not open the HTML directly with `file://`**, because this version loads JSON using `fetch()`. Use an HTTP server instead:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`. VS Code Live Server works as well.

## GitHub Pages

This remains a purely static website. Commit the repository to GitHub and enable GitHub Pages for the branch/folder you want to publish. `.nojekyll` is included.

When you are ready to activate Pages CMS, sign in to Pages CMS with GitHub, give the Pages CMS GitHub App access to the repository, and open the repository. The included `.pages.yml` should then define the editor interface.

## Important

The migration changes the content architecture, not the scientific content itself. Existing work summaries remain populated in English and are ready for additional language versions through the CMS. Mobility descriptions already preserve the translations that existed in the previous `i18n.js`.

### V7.1 — navegação mobile
Em ecrãs até 960 px, a navegação principal passa a funcionar como uma sidebar off-canvas que entra da direita. O menu fecha automaticamente ao selecionar uma página, ao tocar fora da sidebar, ao carregar em Escape ou ao regressar a uma largura desktop.

## Responsive navigation (V7.2)

The mobile/tablet menu is now a true body-level off-canvas drawer (breakpoint: 1100 px). It is independent from the sticky header, scrolls internally when the viewport is short, closes after selecting a page, and resets safely when the viewport/orientation changes. This avoids the clipping and stale-layout behaviour seen in V7.1.


## Training & teaching (V7.3)

A dedicated `training.html` page now separates activities delivered **as trainer/co-trainer** from training received under Funding & Mobility. The page is driven by `data/training.json` and is exposed in Pages CMS through the **Training & teaching** content section.

Each entry can store date/year, official title, institution/event, place, duration, role, activity type, multilingual description and an optional external programme/event link. The current dataset includes verified entries for DARIG, the 2024 Geography Days / GeoPlanUM WebGIS programming workshop, the 2026 Casa das Ciências workshop, and Open GIS Days 2020.


## Live citation metrics (V7.4.1)

The homepage now uses two open, no-key citation sources:

- **Crossref** — primary citation count via each DOI's `is-referenced-by-count` metadata.
- **OpenCitations** — complementary incoming-citation count via the Index API.

Only portfolio entries with a DOI in `data/works.json` are queried. `js/metrics.js` sums the counts independently for each source, so the two values are intentionally shown side by side rather than merged. Different totals are expected because the services have different bibliographic coverage and indexing.

Requests are made directly from the visitor's browser and require no paid service, API key or token. A local browser cache limits repeated calls; its default duration is controlled by `metrics.citationCacheHours` in `data/profile.json` (12 hours in this version). When a source is temporarily unavailable, a previously cached complete value is retained; without a cache, the corresponding metric remains unavailable rather than displaying an invented fallback.

ResearchGate is not used as a metrics source. It remains available only through the profile/footer links. The institutional email in `data/profile.json` is the single contact address used by the site and by Crossref polite API requests.

## V7.4.1 — correção das métricas bibliográficas

A integração Crossref + OpenCitations foi tornada tolerante a falhas por DOI. Um pedido individual que falhe já não invalida a métrica completa: são somadas as citações recuperadas com sucesso e registados separadamente os DOI cobertos, não indexados e falhados. O endpoint OpenCitations preserva agora a estrutura `doi:10.xxxx/sufixo` documentada pela API v2. A cache passou para `edgar-figueira-citation-metrics-v3`, forçando uma consulta limpa após a atualização.

Para diagnóstico, a consola do browser apresenta uma tabela por fonte com `doi`, `status`, `count` e eventual erro. Passar o rato sobre cada métrica dinâmica mostra também um resumo `DOI queried / covered / not indexed / failed`.

## Citation metrics diagnostics (V7.4.2)

The homepage now queries Crossref sequentially (respecting its documented API concurrency limits) and OpenCitations sequentially below its unauthenticated rate limit. Crossref requests also include the public institutional email through the `mailto` parameter for polite API access.

For diagnosis in the browser:

- Open `index.html?metricsDebug=1` through the local HTTP server to show an on-page diagnostics panel below the metrics.
- In DevTools Console, type `CITATION_METRICS_DEBUG.help()`.
- `CITATION_METRICS_DEBUG.refresh()` clears only the citation cache and queries both sources again.
- `CITATION_METRICS_DEBUG.dois()` lists the DOI currently used.

The citation cache key was bumped to `edgar-figueira-citation-metrics-v4`, so previous cached results are not reused.


## V7.4.3 — Field Atlas interaction

The Atlas layout was corrected for Mobile S widths (320 px and below) so image cards no longer overlap captions. The desktop lightbox can also be closed by clicking the backdrop outside the photograph, in addition to the close button.

## V7.5.0 — full Pages CMS administration

This version is the hand-off build for Pages CMS. The objective is that routine content changes no longer require editing HTML or JavaScript.

- `settings.content.merge: true` preserves unmanaged JSON keys when Pages CMS saves structured files.
- Norwegian field names are explicitly quoted as `"no"` in `.pages.yml` to avoid YAML boolean ambiguity.
- `data/cv.json` makes education, work experience, organisation links, descriptions, technologies and scientific identifiers repeatable CMS records.
- `data/research.json` makes research lines, methods and internal research-page links repeatable CMS records.
- `data/regions.json` now stores bounding boxes and polygon vertices in a structured form that Pages CMS can edit; the runtime converts them back to the legacy arrays expected by the site.
- Work and study-area counts on the homepage are derived automatically from `works.json`, so adding/removing works through the CMS updates the headline metrics without a second manual edit.
- Page titles, meta descriptions, navigation accessibility labels, map labels, homepage affiliation text and image alt text are connected to the multilingual translation dataset.
- `data/profile.json` has one contact email source (`profile.email`), used for both the visible institutional address and the contact form.
- The RAIZ employment link remains `https://raiz-iifp.pt/` and The Navigator Company remains a separate organisation/link.
- The Pages CMS media browser has access to the complete `assets/` tree.
- The **Advanced site files** CMS group exposes all first-party HTML, CSS and JavaScript files in a code editor for exceptional structural changes.

Pages CMS structured files are protected against whole-file deletion, while repeatable lists inside them can still be added to, reordered, edited and removed in the editor.
