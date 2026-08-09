"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Camera, Sparkles, Wand2, Zap, Target, MapPin, DollarSign,
  User, Scan, Video, Image as ImageIcon, Download, Share2,
  CheckCircle2, ArrowRight, Star, TrendingUp, Award, Brain,
  Eye, Smile, Heart, Scissors, Loader2, ChevronRight, Play,
  Mic, Volume2, VolumeX, Maximize2, RefreshCw, Settings,
  Calendar, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { 
  HairAnalysisData, 
  FaceAnalysisData, 
  UserPreferences, 
  BeautyProfile 
} from "@/lib/ai-beauty/types";
import { HairSegmentationEngine } from "@/lib/ai-beauty/hair-segmentation";
import { HAIRSTYLE_LIBRARY } from "@/lib/ai-beauty/hairstyle-library";
import { scoreStyleCompatibility, type ScoringResult } from "@/lib/ai-beauty/compatibility-scoring-client";
import { SalonIntelligenceEngine } from "@/lib/ai-beauty/salon-intelligence";
import { ReportGenerator } from "@/lib/ai-beauty/report-generator";
import type { StyleCompatibilityScore, SalonMatch } from "@/lib/ai-beauty/types";

type Phase = 
  | "intro"
  | "consultation"
  | "face-scan"
  | "hair-scan"
  | "3d-twin"
  | "ar-preview"
  | "beauty-score"
  | "salon-match"
  | "report"
  | "prediction";

interface Preferences {
  hairGoal?: string;
  skinGoal?: string;
  budget?: string;
  distance?: string;
  preferences?: string[];
}

const HAIR_GOALS = [
  { id: "wedding", label: "💒 Wedding Look", desc: "Bridal perfection" },
  { id: "party", label: "🎉 Party Ready", desc: "Glamorous night out" },
  { id: "corporate", label: "💼 Corporate", desc: "Professional & polished" },
  { id: "daily", label: "✨ Daily Fresh", desc: "Everyday elegance" },
  { id: "celebrity", label: "⭐ Celebrity Style", desc: "Trending looks" },
  { id: "transformation", label: "🔥 Total Transform", desc: "Complete makeover" },
];

const SKIN_GOALS = [
  { id: "glow", label: "✨ Radiant Glow", desc: "Luminous skin" },
  { id: "acne", label: "🎯 Acne Treatment", desc: "Clear complexion" },
  { id: "anti-aging", label: "⏱️ Anti-Aging", desc: "Youthful appearance" },
  { id: "hydration", label: "💧 Deep Hydration", desc: "Moisturized skin" },
  { id: "brightening", label: "☀️ Skin Brightening", desc: "Even tone" },
  { id: "detox", label: "🌿 Detox & Cleanse", desc: "Pure & fresh" },
];

const BUDGET_OPTIONS = [
  { id: "budget", label: "₹500 - ₹1,000", desc: "Budget Friendly" },
  { id: "standard", label: "₹1,000 - ₹3,000", desc: "Standard" },
  { id: "premium", label: "₹3,000 - ₹10,000", desc: "Premium" },
  { id: "luxury", label: "₹10,000+", desc: "Luxury Experience" },
];

const HAIRSTYLES = [
  { id: "wolf-cut", name: "Wolf Cut", compatibility: 92, trend: "🔥 Trending" },
  { id: "curtain", name: "Curtain Hair", compatibility: 88, trend: "✨ Popular" },
  { id: "fade", name: "Fade Cut", compatibility: 85, trend: "💯 Classic" },
  { id: "layers", name: "Layered Cut", compatibility: 90, trend: "⭐ Recommended" },
  { id: "buzz", name: "Buzz Cut", compatibility: 78, trend: "🎯 Bold" },
  { id: "korean", name: "Korean Style", compatibility: 95, trend: "🔥 Hot" },
];

export default function AIBeautyEngine({ onClose }: { onClose: () => void }) {
  // Phase management
  const [phase, setPhase] = useState<Phase>("intro");
  
  // User preferences from consultation
  const [preferences, setPreferences] = useState<Preferences>({});
  
  // Analysis results
  const [faceAnalysis, setFaceAnalysis] = useState<FaceAnalysisData | null>(null);
  const [hairAnalysis, setHairAnalysis] = useState<HairAnalysisData | null>(null);
  const [beautyProfile, setBeautyProfile] = useState<BeautyProfile>({}); // Legacy - to be migrated
  
  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  
  // Hair analysis state
  const [isHairAnalyzing, setIsHairAnalyzing] = useState(false);
  const [hairAnalysisProgress, setHairAnalysisProgress] = useState(0);
  const [hairAnalysisError, setHairAnalysisError] = useState<string | null>(null);
  
  // Beauty scoring state
  const [compatibilityScores, setCompatibilityScores] = useState<StyleCompatibilityScore[]>([]);
  const [isScoring, setIsScoring] = useState(false);
  const [scoringProgress, setScoringProgress] = useState(0);
  const [scoringError, setScoringError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  
  // Salon matching state
  const [salonMatches, setSalonMatches] = useState<SalonMatch[]>([]);
  const [isFindingSalons, setIsFindingSalons] = useState(false);
  const [salonError, setSalonError] = useState<string | null>(null);
  
  // Report generation state
  const [reportBlob, setReportBlob] = useState<Blob | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  
  // UI state
  const [selectedHairstyle, setSelectedHairstyle] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // Hair segmentation engine instance
  const hairEngineRef = useRef<HairSegmentationEngine | null>(null);

  // Simulate scanning progress
  useEffect(() => {
    if (isScanning) {
      const interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsScanning(false);
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isScanning]);

  // Start camera for face scanning
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: 1280, height: 720 } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
    } catch (err) {
      console.error("Camera access denied:", err);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (phase === "face-scan" || phase === "ar-preview" || phase === "hair-scan") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [phase]);

  const startFaceScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    
    // Simulate AI analysis (in production, this would use actual face detection)
    setTimeout(() => {
      // Set legacy beauty profile
      setBeautyProfile({
        faceShape: "Oval",
        skinTone: "Medium",
        skinHealth: 78,
        hairDensity: "Medium-High",
        hairHealth: 82,
        beautyScore: 85,
      });
      
      // Set proper FaceAnalysisData for compatibility scoring
      setFaceAnalysis({
        landmarks: [], // Would contain 468 3D points in production
        faceShape: "oval",
        skinTone: "#c68642", // Medium skin tone
        facialFeatures: {
          eyeShape: "Almond",
          eyeColor: "Brown",
          lipShape: "Full",
          noseShape: "Straight",
        },
        confidence: 0.85,
        timestamp: Date.now(),
      });
      
      setTimeout(() => setPhase("hair-scan"), 1000);
    }, 5000);
  };

  const startHairScan = async () => {
    setIsHairAnalyzing(true);
    setHairAnalysisProgress(0);
    setHairAnalysisError(null);

    try {
      // Initialize hair segmentation engine if not already created
      if (!hairEngineRef.current) {
        hairEngineRef.current = new HairSegmentationEngine();
        
        // Load model with progress tracking
        await hairEngineRef.current.loadModel((progress) => {
          setHairAnalysisProgress(Math.min(progress, 30));
        });
      }

      setHairAnalysisProgress(35);

      // Ensure video is ready
      if (!videoRef.current || videoRef.current.readyState < 2) {
        throw new Error("Video stream not ready. Please ensure camera is working.");
      }

      setHairAnalysisProgress(40);

      // Perform hair segmentation
      const analysis = await hairEngineRef.current.segmentHair(videoRef.current);
      
      setHairAnalysisProgress(80);
      
      // Store analysis results
      setHairAnalysis(analysis);
      
      // Draw segmentation mask overlay if canvas is available
      if (canvasRef.current && videoRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          
          // Create colored overlay from mask
          const overlayData = new ImageData(
            analysis.segmentationMask.width,
            analysis.segmentationMask.height
          );
          
          for (let i = 0; i < analysis.segmentationMask.data.length; i += 4) {
            if (analysis.segmentationMask.data[i] > 128) {
              // Purple overlay for hair region
              overlayData.data[i] = 168;     // R
              overlayData.data[i + 1] = 85;  // G
              overlayData.data[i + 2] = 247; // B
              overlayData.data[i + 3] = 100; // A (semi-transparent)
            }
          }
          
          // Draw overlay
          ctx.putImageData(overlayData, 0, 0);
        }
      }
      
      setHairAnalysisProgress(100);
      
      // Wait a moment to show results, then transition to next phase
      setTimeout(() => {
        setIsHairAnalyzing(false);
        // TODO: Transition to next phase (3d-twin) when implemented
        // For now, stay on hair-scan to show results
      }, 2000);
      
    } catch (error) {
      console.error("Hair analysis failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setHairAnalysisError(errorMessage);
      setIsHairAnalyzing(false);
      setHairAnalysisProgress(0);
    }
  };

  const retryHairScan = () => {
    setHairAnalysisError(null);
    setHairAnalysisProgress(0);
    startHairScan();
  };

  // Start beauty compatibility scoring
  const startBeautyScoring = async () => {
    if (!faceAnalysis || !hairAnalysis) {
      setScoringError("Face and hair analysis required");
      return;
    }

    setIsScoring(true);
    setScoringProgress(0);
    setScoringError(null);
    setUsedFallback(false);

    try {
      // Get hairstyle library (use first 10 styles for demo)
      const stylesToScore = HAIRSTYLE_LIBRARY.slice(0, 10);

      // Score styles
      const result = await scoreStyleCompatibility(
        faceAnalysis,
        hairAnalysis,
        stylesToScore,
        (progress) => setScoringProgress(progress)
      );

      setCompatibilityScores(result.scores);
      setUsedFallback(result.usedFallback);
      
      setTimeout(() => {
        setIsScoring(false);
      }, 1000);

    } catch (error) {
      console.error("Beauty scoring failed:", error);
      setScoringError(error instanceof Error ? error.message : "Scoring failed");
      setIsScoring(false);
    }
  };

  // Find matching salons
  const findMatchingSalons = async () => {
    if (compatibilityScores.length === 0) {
      setSalonError("Compatibility scores required");
      return;
    }

    setIsFindingSalons(true);
    setSalonError(null);

    try {
      // Get user's location (mock for now, would use geolocation API in production)
      const userLocation = { lat: 19.0760, lng: 72.8777 }; // Mumbai coordinates

      // Initialize salon intelligence engine
      const salonEngine = new SalonIntelligenceEngine({
        userLocation,
        searchRadius: 25,
        topStyles: compatibilityScores.slice(0, 5),
        minRating: 4.0,
      });

      // Find matching salons
      const matches = await salonEngine.findMatchingSalons();
      setSalonMatches(matches);
      
      setTimeout(() => {
        setIsFindingSalons(false);
      }, 1000);

    } catch (error) {
      console.error("Salon matching failed:", error);
      setSalonError(error instanceof Error ? error.message : "Salon search failed");
      setIsFindingSalons(false);
    }
  };

  // Generate AI beauty report
  const generateReport = async () => {
    if (!faceAnalysis || !hairAnalysis || compatibilityScores.length === 0 || salonMatches.length === 0) {
      setReportError("All analysis data required");
      return;
    }

    setIsGeneratingReport(true);
    setReportError(null);

    try {
      const reportGenerator = new ReportGenerator({
        userName: "Valued Customer",
        faceAnalysis,
        hairAnalysis,
        topStyles: compatibilityScores.slice(0, 5),
        recommendedSalons: salonMatches.slice(0, 3),
      });

      const blob = await reportGenerator.generate();
      setReportBlob(blob);
      
      setTimeout(() => {
        setIsGeneratingReport(false);
      }, 500);

    } catch (error) {
      console.error("Report generation failed:", error);
      setReportError(error instanceof Error ? error.message : "Report generation failed");
      setIsGeneratingReport(false);
    }
  };

  // Download report
  const downloadReport = () => {
    if (!reportBlob) return;

    const url = URL.createObjectURL(reportBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `beauty-report-${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl"
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-50 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-all group"
        aria-label="Close"
      >
        <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Progress Indicator */}
      <div className="absolute top-6 left-6 right-24 z-50">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="font-medium">AI Beauty Intelligence Engine™</span>
        </div>
        <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"
            initial={{ width: "0%" }}
            animate={{ 
              width: phase === "intro" ? "10%" : 
                     phase === "consultation" ? "30%" :
                     phase === "face-scan" ? "40%" :
                     phase === "hair-scan" ? "50%" :
                     phase === "3d-twin" ? "60%" :
                     phase === "ar-preview" ? "70%" :
                     phase === "beauty-score" ? "80%" :
                     phase === "salon-match" ? "90%" : "100%"
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="relative w-full h-full overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* INTRO PHASE */}
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex items-center justify-center min-h-screen p-6"
            >
              <div className="max-w-2xl text-center">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative w-32 h-32 mx-auto mb-8"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-xl opacity-60 animate-pulse" />
                  <div className="relative w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl">
                    <Brain className="w-16 h-16 text-white" />
                  </div>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-5xl md:text-6xl font-bold mb-4"
                >
                  <span className="gradient-text">AI Beauty</span>
                  <br />
                  <span className="text-white">Intelligence Engine™</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-xl text-white/60 mb-8 leading-relaxed"
                >
                  Discover your perfect look through advanced facial analysis,
                  <br className="hidden sm:block" />
                  3D scanning, AR previews, and personalized beauty intelligence.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 }}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12"
                >
                  {[
                    { icon: Scan, label: "Face Analysis", color: "purple" },
                    { icon: Brain, label: "AI Matching", color: "pink" },
                    { icon: Video, label: "AR Preview", color: "cyan" },
                    { icon: Target, label: "Perfect Match", color: "emerald" },
                  ].map(({ icon: Icon, label, color }) => (
                    <div key={label} className="glass-card p-4 text-center">
                      <div className={`w-12 h-12 rounded-xl bg-${color}-500/20 flex items-center justify-center mx-auto mb-2`}>
                        <Icon className={`w-6 h-6 text-${color}-400`} />
                      </div>
                      <p className="text-xs text-white/70">{label}</p>
                    </div>
                  ))}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                >
                  <Button
                    size="lg"
                    onClick={() => setPhase("consultation")}
                    className="h-14 px-8 text-lg gap-3 shadow-2xl shadow-purple-500/50"
                  >
                    <Sparkles className="w-5 h-5" />
                    Start Beauty Analysis
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                  <p className="text-xs text-white/40 mt-4">
                    ✓ 100% Free • ✓ No Account Required • ✓ Instant Results
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* CONSULTATION PHASE */}
          {phase === "consultation" && (
            <motion.div
              key="consultation"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="min-h-screen p-6 flex items-center justify-center"
            >
              <div className="max-w-4xl w-full">
                <h2 className="text-4xl font-bold text-white mb-2">Beauty Consultation</h2>
                <p className="text-white/60 mb-8">Tell us what you're looking for</p>

                {/* Hair Goals */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-purple-400" />
                    Hair Goals
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {HAIR_GOALS.map((goal) => (
                      <button
                        key={goal.id}
                        onClick={() => setPreferences({ ...preferences, hairGoal: goal.id })}
                        className={cn(
                          "glass-card p-4 text-left transition-all hover:scale-105",
                          preferences.hairGoal === goal.id && "ring-2 ring-purple-500 bg-purple-500/20"
                        )}
                      >
                        <p className="text-lg font-medium text-white mb-1">{goal.label}</p>
                        <p className="text-xs text-white/50">{goal.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skin Goals */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Smile className="w-5 h-5 text-pink-400" />
                    Skin Goals
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {SKIN_GOALS.map((goal) => (
                      <button
                        key={goal.id}
                        onClick={() => setPreferences({ ...preferences, skinGoal: goal.id })}
                        className={cn(
                          "glass-card p-4 text-left transition-all hover:scale-105",
                          preferences.skinGoal === goal.id && "ring-2 ring-pink-500 bg-pink-500/20"
                        )}
                      >
                        <p className="text-lg font-medium text-white mb-1">{goal.label}</p>
                        <p className="text-xs text-white/50">{goal.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                    Budget Range
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {BUDGET_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setPreferences({ ...preferences, budget: option.id })}
                        className={cn(
                          "glass-card p-4 text-center transition-all hover:scale-105",
                          preferences.budget === option.id && "ring-2 ring-emerald-500 bg-emerald-500/20"
                        )}
                      >
                        <p className="font-semibold text-white mb-1">{option.label}</p>
                        <p className="text-xs text-white/50">{option.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  size="lg"
                  onClick={() => setPhase("face-scan")}
                  disabled={!preferences.hairGoal || !preferences.skinGoal || !preferences.budget}
                  className="w-full h-14 text-lg gap-3"
                >
                  Continue to AI Face Scan
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* FACE SCAN PHASE */}
          {phase === "face-scan" && (
            <motion.div
              key="face-scan"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen p-6 flex items-center justify-center"
            >
              <div className="max-w-4xl w-full">
                <h2 className="text-4xl font-bold text-white mb-2 text-center">AI Face Scanning</h2>
                <p className="text-white/60 mb-8 text-center">Position your face in the frame</p>

                {/* Camera View */}
                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-6 border-4 border-purple-500/50">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                  
                  {/* Face Guide Overlay */}
                  {!isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative w-64 h-80">
                        <div className="absolute inset-0 border-4 border-purple-500 rounded-full opacity-50" style={{ borderStyle: "dashed" }} />
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-400 rounded-tl-3xl" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-400 rounded-tr-3xl" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-400 rounded-bl-3xl" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-400 rounded-br-3xl" />
                      </div>
                    </div>
                  )}

                  {/* Scanning Overlay */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-purple-500/10">
                      <motion.div
                        className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent"
                        animate={{ top: ["0%", "100%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      />
                      
                      {/* Analysis Points */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        {[...Array(468)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-1 h-1 rounded-full bg-purple-400"
                            style={{
                              left: `${20 + Math.random() * 60}%`,
                              top: `${20 + Math.random() * 60}%`,
                            }}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
                            transition={{
                              duration: 2,
                              delay: (i * 0.01) % 2,
                              repeat: Infinity,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Progress Bar */}
                  {isScanning && (
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="glass-card p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white text-sm font-medium">Analyzing facial features...</span>
                          <span className="text-purple-400 font-bold">{scanProgress}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                            style={{ width: `${scanProgress}%` }}
                          />
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                          <div className={cn("text-white/40", scanProgress > 30 && "text-emerald-400")}>
                            ✓ Face Shape
                          </div>
                          <div className={cn("text-white/40", scanProgress > 60 && "text-emerald-400")}>
                            ✓ Skin Tone
                          </div>
                          <div className={cn("text-white/40", scanProgress > 90 && "text-emerald-400")}>
                            ✓ Facial Landmarks
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!isScanning && (
                  <Button
                    size="lg"
                    onClick={startFaceScan}
                    className="w-full h-14 text-lg gap-3"
                  >
                    <Scan className="w-5 h-5" />
                    Start AI Scan (468+ Points)
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* HAIR SCAN PHASE */}
          {phase === "hair-scan" && (
            <motion.div
              key="hair-scan"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen p-6 flex items-center justify-center"
            >
              <div className="max-w-4xl w-full">
                <h2 className="text-4xl font-bold text-white mb-2 text-center">Hair Analysis</h2>
                <p className="text-white/60 mb-8 text-center">
                  {isHairAnalyzing 
                    ? "Analyzing your hair characteristics..." 
                    : hairAnalysis 
                    ? "Hair analysis complete!" 
                    : "Position your hair clearly in the frame"}
                </p>

                {/* Camera View with Segmentation Overlay */}
                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-6 border-4 border-pink-500/50">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover mirror"
                  />
                  
                  {/* Segmentation Mask Overlay Canvas */}
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full object-cover mirror opacity-60"
                  />

                  {/* Hair Guide Overlay (when not analyzing) */}
                  {!isHairAnalyzing && !hairAnalysis && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative w-72 h-96">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 border-4 border-pink-500 rounded-t-full opacity-50" style={{ borderStyle: "dashed" }} />
                        <p className="absolute top-36 left-1/2 -translate-x-1/2 text-pink-400 text-sm font-medium whitespace-nowrap">
                          Position hair in this area
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Analyzing Overlay */}
                  {isHairAnalyzing && (
                    <div className="absolute inset-0 bg-pink-500/10">
                      <motion.div
                        className="absolute inset-x-0 h-2 bg-gradient-to-r from-transparent via-pink-400 to-transparent blur-sm"
                        animate={{ top: ["0%", "100%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                  )}

                  {/* Error Message Overlay */}
                  {hairAnalysisError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <div className="glass-card p-6 max-w-md mx-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                            <X className="w-5 h-5 text-red-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-white font-semibold mb-2">Analysis Failed</h3>
                            <p className="text-white/70 text-sm mb-4">{hairAnalysisError}</p>
                            <div className="space-y-2 text-xs text-white/50">
                              <p>💡 Tips for better results:</p>
                              <ul className="list-disc list-inside space-y-1">
                                <li>Remove hats, headbands, or head coverings</li>
                                <li>Ensure good lighting</li>
                                <li>Position hair clearly in frame</li>
                                <li>Keep head still during scan</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Progress Bar */}
                  {isHairAnalyzing && !hairAnalysisError && (
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="glass-card p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white text-sm font-medium">
                            {hairAnalysisProgress < 35 ? "Loading AI model..." :
                             hairAnalysisProgress < 40 ? "Preparing camera..." :
                             hairAnalysisProgress < 80 ? "Segmenting hair region..." :
                             "Analyzing characteristics..."}
                          </span>
                          <span className="text-pink-400 font-bold">{Math.round(hairAnalysisProgress)}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
                            style={{ width: `${hairAnalysisProgress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Results Display */}
                  {hairAnalysis && !isHairAnalyzing && (
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="glass-card p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-white font-semibold flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            Hair Analysis Complete
                          </h3>
                          <span className="text-xs text-white/50">
                            {Math.round(hairAnalysis.confidence * 100)}% confidence
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-white/50 mb-1">Color</p>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-6 h-6 rounded border-2 border-white/20"
                                style={{ backgroundColor: hairAnalysis.color }}
                              />
                              <span className="text-white font-medium text-sm">{hairAnalysis.color}</span>
                            </div>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-white/50 mb-1">Texture</p>
                            <p className="text-white font-medium capitalize">{hairAnalysis.texture}</p>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-white/50 mb-1">Length</p>
                            <p className="text-white font-medium capitalize">{hairAnalysis.length}</p>
                          </div>
                          <div className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-white/50 mb-1">Density</p>
                            <p className="text-white font-medium capitalize">{hairAnalysis.density}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {!isHairAnalyzing && !hairAnalysis && !hairAnalysisError && (
                    <Button
                      size="lg"
                      onClick={startHairScan}
                      className="flex-1 h-14 text-lg gap-3"
                    >
                      <Scissors className="w-5 h-5" />
                      Start Hair Analysis
                    </Button>
                  )}
                  
                  {hairAnalysisError && (
                    <Button
                      size="lg"
                      onClick={retryHairScan}
                      className="flex-1 h-14 text-lg gap-3"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Retry Analysis
                    </Button>
                  )}

                  {hairAnalysis && !isHairAnalyzing && (
                    <>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={retryHairScan}
                        className="h-14 text-lg gap-3"
                      >
                        <RefreshCw className="w-5 h-5" />
                        Re-scan
                      </Button>
                      <Button
                        size="lg"
                        onClick={() => setPhase("beauty-score")}
                        className="flex-1 h-14 text-lg gap-3"
                      >
                        Continue to Beauty Scoring
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* More phases will be added... */}
          
          {/* BEAUTY SCORE PHASE */}
          {phase === "beauty-score" && (
            <motion.div
              key="beauty-score"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen p-6 flex items-center justify-center"
            >
              <div className="max-w-5xl w-full">
                <h2 className="text-4xl font-bold text-white mb-2 text-center">
                  AI Beauty Compatibility
                </h2>
                <p className="text-white/60 mb-8 text-center">
                  {isScoring 
                    ? "Analyzing style compatibility with AI..." 
                    : compatibilityScores.length > 0
                    ? "Your personalized style recommendations"
                    : "Click below to score hairstyle compatibility"}
                </p>

                {/* Scoring Progress */}
                {isScoring && (
                  <div className="glass-card p-6 mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium">
                        Analyzing {HAIRSTYLE_LIBRARY.slice(0, 10).length} hairstyles...
                      </span>
                      <span className="text-purple-400 font-bold">{scoringProgress}%</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                        style={{ width: `${scoringProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    {usedFallback && (
                      <p className="text-xs text-yellow-400 mt-2">
                        ⚠️ Using rule-based fallback scoring (OpenAI API unavailable)
                      </p>
                    )}
                  </div>
                )}

                {/* Compatibility Scores */}
                {!isScoring && compatibilityScores.length > 0 && (
                  <div className="space-y-4 mb-6">
                    {compatibilityScores.slice(0, 5).map((score, index) => (
                      <motion.div
                        key={score.styleId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="glass-card p-5 hover:scale-[1.02] transition-transform cursor-pointer"
                        onClick={() => setSelectedHairstyle(score.styleId)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-white mb-1">
                              #{index + 1} {score.styleName}
                            </h3>
                            <p className="text-sm text-white/60 mb-2">{score.reasoning}</p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-3xl font-bold gradient-text">
                              {score.compatibilityScore}%
                            </div>
                            <div className="text-xs text-white/50">
                              {score.compatibilityScore >= 80 ? "Excellent" :
                               score.compatibilityScore >= 60 ? "Good" :
                               score.compatibilityScore >= 40 ? "Fair" : "Low"}
                            </div>
                          </div>
                        </div>
                        
                        {/* Score Bar */}
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className={cn(
                              "h-full",
                              score.compatibilityScore >= 80 ? "bg-gradient-to-r from-emerald-500 to-green-400" :
                              score.compatibilityScore >= 60 ? "bg-gradient-to-r from-blue-500 to-cyan-400" :
                              score.compatibilityScore >= 40 ? "bg-gradient-to-r from-yellow-500 to-amber-400" :
                              "bg-gradient-to-r from-red-500 to-orange-400"
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${score.compatibilityScore}%` }}
                            transition={{ duration: 1, delay: index * 0.1 }}
                          />
                        </div>
                        
                        {/* Tags */}
                        <div className="flex gap-2 mt-3">
                          {score.tags.map(tag => (
                            <span key={tag} className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Error Message */}
                {scoringError && (
                  <div className="glass-card p-6 mb-6 border-2 border-red-500/50">
                    <p className="text-red-400">{scoringError}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {!isScoring && compatibilityScores.length === 0 && (
                    <Button
                      size="lg"
                      onClick={startBeautyScoring}
                      className="flex-1 h-14 text-lg gap-3"
                    >
                      <Brain className="w-5 h-5" />
                      Start AI Compatibility Analysis
                    </Button>
                  )}
                  
                  {!isScoring && compatibilityScores.length > 0 && (
                    <>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={startBeautyScoring}
                        className="h-14 text-lg gap-3"
                      >
                        <RefreshCw className="w-5 h-5" />
                        Re-analyze
                      </Button>
                      <Button
                        size="lg"
                        onClick={() => setPhase("salon-match")}
                        className="flex-1 h-14 text-lg gap-3"
                      >
                        Find Matching Salons
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* SALON MATCH PHASE */}
          {phase === "salon-match" && (
            <motion.div
              key="salon-match"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen p-6 flex items-center justify-center"
            >
              <div className="max-w-5xl w-full">
                <h2 className="text-4xl font-bold text-white mb-2 text-center">
                  Perfect Salon Matches
                </h2>
                <p className="text-white/60 mb-8 text-center">
                  {isFindingSalons 
                    ? "Finding salons near you..." 
                    : salonMatches.length > 0
                    ? "Top salons ranked by expertise and ratings"
                    : "Click below to find salons that specialize in your recommended styles"}
                </p>

                {/* Finding Progress */}
                {isFindingSalons && (
                  <div className="glass-card p-6 mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                      <span className="text-white font-medium">
                        Searching salons within 25 miles...
                      </span>
                    </div>
                  </div>
                )}

                {/* Salon Cards */}
                {!isFindingSalons && salonMatches.length > 0 && (
                  <div className="grid gap-4 mb-6">
                    {salonMatches.map((salon, index) => (
                      <motion.div
                        key={salon.salonId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="glass-card p-6"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-2xl font-bold text-white">
                                {salon.salonName}
                              </h3>
                              <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-sm font-semibold">
                                {salon.matchScore}% Match
                              </div>
                            </div>
                            
                            <div className="space-y-2 text-white/70">
                              <p className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {salon.location.address} • {salon.location.distance} miles
                              </p>
                              <p className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-400" />
                                {salon.rating}/5 ({salon.reviewCount} reviews)
                              </p>
                              <p className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-green-400" />
                                Estimated ₹{salon.pricing.estimatedCost}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Expertise Match */}
                        <div className="mb-4">
                          <p className="text-xs text-white/50 mb-2">Specializes in:</p>
                          <div className="flex flex-wrap gap-2">
                            {salon.expertiseMatch.map(style => (
                              <span key={style} className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 font-medium">
                                ✨ {style}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <Button size="sm" variant="outline" className="flex-1">
                            <MapPin className="w-4 h-4 mr-2" />
                            View on Map
                          </Button>
                          <Button size="sm" className="flex-1">
                            <Calendar className="w-4 h-4 mr-2" />
                            Book Appointment
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Error Message */}
                {salonError && (
                  <div className="glass-card p-6 mb-6 border-2 border-red-500/50">
                    <p className="text-red-400">{salonError}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {!isFindingSalons && salonMatches.length === 0 && (
                    <Button
                      size="lg"
                      onClick={findMatchingSalons}
                      className="flex-1 h-14 text-lg gap-3"
                    >
                      <MapPin className="w-5 h-5" />
                      Find Matching Salons
                    </Button>
                  )}
                  
                  {!isFindingSalons && salonMatches.length > 0 && (
                    <>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={findMatchingSalons}
                        className="h-14 text-lg gap-3"
                      >
                        <RefreshCw className="w-5 h-5" />
                        Search Again
                      </Button>
                      <Button
                        size="lg"
                        onClick={() => setPhase("report")}
                        className="flex-1 h-14 text-lg gap-3"
                      >
                        Generate Report
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* REPORT PHASE */}
          {phase === "report" && (
            <motion.div
              key="report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="min-h-screen p-6 flex items-center justify-center"
            >
              <div className="max-w-3xl w-full">
                <h2 className="text-4xl font-bold text-white mb-2 text-center">
                  Your Beauty Blueprint
                </h2>
                <p className="text-white/60 mb-8 text-center">
                  {isGeneratingReport 
                    ? "Generating your personalized beauty report..." 
                    : reportBlob
                    ? "Your complete AI beauty analysis is ready!"
                    : "Click below to generate your comprehensive beauty report"}
                </p>

                {/* Generation Progress */}
                {isGeneratingReport && (
                  <div className="glass-card p-8 mb-6 text-center">
                    <Loader2 className="w-16 h-16 text-purple-400 animate-spin mx-auto mb-4" />
                    <p className="text-white font-medium">Creating your PDF report...</p>
                    <p className="text-white/50 text-sm mt-2">This may take a few seconds</p>
                  </div>
                )}

                {/* Report Ready */}
                {!isGeneratingReport && reportBlob && (
                  <div className="glass-card p-8 mb-6">
                    <div className="text-center mb-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">
                        Report Generated Successfully!
                      </h3>
                      <p className="text-white/60">
                        Size: {(reportBlob.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-white/5 rounded-lg p-4">
                        <p className="text-sm text-white/70 mb-1">✓ Face Analysis Results</p>
                        <p className="text-sm text-white/70 mb-1">✓ Hair Characteristics</p>
                        <p className="text-sm text-white/70 mb-1">✓ Top 5 Style Recommendations</p>
                        <p className="text-sm text-white/70 mb-1">✓ 3 Salon Recommendations</p>
                        <p className="text-sm text-white/70">✓ Compatibility Scores & Reasoning</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {reportError && (
                  <div className="glass-card p-6 mb-6 border-2 border-red-500/50">
                    <p className="text-red-400">{reportError}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {!isGeneratingReport && !reportBlob && (
                    <Button
                      size="lg"
                      onClick={generateReport}
                      className="flex-1 h-14 text-lg gap-3"
                    >
                      <FileText className="w-5 h-5" />
                      Generate Beauty Report
                    </Button>
                  )}
                  
                  {!isGeneratingReport && reportBlob && (
                    <>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={downloadReport}
                        className="flex-1 h-14 text-lg gap-3"
                      >
                        <Download className="w-5 h-5" />
                        Download PDF
                      </Button>
                      <Button
                        size="lg"
                        onClick={() => {
                          // Share functionality
                          alert("Share functionality would be implemented here");
                        }}
                        className="flex-1 h-14 text-lg gap-3"
                      >
                        <Share2 className="w-5 h-5" />
                        Share Report
                      </Button>
                    </>
                  )}
                </div>

                {reportBlob && (
                  <div className="mt-6 text-center">
                    <Button
                      variant="ghost"
                      onClick={onClose}
                      className="text-white/60 hover:text-white"
                    >
                      Close & Return Home
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          
        </AnimatePresence>
      </div>

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </motion.div>
  );
}
