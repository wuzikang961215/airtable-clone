// Airtable-style theme constants
export const airtableTheme = {
  colors: {
    // Primary colors
    primary: '#2D7FF9',
    primaryHover: '#1968E0',
    primaryLight: '#EBF3FE',
    
    // Background colors
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F5F5F5',
    bgTertiary: '#FAFAFA',
    bgHeader: '#FCFCFC',
    
    // Border colors
    borderLight: '#E5E5E5',
    borderMedium: '#D0D0D0',
    borderDark: '#B8B8B8',
    borderFocus: '#2D7FF9',
    
    // Text colors
    textPrimary: '#333333',
    textSecondary: '#666666',
    textTertiary: '#999999',
    textInverse: '#FFFFFF',
    
    // Row/Cell colors
    rowHover: '#F7F7F7',
    rowSelected: '#E8F2FF',
    cellSelected: '#2D7FF9',
    cellEditing: '#FFFFFF',
    
    // Column header
    headerBg: '#F8F8F8',
    headerBorder: '#E1E1E1',
    headerText: '#333333',
    headerHover: '#F0F0F0',
    
    // Status colors
    success: '#27AE60',
    warning: '#F2994A',
    error: '#EB5757',
    info: '#2D7FF9',
    
    // View selector
    viewBg: '#FFFFFF',
    viewHover: '#F5F5F5',
    viewActive: '#E8F2FF',
    viewBorder: '#E5E5E5',
  },
  
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: {
      xs: '11px',
      sm: '13px',
      base: '14px',
      lg: '16px',
      xl: '18px',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  
  spacing: {
    cell: {
      paddingX: '8px',
      paddingY: '6px',
      height: '32px',
    },
    header: {
      height: '32px',
      paddingX: '8px',
    },
    rowNumber: {
      width: '48px',
    },
  },
  
  borders: {
    radius: {
      sm: '3px',
      md: '6px',
      lg: '8px',
    },
    width: {
      thin: '1px',
      medium: '2px',
      thick: '3px',
    },
  },
  
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    focus: '0 0 0 3px rgba(45, 127, 249, 0.2)',
  },
} as const;

export type AirtableTheme = typeof airtableTheme;