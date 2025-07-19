import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Navigation, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SearchInput from './SearchInput';

interface TrafficMapProps {
  mapboxToken: string;
}

interface RouteData {
  geometry: any;
  duration: number;
  distance: number;
  congestion: string[];
  hasTraffic: boolean;
  trafficLevel: 'free' | 'light' | 'moderate' | 'heavy';
}

const TrafficMap: React.FC<TrafficMapProps> = ({ mapboxToken }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [destination, setDestination] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [-74.006, 40.7128], // Default to NYC
      zoom: 12,
      pitch: 45,
    });

    // Add traffic layer
    map.current.on('load', () => {
      map.current?.addSource('mapbox-traffic', {
        type: 'vector',
        url: 'mapbox://mapbox.mapbox-traffic-v1',
      });

      map.current?.addLayer({
        id: 'traffic',
        type: 'line',
        source: 'mapbox-traffic',
        'source-layer': 'traffic',
        paint: {
          'line-width': [
            'case',
            ['==', 'low', ['get', 'congestion']],
            3,
            ['==', 'moderate', ['get', 'congestion']],
            3,
            ['==', 'heavy', ['get', 'congestion']],
            3,
            ['==', 'severe', ['get', 'congestion']],
            3,
            1
          ],
          'line-color': [
            'case',
            ['==', 'low', ['get', 'congestion']],
            'hsl(var(--traffic-free))',
            ['==', 'moderate', ['get', 'congestion']],
            'hsl(var(--traffic-light))',
            ['==', 'heavy', ['get', 'congestion']],
            'hsl(var(--traffic-moderate))',
            ['==', 'severe', ['get', 'congestion']],
            'hsl(var(--traffic-heavy))',
            'hsl(var(--traffic-free))'
          ]
        }
      });
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
          setUserLocation(coords);
          map.current?.setCenter(coords);
          
          // Add user location marker
          new mapboxgl.Marker({ color: 'hsl(var(--primary))' })
            .setLngLat(coords)
            .addTo(map.current!);
        },
        () => {
          toast({
            title: "Location Access Denied",
            description: "Please enable location access for better navigation.",
            variant: "destructive"
          });
        }
      );
    }

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, toast]);

  // Get routes with traffic data
  const getRoutes = async (destination: string, coordinates?: [number, number]) => {
    if (!userLocation || !destination) return;

    setIsLoading(true);
    setDestination(destination);
    
    try {
      let destCoords = coordinates;
      
      // If coordinates not provided, geocode the destination
      if (!destCoords) {
        const geocodeResponse = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json?access_token=${mapboxToken}&limit=1`
        );
        const geocodeData = await geocodeResponse.json();
        
        if (!geocodeData.features.length) {
          toast({
            title: "Destination Not Found",
            description: "Please try a different location.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
        destCoords = geocodeData.features[0].center;
      }
      
      // Get multiple route alternatives with traffic
      const routeResponse = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${userLocation[0]},${userLocation[1]};${destCoords[0]},${destCoords[1]}?access_token=${mapboxToken}&alternatives=true&annotations=congestion&overview=full&geometries=geojson`
      );
      const routeData = await routeResponse.json();

      if (routeData.routes && routeData.routes.length > 0) {
        const processedRoutes: RouteData[] = routeData.routes.map((route: any) => {
          const congestionLevels = route.legs[0]?.annotation?.congestion || [];
          const hasTraffic = congestionLevels.some((level: string) => 
            ['moderate', 'heavy', 'severe'].includes(level)
          );
          
          // Determine overall traffic level
          let trafficLevel: 'free' | 'light' | 'moderate' | 'heavy' = 'free';
          if (congestionLevels.includes('severe')) trafficLevel = 'heavy';
          else if (congestionLevels.includes('heavy')) trafficLevel = 'moderate';
          else if (congestionLevels.includes('moderate')) trafficLevel = 'light';

          return {
            geometry: route.geometry,
            duration: route.duration,
            distance: route.distance,
            congestion: congestionLevels,
            hasTraffic,
            trafficLevel
          };
        });

        setRoutes(processedRoutes);
        displayRoutes(processedRoutes);
        
        // Check for traffic and suggest alternatives
        if (processedRoutes[0].hasTraffic && processedRoutes.length > 1) {
          const betterRoute = processedRoutes.find(route => !route.hasTraffic || route.trafficLevel === 'free');
          if (betterRoute) {
            toast({
              title: "Traffic Detected!",
              description: "Alternative route available to avoid congestion.",
            });
          }
        }
      }
    } catch (error) {
      toast({
        title: "Route Error",
        description: "Unable to get route. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const displayRoutes = (routeData: RouteData[]) => {
    if (!map.current) return;

    // Clear existing routes
    if (map.current.getSource('routes')) {
      map.current.removeLayer('routes');
      map.current.removeSource('routes');
    }

    // Add route data
    map.current.addSource('routes', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: routeData.map((route, index) => ({
          type: 'Feature',
          properties: { 
            routeIndex: index,
            trafficLevel: route.trafficLevel
          },
          geometry: route.geometry
        }))
      }
    });

    map.current.addLayer({
      id: 'routes',
      type: 'line',
      source: 'routes',
      paint: {
        'line-width': [
          'case',
          ['==', ['get', 'routeIndex'], selectedRouteIndex],
          6,
          4
        ],
        'line-color': [
          'case',
          ['==', ['get', 'routeIndex'], selectedRouteIndex],
          'hsl(var(--primary))',
          'hsl(var(--muted-foreground))'
        ]
      }
    });

    // Fit map to route bounds
    if (routeData.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      routeData[0].geometry.coordinates.forEach((coord: [number, number]) => {
        bounds.extend(coord);
      });
      map.current.fitBounds(bounds, { padding: 100 });
    }
  };

  const selectRoute = (index: number) => {
    setSelectedRouteIndex(index);
    if (routes.length > 0) {
      displayRoutes(routes);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`;
  };

  const formatDistance = (meters: number) => {
    const miles = (meters * 0.000621371).toFixed(1);
    return `${miles} mi`;
  };

  const getTrafficColor = (level: string) => {
    switch (level) {
      case 'free': return 'text-traffic-free';
      case 'light': return 'text-traffic-light';
      case 'moderate': return 'text-traffic-moderate';
      case 'heavy': return 'text-traffic-heavy';
      default: return 'text-traffic-free';
    }
  };

  return (
    <div className="relative h-screen w-full">
      {/* Map container */}
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Route input panel */}
      <Card className="absolute top-4 left-4 right-4 bg-glass-bg backdrop-blur-md border-glass-border p-4">
        <SearchInput 
          mapboxToken={mapboxToken}
          onDestinationSelect={getRoutes}
          isLoading={isLoading}
        />
      </Card>

      {/* Route options */}
      {routes.length > 0 && (
        <Card className="absolute bottom-4 left-4 right-4 bg-glass-bg backdrop-blur-md border-glass-border p-4">
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              Route Options
            </h3>
            
            {routes.map((route, index) => (
              <Button
                key={index}
                variant={index === selectedRouteIndex ? "default" : "secondary"}
                className="w-full justify-between h-auto p-3"
                onClick={() => selectRoute(index)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">Route {index + 1}</span>
                  {route.hasTraffic && (
                    <AlertTriangle className={`h-4 w-4 ${getTrafficColor(route.trafficLevel)}`} />
                  )}
                </div>
                <div className="text-right text-sm">
                  <div>{formatDuration(route.duration)}</div>
                  <div className="text-muted-foreground">{formatDistance(route.distance)}</div>
                </div>
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default TrafficMap;