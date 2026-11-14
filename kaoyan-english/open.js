
(async () => {
  const message = document.querySelector('[role=status]');
  const fragment = new URLSearchParams(location.hash.slice(1));
  const secret = fragment.get('key') || history.state?.kaoyanShareKey;
  if (!secret || !/^[A-Za-z0-9_-]{43}$/.test(secret)) {
    message.textContent = '请打开你收到的完整讲义链接。';
    return;
  }
  try {
    if (!crypto.subtle) throw new Error('HTTPS required');
    const secretBytes = Uint8Array.from(atob(secret.replace(/-/g, '+').replace(/_/g, '/') + '='), x => x.charCodeAt(0));
    const target = new URL(document.body.dataset.payload, location.href);
    const response = await fetch(target);
    if (!response.ok) throw new Error('Page unavailable');
    const data = new Uint8Array(await response.arrayBuffer());
    const key = await crypto.subtle.importKey('raw', secretBytes, 'AES-GCM', false, ['decrypt']);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.slice(0, 12) }, key, data.slice(12));
    const markup = new TextDecoder('utf-8', { fatal: true }).decode(plaintext);
    const rememberKey = () => history.replaceState({ kaoyanShareKey: secret }, '');
    rememberKey();
    document.open();
    document.write(markup);
    document.close();
    window.addEventListener('hashchange', rememberKey);
    const pageFolder = new URL('.', location.href);
    const siteRoot = pageFolder.pathname.endsWith('/papers/') ? new URL('..', pageFolder) : pageFolder;
    const paperPath = /^papers\/[0-9]{4}(?:-english-(?:one|two))?\.html$/;
    for (const a of document.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href');
      if (href.startsWith('#')) continue;
      const link = new URL(href, location.href);
      if (link.origin !== siteRoot.origin || !link.pathname.startsWith(siteRoot.pathname)) continue;
      const relative = link.pathname.slice(siteRoot.pathname.length);
      if (relative !== 'index.html' && !paperPath.test(relative)) continue;
      link.hash = 'key=' + secret;
      a.href = link.href;
    }
  } catch {
    message.textContent = '讲义暂时打不开。请用浏览器打开原始分享链接，或联系发链接的人。';
  }
})();
