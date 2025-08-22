// src/Inventory/utils/search.js
// Fuzzy search utilities with highlighting

/**
 * Simple fuzzy search implementation
 * Returns a score between 0 and 1, where 1 is perfect match
 */
export function fuzzyMatch(pattern, text) {
  if (!pattern || !text) return 0;
  
  const patternLower = pattern.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match gets highest score
  if (textLower === patternLower) return 1;
  
  // Check if pattern is a substring
  if (textLower.includes(patternLower)) {
    // Higher score for matches at the beginning
    const index = textLower.indexOf(patternLower);
    const substringScore = 0.8 - (index / textLower.length) * 0.3;
    return Math.max(substringScore, 0.5);
  }
  
  // Fuzzy character matching
  let patternIndex = 0;
  let score = 0;
  let consecutiveMatches = 0;
  let maxConsecutiveMatches = 0;
  
  for (let i = 0; i < textLower.length && patternIndex < patternLower.length; i++) {
    if (textLower[i] === patternLower[patternIndex]) {
      patternIndex++;
      consecutiveMatches++;
      maxConsecutiveMatches = Math.max(maxConsecutiveMatches, consecutiveMatches);
      
      // Bonus for consecutive matches
      score += 1 + (consecutiveMatches * 0.1);
    } else {
      consecutiveMatches = 0;
    }
  }
  
  // All characters must be found
  if (patternIndex < patternLower.length) return 0;
  
  // Normalize score
  const baseScore = score / patternLower.length;
  const lengthPenalty = Math.min(textLower.length / patternLower.length / 10, 0.3);
  const consecutiveBonus = maxConsecutiveMatches / patternLower.length * 0.2;
  
  return Math.min(Math.max(baseScore - lengthPenalty + consecutiveBonus, 0), 0.4);
}

/**
 * Highlight matching characters in text
 */
export function highlightMatches(pattern, text, className = 'bg-yellow-200') {
  if (!pattern || !text) return text;
  
  const patternLower = pattern.toLowerCase();
  const textLower = text.toLowerCase();
  
  // For substring matches, highlight the whole substring
  const subIndex = textLower.indexOf(patternLower);
  if (subIndex !== -1) {
    const before = text.slice(0, subIndex);
    const match = text.slice(subIndex, subIndex + pattern.length);
    const after = text.slice(subIndex + pattern.length);
    return `${before}<span class="${className}">${match}</span>${after}`;
  }
  
  // For fuzzy matches, highlight individual characters
  let result = '';
  let patternIndex = 0;
  
  for (let i = 0; i < text.length && patternIndex < patternLower.length; i++) {
    const char = text[i];
    if (textLower[i] === patternLower[patternIndex]) {
      result += `<span class="${className}">${char}</span>`;
      patternIndex++;
    } else {
      result += char;
    }
  }
  
  // Add remaining characters
  if (result.length < text.length) {
    result += text.slice(result.replace(/<[^>]*>/g, '').length);
  }
  
  return result;
}

/**
 * Search items with fuzzy matching and ranking
 */
export function searchItems(items, searchQuery, options = {}) {
  if (!searchQuery.trim()) return items;
  
  const {
    threshold = 0.1,
    maxResults = 100,
    searchFields = ['title', 'notes', 'tags']
  } = options;
  
  const results = [];
  const query = searchQuery.trim();
  
  for (const item of items) {
    let bestScore = 0;
    let matchedField = '';
    
    // Search in different fields
    for (const field of searchFields) {
      let fieldValue = '';
      let score = 0;
      
      if (field === 'tags' && Array.isArray(item.tags)) {
        // Search in tags array
        for (const tag of item.tags) {
          const tagScore = fuzzyMatch(query, tag);
          if (tagScore > score) {
            score = tagScore;
            fieldValue = tag;
          }
        }
      } else if (item[field]) {
        fieldValue = String(item[field]);
        score = fuzzyMatch(query, fieldValue);
      }
      
      if (score > bestScore) {
        bestScore = score;
        matchedField = field;
      }
    }
    
    if (bestScore >= threshold) {
      results.push({
        item,
        score: bestScore,
        matchedField
      });
    }
  }
  
  // Sort by score (descending) and limit results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(result => result.item);
}

/**
 * Search folders with fuzzy matching
 */
export function searchFolders(folders, searchQuery, options = {}) {
  if (!searchQuery.trim()) return folders;
  
  const { threshold = 0.1 } = options;
  const query = searchQuery.trim();
  
  const results = [];
  
  for (const folder of folders) {
    const score = fuzzyMatch(query, folder.name || '');
    if (score >= threshold) {
      results.push({ folder, score });
    }
  }
  
  return results
    .sort((a, b) => b.score - a.score)
    .map(result => result.folder);
}