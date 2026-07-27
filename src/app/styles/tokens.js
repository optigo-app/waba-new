/**
 * Design tokens for the light theme.
 * Keeps the MUI palette clean and places app-specific tokens under `custom`.
 */

export const getTokens = () => {
  return {
    /* ─── Standard MUI Palette ─── */
    palette: {
      mode: 'light',
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
    },

    /* ─── App-Specific Tokens (theme.custom) ─── */
    custom: {
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
    },
  };
};
