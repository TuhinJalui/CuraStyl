"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, X, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import dynamic from "next/dynamic";

// Dynamically import the map component to avoid SSR issues
const InteractiveMap = dynamic(
  () => import("./InteractiveMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-80 rounded-xl bg-[#1a0a2e] flex items-center justify-center border border-white/10">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    ),
  }
) as React.ComponentType<{
  center: { lat: number; lng: number };
  onMarkerDrag: (lat: number, lng: number) => void;
}>;

interface LocationPickerProps {
  onLocationSelect: (location: { 
    address: string; 
    lat: number; 
    lng: number;
    area?: string;
    pincode?: string;
  }) => void;
  initialLocation?: { address: string; lat: number; lng: number };
}

export default function LocationPicker({ onLocationSelect, initialLocation }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ address: string; lat: number; lng: number } | null>(
    initialLocation || null
  );

  // Update map when location changes
  useEffect(() => {
    if (initialLocation) {
      setSelectedLocation(initialLocation);
    }
  }, [initialLocation]);

  // Auto-search as user types (after 3 characters)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const trimmedQuery = searchQuery.trim();
      
      // Trigger search if at least 3 characters
      if (trimmedQuery.length >= 3) {
        handleAutoSearch();
      } else if (trimmedQuery.length === 0) {
        // Clear results if search is empty
        setSearchResults([]);
      }
    }, 500); // 500ms debounce delay

    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Extract area and pincode from Nominatim address data
  const extractLocationDetails = (data: any) => {
    const address = data.address || {};
    
    // Extract pincode (postal_code)
    const pincode = address.postcode || address.postal_code || "";
    
    // Extract raw area (suburb, neighbourhood, or locality)
    const rawArea = address.suburb || 
                    address.neighbourhood || 
                    address.locality || 
                    address.village || 
                    address.town || 
                    address.city_district || 
                    "";
    
    // Normalize area to match predefined Mumbai areas
    // Remove directions (West, East, North, South) and common suffixes
    const normalizeArea = (areaName: string): string => {
      if (!areaName) return "";
      
      // Known Mumbai areas for matching
      const mumbaiAreas = [
        "Bandra", "Andheri", "Powai", "Juhu", "Versova", "Malad", "Borivali",
        "Dadar", "Worli", "Lower Parel", "Colaba", "Fort", "Churchgate",
        "Santacruz", "Vile Parle", "Kurla", "Chembur", "Ghatkopar", "Mulund",
        "Thane", "Navi Mumbai"
      ];
      
      // Remove common directional suffixes and normalize
      const cleaned = areaName
        .replace(/\s+(West|East|North|South)$/i, "")
        .replace(/\s+Colony$/i, "")
        .replace(/\s+Nagar$/i, "")
        .trim();
      
      // Find matching area from predefined list (case-insensitive partial match)
      for (const area of mumbaiAreas) {
        if (cleaned.toLowerCase().includes(area.toLowerCase()) || 
            area.toLowerCase().includes(cleaned.toLowerCase())) {
          return area;
        }
      }
      
      // If no match found, return the cleaned raw area
      return cleaned || rawArea;
    };
    
    const area = normalizeArea(rawArea);
    
    return { area, pincode };
  };

  // Handle marker drag to update search query with reverse geocoding
  const handleMarkerDrag = async (lat: number, lng: number) => {
    setIsSearching(true); // Show loading state while fetching
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      if (data.display_name) {
        const extractedData = extractLocationDetails(data);
        console.log("📍 Extracted location data:", {
          raw_address: data.address,
          extracted_area: extractedData.area,
          extracted_pincode: extractedData.pincode
        });
        
        setSearchQuery(data.display_name);
        setSelectedLocation({ 
          address: data.display_name, 
          lat, 
          lng,
          ...extractedData
        });
        onLocationSelect({ 
          address: data.display_name, 
          lat, 
          lng,
          ...extractedData
        });
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAutoSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=10&addressdetails=1&countrycodes=in`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        // Remove duplicates based on display_name
        const uniqueResults = data.filter((result: any, index: number, self: any[]) => 
          index === self.findIndex((r) => r.display_name === result.display_name)
        );
        setSearchResults(uniqueResults.slice(0, 5)); // Limit to 5 unique results
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    await handleAutoSearch();
  };

  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const address = result.display_name;
    const extractedData = extractLocationDetails(result);

    console.log("🔍 Search result selected:", {
      raw_address: result.address,
      extracted_area: extractedData.area,
      extracted_pincode: extractedData.pincode
    });

    const location = { 
      address, 
      lat, 
      lng,
      ...extractedData
    };
    setSelectedLocation(location);
    onLocationSelect(location);
    setSearchResults([]);
    setSearchQuery(address); // Set the search query to selected address
  };

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocode to get address
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            
            if (data.display_name) {
              const extractedData = extractLocationDetails(data);
              const location = {
                address: data.display_name,
                lat: latitude,
                lng: longitude,
                ...extractedData
              };
              setSelectedLocation(location);
              onLocationSelect(location);
            }
          } catch (error) {
            console.error("Reverse geocoding failed:", error);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("Unable to get your location. Please search manually.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search for your location..."
              className="pl-9"
              disabled={isSearching}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-purple-400" />
            )}
          </div>
          <Button onClick={handleSearch} disabled={isSearching} size="sm">
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
          </Button>
          <Button onClick={handleLocateMe} variant="outline" size="sm">
            <Navigation className="w-4 h-4 mr-1" /> Locate Me
          </Button>
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-black border border-white/10 rounded-xl overflow-hidden max-h-60 overflow-y-auto shadow-lg">
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => selectSearchResult(result)}
                className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
              >
                <p className="text-sm text-white font-medium">{result.display_name.split(",")[0]}</p>
                <p className="text-xs text-white/50 truncate">{result.display_name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Location Display */}
      {selectedLocation && (
        <div className="glass-card p-4 border-purple-500/30 bg-purple-500/5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-xs text-purple-300 font-medium mb-1">Selected Location</p>
              <p className="text-sm text-white/80">{selectedLocation.address}</p>
              <div className="flex gap-4 mt-2">
                {(selectedLocation as any).area && (
                  <p className="text-xs text-emerald-400">
                    📍 Area: <span className="font-medium">{(selectedLocation as any).area}</span>
                  </p>
                )}
                {(selectedLocation as any).pincode && (
                  <p className="text-xs text-emerald-400">
                    📮 Pincode: <span className="font-medium">{(selectedLocation as any).pincode}</span>
                  </p>
                )}
              </div>
              <p className="text-xs text-white/40 mt-1">
                Coordinates: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedLocation(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Interactive Map with Draggable Marker */}
      <InteractiveMap
        center={selectedLocation || { lat: 19.0760, lng: 72.8777 }} // Default to Mumbai
        onMarkerDrag={handleMarkerDrag}
      />

      {/* Instructions */}
      <div className="text-xs text-white/40 space-y-1">
        <p>• Type at least 3 characters to see location suggestions automatically</p>
        <p>• <strong className="text-white/60">Drag the purple pin on the map</strong> to set your exact location - address, area & pincode will update automatically</p>
        <p>• Click "Locate Me" to use your current GPS location</p>
        <p>• Make sure the location is accurate before saving</p>
      </div>
    </div>
  );
}
