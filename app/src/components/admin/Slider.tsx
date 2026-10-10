import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Txt } from '@/components/ui';
import { colors, radius, space } from '@/lib/theme';

export interface Slide {
  key: string;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  gradient: readonly [string, string, ...string[]];
  big: string;
  caption: string;
  stats: { label: string; value: string }[];
}

const GAP = space.md;
const AUTOPLAY_MS = 4500;

/** سلايدر بطاقات متدرجة: تمرير أفقي بالتقطيع، نقاط، وتشغيل تلقائي. */
export function Slider({ slides }: { slides: Slide[] }) {
  const { width } = useWindowDimensions();
  const cardW = width - space.lg * 2;
  const step = cardW + GAP;
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  const touching = useRef(false);

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // في RTL قد تكون الإزاحة سالبة
    const i = Math.round(Math.abs(e.nativeEvent.contentOffset.x) / step);
    const next = Math.min(Math.max(i, 0), slides.length - 1);
    indexRef.current = next;
    setIndex(next);
    touching.current = false;
  };

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      if (touching.current) return;
      const next = (indexRef.current + 1) % slides.length;
      indexRef.current = next;
      setIndex(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <View>
      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled={false}
        snapToInterval={step}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.key}
        contentContainerStyle={{ paddingHorizontal: space.lg, gap: GAP }}
        getItemLayout={(_, i) => ({ length: step, offset: step * i, index: i })}
        onScrollBeginDrag={() => {
          touching.current = true;
        }}
        onMomentumScrollEnd={onEnd}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item }) => (
          <LinearGradient colors={item.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, { width: cardW }]}>
            <View style={styles.bubbleA} />
            <View style={styles.bubbleB} />
            <View style={styles.top}>
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={22} color="#fff" />
              </View>
              <Txt weight="heavy" size={15} color="rgba(255,255,255,0.92)">
                {item.title}
              </Txt>
            </View>
            <View>
              <Txt weight="heavy" size={44} color="#fff" style={{ lineHeight: 56 }}>
                {item.big}
              </Txt>
              <Txt weight="bold" size={13} color="rgba(255,255,255,0.8)">
                {item.caption}
              </Txt>
            </View>
            <View style={styles.stats}>
              {item.stats.map((s) => (
                <View key={s.label} style={styles.stat}>
                  <Txt weight="heavy" size={18} color="#fff" style={{ lineHeight: 26 }}>
                    {s.value}
                  </Txt>
                  <Txt weight="bold" size={11} color="rgba(255,255,255,0.78)" numberOfLines={1}>
                    {s.label}
                  </Txt>
                </View>
              ))}
            </View>
          </LinearGradient>
        )}
      />
      <View style={styles.dots}>
        {slides.map((s, i) => (
          <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { height: 210, borderRadius: radius.lg + 6, padding: space.lg, justifyContent: 'space-between', overflow: 'hidden' },
  bubbleA: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.09)', top: -60, end: -40 },
  bubbleB: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.07)', bottom: -40, start: 30 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: radius.md, paddingVertical: 6, paddingHorizontal: space.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: space.md },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#cbd5e1' },
  dotActive: { width: 22, backgroundColor: colors.primary },
});
