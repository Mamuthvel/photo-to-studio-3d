import { useState } from 'react';
import { ModelViewer } from '@/components/ModelViewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Cloud, Upload, Zap, DollarSign, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

// TODO: Move this to a backend service for better security
const KIRI_API_KEY = "kiri_N-3gZSOw1fbOzaEOmAfY7z5oyHLmK3iDh4s86AtqBtc";
const KIRI_BASE_URL = "https://api.kiriengine.app/api/v1/open";

const CloudProcessing = () => {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [serialize, setSerialize] = useState<string | null>(null);

  const handlePhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos(files);
    toast.success(`Selected ${files.length} photos`);
  };

  const pollModelStatus = async (taskSerialize: string): Promise<boolean> => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(
          `${KIRI_BASE_URL}/model/getStatus?serialize=${taskSerialize}`,
          {
            headers: { Authorization: `Bearer ${KIRI_API_KEY}` },
          }
        );

        const result = await response.json();
        
        if (!result.ok) {
          throw new Error(result.msg || "Failed to check status");
        }

        const status = result.data.status;
        
        // Status: -1=Uploading, 0=Processing, 1=Failed, 2=Successful, 3=Queuing, 4=Expired
        if (status === 2) {
          return true; // Success
        } else if (status === 1) {
          throw new Error("Processing failed");
        } else if (status === 4) {
          throw new Error("Task expired");
        }

        // Still processing - update progress
        const progressMap: { [key: number]: number } = { "-1": 20, 3: 30, 0: 50 };
        setProgress(progressMap[status] || 40);
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        throw error;
      }
    }

    throw new Error("Processing timeout - please try again");
  };

  const downloadModel = async (taskSerialize: string) => {
    try {
      setProgress(90);
      const response = await fetch(
        `${KIRI_BASE_URL}/model/getModelZip?serialize=${taskSerialize}`,
        {
          headers: { Authorization: `Bearer ${KIRI_API_KEY}` },
        }
      );

      const result = await response.json();
      
      if (!result.ok || !result.data.modelUrl) {
        throw new Error("Failed to get model download URL");
      }

      setProgress(100);
      setModelUrl(result.data.modelUrl);
      
      toast.success("Your 3D model is ready for download!");
    } catch (error) {
      throw error;
    }
  };

  const handleProcess = async () => {
    if (photos.length < 20) {
      toast.error('Please upload at least 20 photos (max 300) for processing');
      return;
    }

    if (photos.length > 300) {
      toast.error('Please upload no more than 300 photos');
      return;
    }

    setIsProcessing(true);
    setProgress(5);

    try {
      // Create FormData and append images
      const formData = new FormData();
      photos.forEach((photo) => {
        formData.append("imagesFiles", photo);
      });
      
      // Set processing parameters
      formData.append("modelQuality", "1"); // Medium quality
      formData.append("textureQuality", "1"); // 2K texture
      formData.append("fileFormat", "GLB"); // GLB format for web
      formData.append("isMask", "1"); // Auto object masking
      formData.append("textureSmoothing", "1"); // Texture smoothing

      setProgress(10);
      toast.info(`Uploading ${photos.length} photos to Kiri Engine...`);

      // Upload images and start reconstruction
      const response = await fetch(`${KIRI_BASE_URL}/photo/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${KIRI_API_KEY}` },
        body: formData,
      });

      const result = await response.json();

      if (!result.ok || !result.data.serialize) {
        throw new Error(result.msg || "Failed to start processing");
      }

      const taskSerialize = result.data.serialize;
      setSerialize(taskSerialize);
      toast.success("Processing started! Reconstructing your 3D model...");

      // Poll for completion
      await pollModelStatus(taskSerialize);

      // Download the model
      await downloadModel(taskSerialize);

    } catch (error) {
      console.error("Processing error:", error);
      toast.error(error instanceof Error ? error.message : "Processing failed");
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
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
                  Upload 20-300 photos of your object from different angles
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
                  disabled={photos.length < 20 || photos.length > 300 || isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4 mr-2" />
                      Process with Kiri Engine
                    </>
                  )}
                </Button>

                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={progress} className="w-full" />
                    <p className="text-sm text-center text-muted-foreground">
                      {progress}% complete
                    </p>
                  </div>
                )}

                {serialize && (
                  <p className="text-xs text-muted-foreground">
                    Task ID: {serialize}
                  </p>
                )}
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
                <div className="p-3 bg-accent/10 rounded-lg border border-accent/20 mb-4">
                  <p className="text-sm font-medium text-accent mb-1">✓ Currently Active</p>
                  <p className="text-xs text-muted-foreground">
                    Using Kiri Engine API for 3D reconstruction
                  </p>
                </div>
                
                <div className="space-y-3">
                  <ServiceCard
                    name="Kiri Engine API"
                    description="AI-powered 3D scanning - Currently integrated"
                    pricing="API-based processing"
                    features={['Auto Object Masking', '2K-8K textures', 'GLB export', 'Multiple quality options']}
                    link="https://www.kiriengine.com/"
                  />
                  
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
                  <p className="font-medium">How it works:</p>
                  <ol className="space-y-2 ml-6 list-decimal text-muted-foreground">
                    <li>Upload 20-300 photos of your object</li>
                    <li>Photos are sent to Kiri Engine API</li>
                    <li>AI reconstructs 3D model with textures</li>
                    <li>Progress is tracked in real-time</li>
                    <li>Download GLB model when ready</li>
                  </ol>
                </div>

                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-xs">
                    ✨ <strong>Live Integration:</strong> This page uses the Kiri Engine API with real 3D reconstruction.
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
