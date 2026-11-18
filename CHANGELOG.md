# Changelog

All notable changes to this project are documented in this file.

## [1.0.5] - 2026-11-18

### Fixed

- **CNN** showed an error, and even when it loaded, only stories from 2023: CNN stopped updating its own RSS feeds. CNN's live headlines now come through Google News.
- **PBS NewsHour** blocks requests that don't come from a web browser. HATickerSec still tries PBS's own feed first, and when it's blocked, uses PBS NewsHour's live headlines through Google News.

### Added

- Built-in sources can have a second address, used when a site blocks Home Assistant.

## [1.0.4] - 2026-11-18

### Fixed

- Big feeds, or feeds that arrive slowly, were cut short after the first few kilobytes. That showed as **the feed is not valid XML (unclosed token …)** (CNN) or **site sent a web page instead of a feed** (PBS NewsHour). HATickerSec now reads the whole feed.
- Feeds with broken XML (unescaped characters, junk after the end) still show their headlines, read the forgiving way.

## [1.0.3] - 2026-11-18

### Fixed

- **Check for updates** reads the version from the release's own files, not the tag name, so a release tagged with the wrong number still installs. Before, it stopped with "the zip holds version …".

## [1.0.2] - 2026-11-18

### Changed

- **Check for updates** in the panel now installs the newest release straight from GitHub. No links or setup: select **Check for updates**, then **Install**, and restart Home Assistant. The Update entity and the once-per-version pop-up work the same way.
- The **Updates** tab no longer shows an update-link box.

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
- App updates from inside HATickerSec.
- The HATickerSec icon and logo in Home Assistant's lists (Home Assistant 2026.3 and later).
- A ready-to-go dashboard, `dashboards/breaking-news.yaml`.
