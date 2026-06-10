import React, { useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GOLD = '#C9A84C';
const BG = '#0A0A0A';
const ONBOARDING_KEY = '@auris:onboarding_complete';

// ---------------------------------------------------------------------------
// Slide icons — pure RN shapes, no third-party icon deps
// ---------------------------------------------------------------------------

/** Slide 1: Solo Mode — gold orb circle with border glow */
function SoloIcon() {
  return (
    <View style={iconStyles.soloOuter}>
      <View style={iconStyles.soloInner} />
    </View>
  );
}

/** Slide 2: Social Mode — two overlapping circles */
function SocialIcon() {
  return (
    <View style={iconStyles.socialContainer}>
      <View style={[iconStyles.socialCircle, { left: 0 }]} />
      <View style={[iconStyles.socialCircle, { right: 0 }]} />
    </View>
  );
}

/** Slide 3: Vision Mode — square with rounded corners (camera viewfinder) */
function VisionIcon() {
  return (
    <View style={iconStyles.visionOuter}>
      {/* Corner ticks */}
      <View style={[iconStyles.corner, iconStyles.cornerTL]} />
      <View style={[iconStyles.corner, iconStyles.cornerTR]} />
      <View style={[iconStyles.corner, iconStyles.cornerBL]} />
      <View style={[iconStyles.corner, iconStyles.cornerBR]} />
      {/* Center dot */}
      <View style={iconStyles.visionDot} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Slide data
// ---------------------------------------------------------------------------
const SLIDES = [
  {
    Icon: SoloIcon,
    title: 'Your AI Companion',
    subtitle: 'Swipe right on the orb for private AI conversations. Auris listens and responds.',
  },
  {
    Icon: SocialIcon,
    title: 'Silent Ambient Intelligence',
    subtitle: 'Swipe left on the orb. Auris listens silently and sends you insights — without interrupting.',
  },
  {
    Icon: VisionIcon,
    title: 'See the World Differently',
    subtitle: 'Tap the floating center node. Capture anything and ask Auris about it.',
  },
];

// ---------------------------------------------------------------------------
// Main onboarding screen
// ---------------------------------------------------------------------------
export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(newIndex);
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < SLIDES.length) {
      scrollRef.current?.scrollTo({ x: nextIndex * SCREEN_WIDTH, animated: true });
      setCurrentIndex(nextIndex);
    }
  };

  const handleGetStarted = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    router.replace('/(tabs)');
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLIDES.map((slide, i) => {
          const { Icon } = slide;
          return (
            <View key={i} style={styles.slide}>
              {/* Icon area */}
              <View style={styles.iconArea}>
                <Icon />
              </View>

              {/* Text */}
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom controls */}
      <View style={styles.bottomArea}>
        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>

        {/* CTA button */}
        <TouchableOpacity
          style={styles.button}
          onPress={isLast ? handleGetStarted : handleNext}
          activeOpacity={0.82}
        >
          <Text style={styles.buttonText}>
            {isLast ? 'GET STARTED' : 'NEXT'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconArea: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    color: '#999999',
    lineHeight: 22,
    textAlign: 'center',
  },
  bottomArea: {
    paddingHorizontal: 32,
    paddingBottom: 60,
    alignItems: 'center',
    gap: 28,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: GOLD,
  },
  dotInactive: {
    backgroundColor: '#333333',
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: GOLD,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
});

// ---------------------------------------------------------------------------
// Icon styles
// ---------------------------------------------------------------------------
const iconStyles = StyleSheet.create({
  // Solo: concentric circles with gold border glow
  soloOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.8,
  },
  soloInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 1,
  },

  // Social: two overlapping circles
  socialContainer: {
    width: 80,
    height: 56,
    position: 'relative',
  },
  socialCircle: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: GOLD,
    top: 0,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.6,
  },

  // Vision: rounded square viewfinder with corner ticks
  visionOuter: {
    width: 68,
    height: 68,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.7,
  },
  corner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: GOLD,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  visionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    shadowOpacity: 1,
  },
});
