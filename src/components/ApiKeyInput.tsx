import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MapPin, ExternalLink } from 'lucide-react';

interface ApiKeyInputProps {
  onApiKeySubmit: (token: string) => void;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onApiKeySubmit }) => {
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      localStorage.setItem('mapbox_token', token.trim());
      onApiKeySubmit(token.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <MapPin className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Smart Traffic Monitor</CardTitle>
          <CardDescription>
            Enter your Mapbox access token to start monitoring traffic and getting route suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Mapbox Access Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="pk.eyJ1Ijoi..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>
            
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-medium mb-2">How to get your token:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Create a free account at mapbox.com</li>
                <li>Go to your Account page</li>
                <li>Copy your public access token</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Start Monitoring
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open('https://mapbox.com', '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiKeyInput;