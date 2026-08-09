"use client";

import { useEffect } from "react";

interface GoogleCSEProps {
  cx?: string;
}

export default function GoogleCSE({ cx = "42662ccfb7ca74536" }: GoogleCSEProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("gcse-script")) return;

    const s = document.createElement("script");
    s.id = "gcse-script";
    s.async = true;
    s.src = `https://cse.google.com/cse.js?cx=${cx}`;
    document.body.appendChild(s);

    return () => {
      // keep script persistent to avoid reloading; remove only on unmount if desired
    };
  }, [cx]);

  return (
    <div>
      <div className="gcse-search" />
    </div>
  );
}
