/**
 * SoundscapePicker Component
 * 
 * Nested category/variant picker for adaptive study soundscapes.
 * First shows 4 categories (Focus, Nature, Minimal, Energy), then variants within selected category.
 * 
 * Backend Integration: None required - uses local soundscape data.
 * // TODO: API -> /api/analytics/soundscape-usage (track which soundscapes are popular)
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SoundscapeId, SoundscapePreset } from '@/utils/soundscapeEngine';
import { ArrowLeft, Brain, Check, Coffee, Heart, Loader2, Moon, PenTool, Repeat, Trees, Volume2, Zap } from 'lucide-react';
import { useState } from 'react';

interface SoundscapePickerProps {
  soundscapes: SoundscapePreset[];
  selectedId: SoundscapeId | null;
  isLoading: boolean;
  loadingId?: SoundscapeId | null;
  onSelect: (id: SoundscapeId) => void;
  className?: string;
}

// Category definitions
const CATEGORIES = [
  {
    id: 'focus',
    name: 'Focus',
    description: 'Instrumental/Classical/Ambient',
    icon: Brain,
    color: 'blue',
    gradient: 'from-blue-500/20 to-indigo-600/20 hover:from-blue-500/30 hover:to-indigo-600/30',
    border: 'border-blue-500',
    iconColor: 'text-blue-500',
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'Nature + Music Blend',
    icon: Trees,
    color: 'green',
    gradient: 'from-emerald-500/20 to-teal-600/20 hover:from-emerald-500/30 hover:to-teal-600/30',
    border: 'border-emerald-500',
    iconColor: 'text-emerald-500',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Ultra-Minimal Rhythms',
    icon: Volume2,
    color: 'gray',
    gradient: 'from-gray-500/20 to-slate-600/20 hover:from-gray-500/30 hover:to-slate-600/30',
    border: 'border-gray-500',
    iconColor: 'text-gray-500',
  },
  {
    id: 'energy',
    name: 'Energy',
    description: 'Upbeat Motivating',
    icon: Zap,
    color: 'yellow',
    gradient: 'from-amber-500/20 to-orange-600/20 hover:from-amber-500/30 hover:to-orange-600/30',
    border: 'border-amber-500',
    iconColor: 'text-amber-500',
  },
];

// Icon mapping for variant types
const VARIANT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'brain': Brain,
  'pen-tool': PenTool,
  'repeat': Repeat,
  'coffee': Coffee,
  'moon': Moon,
  'heart': Heart,
};

// Variant gradients (fallback if not in category)
const VARIANT_GRADIENTS: Record<string, string> = {
  'focus-deep-focus': 'from-blue-500/20 to-indigo-600/20 hover:from-blue-500/30 hover:to-indigo-600/30',
  'focus-conceptual-flow': 'from-amber-500/20 to-orange-600/20 hover:from-amber-500/30 hover:to-orange-600/30',
  'focus-memory-drill': 'from-emerald-500/20 to-teal-600/20 hover:from-emerald-500/30 hover:to-teal-600/30',
  'deep-focus': 'from-blue-500/20 to-indigo-600/20 hover:from-blue-500/30 hover:to-indigo-600/30',
  'conceptual-flow': 'from-amber-500/20 to-orange-600/20 hover:from-amber-500/30 hover:to-orange-600/30',
  'memory-drill': 'from-emerald-500/20 to-teal-600/20 hover:from-emerald-500/30 hover:to-teal-600/30',
  'study-break': 'from-rose-500/20 to-pink-600/20 hover:from-rose-500/30 hover:to-pink-600/30',
};

const VARIANT_BORDERS: Record<string, string> = {
  'focus-deep-focus': 'border-blue-500',
  'focus-conceptual-flow': 'border-amber-500',
  'focus-memory-drill': 'border-emerald-500',
  'deep-focus': 'border-blue-500',
  'conceptual-flow': 'border-amber-500',
  'memory-drill': 'border-emerald-500',
  'study-break': 'border-rose-500',
};

const VARIANT_ICON_COLORS: Record<string, string> = {
  'focus-deep-focus': 'text-blue-500',
  'focus-conceptual-flow': 'text-amber-500',
  'focus-memory-drill': 'text-emerald-500',
  'deep-focus': 'text-blue-500',
  'conceptual-flow': 'text-amber-500',
  'memory-drill': 'text-emerald-500',
  'study-break': 'text-rose-500',
};

export function SoundscapePicker({
  soundscapes,
  selectedId,
  isLoading,
  loadingId,
  onSelect,
  className,
}: SoundscapePickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter soundscapes by selected category
  const categorySoundscapes = selectedCategory
    ? soundscapes.filter(s => s.category === selectedCategory)
    : [];

  // Get category info
  const currentCategory = selectedCategory
    ? CATEGORIES.find(c => c.id === selectedCategory)
    : null;

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  // Handle back to categories
  const handleBack = () => {
    setSelectedCategory(null);
  };

  // If category is selected, show variants
  if (selectedCategory) {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Header with back button */}
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-8 px-2"
            aria-label="Back to categories"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h3 className="text-lg font-semibold flex-1">{currentCategory?.name} Soundscapes</h3>
        </div>

        {/* Variants grid */}
        {categorySoundscapes.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 auto-rows-fr">
            {categorySoundscapes.map((soundscape) => {
              const IconComponent = VARIANT_ICONS[soundscape.icon] || Brain;
              const isSelected = selectedId === soundscape.id;
              const isLoadingThis = loadingId === soundscape.id && isLoading;
              
              // Use category colors or fallback to variant colors
              const gradient = currentCategory?.gradient || VARIANT_GRADIENTS[soundscape.id] || 'from-primary/20 to-primary/10';
              const border = currentCategory?.border || VARIANT_BORDERS[soundscape.id] || 'border-primary';
              const iconColor = currentCategory?.iconColor || VARIANT_ICON_COLORS[soundscape.id] || 'text-primary';
              
              return (
                <Card
                  key={soundscape.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`Select ${soundscape.name} soundscape: ${soundscape.description}`}
                  onClick={() => !isLoading && onSelect(soundscape.id as SoundscapeId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      !isLoading && onSelect(soundscape.id as SoundscapeId);
                    }
                  }}
                  className={cn(
                    'relative cursor-pointer transition-all duration-300 h-full',
                    'bg-gradient-to-br',
                    gradient,
                    'border-2',
                    isSelected ? border : 'border-transparent',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    isLoading && !isLoadingThis && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <CardContent className="p-4 h-full flex flex-col">
                    {/* Selection indicator */}
                    {isSelected && (
                      <div className={cn(
                        'absolute top-2 right-2 h-5 w-5 rounded-full flex items-center justify-center',
                        'bg-primary text-primary-foreground'
                      )}>
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    
                    {/* Loading indicator */}
                    {isLoadingThis && (
                      <div className="absolute top-2 right-2">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Icon */}
                    <div className={cn(
                      'h-10 w-10 rounded-xl flex items-center justify-center mb-3',
                      'bg-background/50 backdrop-blur-sm'
                    )}>
                      <IconComponent className={cn('h-5 w-5', iconColor)} />
                    </div>
                    
                    {/* Name */}
                    <h4 className="font-semibold text-sm mb-1 leading-tight h-[2.5rem] flex items-end">
                      <span>
                        {soundscape.name.includes(' - ') 
                          ? soundscape.name.split(' - ')[1] 
                          : soundscape.name}
                      </span>
                    </h4>
                    
                    {/* Description */}
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2 h-[2rem]">
                      {soundscape.description}
                    </p>
                    
                    {/* BPM badge */}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-auto w-fit">
                      {soundscape.bpm} BPM
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No soundscapes available in this category yet.</p>
            <p className="text-xs mt-2">Coming soon!</p>
          </div>
        )}

        {/* Help text */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          Select a variant, then press play. Audio adapts to your stress level and study type.
        </p>
      </div>
    );
  }

  // Show categories
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold">Choose Category</h3>
        <Badge variant="secondary" className="text-xs">
          Adaptive Audio
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((category) => {
          const IconComponent = category.icon;
          const hasVariants = soundscapes.some(s => s.category === category.id);
          
          return (
            <Card
              key={category.id}
              role="button"
              tabIndex={0}
              aria-label={`Select ${category.name} category`}
              onClick={() => handleCategorySelect(category.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCategorySelect(category.id);
                }
              }}
              className={cn(
                'relative cursor-pointer transition-all duration-300 h-full',
                'bg-gradient-to-br',
                category.gradient,
                'border-2 border-transparent',
                'hover:scale-[1.02] active:scale-[0.98]',
                !hasVariants && 'opacity-60'
              )}
            >
              <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center">
                {/* Icon */}
                <div className={cn(
                  'h-16 w-16 rounded-xl flex items-center justify-center mb-4',
                  'bg-background/50 backdrop-blur-sm'
                )}>
                  <IconComponent className={cn('h-8 w-8', category.iconColor)} />
                </div>
                
                {/* Name */}
                <h4 className="font-semibold text-base mb-2">
                  {category.name}
                </h4>
                
                {/* Description */}
                <p className="text-xs text-muted-foreground mb-3">
                  {category.description}
                </p>
                
                {/* Variant count badge */}
                {hasVariants && (
                  <Badge variant="outline" className="text-[10px]">
                    {soundscapes.filter(s => s.category === category.id).length} available
                  </Badge>
                )}
                
                {!hasVariants && (
                  <Badge variant="outline" className="text-[10px] opacity-50">
                    Coming soon
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Help text */}
      <p className="text-xs text-muted-foreground text-center mt-4">
        Select a category to see available soundscapes.
      </p>
    </div>
  );
}

export default SoundscapePicker;
