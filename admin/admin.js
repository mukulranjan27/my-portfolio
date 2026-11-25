import { isSupabaseConfigured, supabase, supabaseClientError, uploadPortfolioImage } from '../assets/js/supabase.js';
import { CACHE_KEYS, DEFAULT_SECTION_ORDER, defaultProfile } from '../assets/js/site-defaults.js';

const byId = (id) => document.getElementById(id);
const statusElements = document.querySelectorAll('[data-admin-status]');
const profileForm = byId('profile-form');

let cachedProjects = [];
let cachedMessages = [];
let projectFilter = 'all';
let messageFilter = 'all';

let stateHeroStats = [];
let stateExperience = [];
let stateCerts = [];
let stateCustomSocials = [];
let stateSectionOrder = [...DEFAULT_SECTION_ORDER];

function showStatus(message, kind = 'error') {
  statusElements.forEach((element) => {
    element.textContent = message;
    element.className = `admin-alert is-${kind}`;
    element.hidden = false;
  });
}

function clearStatus() {
  statusElements.forEach((element) => {
    element.textContent = '';
    element.hidden = true;
  });
}

function showError(message, error) {
  console.error(message, error);
  showStatus(`${message} ${error?.message || 'Please try again.'}`);
}

function markUnsaved(dirty) {
  const badge = document.querySelector('[data-unsaved-badge]');
  if (badge) badge.hidden = !dirty;
}

function invalidatePublicCache() {
  try {
    localStorage.removeItem(CACHE_KEYS.profile);
    localStorage.removeItem(CACHE_KEYS.projects);
  } catch {
    // ignore
  }
}

function configurationMessage() {
  const message = isSupabaseConfigured
    ? 'Could not load the Supabase client. Check your connection and browser console, then try again.'
    : 'Supabase is not configured. Add your project URL and public anon key in assets/js/config.js (or deploy env vars) to enable admin login.';
  if (supabaseClientError) console.error('Supabase is unavailable:', supabaseClientError);
  return message;
}

function validatePublicUrl(value, label, allowAnchor = false) {
  const url = String(value || '').trim();
  if (!url) return;
  if (allowAnchor && /^#[a-z\d_-]+$/i.test(url)) return;
  if (/^(?:assets\/|\/(?!\/))[a-z0-9._~:/?#[\]@!$&'()*+,;=%-]+$/i.test(url)) return;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${label} must be an HTTPS URL, local path (/assets/...)${allowAnchor ? ', or an anchor (#contact)' : ''}.`);
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`${label} must use HTTPS.`);
  }
}

async function verifyAdminSession(session) {
  if (!session?.user?.id) return false;
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.user_id);
}

function setupLogin() {
  const form = byId('login-form');
  if (!form) return;

  const passwordInput = byId('password');
  const toggleBtn = document.querySelector('[data-toggle-password]');
  toggleBtn?.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    toggleBtn.textContent = show ? 'Hide' : 'Show';
    toggleBtn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  if (!isSupabaseConfigured || !supabase) {
    showStatus(configurationMessage());
    form.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  supabase.auth.getSession().then(async ({ data }) => {
    if (data?.session) {
      try {
        if (await verifyAdminSession(data.session)) {
          window.location.replace('dashboard.html');
        }
      } catch {
        // stay on login page
      }
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearStatus();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Signing in…';
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: byId('email').value.trim(),
        password: byId('password').value
      });
      if (error) throw error;
      const isAdmin = await verifyAdminSession(data.session);
      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error('This account is not in the database admin_users allowlist.');
      }
      window.location.assign('dashboard.html');
    } catch (error) {
      showError('Sign-in failed.', error);
      button.disabled = false;
      button.replaceChildren('Sign in ', Object.assign(document.createElement('span'), { textContent: '→' }));
    }
  });
}

/* ---------- Repeater Editors ---------- */
function makeSmallInput(value, placeholder, maxLength = 160) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value || '';
  input.placeholder = placeholder;
  input.maxLength = maxLength;
  input.addEventListener('input', () => markUnsaved(true));
  return input;
}

function makeActionBtn(text, cls, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `row-action${cls ? ` ${cls}` : ''}`;
  btn.textContent = text;
  btn.addEventListener('click', onClick);
  return btn;
}

function renderStatsEditor() {
  const container = document.querySelector('[data-stats-list]');
  if (!container) return;
  container.replaceChildren();
  if (!stateHeroStats.length) {
    const p = document.createElement('p');
    p.className = 'admin-empty';
    p.textContent = 'No hero stats added yet.';
    container.append(p);
    return;
  }

  stateHeroStats.forEach((stat, idx) => {
    const item = document.createElement('div');
    item.className = 'repeater-item';
    const row = document.createElement('div');
    row.className = 'repeater-row-3';
    const valInput = makeSmallInput(stat.value, 'Value (e.g. 99.95%)', 30);
    valInput.addEventListener('input', () => { stateHeroStats[idx].value = valInput.value; });
    const labelInput = makeSmallInput(stat.label, 'Label (e.g. Uptime SLA)', 60);
    labelInput.addEventListener('input', () => { stateHeroStats[idx].label = labelInput.value; });
    const removeBtn = makeActionBtn('Remove', 'is-danger', () => {
      stateHeroStats.splice(idx, 1);
      markUnsaved(true);
      renderStatsEditor();
    });
    row.append(valInput, labelInput, removeBtn);
    item.append(row);
    container.append(item);
  });
}

function renderExperienceEditor() {
  const container = document.querySelector('[data-experience-editor]');
  if (!container) return;
  container.replaceChildren();
  if (!stateExperience.length) {
    const p = document.createElement('p');
    p.className = 'admin-empty';
    p.textContent = 'No experience entries yet.';
    container.append(p);
    return;
  }

  stateExperience.forEach((entry, idx) => {
    const item = document.createElement('div');
    item.className = 'repeater-item';

    const r1 = document.createElement('div');
    r1.className = 'repeater-row';
    const roleIn = makeSmallInput(entry.role, 'Role / Title', 120);
    roleIn.addEventListener('input', () => { stateExperience[idx].role = roleIn.value; });
    const companyIn = makeSmallInput(entry.company, 'Company / Team', 120);
    companyIn.addEventListener('input', () => { stateExperience[idx].company = companyIn.value; });
    r1.append(roleIn, companyIn);

    const r2 = document.createElement('div');
    r2.className = 'repeater-row';
    const periodIn = makeSmallInput(entry.period, 'Period (e.g. 2024 — Present)', 60);
    periodIn.addEventListener('input', () => { stateExperience[idx].period = periodIn.value; });
    const locIn = makeSmallInput(entry.location, 'Location (e.g. Remote)', 80);
    locIn.addEventListener('input', () => { stateExperience[idx].location = locIn.value; });
    r2.append(periodIn, locIn);

    const summaryIn = document.createElement('textarea');
    summaryIn.rows = 2;
    summaryIn.maxLength = 500;
    summaryIn.placeholder = 'Summary of responsibilities and impact…';
    summaryIn.value = entry.summary || '';
    summaryIn.addEventListener('input', () => {
      stateExperience[idx].summary = summaryIn.value;
      markUnsaved(true);
    });

    const tagsIn = makeSmallInput(
      Array.isArray(entry.highlights) ? entry.highlights.join(', ') : '',
      'Highlights / skills (comma-separated)',
      240
    );
    tagsIn.addEventListener('input', () => {
      stateExperience[idx].highlights = tagsIn.value.split(',').map((s) => s.trim()).filter(Boolean);
    });

    const actions = document.createElement('div');
    actions.className = 'repeater-actions';
    if (idx > 0) {
      actions.append(makeActionBtn('Move up', '', () => {
        [stateExperience[idx - 1], stateExperience[idx]] = [stateExperience[idx], stateExperience[idx - 1]];
        markUnsaved(true);
        renderExperienceEditor();
      }));
    }
    if (idx < stateExperience.length - 1) {
      actions.append(makeActionBtn('Move down', '', () => {
        [stateExperience[idx + 1], stateExperience[idx]] = [stateExperience[idx], stateExperience[idx + 1]];
        markUnsaved(true);
        renderExperienceEditor();
      }));
    }
    actions.append(makeActionBtn('Remove', 'is-danger', () => {
      stateExperience.splice(idx, 1);
      markUnsaved(true);
      renderExperienceEditor();
    }));

    item.append(r1, r2, summaryIn, tagsIn, actions);
    container.append(item);
  });
}

function renderCertsEditor() {
  const container = document.querySelector('[data-certs-editor]');
  if (!container) return;
  container.replaceChildren();
  if (!stateCerts.length) {
    const p = document.createElement('p');
    p.className = 'admin-empty';
    p.textContent = 'No certifications added yet.';
    container.append(p);
    return;
  }

  stateCerts.forEach((cert, idx) => {
    const item = document.createElement('div');
    item.className = 'repeater-item';

    const r1 = document.createElement('div');
    r1.className = 'repeater-row';
    const titleIn = makeSmallInput(cert.title, 'Certification title', 140);
    titleIn.addEventListener('input', () => { stateCerts[idx].title = titleIn.value; });
    const issuerIn = makeSmallInput(cert.issuer, 'Issuing organization', 120);
    issuerIn.addEventListener('input', () => { stateCerts[idx].issuer = issuerIn.value; });
    r1.append(titleIn, issuerIn);

    const r2 = document.createElement('div');
    r2.className = 'repeater-row-3';
    const yearIn = makeSmallInput(cert.year, 'Year', 16);
    yearIn.addEventListener('input', () => { stateCerts[idx].year = yearIn.value; });
    const urlIn = makeSmallInput(cert.url, 'Credential URL (https://…)', 500);
    urlIn.addEventListener('input', () => { stateCerts[idx].url = urlIn.value; });
    const removeBtn = makeActionBtn('Remove', 'is-danger', () => {
      stateCerts.splice(idx, 1);
      markUnsaved(true);
      renderCertsEditor();
    });
    r2.append(yearIn, urlIn, removeBtn);

    item.append(r1, r2);
    container.append(item);
  });
}

function renderCustomSocialsEditor() {
  const container = document.querySelector('[data-socials-editor]');
  if (!container) return;
  container.replaceChildren();
  if (!stateCustomSocials.length) {
    const p = document.createElement('p');
    p.className = 'admin-empty';
    p.textContent = 'No custom social links added.';
    container.append(p);
    return;
  }

  stateCustomSocials.forEach((social, idx) => {
    const item = document.createElement('div');
    item.className = 'repeater-item';
    const row = document.createElement('div');
    row.className = 'repeater-row-3';
    const labelIn = makeSmallInput(social.label, 'Label (e.g. Medium)', 40);
    labelIn.addEventListener('input', () => { stateCustomSocials[idx].label = labelIn.value; });
    const urlIn = makeSmallInput(social.url, 'HTTPS URL', 500);
    urlIn.addEventListener('input', () => { stateCustomSocials[idx].url = urlIn.value; });
    const removeBtn = makeActionBtn('Remove', 'is-danger', () => {
      stateCustomSocials.splice(idx, 1);
      markUnsaved(true);
      renderCustomSocialsEditor();
    });
    row.append(labelIn, urlIn, removeBtn);
    item.append(row);
    container.append(item);
  });
}

function renderSectionOrderEditor() {
  const container = document.querySelector('[data-section-order-list]');
  if (!container) return;
  container.replaceChildren();

  const labels = {
    skills: 'Technologies / Skills',
    about: 'About Me',
    experience: 'Experience & Credentials',
    projects: 'Projects Showcase',
    contact: 'Contact & Social'
  };

  stateSectionOrder.forEach((key, idx) => {
    const row = document.createElement('div');
    row.className = 'order-row';
    const name = document.createElement('strong');
    name.textContent = `${idx + 1}. ${labels[key] || key}`;
    const buttons = document.createElement('div');
    buttons.className = 'order-buttons';
    if (idx > 0) {
      buttons.append(makeActionBtn('↑ Up', '', () => {
        [stateSectionOrder[idx - 1], stateSectionOrder[idx]] = [stateSectionOrder[idx], stateSectionOrder[idx - 1]];
        markUnsaved(true);
        renderSectionOrderEditor();
      }));
    }
    if (idx < stateSectionOrder.length - 1) {
      buttons.append(makeActionBtn('↓ Down', '', () => {
        [stateSectionOrder[idx + 1], stateSectionOrder[idx]] = [stateSectionOrder[idx], stateSectionOrder[idx + 1]];
        markUnsaved(true);
        renderSectionOrderEditor();
      }));
    }
    row.append(name, buttons);
    container.append(row);
  });
}

function setupRepeaters() {
  document.querySelector('[data-add-stat]')?.addEventListener('click', () => {
    stateHeroStats.push({ value: '', label: '' });
    markUnsaved(true);
    renderStatsEditor();
  });
  document.querySelector('[data-add-experience]')?.addEventListener('click', () => {
    stateExperience.unshift({ role: '', company: '', period: '', location: '', summary: '', highlights: [] });
    markUnsaved(true);
    renderExperienceEditor();
  });
  document.querySelector('[data-add-cert]')?.addEventListener('click', () => {
    stateCerts.push({ title: '', issuer: '', year: '', url: '' });
    markUnsaved(true);
    renderCertsEditor();
  });
  document.querySelector('[data-add-social]')?.addEventListener('click', () => {
    stateCustomSocials.push({ label: '', url: '' });
    markUnsaved(true);
    renderCustomSocialsEditor();
  });
}

function syncCustomColorPickers() {
  const accentSelect = byId('p-accent-theme');
  const customBoxes = document.querySelectorAll('[data-custom-colors]');
  const pInput = byId('p-custom-primary');
  const pPicker = byId('p-custom-primary-picker');
  const sInput = byId('p-custom-secondary');
  const sPicker = byId('p-custom-secondary-picker');

  const toggleVisibility = () => {
    const isCustom = accentSelect?.value === 'custom';
    customBoxes.forEach((box) => { box.hidden = !isCustom; });
  };
  accentSelect?.addEventListener('change', toggleVisibility);

  pPicker?.addEventListener('input', () => { if (pInput) pInput.value = pPicker.value; });
  pInput?.addEventListener('input', () => {
    if (/^#[0-9a-f]{6}$/i.test(pInput.value)) pPicker.value = pInput.value;
  });
  sPicker?.addEventListener('input', () => { if (sInput) sInput.value = sPicker.value; });
  sInput?.addEventListener('input', () => {
    if (/^#[0-9a-f]{6}$/i.test(sInput.value)) sPicker.value = sInput.value;
  });
  toggleVisibility();
}

function setProfileForm(profile) {
  const data = { ...defaultProfile, ...(profile || {}) };
  for (const [name, defaultValue] of Object.entries(defaultProfile)) {
    const field = profileForm.elements.namedItem(name);
    if (!field || typeof field.length === 'number' && !field.tagName) continue;
    if (field.type === 'checkbox') {
      field.checked = data[name] === undefined || data[name] === null ? Boolean(defaultValue) : Boolean(data[name]);
    } else if (name === 'skills') {
      field.value = Array.isArray(data.skills) ? data.skills.join(', ') : '';
    } else {
      field.value = data[name] ?? '';
    }
  }

  stateHeroStats = Array.isArray(data.hero_stats) ? structuredClone(data.hero_stats) : [];
  stateExperience = Array.isArray(data.experience) ? structuredClone(data.experience) : [];
  stateCerts = Array.isArray(data.certifications) ? structuredClone(data.certifications) : [];
  stateCustomSocials = Array.isArray(data.custom_social_links) ? structuredClone(data.custom_social_links) : [];

  const seen = new Set();
  stateSectionOrder = [...(Array.isArray(data.section_order) ? data.section_order : []), ...DEFAULT_SECTION_ORDER]
    .filter((key) => {
      if (seen.has(key) || !DEFAULT_SECTION_ORDER.includes(key)) return false;
      seen.add(key);
      return true;
    });

  renderStatsEditor();
  renderExperienceEditor();
  renderCertsEditor();
  renderCustomSocialsEditor();
  renderSectionOrderEditor();

  const pPicker = byId('p-custom-primary-picker');
  const sPicker = byId('p-custom-secondary-picker');
  if (pPicker && /^#[0-9a-f]{6}$/i.test(data.custom_accent_primary || '')) pPicker.value = data.custom_accent_primary;
  if (sPicker && /^#[0-9a-f]{6}$/i.test(data.custom_accent_secondary || '')) sPicker.value = data.custom_accent_secondary;
  document.querySelectorAll('[data-custom-colors]').forEach((box) => {
    box.hidden = data.accent_theme !== 'custom';
  });

  updateAdminMarks(data.logo_mark);
  markUnsaved(false);
}

function updateAdminMarks(mark) {
  const clean = String(mark || 'YN').trim().slice(0, 4).toUpperCase() || 'YN';
  document.querySelectorAll('[data-admin-mark]').forEach((el) => { el.textContent = clean; });
}

function readProfileForm() {
  const profile = { id: 1 };
  for (const name of Object.keys(defaultProfile)) {
    const field = profileForm.elements.namedItem(name);
    if (!field || (typeof field.length === 'number' && !field.tagName)) continue;
    if (field.type === 'checkbox') {
      profile[name] = field.checked;
    } else if (name === 'skills') {
      profile.skills = field.value.split(/[,\n]/).map((skill) => skill.trim()).filter(Boolean);
    } else {
      profile[name] = field.value.trim();
    }
  }

  profile.hero_stats = stateHeroStats
    .map((s) => ({ value: String(s.value || '').trim(), label: String(s.label || '').trim() }))
    .filter((s) => s.value || s.label);

  profile.experience = stateExperience
    .map((e) => ({
      role: String(e.role || '').trim(),
      company: String(e.company || '').trim(),
      period: String(e.period || '').trim(),
      location: String(e.location || '').trim(),
      summary: String(e.summary || '').trim(),
      highlights: Array.isArray(e.highlights) ? e.highlights.map((h) => String(h).trim()).filter(Boolean) : []
    }))
    .filter((e) => e.role || e.company);

  profile.certifications = stateCerts
    .map((c) => ({
      title: String(c.title || '').trim(),
      issuer: String(c.issuer || '').trim(),
      year: String(c.year || '').trim(),
      url: String(c.url || '').trim()
    }))
    .filter((c) => c.title);

  profile.custom_social_links = stateCustomSocials
    .map((s) => ({ label: String(s.label || '').trim(), url: String(s.url || '').trim() }))
    .filter((s) => s.label && s.url);

  profile.section_order = [...stateSectionOrder];

  const anchorAllowed = ['primary_url', 'secondary_url', 'contact_url', 'announcement_url', 'nav_custom_url'];
  [
    'primary_url', 'secondary_url', 'resume_url', 'contact_url', 'announcement_url',
    'nav_custom_url', 'profile_image_url', 'og_image_url',
    'github_url', 'linkedin_url', 'x_url', 'website_url', 'youtube_url'
  ].forEach((key) => {
    validatePublicUrl(profile[key], key.replaceAll('_', ' '), anchorAllowed.includes(key));
  });

  profile.certifications.forEach((c, idx) => validatePublicUrl(c.url, `Certification #${idx + 1} URL`));
  profile.custom_social_links.forEach((s, idx) => validatePublicUrl(s.url, `Custom social link #${idx + 1}`));

  if (profile.accent_theme === 'custom') {
    if (!/^#[0-9a-f]{6}$/i.test(profile.custom_accent_primary) || !/^#[0-9a-f]{6}$/i.test(profile.custom_accent_secondary)) {
      throw new Error('Custom accent colors must be valid 6-digit hex codes like #2de69a.');
    }
  }

  return profile;
}

function updateKPIs(profileData) {
  const published = cachedProjects.filter((p) => p.is_published).length;
  const drafts = cachedProjects.length - published;
  const unread = cachedMessages.filter((m) => !m.is_read).length;
  const skillsCount = Array.isArray(profileData?.skills) ? profileData.skills.length : 0;
  const activeSections = ['show_skills', 'show_about', 'show_experience', 'show_projects', 'show_contact']
    .filter((k) => profileData?.[k] !== false).length;

  const setKpi = (attr, val) => {
    const el = document.querySelector(`[${attr}]`);
    if (el) el.textContent = String(val);
  };
  setKpi('data-kpi-published', published);
  setKpi('data-kpi-drafts', drafts);
  setKpi('data-kpi-unread', unread);
  setKpi('data-kpi-skills', skillsCount);
  setKpi('data-kpi-sections', `${activeSections} / 5`);
}

function setupProfileForm() {
  profileForm.addEventListener('input', () => markUnsaved(true));
  profileForm.addEventListener('change', () => markUnsaved(true));

  profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearStatus();
    const submit = profileForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const profile = readProfileForm();
      profile.updated_at = new Date().toISOString();
      const { error } = await supabase.from('profile').upsert(profile, { onConflict: 'id' });
      if (error) throw error;
      invalidatePublicCache();
      updateAdminMarks(profile.logo_mark);
      updateKPIs(profile);
      markUnsaved(false);
      showStatus('All site content, theme, and layout settings have been saved.', 'success');
    } catch (error) {
      showError('Could not save site content.', error);
    } finally {
      submit.disabled = false;
    }
  });
}

/* ---------- Image Uploaders ---------- */
function setupUploaders() {
  document.querySelectorAll('[data-upload-target]').forEach((input) => {
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      clearStatus();
      const targetField = byId(input.dataset.uploadTarget);
      const folder = input.dataset.uploadFolder || 'uploads';
      const label = input.closest('label');
      if (label) label.classList.add('is-uploading');
      try {
        showStatus('Uploading image to Supabase Storage…', 'success');
        const publicUrl = await uploadPortfolioImage(file, folder);
        if (targetField) {
          targetField.value = publicUrl;
          markUnsaved(true);
        }
        showStatus('Image uploaded! Click Save to publish your changes.', 'success');
      } catch (error) {
        showError('Image upload failed (ensure Storage bucket "portfolio-assets" exists in Supabase).', error);
      } finally {
        input.value = '';
        if (label) label.classList.remove('is-uploading');
      }
    });
  });
}

/* ---------- Projects CRUD ---------- */
function resetProjectForm() {
  const form = byId('project-form');
  if (!form) return;
  form.reset();
  byId('project-id').value = '';
  byId('project-order').value = String(cachedProjects.length + 1);
  byId('project-status').value = 'Live';
  byId('project-featured').checked = false;
  byId('project-published').checked = true;
  document.querySelector('[data-project-form-title]').textContent = 'Add a project';
  document.querySelector('[data-project-submit]').textContent = 'Save project →';
  document.querySelector('[data-cancel-edit]').hidden = true;
}

function editProject(project) {
  const fields = {
    'project-id': 'id',
    'project-title': 'title',
    'project-category': 'category',
    'project-year': 'year',
    'project-status': 'status',
    'project-impact': 'impact',
    'project-description': 'description',
    'project-tech': 'tech_stack',
    'project-image': 'image_url',
    'project-live': 'live_url',
    'project-github': 'github_url',
    'project-order': 'sort_order'
  };
  Object.entries(fields).forEach(([id, key]) => {
    const value = key === 'tech_stack' && Array.isArray(project[key]) ? project[key].join(', ') : project[key];
    const field = byId(id);
    if (field) field.value = value ?? '';
  });
  if (!byId('project-status').value) byId('project-status').value = 'Live';
  byId('project-featured').checked = Boolean(project.is_featured);
  byId('project-published').checked = Boolean(project.is_published);
  document.querySelector('[data-project-form-title]').textContent = 'Edit project';
  document.querySelector('[data-project-submit]').textContent = 'Update project →';
  document.querySelector('[data-cancel-edit]').hidden = false;
  byId('project-title').focus();
}

async function duplicateProject(project) {
  clearStatus();
  try {
    const copy = {
      title: `${project.title} (Copy)`.slice(0, 120),
      category: project.category || '',
      year: project.year || '',
      status: project.status || 'Live',
      impact: project.impact || '',
      description: project.description || '',
      tech_stack: Array.isArray(project.tech_stack) ? project.tech_stack : [],
      image_url: project.image_url || '',
      live_url: project.live_url || '',
      github_url: project.github_url || '',
      is_featured: false,
      sort_order: cachedProjects.length + 1,
      is_published: false
    };
    const { error } = await supabase.from('projects').insert(copy);
    if (error) throw error;
    invalidatePublicCache();
    await loadProjects();
    showStatus('Project duplicated as a draft.', 'success');
  } catch (error) {
    showError('Could not duplicate project.', error);
  }
}

async function moveProject(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= cachedProjects.length) return;
  const current = cachedProjects[index];
  const neighbor = cachedProjects[targetIndex];
  const currentOrder = index + 1;
  const neighborOrder = targetIndex + 1;

  try {
    const [r1, r2] = await Promise.all([
      supabase.from('projects').update({ sort_order: neighborOrder }).eq('id', current.id),
      supabase.from('projects').update({ sort_order: currentOrder }).eq('id', neighbor.id)
    ]);
    if (r1.error) throw r1.error;
    if (r2.error) throw r2.error;
    invalidatePublicCache();
    await loadProjects();
  } catch (error) {
    showError('Could not reorder projects.', error);
  }
}

function makeProjectRow(project, index) {
  const row = document.createElement('article');
  row.className = 'admin-project-row';
  const details = document.createElement('div');
  details.className = 'admin-project-details';
  const title = document.createElement('h4');
  title.textContent = project.title;
  const description = document.createElement('p');
  description.textContent = [project.category, project.status, project.year].filter(Boolean).join(' · ') || 'No category';

  const badges = document.createElement('div');
  badges.className = 'project-badges-row';
  const state = document.createElement('span');
  state.className = `project-state ${project.is_published ? 'is-published' : 'is-draft'}`;
  state.textContent = project.is_published ? 'Published' : 'Draft';
  badges.append(state);
  if (project.is_featured) {
    const feat = document.createElement('span');
    feat.className = 'project-featured-pill';
    feat.textContent = 'Featured';
    badges.append(feat);
  }
  details.append(title, description, badges);

  const actions = document.createElement('div');
  actions.className = 'project-row-actions';
  if (index > 0) actions.append(makeActionBtn('↑', '', () => moveProject(index, -1)));
  if (index < cachedProjects.length - 1) actions.append(makeActionBtn('↓', '', () => moveProject(index, 1)));
  actions.append(
    makeActionBtn('Edit', '', () => editProject(project)),
    makeActionBtn('Duplicate', '', () => duplicateProject(project)),
    makeActionBtn('Delete', 'is-danger', () => deleteProject(project.id, project.title))
  );

  row.append(details, actions);
  return row;
}

function renderAdminProjectsList() {
  const container = document.querySelector('[data-admin-projects]');
  const count = document.querySelector('[data-project-count]');
  const query = byId('admin-project-search')?.value.trim().toLowerCase() || '';

  const filtered = cachedProjects.filter((p) => {
    if (projectFilter === 'published' && !p.is_published) return false;
    if (projectFilter === 'draft' && p.is_published) return false;
    if (!query) return true;
    const text = [p.title, p.category, p.status, p.description, ...(p.tech_stack || [])].join(' ').toLowerCase();
    return text.includes(query);
  });

  count.textContent = `${cachedProjects.length} ${cachedProjects.length === 1 ? 'project' : 'projects'}`;
  container.replaceChildren();

  if (!filtered.length) {
    const empty = document.createElement('p');
    empty.className = 'admin-empty';
    empty.textContent = cachedProjects.length ? 'No projects match the current filter.' : 'No projects yet. Add your first project with the form.';
    container.append(empty);
    return;
  }

  filtered.forEach((project) => {
    const realIndex = cachedProjects.findIndex((p) => p.id === project.id);
    container.append(makeProjectRow(project, realIndex));
  });
}

async function loadProjects() {
  const { data, error } = await supabase.from('projects').select('*').order('sort_order', { ascending: true });
  if (error) throw error;
  cachedProjects = data || [];
  renderAdminProjectsList();
  try {
    updateKPIs(readProfileForm());
  } catch {
    // ignore validation before profile loaded
  }
}

async function deleteProject(id, title) {
  if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return;
  clearStatus();
  try {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    invalidatePublicCache();
    await loadProjects();
    resetProjectForm();
    showStatus('The project has been deleted.', 'success');
  } catch (error) {
    showError('Could not delete the project.', error);
  }
}

function setupProjectForm() {
  const form = byId('project-form');
  byId('admin-project-search')?.addEventListener('input', renderAdminProjectsList);

  document.querySelectorAll('[data-project-filter]').forEach((tab) => {
    tab.addEventListener('click', () => {
      projectFilter = tab.dataset.projectFilter;
      document.querySelectorAll('[data-project-filter]').forEach((t) => t.classList.toggle('is-active', t === tab));
      renderAdminProjectsList();
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearStatus();
    const submit = document.querySelector('[data-project-submit]');
    submit.disabled = true;
    try {
      const id = byId('project-id').value;
      const project = {
        title: byId('project-title').value.trim(),
        category: byId('project-category').value.trim(),
        year: byId('project-year').value.trim(),
        status: byId('project-status').value,
        impact: byId('project-impact').value.trim(),
        description: byId('project-description').value.trim(),
        tech_stack: byId('project-tech').value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean),
        image_url: byId('project-image').value.trim(),
        live_url: byId('project-live').value.trim(),
        github_url: byId('project-github').value.trim(),
        sort_order: Number(byId('project-order').value) || 0,
        is_featured: byId('project-featured').checked,
        is_published: byId('project-published').checked
      };
      validatePublicUrl(project.image_url, 'Project image URL');
      validatePublicUrl(project.live_url, 'Live project URL');
      validatePublicUrl(project.github_url, 'Repository URL');

      const query = id
        ? supabase.from('projects').update(project).eq('id', id)
        : supabase.from('projects').insert(project);
      const { error } = await query;
      if (error) throw error;
      invalidatePublicCache();
      await loadProjects();
      resetProjectForm();
      showStatus(id ? 'Your project has been updated.' : 'Your project has been added.', 'success');
    } catch (error) {
      showError('Could not save the project.', error);
    } finally {
      submit.disabled = false;
    }
  });
  document.querySelector('[data-cancel-edit]').addEventListener('click', resetProjectForm);
}

/* ---------- Messages Inbox ---------- */
function formatMessageDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

async function toggleMessageRead(message) {
  clearStatus();
  try {
    const { error } = await supabase
      .from('contact_messages')
      .update({ is_read: !message.is_read })
      .eq('id', message.id);
    if (error) throw error;
    await loadMessages();
  } catch (error) {
    showError('Could not update message status.', error);
  }
}

function makeMessageRow(message) {
  const article = document.createElement('article');
  article.className = `message-row${message.is_read ? '' : ' is-unread'}`;
  const content = document.createElement('div');
  content.className = 'message-content';

  const heading = document.createElement('h4');
  if (!message.is_read) {
    const dot = document.createElement('span');
    dot.className = 'unread-dot';
    dot.title = 'Unread';
    heading.append(dot);
  }
  heading.append(document.createTextNode(message.subject || 'New portfolio message'));

  const sender = document.createElement('p');
  sender.className = 'message-sender';
  sender.textContent = `${message.name} · ${message.email}`;
  const body = document.createElement('p');
  body.className = 'message-body';
  body.textContent = message.message;
  const date = document.createElement('small');
  date.textContent = formatMessageDate(message.created_at);
  content.append(heading, sender, body, date);

  const actions = document.createElement('div');
  actions.className = 'message-actions';

  const toggleReadBtn = makeActionBtn(message.is_read ? 'Mark unread' : 'Mark read', '', () => toggleMessageRead(message));
  const copyBtn = makeActionBtn('Copy email', '', async () => {
    try {
      await navigator.clipboard.writeText(message.email);
      copyBtn.textContent = 'Copied';
      setTimeout(() => { copyBtn.textContent = 'Copy email'; }, 1500);
    } catch {
      // ignore
    }
  });
  const reply = document.createElement('a');
  reply.className = 'row-action';
  reply.href = `mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent(`Re: ${message.subject || 'Your message'}`)}`;
  reply.textContent = 'Reply';
  const remove = makeActionBtn('Delete', 'is-danger', () => deleteMessage(message.id));

  actions.append(toggleReadBtn, copyBtn, reply, remove);
  article.append(content, actions);
  return article;
}

function renderMessagesList() {
  const container = document.querySelector('[data-admin-messages]');
  const count = document.querySelector('[data-message-count]');
  const list = messageFilter === 'unread' ? cachedMessages.filter((m) => !m.is_read) : cachedMessages;

  count.textContent = `${cachedMessages.length} ${cachedMessages.length === 1 ? 'message' : 'messages'}`;
  container.replaceChildren();
  if (!list.length) {
    const empty = document.createElement('p');
    empty.className = 'admin-empty';
    empty.textContent = messageFilter === 'unread' ? 'No unread messages.' : 'Your inbox is empty. Messages from the contact form will appear here.';
    container.append(empty);
    return;
  }
  list.forEach((message) => container.append(makeMessageRow(message)));
}

async function loadMessages() {
  const { data, error } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  cachedMessages = data || [];
  renderMessagesList();
  try {
    updateKPIs(readProfileForm());
  } catch {
    // ignore
  }
}

async function deleteMessage(id) {
  if (!window.confirm('Delete this contact message? This cannot be undone.')) return;
  clearStatus();
  try {
    const { error } = await supabase.from('contact_messages').delete().eq('id', id);
    if (error) throw error;
    await loadMessages();
    showStatus('The message has been deleted.', 'success');
  } catch (error) {
    showError('Could not delete the message.', error);
  }
}

function setupMessagesFilters() {
  document.querySelectorAll('[data-message-filter]').forEach((tab) => {
    tab.addEventListener('click', () => {
      messageFilter = tab.dataset.messageFilter;
      document.querySelectorAll('[data-message-filter]').forEach((t) => t.classList.toggle('is-active', t === tab));
      renderMessagesList();
    });
  });
}

/* ---------- Backup & Tools ---------- */
function setupTools() {
  byId('export-backup-btn')?.addEventListener('click', () => {
    try {
      const payload = {
        exported_at: new Date().toISOString(),
        profile: readProfileForm(),
        projects: cachedProjects
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showStatus('JSON backup downloaded.', 'success');
    } catch (error) {
      showError('Could not export backup.', error);
    }
  });

  byId('import-backup-input')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || !parsed.profile) {
        throw new Error('Invalid backup JSON: missing "profile" object.');
      }
      setProfileForm(parsed.profile);
      markUnsaved(true);
      showStatus('Backup loaded into the form. Review your settings and click "Save all site content" to publish.', 'success');
    } catch (error) {
      showError('Could not import backup.', error);
    } finally {
      event.target.value = '';
    }
  });

  byId('clear-cache-btn')?.addEventListener('click', () => {
    invalidatePublicCache();
    showStatus('Local browser cache cleared.', 'success');
  });
}

function setupSidebarNav() {
  const toggle = document.querySelector('[data-mobile-nav]');
  const nav = document.querySelector('#sidebar-nav');
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav?.classList.toggle('is-open', open);
  });

  const links = [...document.querySelectorAll('.sidebar-link')];
  links.forEach((link) => {
    link.addEventListener('click', () => {
      links.forEach((l) => l.classList.remove('active'));
      link.classList.add('active');
      nav?.classList.remove('is-open');
      toggle?.setAttribute('aria-expanded', 'false');
    });
  });
}

function setDashboardEnabled(enabled) {
  document.querySelectorAll(
    '#profile-form input, #profile-form textarea, #profile-form select, #profile-form button, ' +
    '#project-form input, #project-form textarea, #project-form select, #project-form button, ' +
    '[data-admin-projects] button, [data-admin-messages] button, #logout-btn, #export-backup-btn, #clear-cache-btn'
  ).forEach((control) => {
    control.disabled = !enabled;
  });
}

async function setupDashboard() {
  setDashboardEnabled(false);
  setupSidebarNav();

  if (!isSupabaseConfigured || !supabase) {
    showStatus(configurationMessage());
    return;
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) {
      window.location.replace('login.html');
      return;
    }

    const isAdmin = await verifyAdminSession(data.session);
    if (!isAdmin) {
      await supabase.auth.signOut();
      window.location.replace('login.html');
      return;
    }

    const emailEl = document.querySelector('[data-admin-email]');
    if (emailEl && data.session.user?.email) emailEl.textContent = data.session.user.email;

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setDashboardEnabled(false);
        window.location.replace('login.html');
      }
    });

    const profileRequest = supabase.from('profile').select('*').eq('id', 1).maybeSingle();
    const [profileResult] = await Promise.all([profileRequest, loadProjects()]);
    if (profileResult.error) throw profileResult.error;

    syncCustomColorPickers();
    setupRepeaters();
    setProfileForm(profileResult.data);
    setDashboardEnabled(true);
    setupProfileForm();
    setupProjectForm();
    setupMessagesFilters();
    setupUploaders();
    setupTools();
    updateKPIs({ ...defaultProfile, ...(profileResult.data || {}) });
    loadMessages().catch((err) => showError('Could not load contact messages.', err));
  } catch (error) {
    showError('Could not load the dashboard.', error);
  }
}

function setupLogout() {
  const button = byId('logout-btn');
  button?.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.assign('login.html');
    } catch (error) {
      showError('Could not sign out.', error);
      button.disabled = false;
    }
  });
}

if (byId('login-form')) setupLogin();
if (profileForm) {
  setupLogout();
  setupDashboard();
}
