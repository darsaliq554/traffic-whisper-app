import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Route, Search, Navigation } from 'lucide-react';

interface Suggestion {
  id: string;
  place_name: string;
  center: [number, number];
  place_type: string[];
}

interface SearchInputProps {
  mapboxToken: string;
  onDestinationSelect: (destination: string, coordinates?: [number, number]) => void;
  isLoading: boolean;
}

const SearchInput: React.FC<SearchInputProps> = ({ 
  mapboxToken, 
  onDestinationSelect, 
  isLoading 
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.length > 2) {
        searchSuggestions(query);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, mapboxToken]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchSuggestions = async (searchQuery: string) => {
    if (!mapboxToken || !searchQuery.trim()) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${mapboxToken}&limit=5&types=place,locality,neighborhood,address,poi`
      );
      const data = await response.json();

      if (data.features) {
        setSuggestions(data.features);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          selectSuggestion(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    setQuery(suggestion.place_name);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    onDestinationSelect(suggestion.place_name, suggestion.center);
  };

  const handleSearch = () => {
    if (query.trim()) {
      setShowSuggestions(false);
      onDestinationSelect(query.trim());
    }
  };

  const getPlaceIcon = (placeTypes: string[]) => {
    if (placeTypes.includes('poi')) return '📍';
    if (placeTypes.includes('address')) return '🏠';
    if (placeTypes.includes('neighborhood')) return '🏘️';
    if (placeTypes.includes('locality')) return '🏙️';
    if (placeTypes.includes('place')) return '📍';
    return '📍';
  };

  return (
    <div className="flex gap-2" ref={searchRef}>
      <div className="flex-1 relative">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              placeholder="Enter destination..."
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              className="bg-background/50 pr-8"
              autoComplete="off"
            />
            <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-6 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                className={`w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b border-border last:border-b-0 ${
                  index === selectedIndex ? 'bg-accent' : ''
                }`}
                onClick={() => selectSuggestion(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm mt-0.5">
                    {getPlaceIcon(suggestion.place_type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {suggestion.place_name.split(',')[0]}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {suggestion.place_name.split(',').slice(1).join(',').trim()}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Button 
        onClick={handleSearch}
        disabled={!query.trim() || isLoading}
        size="sm"
      >
        <Route className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default SearchInput;