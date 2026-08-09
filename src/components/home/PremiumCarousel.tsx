"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Sparkles, Scissors, Palette, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const CAROUSEL_SLIDES = [
  {
    id: 1,
    title: "Premium Bridal Makeover",
    subtitle: "Your Dream Wedding Look Awaits",
    description: "Expert stylists • Luxury Products • Picture Perfect Results",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1600&auto=format&fit=crop&q=80",
    cta: "Book Bridal Package",
    link: "/salons?service=Bridal%20Makeup",
    gradient: "from-pink-900/90 via-purple-900/70 to-transparent",
    icon: Crown,
    tag: "Wedding Special"
  },
  {
    id: 2,
    title: "Luxury Hair Transformations",
    subtitle: "Mumbai's Top Hair Artists",
    description: "Color Experts • Style Masters • Keratin Specialists",
    image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1600&auto=format&fit=crop&q=80",
    cta: "Explore Hair Services",
    link: "/salons?service=Hair%20Color",
    gradient: "from-violet-900/90 via-fuchsia-900/70 to-transparent",
    icon: Scissors,
    tag: "Trending Now"
  },
  {
    id: 3,
    title: "Radiant Skin Treatments",
    subtitle: "Advanced Facial & Skin Care",
    description: "Anti-Aging • Hydrafacial • LED Therapy • Organic Products",
    image: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=1600&auto=format&fit=crop&q=80",
    cta: "Book Facial",
    link: "/salons?service=Facial",
    gradient: "from-blue-900/90 via-cyan-900/70 to-transparent",
    icon: Sparkles,
    tag: "Skin Glow"
  },
  {
    id: 4,
    title: "Professional Makeup Artistry",
    subtitle: "Glam Up for Every Occasion",
    description: "Party Makeup • HD Makeup • Airbrush • Celebrity Styles",
    image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1600&auto=format&fit=crop&q=80",
    cta: "Book Makeup Artist",
    link: "/salons?service=Makeup",
    gradient: "from-rose-900/90 via-pink-900/70 to-transparent",
    icon: Palette,
    tag: "Most Booked"
  },
  {
    id: 5,
    title: "Spa & Wellness",
    subtitle: "Relax, Rejuvenate, Refresh",
    description: "Thai Massage • Aromatherapy • Body Scrubs • Detox",
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1600&auto=format&fit=crop&q=80",
    cta: "Book Spa Session",
    link: "/salons?service=Spa%20Packages",
    gradient: "from-emerald-900/90 via-teal-900/70 to-transparent",
    icon: Sparkles,
    tag: "Relaxation"
  }
];

export default function PremiumCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  const nextSlide = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection('right');
    setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    setTimeout(() => setIsAnimating(false), 600);
  }, [isAnimating]);

  const prevSlide = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection('left');
    setCurrentSlide((prev) => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length);
    setTimeout(() => setIsAnimating(false), 600);
  }, [isAnimating]);

  // Auto-play
  useEffect(() => {
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  const slide = CAROUSEL_SLIDES[currentSlide];
  const Icon = slide.icon;

  return (
    <section className="relative py-0 w-screen max-w-none overflow-hidden bg-gradient-to-b from-[#0a0a0a] to-[#1a0a1f] left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full">
        {/* Carousel Container - Full width, wider aspect ratio */}
        <div className="relative h-[100px] md:h-[500px] lg:h-[450px] overflow-hidden group">
          {/* Main Slide */}
          <div className="relative w-full h-full">
            {/* Background Image with Parallax Effect */}
            <div className={`absolute inset-0 transition-transform duration-700 ${isAnimating ? (direction === 'right' ? '-translate-x-full' : 'translate-x-full') : 'translate-x-0'}`}>
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
              {/* Gradient Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient}`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            </div>

            {/* Content */}
            <div className={`relative h-full flex flex-col justify-end p-6 md:p-12 lg:p-16 transition-all duration-700 ${isAnimating ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'}`}>
              <div className="max-w-7xl mx-auto w-full">
                {/* Tag */}
                <div className="mb-3">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-semibold">
                    <Icon className="w-4 h-4" />
                    {slide.tag}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-2 max-w-4xl leading-tight">
                  {slide.title}
                </h2>
                <p className="text-lg md:text-xl lg:text-2xl text-white/90 mb-3 max-w-3xl">
                  {slide.subtitle}
                </p>
                <p className="text-sm md:text-base lg:text-lg text-white/70 mb-6 max-w-2xl">
                  {slide.description}
                </p>

                {/* CTA Button */}
                <div>
                  <Link href={slide.link}>
                    <Button 
                      size="lg" 
                      className="h-12 md:h-14 px-6 md:px-8 text-base md:text-lg bg-white text-black hover:bg-white/90 hover:scale-105 transition-all duration-300 shadow-2xl"
                    >
                      {slide.cta}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-all duration-300 z-10"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-all duration-300 z-10"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Slide Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {CAROUSEL_SLIDES.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (index !== currentSlide && !isAnimating) {
                    setIsAnimating(true);
                    setDirection(index > currentSlide ? 'right' : 'left');
                    setCurrentSlide(index);
                    setTimeout(() => setIsAnimating(false), 600);
                  }
                }}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'w-12 bg-white' 
                    : 'w-8 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
