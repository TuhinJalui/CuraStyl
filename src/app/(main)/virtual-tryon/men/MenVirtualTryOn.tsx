"use client";

export default function MenVirtualTryOn() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Embedded External App - Starts right below menu bar */}
      <iframe
        src="https://model-men.vercel.app/"
        className="w-full h-screen border-0"
        title="Men's Virtual Try-On"
        allow="camera; microphone"
        style={{ marginTop: '64px' }} // Just offset for main menu bar
      />
    </div>
  );
}
