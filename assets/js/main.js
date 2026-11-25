import { isSupabaseConfigured, supabase, supabaseClientError } from './supabase.js';
import {
  ACCENT_PRESETS,
  CACHE_KEYS,
  DEFAULT_SECTION_ORDER,
  defaultProfile,
  defaultProjects
} from './site-defaults.js';

const setText = (element, value) => {
  if (element && value !== null && value !== undefined) element.textContent = String(value);
};

let activeProjects = [];
let activeCategory = 'all';
let activeProfile = { ...defaultProfile };
const pageLoadTimestamp = Date.now();
let lastContactSentAt = 0;

/**
 * Validates URLs strictly: allows #anchors, safe relative paths (/assets/... or assets/...),
 * HTTPS URLs, and mailto: links (when allowMailto is true). Blocks javascript:/data:/vbscript:/http:.
 */
export function safeUrl(value, { allowMailto = false, allowAnchor = true } = {}) {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (allowAnchor && /^#[a-z\d_-]*$/i.test(raw)) return raw;
  if (/^(?:assets\/|\/(?!\/))[a-z0-9._~:/?#[\]@!$&'()*+,;=%-]+$/i.test(raw)) {
    return raw;
  }
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:') return parsed.href;
    if (allowMailto && parsed.protocol === 'mailto:') return parsed.href;
    return '';
  } catch {
    return '';
  }
}

function isValidHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim());
}

function resolveAccentColors(profile) {
  if (
    profile.accent_theme === 'custom' &&
    isValidHexColor(profile.custom_accent_primary) &&
    isValidHexColor(profile.custom_accent_secondary)
  ) {
    return [profile.custom_accent_primary.trim(), profile.custom_accent_secondary.trim()];
  }
  return ACCENT_PRESETS[profile.accent_theme] || ACCENT_PRESETS.green;
}

function applyThemeAccent(profile) {
  const [primary, secondary] = resolveAccentColors(profile);
  document.documentElement.style.setProperty('--green', primary);
  document.documentElement.style.setProperty('--cyan', secondary);
  return [primary, secondary];
}

function updateDynamicFavicon(mark, primary) {
  const link = document.querySelector('[data-dynamic-favicon]');
  if (!link) return;
  const cleanMark = String(mark || 'YN').replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'YN';
  const color = isValidHexColor(primary) ? primary : '#2de69a';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="${color}"/><text x="32" y="39" fill="#06120e" font-family="Arial,sans-serif" font-size="18" font-weight="700" text-anchor="middle">${cleanMark}</text></svg>`;
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function updateStructuredData(profile) {
  const existing = document.getElementById('portfolio-jsonld');
  const socialSameAs = [
    profile.github_url,
    profile.linkedin_url,
    profile.x_url,
    profile.website_url,
    profile.youtube_url
  ]
    .map((u) => safeUrl(u, { allowAnchor: false }))
    .filter(Boolean);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.role,
    description: profile.site_description,
    url: window.location.origin,
    sameAs: socialSameAs
  };

  const script = existing || document.createElement('script');
  script.id = 'portfolio-jsonld';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema);
  if (!existing) document.head.appendChild(script);
}

function renderHeroStats(stats, visible) {
  const container = document.querySelector('[data-hero-stats]');
  if (!container) return;
  const items = Array.isArray(stats)
    ? stats.filter((s) => s && (String(s.value || '').trim() || String(s.label || '').trim()))
    : [];
  container.replaceChildren();
  container.hidden = visible === false || items.length === 0;
  if (container.hidden) return;

  items.slice(0, 6).forEach((item) => {
    const box = document.createElement('div');
    box.className = 'hero-stat';
    const strong = document.createElement('strong');
    strong.textContent = item.value || '';
    const label = document.createElement('span');
    label.textContent = item.label || '';
    box.append(strong, label);
    container.append(box);
  });
}

function renderExperience(experienceList, certificationsList) {
  const expContainer = document.querySelector('[data-experience-list]');
  const certPanel = document.querySelector('[data-certifications-panel]');
  const certContainer = document.querySelector('[data-certifications-list]');
  const layout = document.querySelector('.experience-layout');

  const items = Array.isArray(experienceList)
    ? experienceList.filter((item) => item && (item.role || item.company))
    : [];
  const certs = Array.isArray(certificationsList)
    ? certificationsList.filter((cert) => cert && cert.title)
    : [];

  if (expContainer) {
    expContainer.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-projects';
      empty.textContent = 'Experience details can be added from the admin dashboard.';
      expContainer.append(empty);
    } else {
      items.forEach((item) => {
        const card = document.createElement('article');
        card.className = 'experience-card';

        const top = document.createElement('div');
        top.className = 'experience-top';
        const role = document.createElement('h3');
        role.className = 'experience-role';
        role.textContent = item.role || 'Role';
        top.append(role);
        if (item.period) {
          const period = document.createElement('span');
          period.className = 'experience-period';
          period.textContent = item.period;
          top.append(period);
        }

        const meta = document.createElement('p');
        meta.className = 'experience-meta';
        meta.textContent = [item.company, item.location].filter(Boolean).join(' · ');

        card.append(top);
        if (meta.textContent) card.append(meta);

        if (item.summary) {
          const summary = document.createElement('p');
          summary.className = 'experience-summary';
          summary.textContent = item.summary;
          card.append(summary);
        }

        const highlights = Array.isArray(item.highlights) ? item.highlights.filter(Boolean) : [];
        if (highlights.length) {
          const tags = document.createElement('div');
          tags.className = 'experience-tags';
          highlights.slice(0, 8).forEach((tagText) => {
            const span = document.createElement('span');
            span.textContent = tagText;
            tags.append(span);
          });
          card.append(tags);
        }

        expContainer.append(card);
      });
    }
  }

  if (certPanel && certContainer) {
    certContainer.replaceChildren();
    certPanel.hidden = certs.length === 0;
    layout?.classList.toggle('no-certs', certs.length === 0);

    certs.forEach((cert) => {
      const row = document.createElement('div');
      row.className = 'cert-item';
      const info = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = cert.title;
      const meta = document.createElement('small');
      meta.textContent = [cert.issuer, cert.year].filter(Boolean).join(' · ');
      info.append(title);
      if (meta.textContent) info.append(meta);
      row.append(info);

      const href = safeUrl(cert.url, { allowAnchor: false });
      if (href) {
        const link = document.createElement('a');
        link.className = 'cert-link';
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Verify ↗';
        row.append(link);
      }
      certContainer.append(row);
    });
  }
}

function renderSocialLinks(profile) {
  const container = document.querySelector('[data-social-links]');
  if (!container) return;
  container.replaceChildren();

  const builtIn = [
    { label: 'GitHub', url: profile.github_url },
    { label: 'LinkedIn', url: profile.linkedin_url },
    { label: 'X / Twitter', url: profile.x_url },
    { label: 'Website', url: profile.website_url },
    { label: 'YouTube', url: profile.youtube_url }
  ];
  const custom = Array.isArray(profile.custom_social_links) ? profile.custom_social_links : [];
  const allLinks = [...builtIn, ...custom]
    .map((item) => ({ label: String(item?.label || '').trim(), href: safeUrl(item?.url, { allowAnchor: false }) }))
    .filter((item) => item.label && item.href);

  container.hidden = allLinks.length === 0;
  allLinks.forEach(({ label, href }) => {
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = label;
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    a.append(arrow);
    container.append(a);
  });
}

function applySectionOrder(order) {
  const container = document.querySelector('[data-sections-container]');
  if (!container) return;
  const normalized = Array.isArray(order) && order.length ? order : DEFAULT_SECTION_ORDER;
  const seen = new Set();
  const fullOrder = [...normalized, ...DEFAULT_SECTION_ORDER].filter((key) => {
    if (seen.has(key) || !DEFAULT_SECTION_ORDER.includes(key)) return false;
    seen.add(key);
    return true;
  });

  fullOrder.forEach((sectionName) => {
    const el = container.querySelector(`[data-section="${sectionName}"]`);
    if (el) container.appendChild(el);
  });
}

function applyProfile(profile) {
  const data = { ...defaultProfile, ...(profile || {}) };
  activeProfile = data;
  data.short_name = String(data.short_name || data.name).trim().split(/\s+/).slice(0, 2).join(' ');
  const mark = String(data.logo_mark || data.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('')).toUpperCase();

  document.querySelectorAll('[data-profile]').forEach((element) => {
    const key = element.dataset.profile;
    setText(element, key === 'logo_mark' ? mark : data[key]);
  });

  // Meta & SEO
  const pageTitle = data.site_title || `${data.name} | ${data.role}`;
  document.title = pageTitle;
  document.querySelector('meta[name="description"]')?.setAttribute('content', data.site_description || '');
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', pageTitle);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', data.site_description || '');
  document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', pageTitle);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', data.site_description || '');
  const ogImg = safeUrl(data.og_image_url, { allowAnchor: false });
  document.querySelector('meta[property="og:image"]')?.setAttribute('content', ogImg);

  // Announcement bar
  const announcementBar = document.querySelector('[data-announcement]');
  if (announcementBar) {
    const showBar = Boolean(data.show_announcement && String(data.announcement_text || '').trim());
    announcementBar.hidden = !showBar;
  }

  // Hero profile portrait
  const avatarWrap = document.querySelector('[data-avatar-wrap]');
  const avatarImg = document.querySelector('[data-profile-image]');
  const avatarUrl = safeUrl(data.profile_image_url, { allowAnchor: false });
  if (avatarWrap && avatarImg) {
    if (avatarUrl) {
      avatarImg.src = avatarUrl;
      avatarImg.alt = `${data.name || 'Portfolio owner'} portrait`;
      avatarImg.onerror = () => { avatarWrap.hidden = true; };
      avatarWrap.hidden = false;
    } else {
      avatarWrap.hidden = true;
    }
  }

  // Dynamic links
  const links = {
    resume_url: data.resume_url,
    secondary_url: data.secondary_url,
    primary_url: data.primary_url,
    contact_url: data.contact_url,
    announcement_url: data.announcement_url,
    nav_custom_url: data.nav_custom_url,
    email: data.email ? `mailto:${data.email}` : ''
  };

  document.querySelectorAll('[data-profile-link]').forEach((link) => {
    const key = link.dataset.profileLink;
    const isCustomNav = key === 'nav_custom_url' && !String(data.nav_custom_label || '').trim();
    const href = isCustomNav ? '' : safeUrl(links[key], { allowMailto: key === 'email' });
    link.hidden = !href;
    if (!href) return;
    link.href = href;
    if (/^https?:/i.test(href)) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    } else {
      link.removeAttribute('target');
      link.removeAttribute('rel');
    }
  });

  // Search placeholder & controls visibility
  const searchInput = document.querySelector('#project-search');
  if (searchInput && data.projects_search_placeholder) {
    searchInput.placeholder = data.projects_search_placeholder;
  }
  const searchBtn = document.querySelector('[data-search-toggle]');
  if (searchBtn) searchBtn.hidden = data.show_search === false || data.show_projects === false;
  const themeBtn = document.querySelector('[data-theme-toggle]');
  if (themeBtn) themeBtn.hidden = data.show_theme_toggle === false;
  const adminFooterLink = document.querySelector('[data-admin-footer-link]');
  if (adminFooterLink) adminFooterLink.hidden = data.show_admin_link === false;

  // Section visibility + matching nav links
  document.querySelectorAll('[data-section]').forEach((section) => {
    const key = section.dataset.section;
    const visible = data[`show_${key}`] !== false;
    section.hidden = !visible;
    const navLink = document.querySelector(`[data-nav-section="${key}"]`);
    if (navLink) navLink.hidden = !visible;
  });

  applySectionOrder(data.section_order);
  const [primary] = applyThemeAccent(data);
  updateDynamicFavicon(mark, primary);
  renderHeroStats(data.hero_stats, data.show_hero_stats);
  renderExperience(data.experience, data.certifications);
  renderSocialLinks(data);
  updateStructuredData(data);
}

function renderSkills(skills) {
  const container = document.querySelector('[data-skills]');
  if (!container) return;
  container.replaceChildren();
  (Array.isArray(skills) ? skills : []).filter(Boolean).forEach((skill) => {
    const chip = document.createElement('span');
    chip.className = 'skill-chip';
    chip.textContent = skill;
    container.append(chip);
  });
}

function projectLink(label, rawUrl) {
  const href = safeUrl(rawUrl, { allowAnchor: false });
  if (!href) return null;
  const link = document.createElement('a');
  link.href = href;
  link.textContent = `${label} ↗`;
  if (/^https?:/i.test(href)) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  return link;
}

function createProject(project, index) {
  const card = document.createElement('article');
  card.className = `project-card${project.is_featured ? ' is-featured' : ''}`;
  card.dataset.category = (project.category || 'Other').trim();

  const topline = document.createElement('div');
  topline.className = 'project-topline';
  const number = document.createElement('span');
  number.className = 'project-index';
  number.textContent = `PROJECT / ${String(index + 1).padStart(2, '0')}`;

  const badges = document.createElement('div');
  badges.className = 'project-badges';
  if (project.is_featured) {
    const featured = document.createElement('span');
    featured.className = 'project-featured-badge';
    featured.textContent = 'Featured';
    badges.append(featured);
  }
  if (project.status) {
    const status = document.createElement('span');
    status.className = 'project-status-badge';
    status.textContent = project.status;
    badges.append(status);
  }
  const category = document.createElement('span');
  category.className = 'project-category';
  category.textContent = project.category || 'Cloud engineering';
  badges.append(category);
  topline.append(number, badges);

  const body = document.createElement('div');
  body.className = 'project-body';
  const titleRow = document.createElement('div');
  titleRow.className = 'project-title-row';
  const title = document.createElement('h3');
  title.className = 'project-title';
  title.textContent = project.title || 'Untitled project';

  const primaryLink = projectLink('Open', project.live_url || project.github_url);
  if (primaryLink) {
    primaryLink.className = 'project-open-link';
    primaryLink.textContent = '↗';
    primaryLink.setAttribute('aria-label', `Open ${project.title || 'project'}`);
    titleRow.append(title, primaryLink);
  } else {
    const arrow = document.createElement('span');
    arrow.className = 'project-open';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    titleRow.append(title, arrow);
  }

  const description = document.createElement('p');
  description.className = 'project-description';
  description.textContent = project.description || '';
  body.append(titleRow, description);

  if (project.impact) {
    const impact = document.createElement('p');
    impact.className = 'project-impact';
    impact.textContent = project.impact;
    body.append(impact);
  }

  const imageUrl = safeUrl(project.image_url, { allowAnchor: false });
  if (imageUrl) {
    const image = document.createElement('img');
    image.className = 'project-image';
    image.src = imageUrl;
    image.alt = `Preview of ${project.title || 'project'}`;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.onerror = () => image.remove();
    body.append(image);
  }

  const tags = document.createElement('div');
  tags.className = 'project-tags';
  if (Array.isArray(project.tech_stack)) {
    project.tech_stack.slice(0, 8).forEach((item) => {
      const tag = document.createElement('span');
      tag.textContent = item;
      tags.append(tag);
    });
  }
  body.append(tags);

  const links = document.createElement('div');
  links.className = 'project-links';
  [projectLink('Repository', project.github_url), projectLink('Live demo', project.live_url)]
    .filter(Boolean)
    .forEach((link) => links.append(link));
  if (project.year) {
    const year = document.createElement('span');
    year.className = 'project-index';
    year.textContent = project.year;
    links.append(year);
  }
  if (links.childElementCount) body.append(links);

  card.append(topline, body);
  card.dataset.searchText = [
    project.title,
    project.category,
    project.status,
    project.impact,
    project.description,
    ...(project.tech_stack || [])
  ]
    .join(' ')
    .toLowerCase();
  return card;
}

function renderProjectFilters(projects) {
  const container = document.querySelector('[data-project-filters]');
  if (!container) return;
  const categories = [...new Set(projects.map((p) => (p.category || '').trim()).filter(Boolean))];
  container.replaceChildren();
  if (categories.length < 2) {
    container.hidden = true;
    activeCategory = 'all';
    return;
  }

  container.hidden = false;
  const allItems = ['all', ...categories];
  if (!allItems.includes(activeCategory)) activeCategory = 'all';

  allItems.forEach((cat) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `filter-pill${activeCategory === cat ? ' is-active' : ''}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(activeCategory === cat));
    btn.textContent = cat === 'all' ? `All (${projects.length})` : cat;
    btn.addEventListener('click', () => {
      activeCategory = cat;
      container.querySelectorAll('.filter-pill').forEach((pill, i) => {
        const selected = allItems[i] === cat;
        pill.classList.toggle('is-active', selected);
        pill.setAttribute('aria-selected', String(selected));
      });
      filterProjects();
    });
    container.append(btn);
  });
}

function renderProjects(projects) {
  activeProjects = Array.isArray(projects) ? projects : [];
  const grid = document.querySelector('[data-projects]');
  if (!grid) return;
  grid.replaceChildren();
  renderProjectFilters(activeProjects);

  if (!activeProjects.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-projects';
    empty.textContent = 'No projects have been published yet.';
    grid.append(empty);
    return;
  }
  activeProjects.forEach((project, index) => grid.append(createProject(project, index)));
  filterProjects();
}

function filterProjects() {
  const query = document.querySelector('#project-search')?.value.trim().toLowerCase() || '';
  const cards = [...document.querySelectorAll('.project-card')];
  let visible = 0;
  cards.forEach((card) => {
    const catMatch = activeCategory === 'all' || card.dataset.category === activeCategory;
    const searchMatch = !query || card.dataset.searchText.includes(query);
    const match = catMatch && searchMatch;
    card.hidden = !match;
    if (match) visible += 1;
  });
  const count = document.querySelector('[data-search-count]');
  if (count) count.textContent = query ? `${visible} ${visible === 1 ? 'project' : 'projects'} found` : '';
  const empty = document.querySelector('[data-search-empty]');
  if (empty) {
    empty.textContent = activeProfile.projects_empty_message || 'No projects match that search.';
    empty.hidden = !(query || activeCategory !== 'all') || visible > 0 || activeProjects.length === 0;
  }
}

function setupNavigation() {
  const button = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.nav-links');
  const searchButton = document.querySelector('[data-search-toggle]');
  const searchPanel = document.querySelector('[data-search-panel]');
  const searchInput = document.querySelector('#project-search');

  const closeMenu = () => {
    button?.setAttribute('aria-expanded', 'false');
    menu?.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  };

  button?.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    menu?.classList.toggle('is-open', open);
    if (open && searchPanel && !searchPanel.hidden) {
      searchPanel.hidden = true;
      searchButton?.setAttribute('aria-expanded', 'false');
    }
  });

  menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

  searchButton?.addEventListener('click', () => {
    const open = searchButton.getAttribute('aria-expanded') !== 'true';
    searchButton.setAttribute('aria-expanded', String(open));
    if (searchPanel) searchPanel.hidden = !open;
    closeMenu();
    if (open) searchInput?.focus();
    else if (searchInput) searchInput.value = '';
    filterProjects();
  });

  searchInput?.addEventListener('input', filterProjects);

  document.addEventListener('click', (event) => {
    if (menu?.classList.contains('is-open') && !menu.contains(event.target) && !button?.contains(event.target)) {
      closeMenu();
    }
    if (searchPanel && !searchPanel.hidden && !searchPanel.contains(event.target) && !searchButton?.contains(event.target)) {
      searchPanel.hidden = true;
      searchButton?.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
      if (searchPanel && !searchPanel.hidden) {
        searchPanel.hidden = true;
        searchButton?.setAttribute('aria-expanded', 'false');
      }
    }
  });
}

function setupThemeToggle() {
  const toggle = document.querySelector('[data-theme-toggle]');
  if (!toggle) return;

  const updateLabel = () => {
    const light = document.documentElement.dataset.theme === 'light';
    toggle.setAttribute('aria-label', `Switch to ${light ? 'dark' : 'light'} theme`);
    if (toggle.firstElementChild) toggle.firstElementChild.textContent = light ? '☾' : '☼';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f4f7fa' : '#080c14');
  };

  updateLabel();
  toggle.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(CACHE_KEYS.theme, theme);
    } catch {
      // ignore storage failure
    }
    updateLabel();
  });
}

function setupCopyEmail() {
  const button = document.querySelector('[data-copy-email]');
  if (!button) return;
  button.addEventListener('click', async () => {
    const email = document.querySelector('[data-profile="email"]')?.textContent.trim();
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      button.textContent = 'Copied';
      window.setTimeout(() => { button.textContent = 'Copy'; }, 1600);
    } catch {
      const status = document.querySelector('[data-contact-status]');
      setText(status, `Copy this address: ${email}`);
    }
  });
}

function setupContactForm() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = new FormData(form);
    if (values.get('website')) return; // Honeypot

    const status = document.querySelector('[data-contact-status]');
    const name = String(values.get('name') || '').trim();
    const email = String(values.get('email') || '').trim();
    const subject = String(values.get('subject') || '').trim();
    const messageBody = String(values.get('message') || '').trim();

    if (!name || !email || !messageBody) {
      setText(status, 'Please fill in your name, email address, and message.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setText(status, 'Please enter a valid email address.');
      return;
    }
    if (Date.now() - pageLoadTimestamp < 2000) {
      setText(status, 'Please wait a moment and try submitting again.');
      return;
    }
    if (lastContactSentAt && Date.now() - lastContactSentAt < 30000) {
      setText(status, 'Message already sent. Please wait 30 seconds before sending another.');
      return;
    }

    const message = { name, email, subject, message: messageBody };
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('contact_messages').insert(message);
        if (error) throw error;
        lastContactSentAt = Date.now();
        setText(status, 'Thanks — your message has been sent.');
        form.reset();
      } catch (error) {
        console.error('Contact message could not be sent:', error);
        setText(status, 'The message could not be sent. Please email directly instead.');
      } finally {
        submit.disabled = false;
      }
      return;
    }

    const targetEmail = activeProfile.email;
    if (!targetEmail) {
      setText(status, 'Direct email is not configured yet.');
      submit.disabled = false;
      return;
    }
    const mailSubject = encodeURIComponent(message.subject || `Portfolio message from ${message.name}`);
    const mailBody = encodeURIComponent(`From: ${message.name} <${message.email}>\n\n${message.message}`);
    window.location.href = `mailto:${targetEmail}?subject=${mailSubject}&body=${mailBody}`;
    lastContactSentAt = Date.now();
    setText(status, 'Opening your email application…');
    submit.disabled = false;
  });
}

function readCachedJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCachedJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

async function loadPortfolio() {
  const cachedProfile = isSupabaseConfigured ? readCachedJson(CACHE_KEYS.profile) : null;
  const cachedProjects = isSupabaseConfigured ? readCachedJson(CACHE_KEYS.projects) : null;

  const initialProfile = cachedProfile ? { ...defaultProfile, ...cachedProfile } : defaultProfile;
  const initialProjects = Array.isArray(cachedProjects) ? cachedProjects : defaultProjects;

  applyProfile(initialProfile);
  renderSkills(initialProfile.skills);
  renderProjects(initialProjects);
  setupNavigation();
  setupThemeToggle();
  setupCopyEmail();
  setupContactForm();
  setText(document.querySelector('[data-current-year]'), new Date().getFullYear());

  if (!isSupabaseConfigured) return;

  if (!supabase) {
    const notice = document.querySelector('[data-data-notice]');
    setText(notice, 'The live content service could not be reached. Showing cached or sample content.');
    if (notice) notice.hidden = false;
    console.error('The Supabase client is unavailable:', supabaseClientError);
    return;
  }

  const [profileResult, projectsResult] = await Promise.all([
    supabase.from('profile').select('*').eq('id', 1).maybeSingle(),
    supabase.from('projects').select('*').eq('is_published', true).order('sort_order', { ascending: true })
  ]);

  const errors = [profileResult.error, projectsResult.error].filter(Boolean);

  if (profileResult.data) {
    const liveProfile = { ...defaultProfile, ...profileResult.data };
    applyProfile(liveProfile);
    renderSkills(liveProfile.skills);
    writeCachedJson(CACHE_KEYS.profile, profileResult.data);
  }

  if (!projectsResult.error && Array.isArray(projectsResult.data)) {
    renderProjects(projectsResult.data);
    writeCachedJson(CACHE_KEYS.projects, projectsResult.data);
  }

  if (errors.length) {
    errors.forEach((error) => console.error('Portfolio data could not be loaded:', error));
    const notice = document.querySelector('[data-data-notice]');
    setText(notice, 'Some live portfolio details could not be refreshed. Showing available content.');
    if (notice) notice.hidden = false;
  }
}

loadPortfolio().catch((error) => {
  console.error('Portfolio initialization failed:', error);
  const notice = document.querySelector('[data-data-notice]');
  setText(notice, 'The portfolio could not connect to its content source. Please try again later.');
  if (notice) notice.hidden = false;
});
