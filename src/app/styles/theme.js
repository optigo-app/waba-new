import { createTheme, responsiveFontSizes } from '@mui/material/styles';
import { getTokens } from './tokens';
import { getComponentOverrides } from './components';

const poppinsFont = "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif";

/**
 * Build a complete MUI theme (light only).
 * - Uses design tokens for palette + app-specific values
 * - Applies component overrides for consistent UX
 * - Enables responsive font sizes across breakpoints
 */
export const getTheme = () => {
  const tokens = getTokens();

  let theme = createTheme({
    palette: tokens.palette,
    custom: tokens.custom,
    typography: {
      fontFamily: poppinsFont,
      h1: {
        fontFamily: poppinsFont,
      },
      h2: {
        fontFamily: poppinsFont,
      },
      h3: {
        fontFamily: poppinsFont,
      },
      h4: {
        fontFamily: poppinsFont,
      },
      h5: {
        fontFamily: poppinsFont,
      },
      h6: {
        fontFamily: poppinsFont,
      },
      subtitle1: {
        fontFamily: poppinsFont,
      },
      subtitle2: {
        fontFamily: poppinsFont,
      },
      body: {
        fontFamily: poppinsFont,
      },
      body1: {
        fontFamily: poppinsFont,
      },
      body2: {
        fontFamily: poppinsFont,
      },
      button: {
        fontFamily: poppinsFont,
      },
      overline: {
        fontFamily: poppinsFont,
      },
    },
    shape: {
      borderRadius: 8,
    },
    spacing: 8,
    components: getComponentOverrides(),
  });

  /* Responsive font scaling across breakpoints */
  theme = responsiveFontSizes(theme, {
    breakpoints: ['xs', 'sm', 'md', 'lg'],
    factor: 2,
  });

  return theme;
};

/* Pre-built instance for direct import */
export const lightTheme = getTheme();

export default getTheme; 