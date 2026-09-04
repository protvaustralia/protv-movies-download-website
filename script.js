(function () {
  const REPO = 'protvaustralia/protv-movies-download-website';
  const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`;

  // Snapshot fetched at build time - shown immediately and used as a
  // fallback if the live GitHub API call fails or gets rate-limited, so the
  // page never shows blank/broken download info. The real release has no
  // version tag (tag_name is just "protv") and ships two separate APKs -
  // one for phones, one for TV devices - instead of a single universal one.
  const FALLBACK = {
    tag_name: 'protv',
    name: 'Protv Movies',
    published_at: '2026-09-04T11:29:56Z',
    html_url: 'https://github.com/protvaustralia/protv-movies-download-website/releases/tag/protv',
    body: '',
    assets: [
      {
        name: 'Mobile.App.apk',
        size: 33602050,
        browser_download_url:
          'https://github.com/protvaustralia/protv-movies-download-website/releases/download/protv/Mobile.App.apk',
      },
      {
        name: 'Tv.App.apk',
        size: 33065489,
        browser_download_url:
          'https://github.com/protvaustralia/protv-movies-download-website/releases/download/protv/Tv.App.apk',
      },
    ],
  };

  function formatBytes(bytes) {
    if (!bytes) return '—';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function findAsset(release, pattern) {
    if (!release.assets || !release.assets.length) return null;
    return release.assets.find((a) => a.name && pattern.test(a.name)) || null;
  }

  function mobileAsset(release) {
    return findAsset(release, /mobile/i) || (release.assets || [])[0] || null;
  }

  function tvAsset(release) {
    return findAsset(release, /\btv\b/i) || (release.assets || [])[1] || null;
  }

  function setApp(prefix, asset, dateStr) {
    const sizeStr = asset ? formatBytes(asset.size) : '—';
    const downloadUrl = asset ? asset.browser_download_url : null;

    const sizeEl = document.getElementById(`fact-${prefix}-size`);
    if (sizeEl) sizeEl.textContent = sizeStr;
    const dateEl = document.getElementById(`fact-${prefix}-date`);
    if (dateEl) dateEl.textContent = dateStr;

    document.querySelectorAll(`[data-download="${prefix}"]`).forEach((btn) => {
      if (downloadUrl) btn.href = downloadUrl;
    });

    return { asset, downloadUrl, sizeStr };
  }

  // Every element lookup below is optional-chained - this file runs on both
  // the full site (index.html, all of these ids exist) and the bare TV
  // landing page (tv/index.html, only the tv-* ids exist), so nothing here
  // may assume every id is present.
  function applyRelease(release) {
    const dateStr = formatDate(release.published_at);

    const mobile = setApp('mobile', mobileAsset(release), dateStr);
    const tv = setApp('tv', tvAsset(release), dateStr);

    const heroMeta = document.getElementById('hero-meta');
    if (heroMeta) {
      heroMeta.textContent = mobile.asset
        ? `Free forever · Released ${dateStr} · ${mobile.sizeStr}`
        : 'View the latest release on GitHub';
    }

    const tvStatus = document.getElementById('tv-status');
    const tvMeta = document.getElementById('tv-meta');
    if (tvStatus) {
      tvStatus.textContent = tv.asset
        ? 'Ready — starting your download…'
        : "Couldn't reach the latest release automatically - tap below.";
    }
    if (tvMeta) tvMeta.textContent = tv.asset ? tv.sizeStr : '';

    // TV page only: this URL exists purely so a saved AFTVnews Downloader
    // code never has to change between releases - jump straight to the
    // real TV download the instant we know it, no extra tap needed. The
    // visible button above is the fallback if this redirect doesn't fire
    // (JS blocked, fetch still pending, etc).
    if (tv.downloadUrl && document.body.dataset.autoRedirect === 'true') {
      window.location.replace(tv.downloadUrl);
    }

    const changelogEl = document.getElementById('changelog-body');
    if (!changelogEl) return;
    const body = (release.body || '').trim();
    changelogEl.innerHTML = '';

    const heading = document.createElement('h4');
    heading.textContent = release.name || 'Latest release';
    changelogEl.appendChild(heading);

    const dateLine = document.createElement('p');
    dateLine.className = 'changelog-date';
    dateLine.textContent = `Released ${dateStr}`;
    changelogEl.appendChild(dateLine);

    if (body) {
      const pre = document.createElement('pre');
      pre.textContent = body;
      changelogEl.appendChild(pre);
    } else {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'No written release notes yet.';
      changelogEl.appendChild(p);
    }

    const link = document.createElement('a');
    link.className = 'gh-link';
    link.href = release.html_url || `https://github.com/${REPO}/releases`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'View on GitHub →';
    changelogEl.appendChild(link);
  }

  applyRelease(FALLBACK);

  fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } })
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then((release) => applyRelease(release))
    .catch((err) => {
      console.warn('Falling back to snapshot release info:', err);
    });

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Device picker - shows the matching install-steps panel for whichever
  // device tab is selected (mobile/androidtv/firetv).
  const tabs = document.querySelectorAll('.device-tab');
  const panels = document.querySelectorAll('.device-panel');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const device = tab.dataset.device;
      tabs.forEach((t) => {
        const isActive = t === tab;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', String(isActive));
      });
      panels.forEach((panel) => {
        panel.hidden = panel.dataset.panel !== device;
      });
    });
  });
})();
