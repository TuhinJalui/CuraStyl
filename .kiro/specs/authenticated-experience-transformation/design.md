# Authenticated User Experience Transformation - Design Document

## Design Philosophy

**Core Principle**: One seamless experience from landing to booking, with authentication enhancing (not disrupting) the journey.

### Design Goals
1. **Zero Context Switching**: No jarring transitions between public and authenticated views
2. **Progressive Enhancement**: Auth adds features without changing the beautiful foundation
3. **Emotional Resonance**: Every interaction feels personal, celebratory, and premium
4. **Effortless Persistence**: Changes save automatically, everywhere, always
5. **Intuitive Navigation**: Users never wonder "where do I find X?"

---

## Architecture Overview

### Current Architecture (Problem)
```
Landing Page (/) → Auth → Dashboard (/dashboard) ❌
  ↓                           ↓
Beautiful                  Separate, disconnected
Premium UI                 "3rd class" experience
```

### New Architecture (Solution)
```
Landing Page (/)
  ├─ Guest Mode: Full marketing experience
  └─ Authenticated Mode: Enhanced personal experience
      ├─ Same beautiful UI
      ├─ Personalized content
      ├─ Inline features (bookings, favorites, etc.)
      └─ Persistent state across sessions
```

---

## Component Architecture

### 1. Auth Flow Enhancement

#### Google OAuth Callback Handler
```typescript
// src/app/auth/callback/route.ts (Enhanced)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (code) {
    const supabase = createClient();
    
    // Exchange code for session
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (user && !error) {
      // Extract Google profile data
      const googleData = {
        full_name: user.user_metadata.full_name || user.user_metadata.name,
        avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture,
        email: user.email,
        provider: 'google'
      };
      
      // Upsert profile (create if not exists, update if exists)
      await supabase.from('profiles').upsert({
        id: user.id,
        ...googleData,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
        ignoreDuplicates: false
      });
      
      // Redirect to homepage (not dashboard!)
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
  
  return NextResponse.redirect(new URL('/auth/login?error=auth_failed', request.url));
}
```

#### Profile Sync Hook
```typescript
// src/lib/auth/useAuth.ts (Enhanced)
export function useAuth() {
  // ... existing code ...
  
  const syncGoogleProfile = useCallback(async (user: any) => {
    if (user.app_metadata.provider !== 'google') return;
    
    const googleData = {
      full_name: user.user_metadata.full_name || user.user_metadata.name,
      avatar_url: user.user_metadata.avatar_url || user.user_metadata.picture,
    };
    
    // Check if profile needs update
    if (profile && (
      profile.full_name !== googleData.full_name ||
      profile.avatar_url !== googleData.avatar_url
    )) {
      await updateUserProfile(googleData);
    }
  }, [profile, updateUserProfile]);
  
  // Sync on auth state change
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) syncGoogleProfile(user);
    });
  }, [syncGoogleProfile]);
  
  // ... rest of the code ...
}
```

### 2. Enhanced Navbar Component

#### Profile Display Logic
```typescript
// src/components/layout/Navbar.tsx (Enhanced)
export default function Navbar() {
  const { isLoggedIn, profile } = useAuth();
  
  // Generate initials or use Google photo
  const profileDisplay = useMemo(() => {
    if (!profile) return null;
    
    return {
      photo: profile.avatar_url, // Google photo URL
      initials: profile.full_name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || '??',
      firstName: profile.full_name?.split(' ')[0] || 'User',
    };
  }, [profile]);
  
  return (
    <nav>
      {/* ... Logo and Links ... */}
      
      {/* Auth Section */}
      {isLoggedIn && profileDisplay ? (
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <NotificationBell />
          
          {/* Profile Dropdown */}
          <Dropdown>
            <DropdownTrigger>
              <button className="relative group">
                {/* Profile Photo */}
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-purple-500/30 group-hover:ring-purple-500/60 transition-all">
                  {profileDisplay.photo ? (
                    <Image 
                      src={profileDisplay.photo} 
                      alt={profileDisplay.firstName}
                      width={40}
                      height={40}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                      {profileDisplay.initials}
                    </div>
                  )}
                </div>
                
                {/* Online Indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0a0a0f]" />
              </button>
            </DropdownTrigger>
            
            <DropdownContent>
              {/* Profile Section */}
              <div className="px-4 py-3 border-b border-white/10">
                <p className="font-semibold text-white">{profile.full_name}</p>
                <p className="text-xs text-white/40">{profile.email}</p>
              </div>
              
              {/* Menu Items */}
              <DropdownItem onClick={() => openProfileModal()}>
                <User className="w-4 h-4" /> Edit Profile
              </DropdownItem>
              <DropdownItem onClick={() => scrollToSection('bookings')}>
                <Calendar className="w-4 h-4" /> My Bookings
              </DropdownItem>
              <DropdownItem onClick={() => scrollToSection('favorites')}>
                <Heart className="w-4 h-4" /> My Favorites
              </DropdownItem>
              <DropdownItem>
                <Gift className="w-4 h-4" /> GlamPoints: {glamPoints}
              </DropdownItem>
              
              <DropdownDivider />
              
              <DropdownItem onClick={signOut} className="text-red-400">
                <LogOut className="w-4 h-4" /> Sign Out
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
          
          {/* Quick Menu */}
          <QuickMenuGrid />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link href="/auth/register">
            <Button>Get Started</Button>
          </Link>
        </div>
      )}
    </nav>
  );
}
```

### 3. Unified Homepage Component

#### Smart Homepage Renderer
```typescript
// src/app/(main)/page.tsx (Enhanced)
export default function HomePage() {
  const { isLoggedIn, isLoading } = useAuth();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  return (
    <div className="min-h-screen gradient-hero">
      {isLoggedIn ? (
        <AuthenticatedHomepage 
          expandedSection={expandedSection}
          onExpandSection={setExpandedSection}
        />
      ) : (
        <PublicLandingPage />
      )}
    </div>
  );
}
```

#### Authenticated Homepage Structure
```typescript
// src/components/home/AuthenticatedHomepage.tsx (New)
export default function AuthenticatedHomepage({ 
  expandedSection, 
  onExpandSection 
}: Props) {
  return (
    <>
      {/* Hero Section - Personalized */}
      <WelcomeHero />
      
      {/* Quick Stats */}
      <StatsGrid />
      
      {/* Search Bar */}
      <SearchSection />
      
      {/* Bookings Section - Inline, Expandable */}
      <BookingsSection 
        expanded={expandedSection === 'bookings'}
        onToggle={() => onExpandSection(
          expandedSection === 'bookings' ? null : 'bookings'
        )}
      />
      
      {/* Favorites Section - Inline, Expandable */}
      <FavoritesSection 
        expanded={expandedSection === 'favorites'}
        onToggle={() => onExpandSection(
          expandedSection === 'favorites' ? null : 'favorites'
        )}
      />
      
      {/* AI Recommendations */}
      <AIRecommendationsSection />
      
      {/* Trending Salons (personalized) */}
      <PersonalizedTrendingSalons />
      
      {/* Quick Actions */}
      <QuickActionsGrid />
      
      {/* Special Offers (personalized) */}
      <PersonalizedOffers />
    </>
  );
}
```

### 4. Profile Management Modal

#### Modal Component
```typescript
// src/components/profile/ProfileModal.tsx (New)
export default function ProfileModal({ isOpen, onClose }: Props) {
  const { profile, updateUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'preferences' | 'settings'>('info');
  const [isSaving, setIsSaving] = useState(false);
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-2xl glass-card rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative h-32 bg-gradient-to-r from-purple-500 to-pink-500">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              
              {/* Profile Photo - Overlapping */}
              <div className="absolute -bottom-12 left-8">
                <div className="relative w-24 h-24 rounded-full ring-4 ring-[#0a0a0f] overflow-hidden">
                  {profile?.avatar_url ? (
                    <Image 
                      src={profile.avatar_url} 
                      alt={profile.full_name || ''}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-2xl font-bold">
                      {getInitials(profile?.full_name)}
                    </div>
                  )}
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-purple-500 hover:bg-purple-600 flex items-center justify-center shadow-lg transition-all">
                  <Camera className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="pt-16 p-8">
              {/* Tabs */}
              <div className="flex gap-2 mb-6 bg-white/5 rounded-xl p-1">
                {[
                  { id: 'info', label: 'Personal Info', icon: User },
                  { id: 'preferences', label: 'Preferences', icon: Settings },
                  { id: 'settings', label: 'Settings', icon: Sliders },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                      activeTab === id
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
              
              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {activeTab === 'info' && (
                  <PersonalInfoTab 
                    profile={profile} 
                    onSave={updateUserProfile}
                    isSaving={isSaving}
                    setIsSaving={setIsSaving}
                  />
                )}
                {activeTab === 'preferences' && (
                  <PreferencesTab profile={profile} />
                )}
                {activeTab === 'settings' && (
                  <SettingsTab profile={profile} />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 5. Expandable Sections

#### Bookings Section Component
```typescript
// src/components/home/sections/BookingsSection.tsx (New)
export default function BookingsSection({ expanded, onToggle }: Props) {
  const { bookings, isLoading } = useBookings();
  const displayCount = expanded ? bookings.length : 3;
  
  return (
    <section id="bookings" className="mb-12 scroll-mt-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Your Bookings</h2>
            <p className="text-sm text-white/50">{bookings.length} total appointments</p>
          </div>
        </div>
        
        {bookings.length > 3 && (
          <button
            onClick={onToggle}
            className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            {expanded ? 'Show Less' : `View All ${bookings.length}`}
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              expanded && "rotate-180"
            )} />
          </button>
        )}
      </div>
      
      {/* Bookings Grid */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <LoadingSkeleton count={3} />
        ) : bookings.length === 0 ? (
          <EmptyBookingsState />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {bookings.slice(0, displayCount).map((booking, index) => (
              <motion.div
                key={booking.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <BookingCard booking={booking} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
```

---

## Data Flow

### 1. Authentication Flow
```
Google OAuth
  ↓
Callback Handler
  ├─ Exchange code for session
  ├─ Extract Google profile data (name, photo, email)
  ├─ Upsert to profiles table
  └─ Redirect to / (homepage)
    ↓
useAuth Hook
  ├─ Load session
  ├─ Fetch profile from Supabase
  ├─ Store in Zustand
  └─ Trigger UI update
    ↓
Navbar & Homepage
  └─ Render authenticated experience
```

### 2. Profile Update Flow
```
User edits profile in modal
  ↓
Debounced auto-save (500ms)
  ↓
Update Supabase profiles table
  ↓
Update Zustand store
  ↓
Broadcast to all tabs (BroadcastChannel API)
  ↓
UI updates everywhere
  ↓
Show "Saved ✓" indicator
```

### 3. Section State Management
```
User clicks "View All Bookings"
  ↓
Update expandedSection state
  ↓
Smooth scroll to bookings section
  ↓
Animate expansion
  ├─ Increase displayCount
  ├─ Animate new cards in
  └─ Update button text
```

---

## UI/UX Specifications

### Color Palette
- **Primary Gradient**: Purple (#a855f7) to Pink (#ec4899)
- **Background**: Dark (#0a0a0f) with glass-morphism
- **Success**: Emerald (#10b981)
- **Warning**: Amber (#f59e0b)
- **Error**: Red (#ef4444)
- **Text**: White with opacity variants

### Typography
- **Headings**: Bold, gradient text
- **Body**: Regular, white/70 opacity
- **Labels**: Small, white/40 opacity

### Spacing
- **Section Gaps**: 3-4rem (mb-12)
- **Card Gaps**: 1rem (gap-4)
- **Element Gaps**: 0.75rem (gap-3)

### Animations
- **Transitions**: 200-300ms ease
- **Hover Scale**: 1.05
- **Modal**: Scale 0.9 → 1
- **Card Entrance**: Stagger by 50ms

---

## Database Schema Updates

### profiles Table (Enhanced)
```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS provider VARCHAR(20) DEFAULT 'email',
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_provider ON profiles(provider);
```

### user_preferences Table (New)
```sql
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

---

## Performance Optimizations

### 1. Auth State Caching
- Cache profile in Zustand store
- Persist to localStorage (encrypted)
- Skip API call if cached and fresh (<5min)

### 2. Lazy Loading
- Defer non-critical sections
- Load bookings/favorites on scroll into view
- Prefetch on hover

### 3. Optimistic Updates
- Update UI immediately
- Sync to server in background
- Rollback on error

### 4. Image Optimization
- Use Next.js Image component
- Auto WebP conversion
- Responsive sizes
- Lazy load below fold

---

## Security Considerations

### 1. Profile Photo Validation
- Validate URL is from Google's CDN
- Check file size < 5MB
- Scan for malicious content
- Use signed URLs

### 2. Data Encryption
- Encrypt sensitive preferences at rest
- Use HTTPS everywhere
- Secure cookies with httpOnly
- Rate limit profile updates

### 3. Access Control
- Users can only update own profile
- RLS policies on Supabase
- Validate all inputs server-side
- Sanitize user-generated content

---

## Testing Strategy

### Unit Tests
- Profile sync logic
- Initials generation
- Data persistence
- State management

### Integration Tests
- Auth flow end-to-end
- Profile update flow
- Section expansion
- Modal interactions

### E2E Tests
- Complete user journey:
  1. Sign in with Google
  2. Verify profile photo shows
  3. Edit profile
  4. View bookings
  5. View favorites
  6. Sign out

---

## Rollout Plan

### Phase 1: Auth & Profile (Week 1)
- ✅ Fix Google profile sync
- ✅ Update navbar with profile photo
- ✅ Fix "Sign In" button persistence issue
- ✅ Profile modal implementation

### Phase 2: Homepage Integration (Week 2)
- ✅ Remove dashboard route
- ✅ Implement AuthenticatedHomepage
- ✅ Inline bookings section
- ✅ Inline favorites section

### Phase 3: Polish & Animations (Week 3)
- ✅ Micro-interactions
- ✅ Loading states
- ✅ Empty states
- ✅ Celebrations

### Phase 4: Testing & Launch (Week 4)
- ✅ Comprehensive testing
- ✅ Performance optimization
- ✅ Bug fixes
- ✅ Production deployment

---

## Success Metrics

### Technical KPIs
- Auth state load time < 100ms
- Profile photo appears < 200ms after login
- Section expansion animation < 300ms
- Modal open/close < 200ms
- Zero broken features

### UX KPIs
- User retention +30%
- Session duration +50%
- Feature discovery +80%
- Positive sentiment +90%
- Support tickets -50%

---

This design ensures a seamless, premium, emotionally engaging experience that makes users fall in love with MumbaiGlamHub! 💜✨
