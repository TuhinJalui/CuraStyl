import { Metadata } from "next";
import MenVirtualTryOn from "./MenVirtualTryOn";

export const metadata: Metadata = {
  title: "Men's Virtual Try-On |  CuraStyl",
  description: "Try men's hairstyles virtually with AI-powered AR technology",
};

export default function MenVirtualTryOnPage() {
  return <MenVirtualTryOn />;
}
