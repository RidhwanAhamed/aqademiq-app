import { useEffect } from 'react';

// Custom themes - 'default' matches the original index.css values (purple-to-blue gradient)
const colorThemes = {
  default: {
    primary: '262 52% 47%',      // Purple
    secondary: '215 16% 92%',
    accent: '216 88% 60%',       // Blue → Purple-Blue gradient
  },
  forest: {
    primary: '142 76% 36%',      // Deep Green
    secondary: '138 62% 90%',
    accent: '160 84% 39%',       // Teal → Green-Teal gradient
  },
  blue: {
    primary: '221 83% 53%',      // Royal Blue
    secondary: '210 40% 95%',
    accent: '199 89% 48%',       // Cyan → Blue-Cyan gradient
  },
  sunset: {
    primary: '25 95% 53%',       // Orange
    secondary: '33 100% 96%',
    accent: '350 89% 60%',       // Rose → Orange-Rose gradient
  },
  ocean: {
    primary: '173 80% 40%',      // Teal
    secondary: '180 100% 97%',
    accent: '210 80% 55%',       // Blue → Teal-Blue gradient
  },
  rose: {
    primary: '330 81% 60%',      // Rose Pink
    secondary: '322 100% 98%',
    accent: '280 70% 60%',       // Violet → Rose-Violet gradient
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
    
    // Restore saved color theme - only apply if NOT default
    const savedColorTheme = localStorage.getItem('aqademiq-color-theme');
    if (savedColorTheme && savedColorTheme !== 'default' && colorThemes[savedColorTheme as keyof typeof colorThemes]) {
      const theme = colorThemes[savedColorTheme as keyof typeof colorThemes];
      root.style.setProperty('--primary', theme.primary);
      root.style.setProperty('--secondary', theme.secondary);
      root.style.setProperty('--accent', theme.accent);
      
      // Update gradient variables to use new primary color
      root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${theme.primary}), hsl(${theme.accent}))`);
      root.style.setProperty('--gradient-progress', `linear-gradient(90deg, hsl(${theme.primary}), hsl(${theme.accent}))`);
      root.style.setProperty('--ring', theme.primary);
    }
    // If default or no saved theme, don't override - let index.css handle it
    
    // Restore saved font size
    const savedFontSize = localStorage.getItem('aqademiq-font-size');
    if (savedFontSize && fontSizes[savedFontSize as keyof typeof fontSizes]) {
      root.style.setProperty('font-size', `${fontSizes[savedFontSize as keyof typeof fontSizes]}rem`);
    }
  }, []);
}

export { colorThemes, fontSizes };
