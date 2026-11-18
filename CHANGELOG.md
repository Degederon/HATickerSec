# Changelog

All notable changes to this project are documented in this file.

## [1.0.1] - 2026-11-18

### Fixed

- Sources that answer with **HTTP 202** (the site is still preparing its feed), such as PBS NewsHour, showed **Couldn't reach … (HTTP 202)**. Any successful answer is accepted now, and a 202 without the feed gets one more try a few seconds later.

## [1.0.0] - 2026-11-18

### Added

- Glass ticker bars for Home Assistant: one smooth bar per news source, with its name, a **NEW** tag and the age of every headline. Click a headline to open the story; hover to pause it.
- Docked tickers along the top or bottom of every Home Assistant screen. Home Assistant makes room for them, so they never cover its toolbars, sidebar or buttons.
- A dashboard card, `custom:hatickersec-card`, with a title, a maximum height and a choice of sources or categories, and a visual editor.
- 147 built-in sources in 16 groups, including the consolidated **Cyber Breaking News** and **Breaking Across the U.S.** tickers, plus custom RSS and Atom feeds and the CISA Known Exploited Vulnerabilities catalog.
- Categories with a title strip and a bar per source; tap the strip to combine them into one bar.
- Keyword alerts in gold, breaking-news detection in red, a glow for new alerts, glass pop-ups on every open screen, five chimes with quiet hours, and Home Assistant notifications with an optional notify service.
- Headline translation with Google, MyMemory, LibreTranslate or DeepL.
- The **HATickerSec** panel in the sidebar, with every setting: news agencies, display, alerts with previews, updates and translation. **Test all agencies** checks every source.
- Per-device settings for the docked tickers, pop-ups and chimes.
- A setup step that picks up to four categories and where the tickers go.
- Entities: an on/off switch, **Show only NEW headlines**, **Pause scrolling** and **Hide docked tickers** switches, **Refresh now** and **Check for updates** buttons, **Latest alert**, **Headlines** and **Last updated** sensors, and an **Update** entity.
- The `hatickersec_alert` event, and the `hatickersec.refresh`, `hatickersec.preview`, `hatickersec.test_alert` and `hatickersec.toggle_category` actions.
- Updates from your own SharePoint, OneDrive or web folder, checked against the size and `sha256` in `latest.json`.
- The HATickerSec icon and logo in Home Assistant's lists (Home Assistant 2026.3 and later).
- A ready-to-go dashboard, `dashboards/breaking-news.yaml`.
