import React, { useState, useEffect } from 'react';
import TrafficMap from '@/components/TrafficMap';
import ApiKeyInput from '@/components/ApiKeyInput';

const Index = () => {
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for stored token
    const storedToken = localStorage.getItem('mapbox_token');
    if (storedToken) {
      setMapboxToken(storedToken);
    }
  }, []);

  const handleApiKeySubmit = (token: string) => {
    setMapboxToken(token);
  };

  if (!mapboxToken) {
    return <ApiKeyInput onApiKeySubmit={handleApiKeySubmit} />;
  }

  return <TrafficMap mapboxToken={mapboxToken} />;
};

export default Index;
