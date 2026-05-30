import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { PERSONALITIES, PersonalityId, PersonalityMode } from '@/constants/personalities';
import { backendService } from '@/services/BackendService';
import { profileService } from '@/services/ProfileService';

function PersonalityCard({
  personality,
  selected,
  onSelect,
}: {
  personality: PersonalityMode;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.personalityCard,
        selected && { borderColor: personality.color, backgroundColor: `${personality.color}0D` },
      ]}
    >
      <View style={styles.personalityCardLeft}>
        <View style={[styles.personalityIcon, { backgroundColor: `${personality.color}18` }]}>
          <Ionicons name={personality.icon as any} size={18} color={personality.color} />
        </View>
        <View style={{ gap: 2 }}>
          <Text style={styles.personalityName}>{personality.nameTR}</Text>
          <Text style={styles.personalityDesc}>{personality.descriptionTR}</Text>
        </View>
      </View>
      {selected && (
        <View style={[styles.selectedDot, { backgroundColor: personality.color }]} />
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('');
  const [personality, setPersonality] = useState<PersonalityId>('companion');
  const [backendUrl, setBackendUrl] = useState('');

  useEffect(() => {
    Promise.all([
      backendService.loadConfig(),
      profileService.load(),
    ]).then(([, profile]) => {
      setName(profile.name);
      setProfession(profile.profession);
      setPersonality(profile.personality as PersonalityId);
      setBackendUrl(backendService.getBackendUrl());
    });
  }, []);

  const selectedPersonality = PERSONALITIES.find((p) => p.id === personality)!;

  const handleSave = async () => {
    await Promise.all([
      profileService.save({ name, profession, personality }),
      backendUrl.trim() ? backendService.saveBackendUrl(backendUrl.trim()) : Promise.resolve(),
    ]);
    Alert.alert('Saved', 'Profile updated.');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>PROFILE</Text>
      </View>

      <View style={styles.avatarSection}>
        <Pressable style={[styles.avatar, { borderColor: selectedPersonality.color }]}>
          <Text style={[styles.avatarInitial, { color: selectedPersonality.color }]}>
            {name ? name.charAt(0).toUpperCase() : 'A'}
          </Text>
        </Pressable>
        <View style={styles.avatarInfo}>
          <Text style={styles.avatarName}>{name || 'Your Name'}</Text>
          <Text style={styles.avatarProfession}>{profession || 'Profession'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>IDENTITY</Text>
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.fieldInput}
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor={theme.colors.textTertiary}
            returnKeyType="next"
          />
          <View style={styles.divider} />
          <TextInput
            style={styles.fieldInput}
            value={profession}
            onChangeText={setProfession}
            placeholder="Profession (e.g. Software Engineer)"
            placeholderTextColor={theme.colors.textTertiary}
            returnKeyType="done"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>BACKEND</Text>
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.fieldInput}
            value={backendUrl}
            onChangeText={setBackendUrl}
            placeholder="https://auris-backend.aurisapi.workers.dev"
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
          />
        </View>
        <Text style={styles.sectionSub}>
          Cloudflare Workers URL. Set up backend first, then paste URL here.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>PERSONALITY MODE</Text>
        <Text style={styles.sectionSub}>
          Auris adapts its behavior and tone based on the mode you choose.
        </Text>
        <View style={styles.personalityList}>
          {PERSONALITIES.map((p) => (
            <PersonalityCard
              key={p.id}
              personality={p}
              selected={personality === p.id}
              onSelect={() => setPersonality(p.id)}
            />
          ))}
        </View>
      </View>

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>SAVE</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: 20,
    gap: 24,
  },
  header: {
    paddingBottom: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.gold,
    letterSpacing: 4,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '300',
  },
  avatarInfo: {
    gap: 4,
  },
  avatarName: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '500',
  },
  avatarProfession: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    color: theme.colors.textTertiary,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '600',
  },
  sectionSub: {
    color: theme.colors.textTertiary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
  },
  inputGroup: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 0.5,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  fieldInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  divider: {
    height: 0.5,
    backgroundColor: theme.colors.border,
    marginLeft: 16,
  },
  personalityList: {
    gap: 8,
  },
  personalityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  personalityCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  personalityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalityName: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  personalityDesc: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: `${theme.colors.gold}15`,
    borderWidth: 1,
    borderColor: `${theme.colors.gold}40`,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveText: {
    color: theme.colors.gold,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 3,
  },
});
