import { useState, useEffect, useRef } from 'react';

export const useCountUp = (targetValue, duration = 1000) => {
  const [currentValue, setCurrentValue] = useState(0);
  const animationRef = useRef();
  const startTimeRef = useRef();

  useEffect(() => {
    if (targetValue === 0) {
      setCurrentValue(0);
      return;
    }

    const startValue = currentValue;
    const difference = targetValue - startValue;
    
    if (Math.abs(difference) < 0.01) {
      setCurrentValue(targetValue);
      return;
    }

    const animate = (timestamp) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      const newValue = startValue + (difference * easeOutQuart);
      setCurrentValue(newValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setCurrentValue(targetValue);
        startTimeRef.current = null;
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    startTimeRef.current = null;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration]);

  return Math.round(currentValue * 100) / 100;
};