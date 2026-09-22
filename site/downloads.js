// Enable a download only when the exact package exists in a published release.
// Static HTML still links to GitHub Releases when JavaScript is unavailable.
const status = document.querySelector('#release-status');
try {
  const manifestResponse = await fetch('./release.json', { signal: AbortSignal.timeout(8000) });
  if (!manifestResponse.ok) throw new Error('Manifest unavailable');
  const manifest = await manifestResponse.json();
  const response = await fetch(`https://api.github.com/repos/${manifest.repository}/releases/tags/v${manifest.version}`, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 404) {
    status.textContent = 'V1.0 is being prepared. Downloads will appear here after the release is published.';
  } else {
    if (!response.ok) throw new Error('Release lookup unavailable');
    const release = await response.json();
    if (release.draft || release.prerelease) throw new Error('Release is not public and stable');
    let available = 0;
    for (const link of document.querySelectorAll('[data-platform]')) {
      const name = manifest.assets[link.dataset.platform];
      const asset = release.assets.find(item => item.name === name);
      const expectedUrl = `https://github.com/${manifest.repository}/releases/download/v${manifest.version}/${name}`;
      if (asset && asset.browser_download_url === expectedUrl) {
        link.href = expectedUrl;
        link.textContent = link.dataset.downloadLabel;
        available++;
      }
    }
    status.textContent = available === 3 ? 'V1.0 · All three installers are available.' : 'Some packages are still being prepared. Check GitHub Releases for availability.';
  }
} catch {
  status.textContent = 'Check GitHub Releases for available packages. Live download status is temporarily unavailable.';
}
