(() => {
  try {
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('portfolio-theme');
    const cachedProfileRaw = localStorage.getItem('portfolio-profile-cache-v2');
    const cachedProfile = cachedProfileRaw ? JSON.parse(cachedProfileRaw) : null;

    const theme = savedTheme === 'light' || savedTheme === 'dark'
      ? savedTheme
      : (cachedProfile?.default_theme === 'light' ? 'light' : 'dark');
    root.dataset.theme = theme;

    if (cachedProfile) {
      if (cachedProfile.site_title) document.title = cachedProfile.site_title;
      const presets = {
        green: ['#2de69a', '#22c5e9'],
        blue: ['#60a5fa', '#22d3ee'],
        violet: ['#a78bfa', '#f472b6'],
        amber: ['#fbbf24', '#fb7185'],
        rose: ['#fb7185', '#c084fc']
      };
      const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v.trim());
      const [primary, secondary] = cachedProfile.accent_theme === 'custom' && isHex(cachedProfile.custom_accent_primary) && isHex(cachedProfile.custom_accent_secondary)
        ? [cachedProfile.custom_accent_primary.trim(), cachedProfile.custom_accent_secondary.trim()]
        : (presets[cachedProfile.accent_theme] || presets.green);
      root.style.setProperty('--green', primary);
      root.style.setProperty('--cyan', secondary);
    }
  } catch {
    // Ignore storage/JSON errors during early paint
  }
})();
