import { useState, useEffect } from 'react';

export function useTileStyle() {
  const [style, setStyle] = useState({});

  useEffect(() => {
    const calculateAndSetStyle = () => {
      if (typeof window !== 'undefined') {
        try {
          const root = document.documentElement;
          const tileColor = getComputedStyle(root).getPropertyValue('--tile-color').trim();
          const tileTextColor = getComputedStyle(root).getPropertyValue('--tile-text-color').trim();
          
          // Validate that we got valid values
          const validTileColor = tileColor && tileColor !== '';
          const validTextColor = tileTextColor && tileTextColor !== '';
          
          if (validTileColor && validTextColor) {
            setStyle({
              backgroundColor: tileColor,
              color: tileTextColor
            });
          } else {
            // Fallback to default values if CSS variables are not available
            const isDark = root.classList.contains('dark');
            setStyle({
              backgroundColor: isDark ? '#262833' : '#F6F5F2',
              color: isDark ? '#ffffff' : '#333333'
            });
          }
        } catch (error) {
          console.warn('Error calculating tile style:', error);
          // Fallback styling
          setStyle({
            backgroundColor: '#F6F5F2',
            color: '#333333'
          });
        }
      }
    };

    // Set initial style
    calculateAndSetStyle();

    // Create observer to watch for theme changes
    let observer;
    try {
      observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && 
              (mutation.attributeName === 'class' || mutation.attributeName === 'style')) {
            // Small delay to ensure CSS has been applied
            setTimeout(calculateAndSetStyle, 10);
          }
        });
      });

      observer.observe(document.documentElement, { 
        attributes: true, 
        attributeFilter: ['class', 'style'] 
      });
    } catch (error) {
      console.warn('Error setting up tile style observer:', error);
    }

    // Also listen for custom theme changes
    const handleThemeChange = () => {
      setTimeout(calculateAndSetStyle, 50);
    };

    window.addEventListener('themeChanged', handleThemeChange);

    return () => {
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener('themeChanged', handleThemeChange);
    };
  }, []);

  return style;
}