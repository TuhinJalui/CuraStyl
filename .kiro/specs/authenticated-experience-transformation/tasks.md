# Authenticated Experience Transformation - Implementation Tasks

## Overview

This implementation plan transforms the disconnected auth/dashboard experience into a seamless, premium, emotionally engaging authenticated experience integrated directly into the homepage.

---

## Phase 1: Fix Authentication & Profile Sync (Priority: Critical)

### Task 1: Google Profile Auto-Sync
**Goal**: Automatically extract and save Google profile data (photo, name, email) on login

- [ ] 1.1 Update auth callback handler
  - Modify `src/app/auth/callback/route.ts`
  - Extract `user_metadata.avatar_url` or `user_metadata.picture` from Google
  - Extract `user_metadata.full_name` or `user_metadata.name`
  - Extract `user_metadata.email`
  - Upsert to profiles table with `onConflict: 'id'`
  - _Requirements: 1.1_

- [ ] 1.2 Add profile sync to useAuth hook
  - Modify `src/lib/auth/useAuth.ts`
  - Add `syncGoogleProfile()` function
  - Call on auth state change
  - Update local state when Google data changes
  - _Requirements: 1.1_

- [ ] 1.3 Update profiles table schema
  - Run migration to add `avatar_url` column (if not exists)
  - Add `provider` column to track auth method
  - Add `last_synced_at` timestamp
  - Add indexes for performance
  - _Requirements: 1.1, 1.3_

### Task 2: Fix Navbar Profile Display
**Goal**: Show profile photo/initials instead of "Sign In" button after login

- [ ] 2.1 Update Navbar component auth section
  - Modify `src/components/layout/Navbar.tsx`
  - Replace "Sign In" button logic with profile display
  - Show circular profile photo if `avatar_url` exists
  - Generate and show initials if no photo
  - Add online status indicator (green dot)
  - _Requirements: 1.2_

- [ ] 2.2 Implement profile dropdown
  - Add dropdown trigger on profile photo click
  - Show full name + email in header
  - Add menu items: Edit Profile, My Bookings, My Favorites, GlamPoints, Settings, Sign Out
  - Implement smooth animations
  - _Requirements: 1.2, 4.2_

- [ ] 2.3 Style profile photo component
  - Add hover effects (ring glow)
  - Add click animation (scale pulse)
  - Ensure image loads fast (Next.js Image optimization)
  - Handle loading/error states gracefully
  - _Requirements: 5.3_

### Task 3: Profile Data Persistence
**Goal**: Save and sync all profile changes across sessions

- [ ] 3.1 Implement auto-save for profile edits
  - Add debounced save (500ms delay)
  - Update Supabase on every change
  - Update Zustand store immediately (optimistic)
  - Show "Saving..." → "Saved ✓" indicator
  - _Requirements: 1.3, 6.1_

- [ ] 3.2 Add cross-tab sync
  - Use BroadcastChannel API
  - Broadcast profile updates to all tabs
  - Listen and update UI in other tabs
  - Handle concurrent edits gracefully
  - _Requirements: 1.3, 6.1_

- [ ] 3.3 Implement profile caching
  - Cache profile in localStorage (encrypted)
  - Load from cache first (instant UI)
  - Refresh from server in background
  - Handle cache invalidation
  - _Requirements: 7.1_

---

## Phase 2: Remove Dashboard & Integrate Features (Priority: Critical)

### Task 4: Eliminate Dashboard Route
**Goal**: Remove `/dashboard` entirely and redirect to homepage

- [ ] 4.1 Remove dashboard route files
  - Delete `src/app/(main)/dashboard/page.tsx`
  - Delete `src/app/(main)/dashboard/DashboardClient.tsx`
  - Delete dashboard folder completely
  - _Requirements: 2.1_

- [ ] 4.2 Add dashboard redirect
  - Create redirect in `next.config.ts`
  - Redirect `/dashboard/*` → `/`
  - Preserve query params
  - _Requirements: 2.1_

- [ ] 4.3 Update all dashboard links
  - Find all `href="/dashboard"` references
  - Replace with `href="/"` or section anchors
  - Update navigation components
  - Update API routes that return dashboard URLs
  - _Requirements: 2.1_

### Task 5: Smart Homepage Renderer
**Goal**: Show different content based on auth state

- [ ] 5.1 Update homepage component structure
  - Modify `src/app/(main)/page.tsx`
  - Add auth state check
  - Conditionally render `<PublicLandingPage />` or `<AuthenticatedHomepage />`
  - Add loading state between transitions
  - _Requirements: 2.2_

- [ ] 5.2 Preserve existing PublicLandingPage
  - Extract current homepage content to `PublicLandingPage` component
  - Keep all existing sections (Hero, TrustBadges, etc.)
  - Ensure no visual changes for guest users
  - _Requirements: 2.2_

- [ ] 5.3 Create AuthenticatedHomepage component
  - Create `src/components/home/AuthenticatedHomepage.tsx`
  - Import from `AuthenticatedHome.tsx` (existing)
  - Enhance with new features (expandable sections, modals)
  - Maintain premium visual consistency
  - _Requirements: 2.2, 5.3_

### Task 6: Welcome Hero Section
**Goal**: Replace slideshow with personalized welcome for authenticated users

- [ ] 6.1 Create WelcomeHero component
  - Show large profile photo + "Welcome back, {firstName}! 👋"
  - Add quick stats grid (Total Bookings, Completed, Upcoming, GlamPoints)
  - Include search bar prominently
  - Use same glass-morphism aesthetic
  - _Requirements: 5.1_

- [ ] 6.2 Add personalization elements
  - Show time-based greeting (Good morning/afternoon/evening)
  - Display last visit date
  - Show recent activity summary
  - Add milestone celebrations
  - _Requirements: 5.1_

- [ ] 6.3 Implement stats counters
  - Fetch stats from bookings table
  - Calculate GlamPoints from completed bookings
  - Animate counters on load (count up effect)
  - Make stats clickable (scroll to sections)
  - _Requirements: 3.4_

---

## Phase 3: Inline Feature Sections (Priority: High)

### Task 7: Expandable Bookings Section
**Goal**: Show bookings inline on homepage with expand/collapse

- [ ] 7.1 Create BookingsSection component
  - Create `src/components/home/sections/BookingsSection.tsx`
  - Show recent 3 bookings by default
  - Add "View All X bookings" button
  - Implement expand to show all bookings inline
  - _Requirements: 3.1_

- [ ] 7.2 Implement expansion animation
  - Use Framer Motion `layout` animation
  - Smooth height transition
  - Stagger card entrance animations
  - Scroll to section on expand
  - _Requirements: 5.2, 7.2_

- [ ] 7.3 Build BookingCard component
  - Show salon photo, name, service
  - Display date, time, status badge
  - Add cancel button for confirmed bookings
  - Implement status color coding
  - _Requirements: 3.1_

- [ ] 7.4 Add booking actions
  - Implement inline cancellation with confirmation
  - Show cancellation reason modal
  - Update status optimistically
  - Sync to server in background
  - _Requirements: 3.1, 6.3_

### Task 8: Expandable Favorites Section
**Goal**: Show favorite salons inline with expand/collapse

- [ ] 8.1 Create FavoritesSection component
  - Create `src/components/home/sections/FavoritesSection.tsx`
  - Show 3-6 favorite salons by default
  - Add "View All X favorites" button
  - Implement expand to show all favorites inline
  - _Requirements: 3.2_

- [ ] 8.2 Integrate with existing SalonCard
  - Reuse `SalonCard` component
  - Add heart icon with filled/unfilled states
  - Implement toggle favorite inline
  - Optimistic UI update
  - _Requirements: 3.2_

- [ ] 8.3 Add quick book from favorites
  - Add "Book Now" CTA on each card
  - Navigate to salon detail page
  - Preserve scroll position on back
  - _Requirements: 3.2_

- [ ] 8.4 Handle empty favorites state
  - Show beautiful illustration
  - Add encouraging copy
  - Provide "Browse Salons" CTA
  - Show sample recommended salons
  - _Requirements: 5.4_

### Task 9: GlamPoints & Rewards
**Goal**: Display and manage GlamPoints system

- [ ] 9.1 Create GlamPoints database table
  - Create `glam_points` table in Supabase
  - Track earned, redeemed, bonus points
  - Add transactions table for history
  - _Requirements: 3.4_

- [ ] 9.2 Implement points calculation
  - Award 50 points per completed booking
  - Add bonus points for milestones
  - Calculate current balance
  - Show in stats grid
  - _Requirements: 3.4_

- [ ] 9.3 Build points history modal
  - Show all transactions
  - Display earned vs. redeemed
  - Add redemption options
  - Celebrate milestones
  - _Requirements: 3.4_

---

## Phase 4: Profile Management Modal (Priority: High)

### Task 10: Profile Modal Component
**Goal**: Beautiful modal for editing profile, preferences, settings

- [ ] 10.1 Create ProfileModal component
  - Create `src/components/profile/ProfileModal.tsx`
  - Implement overlay with backdrop blur
  - Add header with gradient background
  - Position profile photo overlapping header
  - _Requirements: 3.3_

- [ ] 10.2 Implement modal tabs
  - Add tabs: Personal Info, Preferences, Settings
  - Smooth tab switching with animations
  - Persist active tab in state
  - _Requirements: 3.3_

- [ ] 10.3 Build PersonalInfoTab
  - Edit full name, phone, avatar
  - Add avatar upload/change functionality
  - Implement auto-save
  - Show save status indicator
  - _Requirements: 3.3, 6.1_

- [ ] 10.4 Build PreferencesTab
  - Notification preferences
  - Email/SMS opt-in/out
  - Favorite service types
  - Preferred areas/salons
  - _Requirements: 6.2_

- [ ] 10.5 Build SettingsTab
  - Privacy controls
  - Data management
  - Account deletion
  - Export data (GDPR)
  - _Requirements: 8.2_

- [ ] 10.6 Add modal animations
  - Fade in overlay
  - Scale in modal (0.9 → 1)
  - Smooth close animation
  - Return to scroll position on close
  - _Requirements: 5.2, 7.2_

---

## Phase 5: Enhanced Navigation (Priority: Medium)

### Task 11: Restructure Menu Bar
**Goal**: Reorganize navigation for better UX

- [ ] 11.1 Reorder navigation items
  - Logo → Home | Salons | Offers | AI Beauty
  - Right side: Notifications | Profile | Quick Menu
  - Remove redundant items
  - Optimize for muscle memory
  - _Requirements: 4.1_

- [ ] 11.2 Implement NotificationBell component
  - Show red badge with unread count
  - Dropdown with recent notifications
  - Click notification → Navigate to section
  - Mark as read on click
  - Real-time updates
  - _Requirements: 4.3_

- [ ] 11.3 Build QuickMenuGrid component
  - 4-dot icon trigger
  - 2x2 or 3x3 grid dropdown
  - Quick actions: Home, Salons, Offers, AI, Bookings, Favorites, Help, Settings
  - Icon + label for each action
  - Smooth animations
  - _Requirements: 4.4_

- [ ] 11.4 Optimize mobile navigation
  - Collapsible mobile menu
  - Touch-friendly dropdowns
  - Swipeable sections
  - Bottom navigation bar (optional)
  - _Requirements: 7.3_

---

## Phase 6: Personalization & Emotions (Priority: Medium)

### Task 12: Personalized Greetings
**Goal**: Make users feel special with personalization

- [ ] 12.1 Implement dynamic greetings
  - Time-based: "Good morning/afternoon/evening, {firstName}"
  - Event-based: "Happy Birthday, {firstName}! 🎂"
  - Milestone: "Congrats on your 10th booking! 🎉"
  - _Requirements: 5.1_

- [ ] 12.2 Build milestone celebration system
  - Detect milestones (first booking, 5th, 10th, etc.)
  - Show confetti animation
  - Display celebration modal
  - Award bonus GlamPoints
  - _Requirements: 5.1, 5.2_

- [ ] 12.3 Add birthday wishes
  - Store birthday in profile
  - Send notification on birthday
  - Show special offer
  - Celebrate in welcome banner
  - _Requirements: 5.1_

### Task 13: Micro-Interactions
**Goal**: Add delightful micro-interactions throughout

- [ ] 13.1 Implement hover animations
  - Scale on hover (1.05)
  - Glow effects on cards
  - Smooth color transitions
  - Icon animations
  - _Requirements: 5.2_

- [ ] 13.2 Add click feedback
  - Pulse animation on click
  - Success checkmarks
  - Loading spinners with personality
  - Error shake animations
  - _Requirements: 5.2_

- [ ] 13.3 Build celebration animations
  - Confetti for achievements
  - Heart burst for favorites
  - Star explosion for ratings
  - Points counter animation
  - _Requirements: 5.2_

- [ ] 13.4 Smooth scroll animations
  - Auto-scroll to sections on click
  - Smooth easing curve
  - Offset for fixed navbar
  - Preserve scroll on modal close
  - _Requirements: 7.2_

### Task 14: Thoughtful Empty States
**Goal**: Beautiful, encouraging empty states

- [ ] 14.1 Design empty bookings state
  - Beautiful illustration/icon
  - Encouraging copy: "Start your beauty journey!"
  - Clear CTA: "Browse Salons"
  - Show sample trending salons
  - _Requirements: 5.4_

- [ ] 14.2 Design empty favorites state
  - Heart-themed illustration
  - Copy: "Find salons you'll love"
  - CTA: "Explore Salons"
  - Show recommended salons
  - _Requirements: 5.4_

- [ ] 14.3 Design empty notifications state
  - Bell icon with friendly message
  - "You're all caught up!"
  - Suggest actions to get notifications
  - _Requirements: 5.4_

---

## Phase 7: Data Persistence & Sync (Priority: High)

### Task 15: Auto-Save Implementation
**Goal**: Save all changes automatically without explicit save button

- [ ] 15.1 Implement debounced auto-save
  - 500ms debounce on input changes
  - Save to Supabase automatically
  - Update Zustand store optimistically
  - Show saving indicator
  - _Requirements: 6.1_

- [ ] 15.2 Handle save conflicts
  - Detect concurrent edits
  - Show conflict resolution UI
  - Merge changes intelligently
  - Preserve user intent
  - _Requirements: 6.1_

- [ ] 15.3 Add offline support
  - Queue changes when offline
  - Sync when connection restored
  - Show offline indicator
  - Preserve data integrity
  - _Requirements: 6.1_

### Task 16: Real-Time Sync
**Goal**: Sync data across tabs and devices instantly

- [ ] 16.1 Implement BroadcastChannel sync
  - Broadcast profile updates to all tabs
  - Listen for updates in all tabs
  - Update UI immediately
  - Handle edge cases (closed tabs)
  - _Requirements: 6.1_

- [ ] 16.2 Add Supabase Realtime
  - Subscribe to profile changes
  - Subscribe to booking status updates
  - Subscribe to notifications
  - Update UI on real-time events
  - _Requirements: 6.3_

- [ ] 16.3 Implement optimistic updates
  - Update UI immediately on action
  - Sync to server in background
  - Rollback on error
  - Show error state
  - _Requirements: 7.2_

---

## Phase 8: Performance Optimization (Priority: Medium)

### Task 17: Fast Auth State Loading
**Goal**: Load auth state <100ms for instant UI

- [ ] 17.1 Implement auth state caching
  - Cache profile in localStorage
  - Encrypt sensitive data
  - Load from cache on mount
  - Refresh from server in background
  - _Requirements: 7.1_

- [ ] 17.2 Optimize profile fetch
  - Use single query with joins
  - Cache in Zustand store
  - Skip fetch if cached and fresh (<5min)
  - Prefetch on login
  - _Requirements: 7.1_

- [ ] 17.3 Add loading skeletons
  - Match skeleton to actual content shape
  - Animate smoothly
  - No layout shift
  - Fast transition to real content
  - _Requirements: 7.2_

### Task 18: Image Optimization
**Goal**: Fast image loading without quality loss

- [ ] 18.1 Optimize profile photos
  - Use Next.js Image component
  - Auto WebP conversion
  - Responsive sizes
  - Lazy load below fold
  - _Requirements: 7.2_

- [ ] 18.2 Implement image caching
  - Cache avatar URLs
  - Preload on hover
  - Use CDN for Google photos
  - Handle broken images gracefully
  - _Requirements: 7.2_

### Task 19: Code Splitting
**Goal**: Reduce initial bundle size

- [ ] 19.1 Lazy load modals
  - Dynamic import ProfileModal
  - Load on first open
  - Preload on hover
  - _Requirements: 8.1_

- [ ] 19.2 Lazy load sections
  - Load bookings on scroll into view
  - Load favorites on scroll into view
  - Prefetch on hover over section link
  - _Requirements: 8.1_

---

## Phase 9: Security & Privacy (Priority: High)

### Task 20: Secure Profile Updates
**Goal**: Validate and secure all profile operations

- [ ] 20.1 Add server-side validation
  - Validate all profile update requests
  - Sanitize user input
  - Check file size limits
  - Verify image URLs
  - _Requirements: 8.1_

- [ ] 20.2 Implement rate limiting
  - Limit profile updates to 10/minute
  - Limit avatar uploads to 5/hour
  - Return 429 on exceed
  - _Requirements: 8.1_

- [ ] 20.3 Add RLS policies
  - Users can only update own profile
  - Users can only see own bookings
  - Users can only manage own favorites
  - _Requirements: 8.1_

### Task 21: Privacy Controls
**Goal**: Give users control over their data

- [ ] 21.1 Add privacy settings
  - Option to hide profile photo
  - Control notification preferences
  - Manage data sharing
  - _Requirements: 8.2_

- [ ] 21.2 Implement data export
  - Export all user data as JSON
  - Include profile, bookings, favorites
  - GDPR compliant
  - _Requirements: 8.2_

- [ ] 21.3 Add account deletion
  - Confirm with password
  - Delete all user data
  - Cascade delete bookings, favorites
  - Show confirmation
  - _Requirements: 8.2_

---

## Phase 10: Testing & Polish (Priority: Critical)

### Task 22: Testing
**Goal**: Ensure everything works perfectly

- [ ] 22.1 Unit tests
  - Test profile sync logic
  - Test initials generation
  - Test auto-save debouncing
  - Test optimistic updates
  - _Requirements: All_

- [ ] 22.2 Integration tests
  - Test auth flow end-to-end
  - Test profile update flow
  - Test section expansion
  - Test modal interactions
  - _Requirements: All_

- [ ] 22.3 E2E tests
  - Complete user journey:
    1. Sign in with Google
    2. Verify profile photo shows
    3. Edit profile
    4. Expand bookings
    5. Expand favorites
    6. Sign out
  - _Requirements: All_

- [ ] 22.4 Cross-browser testing
  - Chrome, Firefox, Safari, Edge
  - Mobile browsers (iOS Safari, Chrome Mobile)
  - Test all features work
  - _Requirements: 7.3_

### Task 23: Final Polish
**Goal**: Make everything feel premium and delightful

- [ ] 23.1 Polish animations
  - Smooth all transitions
  - Perfect timing curves
  - No jank or stutter
  - Consistent motion language
  - _Requirements: 5.2_

- [ ] 23.2 Perfect spacing & alignment
  - Consistent spacing scale
  - Pixel-perfect alignment
  - Responsive breakpoints
  - Print design review
  - _Requirements: 5.3_

- [ ] 23.3 Accessibility audit
  - Keyboard navigation
  - Screen reader support
  - ARIA labels
  - Focus indicators
  - Color contrast
  - _Requirements: 7.3_

- [ ] 23.4 Performance audit
  - Lighthouse score >90
  - Fast 3G load time <3s
  - No layout shifts
  - Optimize images
  - _Requirements: 7.1, 7.2_

---

## Checkpoint Tasks

- [ ] Checkpoint 1: Auth & Profile Working
  - Google profile syncs automatically
  - Profile photo shows in navbar
  - No "Sign In" button when logged in
  - Profile modal works perfectly

- [ ] Checkpoint 2: Dashboard Removed
  - /dashboard redirects to /
  - All features integrated on homepage
  - No broken links

- [ ] Checkpoint 3: Features Working
  - Bookings section expands/collapses
  - Favorites section expands/collapses
  - Profile edits save automatically
  - GlamPoints display correctly

- [ ] Checkpoint 4: Premium Feel
  - Animations smooth throughout
  - Empty states are beautiful
  - Micro-interactions delight users
  - Overall experience feels "premium"

- [ ] Checkpoint 5: Production Ready
  - All tests pass
  - No console errors
  - Cross-browser tested
  - Performance optimized
  - Security reviewed

---

## Notes

- **Priority Order**: Phase 1-2 are critical (fix auth, remove dashboard)
- **UI Consistency**: Maintain landing page's premium aesthetic throughout
- **Emotional Design**: Every interaction should feel delightful
- **Performance**: Optimize for speed without sacrificing beauty
- **Testing**: Test thoroughly before considering any phase complete

---

## Estimated Timeline

- **Phase 1-2**: 1 week (Critical auth fixes + dashboard removal)
- **Phase 3-4**: 1 week (Inline sections + profile modal)
- **Phase 5-6**: 1 week (Navigation + personalization)
- **Phase 7-9**: 1 week (Data sync + security)
- **Phase 10**: 3-4 days (Testing + polish)

**Total**: ~5 weeks for complete transformation

---

**Goal**: Transform MumbaiGlamHub from disconnected experience to seamlessly integrated, premium, emotionally engaging platform that users love! 💜✨
