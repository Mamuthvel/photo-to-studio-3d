import { useState } from 'react';
import { ModelViewer } from '@/components/ModelViewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Cloud, Upload, Zap, DollarSign, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const CloudProcessing = () => {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);

  const handlePhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos(files);
    toast.success(`Selected ${files.length} photos`);
  };

  const handleProcess = async () => {
    if (photos.length < 10) {
      toast.error('Please upload at least 10 photos for reconstruction');
      return;
    }
    
    setIsProcessing(true);
    toast.info('Cloud processing would start here - API integration required');
    
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      toast.success('Demo: Processing complete! (In production, this would call cloud APIs)');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Cloud className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Cloud Processing Pipeline</h1>
                <p className="text-sm text-muted-foreground">Upload photos & process in the cloud</p>
              </div>
            </div>
            <Link to="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Local Pipeline
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr,400px] gap-6">
          {/* Left Column - Viewer & Upload */}
          <div className="space-y-6">
            <div className="h-[500px]">
              <ModelViewer modelUrl={modelUrl} />
            </div>

            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Upload Photos
                </CardTitle>
                <CardDescription>
                  Upload 20-50 photos of your object from different angles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="photos">Select Photos</Label>
                  <Input
                    id="photos"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotosUpload}
                    className="cursor-pointer"
                  />
                  {photos.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {photos.length} photos selected
                    </p>
                  )}
                </div>

                <Button 
                  onClick={handleProcess}
                  disabled={photos.length < 10 || isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Zap className="w-4 h-4 mr-2 animate-pulse" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4 mr-2" />
                      Process in Cloud
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Service Info */}
          <div className="space-y-6 lg:sticky lg:top-24 h-fit">
            {/* Cloud Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-accent" />
                  Cloud Services
                </CardTitle>
                <CardDescription>
                  Professional photogrammetry APIs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <ServiceCard
                    name="Polycam API"
                    description="High-quality 3D reconstruction"
                    pricing="$0.50 - $5 per scan"
                    features={['Fast processing', 'Auto decimation', 'Texture mapping']}
                    link="https://poly.cam/api"
                  />
                  
                  <ServiceCard
                    name="PhotoCatch"
                    description="Enterprise photogrammetry"
                    pricing="Custom pricing"
                    features={['Large datasets', 'Batch processing', 'API support']}
                    link="https://photocatch.app"
                  />
                  
                  <ServiceCard
                    name="Sketchfab"
                    description="3D model processing & hosting"
                    pricing="Free - $99/mo"
                    features={['Auto optimization', 'Web viewer', 'Model hosting']}
                    link="https://sketchfab.com/developers"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Implementation Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Implementation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-2">
                  <p className="font-medium">To enable cloud processing:</p>
                  <ol className="space-y-2 ml-6 list-decimal text-muted-foreground">
                    <li>Choose a photogrammetry API service</li>
                    <li>Enable Lovable Cloud for backend</li>
                    <li>Add API keys to Cloud secrets</li>
                    <li>Create Edge Functions for API calls</li>
                    <li>Upload photos & poll for results</li>
                  </ol>
                </div>

                <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                  <p className="text-xs">
                    💡 <strong>Note:</strong> This is a demo interface. API integration requires Lovable Cloud and service API keys.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

interface ServiceCardProps {
  name: string;
  description: string;
  pricing: string;
  features: string[];
  link: string;
}

const ServiceCard = ({ name, description, pricing, features, link }: ServiceCardProps) => (
  <div className="p-4 rounded-lg border border-border bg-card/50 space-y-2">
    <div>
      <h4 className="font-semibold">{name}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <div className="flex items-center gap-2 text-xs">
      <DollarSign className="w-3 h-3 text-accent" />
      <span className="text-muted-foreground">{pricing}</span>
    </div>
    <ul className="space-y-1 text-xs text-muted-foreground">
      {features.map((feature, i) => (
        <li key={i}>• {feature}</li>
      ))}
    </ul>
    <a href={link} target="_blank" rel="noopener noreferrer">
      <Button variant="outline" size="sm" className="w-full text-xs">
        Learn More
      </Button>
    </a>
  </div>
);

export default CloudProcessing;
