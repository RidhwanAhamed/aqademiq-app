import { useEffect } from 'react';

const colorThemes = {
  default: {
    primary: '221 83% 53%',
    secondary: '210 40% 95%',
    accent: '221 83% 53%',
  },
  forest: {
    primary: '142 76% 36%',
    secondary: '138 62% 47%',
    accent: '142 76% 36%',
  },
  purple: {
    primary: '262 83% 58%',
    secondary: '270 95% 75%',
    accent: '262 83% 58%',
  },
  sunset: {
    primary: '25 95% 53%',
    secondary: '33 100% 96%',
    accent: '25 95% 53%',
  },
  ocean: {
    primary: '173 80% 40%',
    secondary: '180 100% 97%',
    accent: '173 80% 40%',
  },
  rose: {
    primary: '330 81% 60%',
    secondary: '322 100% 98%',
    accent: '330 81% 60%',
  },
};

const fontSizes = {
  small: '0.875',
  default: '1',
  large: '1.125',
  xl: '1.25',
};

export function useThemeInit() {
  useEffect(() => {
    const root = document.documentElement;
    
    // Restore saved color theme
    const savedColorTheme = localStorage.getItem('aqademiq-color-theme');
    if (savedColorTheme && colorThemes[savedColorTheme as keyof typeof colorThemes]) {
      const theme = colorThemes[savedColorTheme as keyof typeof colorThemes];
      root.style.setProperty('--primary', theme.primary);
      root.style.setProperty('--secondary', theme.secondary);
      root.style.setProperty('--accent', theme.accent);
      
      // Update gradient variables to use new primary color
      root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${theme.primary}), hsl(${theme.accent}))`);
      root.style.setProperty('--gradient-progress', `linear-gradient(90deg, hsl(${theme.primary}), hsl(${theme.accent}))`);
      root.style.setProperty('--ring', theme.primary);
    }
    
    // Restore saved font size
    const savedFontSize = localStorage.getItem('aqademiq-font-size');
    if (savedFontSize && fontSizes[savedFontSize as keyof typeof fontSizes]) {
      root.style.setProperty('font-size', `${fontSizes[savedFontSize as keyof typeof fontSizes]}rem`);
    }
  }, []);
}

export { colorThemes, fontSizes };
