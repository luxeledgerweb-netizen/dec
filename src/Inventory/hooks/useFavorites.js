// src/Inventory/hooks/useFavorites.js
// Hook for managing favorite items

import { useState, useEffect } from 'react';

const FAVORITES_KEY = 'inventory_favorites_v1';

/**
 * Hook for managing favorite items
 * Stores favorites in localStorage
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const favArray = JSON.parse(stored);
        setFavorites(new Set(favArray));
      }
    } catch (error) {
      console.warn('Failed to load favorites from localStorage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save favorites to localStorage whenever they change
  const saveFavorites = (newFavorites) => {
    try {
      const favArray = Array.from(newFavorites);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favArray));
      setFavorites(newFavorites);
    } catch (error) {
      console.warn('Failed to save favorites to localStorage:', error);
    }
  };

  const toggleFavorite = (itemId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(itemId)) {
      newFavorites.delete(itemId);
    } else {
      newFavorites.add(itemId);
    }
    saveFavorites(newFavorites);
  };

  const addFavorite = (itemId) => {
    if (!favorites.has(itemId)) {
      const newFavorites = new Set(favorites);
      newFavorites.add(itemId);
      saveFavorites(newFavorites);
    }
  };

  const removeFavorite = (itemId) => {
    if (favorites.has(itemId)) {
      const newFavorites = new Set(favorites);
      newFavorites.delete(itemId);
      saveFavorites(newFavorites);
    }
  };

  const isFavorite = (itemId) => {
    return favorites.has(itemId);
  };

  const clearFavorites = () => {
    saveFavorites(new Set());
  };

  return {
    favorites: Array.from(favorites),
    loading,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    isFavorite,
    clearFavorites
  };
}