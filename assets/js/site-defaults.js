export const CACHE_KEYS = {
  theme: 'portfolio-theme',
  profile: 'portfolio-profile-cache-v2',
  projects: 'portfolio-projects-cache-v2'
};

export const ACCENT_PRESETS = {
  green: ['#2de69a', '#22c5e9'],
  blue: ['#60a5fa', '#22d3ee'],
  violet: ['#a78bfa', '#f472b6'],
  amber: ['#fbbf24', '#fb7185'],
  rose: ['#fb7185', '#c084fc']
};

export const DEFAULT_SECTION_ORDER = ['skills', 'about', 'experience', 'projects', 'contact'];

export const PROJECT_STATUSES = ['Live', 'Production', 'Open Source', 'Case Study', 'In Progress', 'Archived'];

export const defaultProfile = {
  site_title: 'Your Name | Cloud & DevOps Engineer',
  site_description: 'Cloud infrastructure, automation, and platform engineering projects.',
  og_image_url: '',
  logo_mark: 'YN',
  name: 'Your Name',
  short_name: 'Your Name',
  brand_subtitle: 'Portfolio',
  profile_image_url: '',
  hero_greeting: 'Hello, I’m',
  role: 'Cloud & DevOps Engineer',
  availability: 'Open to opportunities',
  availability_focus: 'Cloud & DevOps',
  hero_description: 'Building reliable cloud infrastructure, automated delivery pipelines, and secure platforms that help teams ship with confidence.',
  primary_label: 'Explore my work',
  primary_url: '#projects',
  secondary_label: 'Download résumé',
  secondary_url: '',
  resume_label: 'Résumé',
  resume_url: '',
  contact_link_label: 'Get in touch',
  contact_url: '#contact',
  scroll_label: 'Scroll to explore',
  hero_stats: [
    { value: '99.95%', label: 'Production uptime' },
    { value: '40+', label: 'Automated pipelines' },
    { value: 'IaC', label: 'Terraform & GitOps' }
  ],

  show_announcement: false,
  announcement_badge: 'New',
  announcement_text: 'Available for cloud architecture & DevOps consulting in Q4.',
  announcement_url: '#contact',

  nav_about_label: 'About',
  nav_skills_label: 'Technologies',
  nav_experience_label: 'Experience',
  nav_projects_label: 'Projects',
  nav_contact_label: 'Contact',
  nav_custom_label: '',
  nav_custom_url: '',
  show_search: true,
  show_theme_toggle: true,
  default_theme: 'dark',

  skills_label: 'Core technologies & infrastructure',
  skills_heading: 'Tools I work with',
  skills: ['AWS Cloud', 'Kubernetes', 'Docker', 'Terraform', 'CI/CD', 'Linux', 'GitOps', 'Monitoring'],

  about_label: 'A little about me',
  about_heading: 'Good systems make great work possible.',
  about_intro: 'I like solving the important problems behind the scenes — the ones that make software safer, faster, and more dependable.',
  about_quote: 'Automate the repeatable. Make the reliable the default.',
  about_quote_caption: 'A principle I bring to every project',
  about: 'I’m a cloud and DevOps engineer focused on turning complex infrastructure into clear, repeatable systems. I enjoy working across cloud platforms, containers, infrastructure as code, and delivery automation.',
  about_detail: 'From a first architecture sketch to a production-ready pipeline, I aim for practical solutions that teams can understand, own, and grow with.',
  about_location_label: 'Based in',
  location: 'India · Working worldwide',
  about_response_label: 'Typical response',
  response_time: 'Within 1 business day',

  experience_label: 'Career & impact',
  experience_heading: 'Experience & credentials.',
  experience_intro: 'Hands-on engineering roles, production ownership, and verified cloud credentials.',
  experience: [
    {
      role: 'Cloud & DevOps Engineer',
      company: 'Platform Engineering Team',
      period: '2024 — Present',
      location: 'Remote',
      summary: 'Designed multi-environment AWS landing zones with Terraform, Kubernetes deployment pipelines, and automated security scanning.',
      highlights: ['AWS', 'Terraform', 'Kubernetes', 'GitHub Actions']
    },
    {
      role: 'Site Reliability & Automation Engineer',
      company: 'Cloud Delivery Practice',
      period: '2022 — 2024',
      location: 'India',
      summary: 'Built containerized CI/CD workflows, centralized observability dashboards, and zero-downtime release strategies.',
      highlights: ['Docker', 'Prometheus', 'Grafana', 'Linux']
    }
  ],
  certifications: [
    {
      title: 'AWS Certified Solutions Architect',
      issuer: 'Amazon Web Services',
      year: '2025',
      url: ''
    },
    {
      title: 'Certified Kubernetes Administrator (CKA)',
      issuer: 'Cloud Native Computing Foundation',
      year: '2024',
      url: ''
    }
  ],

  projects_label: 'Selected work',
  projects_heading: 'Built to work. Ready to scale.',
  projects_intro: 'A selection of infrastructure, automation, and platform projects — designed to solve real delivery challenges.',
  projects_search_placeholder: 'Search projects or technologies…',
  projects_empty_message: 'No projects match that search.',

  contact_label: 'Let’s connect',
  contact_heading: 'Have a cloud challenge? Let’s talk.',
  contact_intro: 'Open to thoughtful conversations about cloud engineering, DevOps roles, and projects that make a difference.',
  contact_email_label: 'Direct email',
  email: 'hello@example.com',
  contact_location_label: 'Location',
  contact_response_label: 'Response time',
  opportunity_title: 'Open for Cloud & DevOps roles',
  opportunity_detail: 'Full-time · Contract · Consulting',
  contact_name_label: 'Full name',
  contact_email_field_label: 'Email address',
  contact_subject_label: 'Subject',
  contact_message_label: 'Message',
  contact_submit_label: 'Send a message',

  github_url: '',
  linkedin_url: '',
  x_url: '',
  website_url: '',
  youtube_url: '',
  custom_social_links: [],

  footer_tagline: 'Cloud · DevOps · Automation',
  copyright_text: 'Built with care.',
  footer_status: 'Available for opportunities',
  show_admin_link: true,
  accent_theme: 'green',
  custom_accent_primary: '#2de69a',
  custom_accent_secondary: '#22c5e9',
  section_order: [...DEFAULT_SECTION_ORDER],

  show_hero_stats: true,
  show_about: true,
  show_skills: true,
  show_experience: true,
  show_projects: true,
  show_contact: true
};

export const defaultProjects = [
  {
    id: 'sample-1',
    title: 'Cloud Foundation Kit',
    category: 'Infrastructure as Code',
    status: 'Open Source',
    impact: '60% faster environment provisioning',
    description: 'A reusable cloud foundation with network boundaries, least-privilege access, and environment-aware Terraform modules.',
    year: '2025',
    tech_stack: ['AWS', 'Terraform', 'GitHub Actions'],
    live_url: '',
    github_url: '',
    image_url: '',
    is_featured: true,
    sort_order: 1,
    is_published: true
  },
  {
    id: 'sample-2',
    title: 'Reliable Release Pipeline',
    category: 'CI/CD automation',
    status: 'Production',
    impact: 'Zero-downtime container rollouts',
    description: 'A container delivery workflow with quality gates, image scanning, and repeatable deployment steps for small teams.',
    year: '2025',
    tech_stack: ['Docker', 'CI/CD', 'Security'],
    live_url: '',
    github_url: '',
    image_url: '',
    is_featured: false,
    sort_order: 2,
    is_published: true
  },
  {
    id: 'sample-3',
    title: 'Kubernetes Platform Lab',
    category: 'Container platform',
    status: 'Live',
    impact: '99.95% cluster service availability',
    description: 'A practical cluster setup with declarative deployments, sensible health checks, and application observability.',
    year: '2024',
    tech_stack: ['Kubernetes', 'Helm', 'Prometheus'],
    live_url: '',
    github_url: '',
    image_url: '',
    is_featured: false,
    sort_order: 3,
    is_published: true
  },
  {
    id: 'sample-4',
    title: 'Ops Signals',
    category: 'Observability',
    status: 'Case Study',
    impact: '45% faster incident triage',
    description: 'A service health dashboard concept that turns logs and metrics into useful signals for faster incident response.',
    year: '2024',
    tech_stack: ['Linux', 'Grafana', 'Monitoring'],
    live_url: '',
    github_url: '',
    image_url: '',
    is_featured: false,
    sort_order: 4,
    is_published: true
  }
];
