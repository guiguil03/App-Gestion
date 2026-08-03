/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Palette alignée sur le dashboard web (apps/dashboard) : fond gris-bleu très
// clair, cartes blanches à bordure fine (pas d'élévation "Material" seule),
// neutres zinc, état actif/CTA en noir quasi pur — le vert (`primary`) reste
// réservé à l'identité de marque et aux indicateurs de statut, jamais utilisé
// comme couleur d'action comme dans la V1 du design system mobile.
// Couleurs de statut (WCAG + daltonisme) validées via
// dataviz/scripts/validate_palette.js — communes aux deux thèmes.
export const Colors = {
  light: {
    text: '#18181B',
    textSecondary: '#71717A',
    background: '#F8FAFC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E4E4E7',
    border: '#E4E4E7',
    primary: '#059669',
    primaryText: '#FFFFFF',
    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
    // Couleur d'action principale (CTA/état actif) — noir quasi pur, comme
    // les boutons primaires et la nav active du dashboard.
    active: '#18181B',
    activeText: '#FFFFFF',
  },
  dark: {
    text: '#F4F4F5',
    textSecondary: '#A1A1AA',
    // Gris anthracite plutôt que noir pur : le noir pur (#000) est un
    // anti-pattern de dark mode (HIG/Material recommandent une surface
    // sombre désaturée, jamais un simple inversion des couleurs claires).
    background: '#0B0B0E',
    backgroundElement: '#18181B',
    backgroundSelected: '#27272A',
    border: '#27272A',
    primary: '#059669',
    primaryText: '#FFFFFF',
    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
    // Inversé par rapport au clair : pastille quasi blanche sur fond sombre.
    active: '#F4F4F5',
    activeText: '#18181B',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Ajoute une opacité (00–FF) à une couleur hex — utilisé pour les badges de statut en teinte pastel (fond clair + texte plein), comme les KPI/badges du dashboard. */
export function withOpacity(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`;
}

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

// Échelle de rayons partagée par tous les composants — `medium` (12px) est le
// rayon dominant, aligné sur le `rounded-xl` utilisé partout côté dashboard
// (cartes, boutons, badges, nav).
export const Radius = {
  small: 8,
  medium: 12,
  large: 16,
  xlarge: 28,
  full: 999,
} as const;

// `level1` = ombre "shadow-sm" du dashboard : très discrète, toujours
// combinée à une bordure fine (`bordered`) plutôt qu'utilisée seule comme en
// Material 3. `level2` reste plus marquée, réservée aux éléments qui flottent
// par-dessus un contenu dynamique (bannières de scan, overlays caméra).
export const Elevation = {
  level1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  level2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
