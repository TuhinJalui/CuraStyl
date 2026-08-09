"use client";

import { useEffect, useCallback } from "react";
import { create } from "zustand";

interface FavoritesState {
  favoriteIds: Set<string>;
  isLoaded: boolean;
  setFavoriteIds: (ids: string[]) => void;
  toggleId: (id: string) => void;
}

const useFavoritesStore = create<FavoritesState>((set) => ({
  favoriteIds: new Set(),
  isLoaded: false,
  setFavoriteIds: (ids) => set({ favoriteIds: new Set(ids), isLoaded: true }),
  toggleId: (id) =>
    set((state) => {
      const next = new Set(state.favoriteIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { favoriteIds: next };
    }),
}));

export function useFavorites() {
  const { favoriteIds, isLoaded, setFavoriteIds, toggleId } =
    useFavoritesStore();

  // Load favorites on mount
  useEffect(() => {
    if (isLoaded) return;

    fetch("/api/favorites")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.favoriteIds) {
          setFavoriteIds(data.favoriteIds);
        }
      })
      .catch(() => {
        // Not logged in or error — just set empty
        setFavoriteIds([]);
      });
  }, [isLoaded, setFavoriteIds]);

  const toggleFavorite = useCallback(
    async (salonId: string) => {
      // Optimistic update
      toggleId(salonId);

      try {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ salon_id: salonId }),
        });

        if (!res.ok) {
          // Revert on failure
          toggleId(salonId);
        }
      } catch {
        // Revert on network error
        toggleId(salonId);
      }
    },
    [toggleId]
  );

  const isFavorite = useCallback(
    (salonId: string) => favoriteIds.has(salonId),
    [favoriteIds]
  );

  return { favoriteIds, isFavorite, toggleFavorite, isLoaded };
}
