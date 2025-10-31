import { useState } from 'react';
import JSZip from 'jszip';
import { ModelViewer } from '@/components/ModelViewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Cloud, Upload, Zap, DollarSign, ArrowLeft, Loader2, CheckCircle2, XCircle, Clock, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

// TODO: Move this to a backend service for better security
const KIRI_API_KEY = "kiri_R5x1ZJ7C52R5MRwowSzkw_azeEXhWOOGgoL7uith5OM";
const KIRI_BASE_URL = "https://api.kiriengine.app/api/v1/open";

type ProcessingStep = 'idle' | 'uploading' | 'sending' | 'processing' | 'downloading' | 'complete' | 'failed';

const CloudProcessing = () => {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [serialize, setSerialize] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('idle');
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<string>('');

  const handlePhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos(files);
    toast.success(`Selected ${files.length} photos`);
  };

  const pollModelStatus = async (taskSerialize: string): Promise<boolean> => {
    const maxAttempts = 30; // 5 minutes with 10-second intervals
    let attempts = 0;

    setCurrentStep('processing');
    setEstimatedTime('~2-5 minutes');

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(
          `${KIRI_BASE_URL}/model/getStatus?serialize=${taskSerialize}`,
          {
            headers: { Authorization: `Bearer ${KIRI_API_KEY}` },
          }
        );

        let result;
        try {
          const text = await response.text();
          const cleanText = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
          result = JSON.parse(cleanText);
        } catch (parseError) {
          console.error("Failed to parse status response:", parseError);
          throw new Error("Failed to parse status response");
        }
        
        if (!result.ok) {
          throw new Error(result.msg || "Failed to check status");
        }

        const status = result.data.status;
        
        // Status: -1=Uploading, 0=Processing, 1=Failed, 2=Successful, 3=Queuing, 4=Expired
        if (status === 2) {
          return true; // Success
        } else if (status === 1) {
          setFailureReason("Model processing failed. Please check your images and try again.");
          throw new Error("Processing failed");
        } else if (status === 4) {
          setFailureReason("Processing task expired. Please try uploading again.");
          throw new Error("Task expired");
        }

        // Still processing - update progress
        const progressMap: { [key: number]: number } = { "-1": 30, 3: 40, 0: 60 };
        setProgress(progressMap[status] || 50);
        
        // Update estimated time based on attempts
        const remainingMinutes = Math.max(1, 5 - Math.floor((attempts * 10) / 60));
        setEstimatedTime(`~${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} remaining`);
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second intervals
      } catch (error) {
        throw error;
      }
    }

    setFailureReason("Processing timeout - the operation took too long. Please try again with fewer or smaller images.");
    throw new Error("Processing timeout - please try again");
  };

  const downloadModel = async (taskSerialize: string) => {
    try {
      setCurrentStep('downloading');
      setProgress(90);
      setEstimatedTime('~30 seconds');
      
      const response = await fetch(
        `${KIRI_BASE_URL}/model/getModelZip?serialize=${taskSerialize}`,
        {
          headers: { Authorization: `Bearer ${KIRI_API_KEY}` },
        }
      );

      let result;
      try {
        const text = await response.text();
        const cleanText = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        result = JSON.parse(cleanText);
      } catch (parseError) {
        console.error("Failed to parse download response:", parseError);
        setFailureReason("Failed to retrieve the model download URL. Please try again.");
        throw new Error("Failed to parse download response");
      }
      
      if (!result.ok || !result.data?.modelUrl) {
        setFailureReason("Failed to retrieve the model download URL. Please try again.");
        throw new Error("Failed to get model download URL");
      }

      // Download the ZIP file
      const zipResponse = await fetch(result.data.modelUrl);
      const zipBlob = await zipResponse.blob();
      
      // Extract the GLB file from the ZIP
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(zipBlob);
      
      // Find the GLB file in the zip
      const glbFile = Object.keys(zipContent.files).find(filename => 
        filename.toLowerCase().endsWith('.glb')
      );
      
      if (!glbFile) {
        setFailureReason("No GLB file found in the downloaded package.");
        throw new Error("No GLB file found in zip");
      }
      
      // Extract and create blob URL
      const glbBlob = await zipContent.files[glbFile].async('blob');
      const glbUrl = URL.createObjectURL(glbBlob);

      setModelUrl(glbUrl);
      setProgress(100);
      setEstimatedTime('');
      setCurrentStep('complete');
      
      toast.success("Your 3D model is ready to view!");
    } catch (error) {
      setCurrentStep('failed');
      setFailureReason("Failed to download or extract the model file.");
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
    setProgress(0);
    setCurrentStep('uploading');
    setFailureReason(null);
    setEstimatedTime('~1 minute');

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

      setCurrentStep('sending');
      setProgress(20);
      
      // Upload images and start reconstruction
      const response = await fetch(`${KIRI_BASE_URL}/photo/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${KIRI_API_KEY}` },
        body: formData,
      });

      let result;
      try {
        const text = await response.text();
        // Clean any control characters from the response
        const cleanText = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        result = JSON.parse(cleanText);
      } catch (parseError) {
        console.error("Failed to parse API response:", parseError);
        setFailureReason("Failed to communicate with Kiri Engine. Please check your API key and try again.");
        throw new Error("Failed to parse API response");
      }

      if (!response.ok || !result.ok) {
        const errorMsg = result.msg || result.message || `API error (${response.status})`;
        setFailureReason(errorMsg);
        throw new Error(errorMsg);
      }

      if (!result.data?.serialize) {
        setFailureReason("Failed to start processing. Please check your images and try again.");
        throw new Error("No task ID received from API");
      }

      const taskSerialize = result.data.serialize;
      setSerialize(taskSerialize);
      setProgress(25);
      toast.success("Processing started! Reconstructing your 3D model...");

      // Poll for completion
      await pollModelStatus(taskSerialize);

      // Download the model
      await downloadModel(taskSerialize);

    } catch (error) {
      console.error("Processing error:", error);
      setCurrentStep('failed');
      toast.error(error instanceof Error ? error.message : "Processing failed");
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

                {(isProcessing || currentStep === 'complete' || currentStep === 'failed') && (
                  <div className="space-y-4 mt-6">
                    {/* Progress Timeline */}
                    <div className="space-y-3">
                      <ProcessingStep
                        icon={Upload}
                        label="Uploading"
                        status={getStepStatus('uploading', currentStep)}
                      />
                      <ProcessingStep
                        icon={Cloud}
                        label="Sending to Kiri Engine"
                        status={getStepStatus('sending', currentStep)}
                      />
                      <ProcessingStep
                        icon={Loader2}
                        label="Processing"
                        status={getStepStatus('processing', currentStep)}
                        isAnimated
                      />
                      <ProcessingStep
                        icon={Download}
                        label="Downloading Model"
                        status={getStepStatus('downloading', currentStep)}
                      />
                      <ProcessingStep
                        icon={currentStep === 'failed' ? XCircle : CheckCircle2}
                        label={currentStep === 'failed' ? 'Failed' : 'Reconstruction Complete'}
                        status={getStepStatus('complete', currentStep)}
                      />
                    </div>

                    {/* Progress Bar */}
                    {isProcessing && (
                      <div className="space-y-2">
                        <Progress value={progress} className="w-full" />
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{progress}% complete</span>
                          {estimatedTime && (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {estimatedTime}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Failure Message */}
                    {currentStep === 'failed' && failureReason && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-sm text-destructive font-medium mb-1">Processing Failed</p>
                        <p className="text-xs text-muted-foreground">{failureReason}</p>
                      </div>
                    )}

                    {/* Success Message */}
                    {currentStep === 'complete' && (
                      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <p className="text-sm text-primary font-medium">✅ 3D Model Ready!</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your model has been successfully reconstructed and is displayed above.
                        </p>
                      </div>
                    )}

                    {serialize && (
                      <p className="text-xs text-muted-foreground">
                        Task ID: {serialize}
                      </p>
                    )}
                  </div>
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

interface ProcessingStepProps {
  icon: React.ElementType;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'failed';
  isAnimated?: boolean;
}

const ProcessingStep = ({ icon: Icon, label, status, isAnimated }: ProcessingStepProps) => {
  const getStatusColor = () => {
    switch (status) {
      case 'complete':
        return 'text-primary';
      case 'active':
        return 'text-accent';
      case 'failed':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getIconBg = () => {
    switch (status) {
      case 'complete':
        return 'bg-primary/10';
      case 'active':
        return 'bg-accent/10';
      case 'failed':
        return 'bg-destructive/10';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${getIconBg()}`}>
        <Icon className={`w-4 h-4 ${getStatusColor()} ${isAnimated && status === 'active' ? 'animate-spin' : ''}`} />
      </div>
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {label}
      </span>
      {status === 'complete' && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
      {status === 'failed' && <XCircle className="w-4 h-4 text-destructive ml-auto" />}
    </div>
  );
};

const getStepStatus = (step: string, currentStep: ProcessingStep): 'pending' | 'active' | 'complete' | 'failed' => {
  const steps = ['uploading', 'sending', 'processing', 'downloading', 'complete'];
  const currentIndex = steps.indexOf(currentStep);
  const stepIndex = steps.indexOf(step);

  if (currentStep === 'failed') {
    if (stepIndex < currentIndex) return 'complete';
    if (step === 'complete') return 'failed';
    return 'pending';
  }

  if (stepIndex < currentIndex) return 'complete';
  if (stepIndex === currentIndex) return 'active';
  return 'pending';
};

export default CloudProcessing;
