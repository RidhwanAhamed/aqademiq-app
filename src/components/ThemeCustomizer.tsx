import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  Sun, 
  Moon, 
  Monitor, 
  Eye, 
  RotateCcw,
  Check
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { colorThemes as themeColors, fontSizes as themeFontSizes } from '@/hooks/useThemeInit';

const colorThemes = [
  { name: 'Default Blue', id: 'default' },
  { name: 'Forest Green', id: 'forest' },
  { name: 'Purple Dream', id: 'purple' },
  { name: 'Sunset Orange', id: 'sunset' },
  { name: 'Ocean Teal', id: 'ocean' },
  { name: 'Rose Pink', id: 'rose' },
];

const fontSizes = [
  { name: 'Small', id: 'small', scale: '0.875' },
  { name: 'Default', id: 'default', scale: '1' },
  { name: 'Large', id: 'large', scale: '1.125' },
  { name: 'Extra Large', id: 'xl', scale: '1.25' }
];

export function ThemeCustomizer() {
  const { theme, setTheme } = useTheme();
  const [selectedColorTheme, setSelectedColorTheme] = useState('default');
  const [selectedFontSize, setSelectedFontSize] = useState('default');
  const [previewMode, setPreviewMode] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    const savedColorTheme = localStorage.getItem('aqademiq-color-theme');
    const savedFontSize = localStorage.getItem('aqademiq-font-size');
    
    if (savedColorTheme) setSelectedColorTheme(savedColorTheme);
    if (savedFontSize) setSelectedFontSize(savedFontSize);
  }, []);

  const applyColorTheme = (themeId: string) => {
    const themeData = themeColors[themeId as keyof typeof themeColors];
    if (!themeData) return;
    
    const root = document.documentElement;
    
    // Apply HSL values
    root.style.setProperty('--primary', themeData.primary);
    root.style.setProperty('--secondary', themeData.secondary);
    root.style.setProperty('--accent', themeData.accent);
    
    // Update gradient variables
    root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${themeData.primary}), hsl(${themeData.accent}))`);
    root.style.setProperty('--gradient-progress', `linear-gradient(90deg, hsl(${themeData.primary}), hsl(${themeData.accent}))`);
    root.style.setProperty('--ring', themeData.primary);
    
    if (!previewMode) {
      setSelectedColorTheme(themeId);
      localStorage.setItem('aqademiq-color-theme', themeId);
    }
  };

  const getThemeDisplayColors = (themeId: string) => {
    const themeData = themeColors[themeId as keyof typeof themeColors];
    if (!themeData) return { primary: '', secondary: '', accent: '' };
    return {
      primary: `hsl(${themeData.primary})`,
      secondary: `hsl(${themeData.secondary})`,
      accent: `hsl(${themeData.accent})`,
    };
  };

  const applyFontSize = (size: typeof fontSizes[0]) => {
    const root = document.documentElement;
    root.style.setProperty('font-size', `${parseFloat(size.scale)}rem`);
    setSelectedFontSize(size.id);
    localStorage.setItem('aqademiq-font-size', size.id);
  };

  const resetToDefaults = () => {
    const root = document.documentElement;
    
    // Reset colors using the centralized theme data
    const defaultTheme = themeColors['default'];
    root.style.setProperty('--primary', defaultTheme.primary);
    root.style.setProperty('--secondary', defaultTheme.secondary);
    root.style.setProperty('--accent', defaultTheme.accent);
    root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${defaultTheme.primary}), hsl(${defaultTheme.accent}))`);
    root.style.setProperty('--gradient-progress', `linear-gradient(90deg, hsl(${defaultTheme.primary}), hsl(${defaultTheme.accent}))`);
    root.style.setProperty('--ring', defaultTheme.primary);
    
    // Reset font size
    root.style.removeProperty('font-size');
    
    setSelectedColorTheme('default');
    setSelectedFontSize('default');
    setTheme('system');
    
    localStorage.removeItem('aqademiq-color-theme');
    localStorage.removeItem('aqademiq-font-size');
  };

  const togglePreview = () => {
    setPreviewMode(!previewMode);
    if (previewMode) {
      // Exit preview mode - restore saved theme
      applyColorTheme(selectedColorTheme);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Theme Customization</h3>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePreview}
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            {previewMode ? 'Exit Preview' : 'Preview Mode'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>
      </div>

      {previewMode && (
        <Card className="p-4 bg-primary/10 border-primary/20">
          <div className="flex items-center gap-2 text-primary">
            <Eye className="w-4 h-4" />
            <span className="font-medium">Preview Mode Active</span>
          </div>
          <p className="text-sm text-primary/80 mt-1">
            Hover over themes to preview them. Click "Apply" to save changes.
          </p>
        </Card>
      )}

      {/* Dark Mode Toggle */}
      <Card className="p-6">
        <h4 className="font-medium mb-4">Appearance Mode</h4>
        <div className="flex gap-2">
          <Button
            variant={theme === 'light' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('light')}
            className="gap-2"
          >
            <Sun className="w-4 h-4" />
            Light
          </Button>
          <Button
            variant={theme === 'dark' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('dark')}
            className="gap-2"
          >
            <Moon className="w-4 h-4" />
            Dark
          </Button>
          <Button
            variant={theme === 'system' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('system')}
            className="gap-2"
          >
            <Monitor className="w-4 h-4" />
            System
          </Button>
        </div>
      </Card>

      {/* Color Themes */}
      <Card className="p-6">
        <h4 className="font-medium mb-4">Color Themes</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {colorThemes.map((colorTheme) => {
            const colors = getThemeDisplayColors(colorTheme.id);
            return (
              <div
                key={colorTheme.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedColorTheme === colorTheme.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onMouseEnter={() => previewMode && applyColorTheme(colorTheme.id)}
                onClick={() => !previewMode && applyColorTheme(colorTheme.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm">{colorTheme.name}</span>
                  {selectedColorTheme === colorTheme.id && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex gap-2">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: colors.primary }}
                  />
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: colors.secondary }}
                  />
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: colors.accent }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Font Size */}
      <Card className="p-6">
        <h4 className="font-medium mb-4">Font Size</h4>
        <div className="flex flex-wrap gap-2">
          {fontSizes.map((size) => (
            <Button
              key={size.id}
              variant={selectedFontSize === size.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => applyFontSize(size)}
              className="gap-2"
            >
              {selectedFontSize === size.id && <Check className="w-3 h-3" />}
              {size.name}
            </Button>
          ))}
        </div>
      </Card>

      {/* Course Color Customization */}
      <Card className="p-6">
        <h4 className="font-medium mb-4">Course Colors</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Customize colors for your courses to make them easily identifiable in your calendar and assignments.
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500" />
              <span className="text-sm font-medium">Computer Science</span>
            </div>
            <Button variant="outline" size="sm">
              Change Color
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500" />
              <span className="text-sm font-medium">Mathematics</span>
            </div>
            <Button variant="outline" size="sm">
              Change Color
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-500" />
              <span className="text-sm font-medium">Physics</span>
            </div>
            <Button variant="outline" size="sm">
              Change Color
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}