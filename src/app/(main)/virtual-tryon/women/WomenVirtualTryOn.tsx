"use client";

export default function WomenVirtualTryOn() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Embedded External App - Starts right below menu bar */}
      <iframe
        src="https://model-two-henna.vercel.app/"
        className="w-full h-screen border-0"
        title="Women's Virtual Try-On"
        allow="camera; microphone"
        style={{ marginTop: '64px' }} // Just offset for main menu bar
      />
    </div>
  );
}
