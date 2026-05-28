export const theme = {
  colors: {
    background: '#050505',
    surface: '#0D0D0D',
    surfaceElevated: '#141414',
    border: '#1A1A1A',
    borderLight: '#252525',

    gold: '#C9A84C',
    goldDim: '#6B5520',

    // Orb state colors
    idle: '#C9A84C',
    listening: '#4A9EFF',
    processing: '#8B5CF6',
    speaking: '#10B981',

    textPrimary: '#FFFFFF',
    textSecondary: '#888888',
    textTertiary: '#3A3A3A',
    textMuted: '#222222',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  font: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};
