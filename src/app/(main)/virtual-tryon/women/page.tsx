import { Metadata } from "next";
import WomenVirtualTryOn from "./WomenVirtualTryOn";

export const metadata: Metadata = {
  title: "Women's Virtual Try-On |  CuraStyl",
  description: "Try women's hairstyles virtually with AI-powered AR technology",
};

export default function WomenVirtualTryOnPage() {
  return <WomenVirtualTryOn />;
}
