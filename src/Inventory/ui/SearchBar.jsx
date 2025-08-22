// src/Inventory/ui/SearchBar.jsx
// Enhanced search bar with fuzzy matching

import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { highlightMatches } from '../utils/search';

export function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = 'Search items, folders, tags...',
  suggestions = [],
  showSuggestions = false,
  onSuggestionClick,
  className = ''
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Show suggestions when focused and have value or suggestions
  useEffect(() => {
    if (showSuggestions && isFocused && (value || suggestions.length > 0)) {
      setShowSuggestionsList(true);
    } else {
      setShowSuggestionsList(false);
    }
  }, [showSuggestions, isFocused, value, suggestions.length]);

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowSuggestionsList(false);
        setIsFocused(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion);
    onSuggestionClick?.(suggestion);
    setShowSuggestionsList(false);
    setIsFocused(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestionsList(false);
      setIsFocused(false);
      inputRef.current?.blur();
    } else if (e.key === 'Enter' && showSuggestionsList && suggestions.length > 0) {
      handleSuggestionClick(suggestions[0]);
      e.preventDefault();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`
            block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            text-sm placeholder-gray-500
            ${isFocused ? 'ring-2 ring-blue-500 border-blue-500' : ''}
          `}
          aria-label={placeholder}
          aria-expanded={showSuggestionsList}
          aria-haspopup="listbox"
          role="combobox"
        />

        {value && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {showSuggestionsList && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className={`
            absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg
            max-h-60 overflow-auto
          `}
          role="listbox"
        >
          {suggestions.slice(0, 8).map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`
                w-full px-4 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50
                focus:outline-none border-b border-gray-100 last:border-b-0
              `}
              role="option"
              dangerouslySetInnerHTML={{
                __html: highlightMatches(value, suggestion, 'bg-yellow-200 font-medium')
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}