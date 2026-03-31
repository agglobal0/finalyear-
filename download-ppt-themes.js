const fs = require('fs');
const path = require('path');

const THEMES_DIR = path.join(__dirname, '..', 'ppt-themes');

const themes = [
  {
    slug: 'midnight-corporate',
    name: 'Midnight Corporate',
    primaryColor: '#1a1f3c',
    accentColor: '#c9a84c',
    fontHeading: 'Playfair Display',
    fontBody: 'DM Sans',
    bgColor: '#0d1020',
    textColor: '#f0ede6',
    svgBg: '#0d1020',
    svgAccent: '#c9a84c',
    svgTitle: '#f0ede6',
  },
  {
    slug: 'clean-minimal',
    name: 'Clean Minimal',
    primaryColor: '#ffffff',
    accentColor: '#475569',
    fontHeading: 'Georgia',
    fontBody: 'Arial',
    bgColor: '#f8fafc',
    textColor: '#1e293b',
    svgBg: '#f8fafc',
    svgAccent: '#475569',
    svgTitle: '#1e293b',
  },
  {
    slug: 'forest-growth',
    name: 'Forest Growth',
    primaryColor: '#14532d',
    accentColor: '#84cc16',
    fontHeading: 'Georgia',
    fontBody: 'Verdana',
    bgColor: '#052e16',
    textColor: '#ecfdf5',
    svgBg: '#052e16',
    svgAccent: '#84cc16',
    svgTitle: '#ecfdf5',
  },
  {
    slug: 'sunset-warmth',
    name: 'Sunset Warmth',
    primaryColor: '#9a3412',
    accentColor: '#fde68a',
    fontHeading: 'Georgia',
    fontBody: 'Arial',
    bgColor: '#431407',
    textColor: '#fef3c7',
    svgBg: '#431407',
    svgAccent: '#fde68a',
    svgTitle: '#fef3c7',
  },
  {
    slug: 'ocean-depth',
    name: 'Ocean Depth',
    primaryColor: '#1e3a5f',
    accentColor: '#22d3ee',
    fontHeading: 'Georgia',
    fontBody: 'Arial',
    bgColor: '#0c1a2e',
    textColor: '#e0f7fa',
    svgBg: '#0c1a2e',
    svgAccent: '#22d3ee',
    svgTitle: '#e0f7fa',
  },
  {
    slug: 'monochrome-bold',
    name: 'Monochrome Bold',
    primaryColor: '#000000',
    accentColor: '#ef4444',
    fontHeading: 'Impact',
    fontBody: 'Arial',
    bgColor: '#0a0a0a',
    textColor: '#ffffff',
    svgBg: '#0a0a0a',
    svgAccent: '#ef4444',
    svgTitle: '#ffffff',
  },
  {
    slug: 'lavender-dream',
    name: 'Lavender Dream',
    primaryColor: '#6d28d9',
    accentColor: '#e9d5ff',
    fontHeading: 'Georgia',
    fontBody: 'Arial',
    bgColor: '#2e1065',
    textColor: '#f5f3ff',
    svgBg: '#2e1065',
    svgAccent: '#e9d5ff',
    svgTitle: '#f5f3ff',
  },
  {
    slug: 'tech-neon',
    name: 'Tech Neon',
    primaryColor: '#0d0d0d',
    accentColor: '#39ff14',
    fontHeading: 'Courier New',
    fontBody: 'Courier New',
    bgColor: '#050505',
    textColor: '#e2e8f0',
    svgBg: '#050505',
    svgAccent: '#39ff14',
    svgTitle: '#e2e8f0',
  },
];

function generateSVG(theme) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
  <rect width="320" height="180" fill="${theme.svgBg}"/>
  <!-- Header bar -->
  <rect x="0" y="0" width="320" height="40" fill="${theme.svgAccent}" opacity="0.15"/>
  <rect x="0" y="0" width="6" height="180" fill="${theme.svgAccent}"/>
  <!-- Title text -->
  <text x="20" y="28" font-family="Arial" font-size="14" font-weight="bold" fill="${theme.svgTitle}">${theme.name}</text>
  <!-- Slide title placeholder -->
  <rect x="20" y="56" width="200" height="14" rx="2" fill="${theme.svgTitle}" opacity="0.7"/>
  <!-- Bullet lines -->
  <rect x="28" y="82" width="160" height="8" rx="2" fill="${theme.svgTitle}" opacity="0.3"/>
  <rect x="28" y="98" width="140" height="8" rx="2" fill="${theme.svgTitle}" opacity="0.3"/>
  <rect x="28" y="114" width="150" height="8" rx="2" fill="${theme.svgTitle}" opacity="0.3"/>
  <rect x="28" y="130" width="120" height="8" rx="2" fill="${theme.svgTitle}" opacity="0.2"/>
  <!-- Accent dot -->
  <circle cx="20" cy="86" r="3" fill="${theme.svgAccent}"/>
  <circle cx="20" cy="102" r="3" fill="${theme.svgAccent}"/>
  <circle cx="20" cy="118" r="3" fill="${theme.svgAccent}"/>
  <circle cx="20" cy="134" r="3" fill="${theme.svgAccent}"/>
  <!-- Image placeholder -->
  <rect x="238" y="50" width="62" height="100" rx="4" fill="${theme.svgAccent}" opacity="0.1" stroke="${theme.svgAccent}" stroke-width="1"/>
  <text x="269" y="105" font-family="Arial" font-size="22" text-anchor="middle" fill="${theme.svgAccent}" opacity="0.4">🖼</text>
  <!-- Footer bar -->
  <rect x="0" y="168" width="320" height="12" fill="${theme.svgAccent}" opacity="0.1"/>
</svg>`;
}

if (!fs.existsSync(THEMES_DIR)) {
  fs.mkdirSync(THEMES_DIR, { recursive: true });
  console.log('Created ppt-themes directory.');
}

for (const theme of themes) {
  const themeDir = path.join(THEMES_DIR, theme.slug);
  if (!fs.existsSync(themeDir)) {
    fs.mkdirSync(themeDir, { recursive: true });
  }

  const themeJson = {
    name: theme.name,
    primaryColor: theme.primaryColor,
    accentColor: theme.accentColor,
    fontHeading: theme.fontHeading,
    fontBody: theme.fontBody,
    bgColor: theme.bgColor,
    textColor: theme.textColor,
    previewImage: `/api/ppt/themes/${theme.slug}/preview.svg`,
  };

  fs.writeFileSync(
    path.join(themeDir, 'theme.json'),
    JSON.stringify(themeJson, null, 2)
  );

  fs.writeFileSync(path.join(themeDir, 'preview.svg'), generateSVG(theme));

  console.log(`✓ Generated theme: ${theme.name}`);
}

console.log('\n✅ All 8 PPT themes generated successfully in /ppt-themes/');
