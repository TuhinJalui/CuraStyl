"use client";

import { useEffect, useRef, useState } from "react";

const SLIDES_META = [
  { local: "/images/hero/slide1.jpg", fallback: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=85", title: "Chic Salon Interiors" },
  { local: "/images/hero/slide2.jpg", fallback: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1920&q=85", title: "Expert Stylists & Makeovers" },
  { local: "/images/hero/slide3.jpg", fallback: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1920&q=85", title: "Nail Art & Manicures" },
  { local: "/images/hero/slide4.jpg", fallback: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1920&q=85", title: "Relaxing Spa & Facials" },
  { local: "/images/hero/slide5.jpg", fallback: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1920&q=85", title: "Bridal Makeup & Glam" },
];

export default function HeroSlideshow({ paused = false, parallax = { x: 0, y: 0 } }: { paused?: boolean; parallax?: { x: number; y: number } }) {
  const [active, setActive] = useState(0);
  const [urls, setUrls] = useState<string[]>(SLIDES_META.map(m => m.fallback));
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  const timerRef = useRef<number | null>(null);
  const manualTimeoutRef = useRef<number | null>(null);

  // Try to load local images, fall back to Unsplash
  useEffect(() => {
    SLIDES_META.forEach((m, idx) => {
      const img = new Image();
      img.onload = () => {
        setUrls((prev) => {
          const next = [...prev];
          next[idx] = m.local;
          return next;
        });
        setLoadedImages((prev) => new Set(prev).add(idx));
      };
      img.onerror = () => {
        // Use Unsplash fallback (already set in initial state)
        setLoadedImages((prev) => new Set(prev).add(idx));
      };
      img.src = m.local;
    });
  }, []);

  useEffect(() => {
    if (paused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      setActive((p) => (p + 1) % SLIDES_META.length);
    }, 6000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (manualTimeoutRef.current) {
        clearTimeout(manualTimeoutRef.current);
        manualTimeoutRef.current = null;
      }
    };
  }, [paused]);

  // Keyboard navigation (left / right)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goTo((active - 1 + SLIDES_META.length) % SLIDES_META.length);
      } else if (e.key === "ArrowRight") {
        goTo((active + 1) % SLIDES_META.length);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active]);

  const goTo = (idx: number) => {
    setActive(idx);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (manualTimeoutRef.current) clearTimeout(manualTimeoutRef.current as any);
    manualTimeoutRef.current = window.setTimeout(() => {
      manualTimeoutRef.current = null;
      if (!paused) {
        timerRef.current = window.setInterval(() => setActive((p) => (p + 1) % SLIDES_META.length), 6000);
      }
    }, 6000);
  };

  return (
    <div aria-hidden className="absolute inset-0 z-0">
      {urls.map((src, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{
            transform: `translate3d(${parallax.x * (i === active ? 0.55 : 0.28)}px, ${parallax.y * (i === active ? 0.55 : 0.28)}px, 0)`,
            transition: "transform 220ms ease-out",
          }}
        >
          <div
            className={`absolute inset-0 bg-center bg-cover hero-image-filter transition-opacity duration-1000 ease-in-out transform ${
              i === active ? "scale-105 hero-kenburns" : "scale-100"
            }`}
            style={{
              backgroundImage: `url(${src})`,
              opacity: i === active ? 0.22 : 0,
            }}
          />
        </div>
      ))}

      <div className="absolute inset-0 hero-gradient-overlay pointer-events-none" />
      <div className="absolute inset-0 hero-vignette pointer-events-none" />
      <div className="absolute inset-0 noise-overlay pointer-events-none" />

      {/* <div className="absolute left-6 bottom-6 z-20 flex items-center gap-4 pointer-events-none">
        <div className="glass px-4 py-2 rounded-md text-white/95 pointer-events-none max-w-xs truncate">{SLIDES_META[active].title}</div>
        <div className="flex gap-2 items-center pointer-events-auto">
          {SLIDES_META.map((_, idx) => (
            <button
              key={idx}
              aria-label={`Show slide ${idx + 1}`}
              onClick={() => goTo(idx)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                idx === active ? "bg-gradient-to-r from-purple-400 to-pink-400 scale-110" : "bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </div> */}

      {/* Arrow controls */}
      <div className="absolute inset-y-0 left-0 right-0 z-20 pointer-events-none">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-auto">
          {/* <button
            aria-label="Previous slide"
            onClick={() => goTo((active - 1 + SLIDES_META.length) % SLIDES_META.length)}
            className="w-10 h-10 rounded-full glass flex items-center justify-center text-white/90 hover:scale-105 transition-transform"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.293 16.293a1 1 0 010-1.414L15.586 11H4a1 1 0 110-2h11.586l-3.293-3.879a1 1 0 111.56-1.26l5 5.882a1 1 0 010 1.26l-5 5.882a1 1 0 01-1.56-1.26z" clipRule="evenodd" />
            </svg>
          </button> */}
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-auto">
          {/* <button
            aria-label="Next slide"
            onClick={() => goTo((active + 1) % SLIDES_META.length)}
            className="w-10 h-10 rounded-full glass flex items-center justify-center text-white/90 hover:scale-105 transition-transform"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 rotate-180" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.293 16.293a1 1 0 010-1.414L15.586 11H4a1 1 0 110-2h11.586l-3.293-3.879a1 1 0 111.56-1.26l5 5.882a1 1 0 010 1.26l-5 5.882a1 1 0 01-1.56-1.26z" clipRule="evenodd" />
            </svg>
          </button> */}
        </div>
      </div>
    </div>
  );
}
