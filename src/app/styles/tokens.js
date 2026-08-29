/**
 * Design tokens for light & dark themes.
 * Keeps the MUI palette clean and places app-specific tokens under `custom`.
 *
 * Pass `mode: 'light' | 'dark'` to getTokens(). Defaults to 'light'.
 */

const lightPalette = {
  primary: {
    main: '#1daa61',
    light: '#4cdb8d',
    dark: '#128C7E',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#128C7E',
    light: '#1daa61',
    dark: '#075E54',
    contrastText: '#ffffff',
  },
  success: {
    main: '#1daa61',
    light: '#c8e6c9',
    dark: '#2e7d32',
    contrastText: '#ffffff',
  },
  error: {
    main: '#d32f2f',
    light: '#ffcdd2',
    dark: '#c62828',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#ed6c02',
    light: '#ffe0b2',
    dark: '#e65100',
    contrastText: '#ffffff',
  },
  info: {
    main: '#00CFE8',
    light: '#b3e5fc',
    dark: '#0097a7',
    contrastText: '#ffffff',
  },
  background: {
    default: '#f5f5f5',
    paper: '#ffffff',
  },
  text: {
    primary: '#444050',
    secondary: '#7D7f85',
    disabled: '#9e9e9e',
  },
  divider: 'rgba(0, 0, 0, 0.08)',
  action: {
    active: 'rgba(0, 0, 0, 0.54)',
    hover: 'rgba(0, 0, 0, 0.04)',
    hoverOpacity: 0.08,
    selected: 'rgba(0, 0, 0, 0.08)',
    selectedOpacity: 0.16,
    disabled: 'rgba(0, 0, 0, 0.26)',
    disabledBackground: 'rgba(0, 0, 0, 0.12)',
    disabledOpacity: 0.38,
    focus: 'rgba(0, 0, 0, 0.12)',
    focusOpacity: 0.12,
    activatedOpacity: 0.24,
  },
  grey: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
};

const darkPalette = {
  primary: {
    main: '#1daa61',
    light: '#4cdb8d',
    dark: '#128C7E',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#128C7E',
    light: '#1daa61',
    dark: '#075E54',
    contrastText: '#ffffff',
  },
  success: {
    main: '#1daa61',
    light: '#2e7d32',
    dark: '#1b5e20',
    contrastText: '#ffffff',
  },
  error: {
    main: '#ef5350',
    light: '#c62828',
    dark: '#b71c1c',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#ff9800',
    light: '#e65100',
    dark: '#bf360c',
    contrastText: '#ffffff',
  },
  info: {
    main: '#00CFE8',
    light: '#0097a7',
    dark: '#006064',
    contrastText: '#ffffff',
  },
  background: {
    default: '#0f172a',
    paper: '#1e293b',
  },
  text: {
    primary: '#e2e8f0',
    secondary: '#94a3b8',
    disabled: '#64748b',
  },
  divider: 'rgba(255, 255, 255, 0.12)',
  action: {
    active: 'rgba(255, 255, 255, 0.7)',
    hover: 'rgba(255, 255, 255, 0.08)',
    hoverOpacity: 0.08,
    selected: 'rgba(255, 255, 255, 0.16)',
    selectedOpacity: 0.16,
    disabled: 'rgba(255, 255, 255, 0.5)',
    disabledBackground: 'rgba(255, 255, 255, 0.12)',
    disabledOpacity: 0.38,
    focus: 'rgba(255, 255, 255, 0.12)',
    focusOpacity: 0.12,
    activatedOpacity: 0.24,
  },
  grey: {
    50: '#1e293b',
    100: '#1e293b',
    200: '#273449',
    300: '#334155',
    400: '#475569',
    500: '#64748b',
    600: '#94a3b8',
    700: '#cbd5e1',
    800: '#e2e8f0',
    900: '#f1f5f9',
  },
};

const lightCustom = {
  colors: {
    whatsappGreen: '#1daa61',
    whatsappDark: '#075E54',
    blue: '#007bfc',
    highlight: '#1daa61',
    lightGreenBg: '#dcf8e6',
  },
  gradients: {
    primary: 'linear-gradient(270deg, rgba(37, 211, 102, 0.85) 0%, #1daa61 100%)',
    lowImportance: 'linear-gradient(135deg, #f7f7f7 0%, #e5e5e5 100%)',
  },
  shadows: {
    card: 'rgba(0, 0, 0, 0.05) 0px 6px 24px, rgba(0, 0, 0, 0.03) 0px 0px 0px 1px',
    elevated: '0 4px 16px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.08)',
  },
  importance: {
    high: {
      background: 'linear-gradient(270deg, rgba(37, 211, 102, 0.85) 0%, #1daa61 100%)',
      text: '#444050',
    },
    low: {
      background: 'linear-gradient(135deg, #f7f7f7 0%, #e5e5e5 100%)',
      text: '#444050',
    },
  },
  scrollbar: {
    track: '#f5f5f5',
    thumb: '#bdbdbd',
    thumbHover: '#9e9e9e',
  },
};

const darkCustom = {
  colors: {
    whatsappGreen: '#1daa61',
    whatsappDark: '#075E54',
    blue: '#3b82f6',
    highlight: '#1daa61',
    lightGreenBg: 'rgba(29, 170, 97, 0.16)',
  },
  gradients: {
    primary: 'linear-gradient(270deg, rgba(37, 211, 102, 0.85) 0%, #1daa61 100%)',
    lowImportance: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
  },
  shadows: {
    card: 'rgba(0, 0, 0, 0.3) 0px 6px 24px, rgba(0, 0, 0, 0.2) 0px 0px 0px 1px',
    elevated: '0 4px 16px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.4)',
  },
  importance: {
    high: {
      background: 'linear-gradient(270deg, rgba(37, 211, 102, 0.85) 0%, #1daa61 100%)',
      text: '#e2e8f0',
    },
    low: {
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      text: '#e2e8f0',
    },
  },
  scrollbar: {
    track: '#0f172a',
    thumb: '#475569',
    thumbHover: '#64748b',
  },
};

export const getTokens = (mode = 'light') => {
  const isDark = mode === 'dark';
  return {
    palette: {
      mode,
      ...(isDark ? darkPalette : lightPalette),
    },
    custom: isDark ? darkCustom : lightCustom,
  };
};
