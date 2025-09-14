import React, { useState } from 'react';
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

const colorThemes = [
  {
    name: 'Default Blue',
    id: 'default',
    colors: {
      primary: 'hsl(221, 83%, 53%)',
      secondary: 'hsl(210, 40%, 95%)',
      accent: 'hsl(221, 83%, 53%)'
    }
  },
  {
    name: 'Forest Green',
    id: 'forest',
    colors: {
      primary: 'hsl(142, 76%, 36%)',
      secondary: 'hsl(138, 62%, 47%)',
      accent: 'hsl(142, 76%, 36%)'
    }
  },
  {
    name: 'Purple Dream',
    id: 'purple',
    colors: {
      primary: 'hsl(262, 83%, 58%)',
      secondary: 'hsl(270, 95%, 75%)',
      accent: 'hsl(262, 83%, 58%)'
    }
  },
  {
    name: 'Sunset Orange',
    id: 'sunset',
    colors: {
      primary: 'hsl(25, 95%, 53%)',
      secondary: 'hsl(33, 100%, 96%)',
      accent: 'hsl(25, 95%, 53%)'
    }
  },
  {
    name: 'Ocean Teal',
    id: 'ocean',
    colors: {
      primary: 'hsl(173, 80%, 40%)',
      secondary: 'hsl(180, 100%, 97%)',
      accent: 'hsl(173, 80%, 40%)'
    }
  },
  {
    name: 'Rose Pink',
    id: 'rose',
    colors: {
      primary: 'hsl(330, 81%, 60%)',
      secondary: 'hsl(322, 100%, 98%)',
      accent: 'hsl(330, 81%, 60%)'
    }
  }
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

  const applyColorTheme = (themeData: typeof colorThemes[0]) => {
    const root = document.documentElement;
    
    if (previewMode) {
      // Temporary preview
      root.style.setProperty('--primary', themeData.colors.primary.match(/hsl\(([^)]+)\)/)![1]);
      root.style.setProperty('--secondary', themeData.colors.secondary.match(/hsl\(([^)]+)\)/)![1]);
      root.style.setProperty('--accent', themeData.colors.accent.match(/hsl\(([^)]+)\)/)![1]);
    } else {
      // Permanent application - this would need localStorage integration
      root.style.setProperty('--primary', themeData.colors.primary.match(/hsl\(([^)]+)\)/)![1]);
      root.style.setProperty('--secondary', themeData.colors.secondary.match(/hsl\(([^)]+)\)/)![1]);
      root.style.setProperty('--accent', themeData.colors.accent.match(/hsl\(([^)]+)\)/)![1]);
      
      setSelectedColorTheme(themeData.id);
      localStorage.setItem('aqademiq-color-theme', themeData.id);
    }
  };

  const applyFontSize = (size: typeof fontSizes[0]) => {
    const root = document.documentElement;
    root.style.setProperty('font-size', `${parseFloat(size.scale)}rem`);
    setSelectedFontSize(size.id);
    localStorage.setItem('aqademiq-font-size', size.id);
  };

  const resetToDefaults = () => {
    const root = document.documentElement;
    const defaultTheme = colorThemes[0];
    
    // Reset colors
    root.style.setProperty('--primary', defaultTheme.colors.primary.match(/hsl\(([^)]+)\)/)![1]);
    root.style.setProperty('--secondary', defaultTheme.colors.secondary.match(/hsl\(([^)]+)\)/)![1]);
    root.style.setProperty('--accent', defaultTheme.colors.accent.match(/hsl\(([^)]+)\)/)![1]);
    
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
      const savedTheme = colorThemes.find(t => t.id === selectedColorTheme) || colorThemes[0];
      applyColorTheme(savedTheme);
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
          {colorThemes.map((colorTheme) => (
            <div
              key={colorTheme.id}
              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                selectedColorTheme === colorTheme.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onMouseEnter={() => previewMode && applyColorTheme(colorTheme)}
              onClick={() => !previewMode && applyColorTheme(colorTheme)}
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
                  style={{ backgroundColor: colorTheme.colors.primary }}
                />
                <div
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: colorTheme.colors.secondary }}
                />
                <div
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: colorTheme.colors.accent }}
                />
              </div>
            </div>
          ))}
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