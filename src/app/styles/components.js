/**
 * MUI component overrides for light & dark themes.
 * Import the font string so we don't repeat it.
 *
 * Pass `mode: 'light' | 'dark'` to getComponentOverrides(). Defaults to 'light'.
 */

const poppinsFont = "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif";

export const getComponentOverrides = (mode = 'light') => {
  const isDark = mode === 'dark';
  const bgDefault = isDark ? '#0f172a' : '#f5f5f5';
  const textPrimary = isDark ? '#e2e8f0' : '#444050';
  const scrollbarTrack = isDark ? '#0f172a' : '#f5f5f5';
  const scrollbarThumb = isDark ? '#475569' : '#bdbdbd';
  const scrollbarThumbHover = isDark ? '#64748b' : '#9e9e9e';
  const borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const outlinedBorderColor = isDark ? 'rgba(255,255,255,0.23)' : 'rgba(0,0,0,0.23)';
  const outlinedBorderHover = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
  const dataGridHeaderBg = isDark ? '#1e293b' : '#f5f5f5';

  return {
    MuiCssBaseline: {
      styleOverrides: {
        html: { height: '100%' },
        body: {
          fontFamily: poppinsFont,
          backgroundColor: bgDefault,
          color: textPrimary,
          minHeight: '100%',
          WebkitFontSmoothing: 'antialiased',
          MozosxFontSmoothing: 'grayscale',
          transition: 'background-color 200ms ease, color 200ms ease',
        },
        '::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '::-webkit-scrollbar-track': {
          background: scrollbarTrack,
        },
        '::-webkit-scrollbar-thumb': {
          background: scrollbarThumb,
          borderRadius: '4px',
        },
        '::-webkit-scrollbar-thumb:hover': {
          background: scrollbarThumbHover,
        },
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: `${scrollbarThumb} ${scrollbarTrack}`,
        },
      },
    },

    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          fontFamily: poppinsFont,
          fontWeight: 500,
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 20px',
        },
        containedPrimary: {
          background: 'linear-gradient(270deg, rgba(37, 211, 102, 0.85) 0%, #1daa61 100%)',
          '&:hover': {
            background: 'linear-gradient(270deg, rgba(37, 211, 102, 1) 0%, #1DA851 100%)',
          },
        },
        sizeSmall: {
          padding: '6px 12px',
          fontSize: '0.8125rem',
        },
        sizeLarge: {
          padding: '10px 24px',
          fontSize: '0.9375rem',
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },

    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 12,
        },
        outlined: {
          borderColor,
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: isDark
            ? 'rgba(0, 0, 0, 0.3) 0px 6px 24px, rgba(0, 0, 0, 0.2) 0px 0px 0px 1px'
            : 'rgba(0, 0, 0, 0.05) 0px 6px 24px, rgba(0, 0, 0, 0.03) 0px 0px 0px 1px',
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          fontFamily: poppinsFont,
          borderRadius: 8,
          '& fieldset': {
            borderColor: outlinedBorderColor,
          },
          '&:hover fieldset': {
            borderColor: outlinedBorderHover,
          },
          '&.Mui-focused fieldset': {
            borderWidth: 1,
          },
        },
        input: {
          fontFamily: poppinsFont,
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontFamily: poppinsFont,
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            fontFamily: poppinsFont,
          },
          '& .MuiInputLabel-root': {
            fontFamily: poppinsFont,
          },
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontFamily: poppinsFont,
          fontWeight: 500,
          borderRadius: 6,
          margin: '2px 8px',
          padding: '8px 12px',
        },
      },
    },

    MuiListItem: {
      styleOverrides: {
        root: {
          fontFamily: poppinsFont,
          borderRadius: 8,
        },
      },
    },

    MuiTypography: {
      styleOverrides: {
        root: {
          fontFamily: poppinsFont,
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: poppinsFont,
          fontWeight: 500,
          borderRadius: 6,
        },
      },
    },

    MuiAvatar: {
      styleOverrides: {
        root: {
          fontFamily: poppinsFont,
          fontWeight: 500,
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontFamily: poppinsFont,
          fontSize: '0.75rem',
          borderRadius: 6,
          padding: '6px 10px',
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },

    MuiSkeleton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },

    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
        },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor,
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          fontFamily: poppinsFont,
        },
      },
    },

    MuiDataGrid: {
      styleOverrides: {
        root: {
          fontFamily: poppinsFont,
          border: 'none',
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: dataGridHeaderBg,
          },
        },
      },
    },
  };
};
