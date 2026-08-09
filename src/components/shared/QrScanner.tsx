"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, Keyboard, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface QrScannerProps {
  /** Called with the decoded booking ID when a QR code is successfully scanned */
  onScan: (bookingId: string) => void;
  onClose: () => void;
}

type ScannerState = "idle" | "scanning" | "success" | "error";

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [state, setState] = useState<ScannerState>("idle");
  const [error, setError] = useState<string>("");
  const [manualId, setManualId] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  // ── Camera logic ──────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setState("scanning");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        tickScan();
      }
    } catch (err: any) {
      setError("Camera access denied. Please use manual entry below.");
      setState("error");
      setMode("manual");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tickScan = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tickScan);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Dynamically import jsQR to keep bundle lean
    import("jsqr").then(({ default: jsQR }) => {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code?.data) {
        handleDecoded(code.data);
        return;
      }
      rafRef.current = requestAnimationFrame(tickScan);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDecoded = useCallback((raw: string) => {
    stopCamera();
    try {
      // QR payload: { bookingId, salonId, service, date, time, amount, paymentStatus }
      const parsed = JSON.parse(raw);
      const bookingId = parsed.bookingId as string;
      if (!bookingId) throw new Error("No bookingId in QR");
      setLastScanned(bookingId);
      setState("success");
      onScan(bookingId);
    } catch {
      // Might be a plain booking ID string
      const trimmed = raw.trim();
      if (trimmed) {
        setLastScanned(trimmed);
        setState("success");
        onScan(trimmed);
      } else {
        setError("Invalid QR code. Please try again or use manual entry.");
        setState("error");
      }
    }
  }, [onScan, stopCamera]);

  useEffect(() => {
    if (mode === "camera") {
      startCamera();
    }
    return () => stopCamera();
  }, [mode, startCamera, stopCamera]);

  // ── Manual entry ──────────────────────────────────────────────────────────

  const handleManualSubmit = () => {
    const id = manualId.trim().toUpperCase();
    if (!id) return;
    setLastScanned(id);
    setState("success");
    onScan(id);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0d0d1a] border border-purple-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-purple-900/40">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gradient-to-r from-purple-600/20 to-pink-600/10">
          <div>
            <p className="font-semibold text-white text-base">Scan Customer QR</p>
            <p className="text-xs text-white/40 mt-0.5">Point camera at customer's QR code</p>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Close scanner"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Tab toggle */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => { setState("idle"); setMode("camera"); }}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors",
              mode === "camera" ? "text-purple-400 border-b-2 border-purple-400 bg-purple-500/5" : "text-white/40 hover:text-white/70"
            )}
          >
            <Camera className="w-3.5 h-3.5" /> Camera
          </button>
          <button
            onClick={() => { stopCamera(); setState("idle"); setMode("manual"); }}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors",
              mode === "manual" ? "text-purple-400 border-b-2 border-purple-400 bg-purple-500/5" : "text-white/40 hover:text-white/70"
            )}
          >
            <Keyboard className="w-3.5 h-3.5" /> Manual Entry
          </button>
        </div>

        {/* Content */}
        <div className="p-5">

          {/* ── SUCCESS ── */}
          {state === "success" && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-3 animate-glow">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-white font-semibold text-lg mb-1">QR Verified!</p>
              <p className="text-white/40 text-xs mb-4">Booking ID: <span className="font-mono text-purple-300">{lastScanned}</span></p>
              <p className="text-emerald-400 text-sm">Customer has been notified ✅</p>
              <Button
                className="mt-5 w-full"
                onClick={() => { setState("idle"); setMode("camera"); setManualId(""); }}
              >
                Scan Another
              </Button>
            </div>
          )}

          {/* ── CAMERA SCANNING ── */}
          {mode === "camera" && state !== "success" && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square border border-white/10">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                {/* Viewfinder overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-48 h-48">
                    <span className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-purple-400 rounded-tl-lg" />
                    <span className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-purple-400 rounded-tr-lg" />
                    <span className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-purple-400 rounded-bl-lg" />
                    <span className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-400 rounded-br-lg" />
                    {/* Scan line animation */}
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-scan-line" />
                  </div>
                </div>
                {state === "scanning" && (
                  <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center">
                    <span className="text-xs text-white/50 bg-black/60 px-2 py-1 rounded-full flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Scanning…
                    </span>
                  </div>
                )}
              </div>
              {state === "error" && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* ── MANUAL ENTRY ── */}
          {mode === "manual" && state !== "success" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-white/50 mb-2">Enter Booking ID</label>
                <Input
                  placeholder="e.g. CS-A1B2-C3D4"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                  className="font-mono uppercase tracking-wider"
                />
                <p className="text-xs text-white/30 mt-2">
                  Ask the customer for the Booking ID shown on their receipt.
                </p>
              </div>
              {state === "error" && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}
              <Button
                className="w-full"
                onClick={handleManualSubmit}
                disabled={!manualId.trim()}
              >
                Verify Booking
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
