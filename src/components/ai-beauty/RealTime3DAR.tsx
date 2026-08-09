"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Video, Square, Sparkles, Download, Wand2, Palette, Eye, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { advanced3DFaceDetector } from "@/lib/ai-beauty/advanced-face-mesh";

interface RealTime3DARProps {
  mode: 'hair' | 'facial' | 'makeup';
  gender: 'men' | 'women';
  onBack: () => void;
}

const HAIR_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'Dark Brown', hex: '#3B2414' },
  { name: 'Light Brown', hex: '#8B6B47' },
  { name: 'Blonde', hex: '#F5DEB3' },
  { name: 'Red', hex: '#8B2500' },
  { name: 'Auburn', hex: '#A52A2A' },
  { name: 'Platinum', hex: '#E5E4E2' },
  { name: 'Blue', hex: '#4169E1' },
  { name: 'Purple', hex: '#800080' },
  { name: 'Pink', hex: '#FF69B4' },
];

export default function RealTime3DAR({ mode, gender, onBack }: RealTime3DARProps) {
  const [isLive, setIsLive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedHairColor, setSelectedHairColor] = useState(HAIR_COLORS[0].hex);
  const [glowIntensity, setGlowIntensity] = useState(70);
  const [makeupIntensity, setMakeupIntensity] = useState(60);
  const [selectedGlowType, setSelectedGlowType] = useState<'natural' | 'radiant' | 'luminous'>('natural');
  const [selectedMakeup, setSelectedMakeup] = useState('Natural Everyday');
  const [fpsCount, setFpsCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Start camera and 3D AR
  const startLiveAR = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 60 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          await videoRef.current?.play();
          
          // Initialize 3D face detector
          const initialized = await advanced3DFaceDetector.initialize(videoRef.current!);
          
          if (initialized) {
            setIsLive(true);
            startARProcessing();
          }
        };
      }
    } catch (error) {
      console.error('Camera access error:', error);
      alert('Please allow camera access for AR features');
    }
  };

  // Real-time AR processing loop
  const startARProcessing = () => {
    const processFrame = async (timestamp: number) => {
      if (!videoRef.current || !canvasRef.current) return;

      // Calculate FPS
      const deltaTime = timestamp - lastFrameTimeRef.current;
      if (deltaTime > 0) {
        setFpsCount(Math.round(1000 / deltaTime));
      }
      lastFrameTimeRef.current = timestamp;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Set canvas size to match video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Draw video frame (mirrored)
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      // Process face mesh
      await advanced3DFaceDetector.processVideoFrame(video);

      // Apply 3D effects based on mode
      if (mode === 'hair') {
        await advanced3DFaceDetector.apply3DHairstyle(
          'procedural',
          selectedHairColor,
          canvas
        );
      } else if (mode === 'facial') {
        await advanced3DFaceDetector.applyRealistic3DGlow(
          glowIntensity,
          selectedGlowType,
          canvas
        );
      } else if (mode === 'makeup') {
        await advanced3DFaceDetector.apply3DMakeup(
          selectedMakeup,
          makeupIntensity,
          canvas
        );
      }

      // Continue loop
      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);
  };

  // Stop AR
  const stopLiveAR = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }

    setIsLive(false);
  };

  // Capture screenshot
  const captureFrame = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement('a');
    link.download = `glamhub-ar-${mode}-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  useEffect(() => {
    return () => {
      stopLiveAR();
      advanced3DFaceDetector.dispose();
    };
  }, []);

  return (
    <div className="min-h-screen gradient-hero pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack} className="text-white/70">
            ← Back
          </Button>
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge className="bg-red-500 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-white mr-2" />
                LIVE • {fpsCount} FPS
              </Badge>
            )}
          </div>
        </div>

        {/* Main AR View */}
        <div className="grid lg:grid-cols-[1fr,320px] gap-6">
          {/* Video/Canvas */}
          <div className="space-y-4">
            <div className="glass rounded-3xl p-6 border border-white/10">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
                {/* Video element (hidden) */}
                <video
                  ref={videoRef}
                  className="absolute inset-0 opacity-0"
                  playsInline
                  muted
                />
                
                {/* Canvas with AR effects */}
                <canvas
                  ref={canvasRef}
                  className={cn(
                    "w-full h-full object-contain",
                    !isLive && "hidden"
                  )}
                />

                {/* Start screen */}
                {!isLive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6 animate-pulse">
                      <Video className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Ready for 3D AR?</h3>
                    <p className="text-white/60 mb-6 text-center max-w-md">
                      Experience real-time 3D hairstyles, facial effects, and makeup with advanced AR technology
                    </p>
                    <Button
                      size="lg"
                      onClick={startLiveAR}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Start Live AR
                    </Button>
                  </div>
                )}

                {/* AR Info Overlay */}
                {isLive && (
                  <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
                    <div className="glass rounded-xl px-4 py-2 border border-white/20">
                      <p className="text-xs text-white/60 mb-1">Active Effect</p>
                      <p className="text-sm font-semibold text-white">
                        {mode === 'hair' && '3D Hairstyle'}
                        {mode === 'facial' && 'Facial Glow'}
                        {mode === 'makeup' && '3D Makeup'}
                      </p>
                    </div>
                    <div className="glass rounded-xl px-4 py-2 border border-white/20">
                      <p className="text-xs text-white/60">MediaPipe + Three.js</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            {isLive && (
              <div className="glass rounded-2xl p-4 border border-white/10">
                <div className="flex items-center justify-center gap-3">
                  <Button
                    onClick={captureFrame}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Capture
                  </Button>
                  <Button
                    onClick={() => setIsRecording(!isRecording)}
                    variant={isRecording ? "destructive" : "default"}
                    size="lg"
                    className="gap-2"
                  >
                    {isRecording ? <Square className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    {isRecording ? 'Stop Recording' : 'Record Video'}
                  </Button>
                  <Button
                    onClick={stopLiveAR}
                    variant="ghost"
                    size="lg"
                  >
                    Stop AR
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Side Panel - Effect Controls */}
          <div className="space-y-4">
            {/* Hair Color Selector */}
            {mode === 'hair' && (
              <div className="glass rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="w-5 h-5 text-purple-400" />
                  <h3 className="font-semibold text-white">Hair Color</h3>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {HAIR_COLORS.map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => setSelectedHairColor(color.hex)}
                      className={cn(
                        "w-full aspect-square rounded-lg border-2 transition-all",
                        selectedHairColor === color.hex
                          ? "border-purple-500 scale-110"
                          : "border-white/20 hover:border-white/40"
                      )}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Facial Glow Controls */}
            {mode === 'facial' && (
              <div className="glass rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-semibold text-white">Glow Effect</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-white/70 mb-2 block">Intensity</label>
                    <Slider
                      value={[glowIntensity]}
                      onValueChange={(v) => setGlowIntensity(v[0])}
                      min={0}
                      max={100}
                      step={1}
                      className="mb-2"
                    />
                    <div className="text-xs text-white/50 text-right">{glowIntensity}%</div>
                  </div>

                  <div>
                    <label className="text-sm text-white/70 mb-2 block">Glow Type</label>
                    <div className="space-y-2">
                      {(['natural', 'radiant', 'luminous'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setSelectedGlowType(type)}
                          className={cn(
                            "w-full px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            selectedGlowType === type
                              ? "bg-emerald-500/20 border-2 border-emerald-500 text-white"
                              : "border-2 border-white/10 text-white/70 hover:border-white/30"
                          )}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Makeup Controls */}
            {mode === 'makeup' && (
              <div className="glass rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Smile className="w-5 h-5 text-pink-400" />
                  <h3 className="font-semibold text-white">Makeup Style</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-white/70 mb-2 block">Intensity</label>
                    <Slider
                      value={[makeupIntensity]}
                      onValueChange={(v) => setMakeupIntensity(v[0])}
                      min={0}
                      max={100}
                      step={1}
                      className="mb-2"
                    />
                    <div className="text-xs text-white/50 text-right">{makeupIntensity}%</div>
                  </div>

                  <div>
                    <label className="text-sm text-white/70 mb-2 block">Style</label>
                    <div className="space-y-2">
                      {['Natural Everyday', 'Party Glam', 'Bridal Makeup', 'Bold Red Lips'].map((style) => (
                        <button
                          key={style}
                          onClick={() => setSelectedMakeup(style)}
                          className={cn(
                            "w-full px-4 py-2 rounded-lg text-sm font-medium transition-all text-left",
                            selectedMakeup === style
                              ? "bg-pink-500/20 border-2 border-pink-500 text-white"
                              : "border-2 border-white/10 text-white/70 hover:border-white/30"
                          )}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Stats */}
            {isLive && (
              <div className="glass rounded-2xl p-4 border border-white/10">
                <h4 className="text-sm font-semibold text-white/70 mb-3">Performance</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/60">Frame Rate</span>
                    <span className="text-emerald-400 font-mono">{fpsCount} FPS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Processing</span>
                    <span className="text-emerald-400">Real-time</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">3D Mesh</span>
                    <span className="text-emerald-400">Active</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
