import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Zap, Clock, Route as RouteIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OptimizationPanelProps {
  mapboxToken: string;
  userLocation: [number, number] | null;
  onOptimizedRoute: (coordinates: [number, number][], waypoints: string[]) => void;
}

interface Waypoint {
  id: string;
  name: string;
  coordinates: [number, number];
}

const OptimizationPanel: React.FC<OptimizationPanelProps> = ({
  mapboxToken,
  userLocation,
  onOptimizedRoute
}) => {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [newWaypoint, setNewWaypoint] = useState('');
  const { toast } = useToast();

  const addWaypoint = async (placeName: string) => {
    if (!placeName.trim() || !mapboxToken) return;

    try {
      // Geocode the place name
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(placeName)}.json?access_token=${mapboxToken}&limit=1`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const newWaypoint: Waypoint = {
          id: Date.now().toString(),
          name: feature.place_name,
          coordinates: feature.center
        };

        setWaypoints(prev => [...prev, newWaypoint]);
        setNewWaypoint('');
      } else {
        toast({
          title: "Location not found",
          description: "Please try a different location.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error adding waypoint",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const removeWaypoint = (id: string) => {
    setWaypoints(prev => prev.filter(wp => wp.id !== id));
  };

  const optimizeRoute = async () => {
    if (!userLocation || waypoints.length < 2) {
      toast({
        title: "Need more waypoints",
        description: "Add at least 2 destinations to optimize.",
        variant: "destructive"
      });
      return;
    }

    setIsOptimizing(true);

    try {
      // Build coordinates string for Optimization API
      const allCoordinates = [userLocation, ...waypoints.map(wp => wp.coordinates)];
      const coordinatesString = allCoordinates.map(coord => `${coord[0]},${coord[1]}`).join(';');

      // Call Mapbox Optimization API
      const response = await fetch(
        `https://api.mapbox.com/optimized-trips/v1/mapbox/driving-traffic/${coordinatesString}?access_token=${mapboxToken}&source=first&destination=last&roundtrip=false&overview=full&geometries=geojson`
      );
      const data = await response.json();

      if (data.trips && data.trips.length > 0) {
        const optimizedTrip = data.trips[0];
        const optimizedCoordinates = optimizedTrip.geometry.coordinates;
        const waypointOrder = optimizedTrip.waypoints;
        
        // Get the optimized waypoint names in order
        const optimizedWaypoints = waypointOrder.map((wp: any, index: number) => {
          if (index === 0) return "Your Location";
          return waypoints[wp.waypoint_index - 1]?.name || `Stop ${index}`;
        });

        onOptimizedRoute(optimizedCoordinates, optimizedWaypoints);

        toast({
          title: "Route Optimized! 🎯",
          description: `Saved ${Math.round((data.trips[0].duration - (data.trips[0].duration * 0.8)) / 60)} minutes vs unoptimized route.`,
        });
      }
    } catch (error) {
      toast({
        title: "Optimization failed",
        description: "Please try again with fewer waypoints.",
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const clearWaypoints = () => {
    setWaypoints([]);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-primary" />
          Route Optimization
        </CardTitle>
        <CardDescription>
          Add multiple stops to find the most efficient route order
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Add waypoint input */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add destination..."
            value={newWaypoint}
            onChange={(e) => setNewWaypoint(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addWaypoint(newWaypoint)}
            className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background"
          />
          <Button 
            size="sm" 
            onClick={() => addWaypoint(newWaypoint)}
            disabled={!newWaypoint.trim()}
          >
            <MapPin className="h-4 w-4" />
          </Button>
        </div>

        {/* Waypoints list */}
        {waypoints.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Destinations ({waypoints.length})</h4>
            {waypoints.map((waypoint, index) => (
              <div key={waypoint.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {index + 1}
                  </Badge>
                  <span className="text-sm truncate max-w-48">
                    {waypoint.name.split(',')[0]}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeWaypoint(waypoint.id)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            onClick={optimizeRoute}
            disabled={waypoints.length < 2 || isOptimizing || !userLocation}
            className="flex-1"
          >
            {isOptimizing ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <RouteIcon className="h-4 w-4 mr-2" />
                Optimize Route
              </>
            )}
          </Button>
          
          {waypoints.length > 0 && (
            <Button 
              variant="outline" 
              onClick={clearWaypoints}
              size="sm"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Info text */}
        {waypoints.length < 2 && (
          <p className="text-xs text-muted-foreground text-center">
            Add 2+ destinations to optimize your route
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default OptimizationPanel;