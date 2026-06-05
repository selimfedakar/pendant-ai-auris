import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActionSheetIOS,
  Image,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { PERSONALITIES, PersonalityId, PersonalityMode } from '@/constants/personalities';
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
          <Text style={styles.personalityName}>{personality.name}</Text>
          <Text style={styles.personalityDesc}>{personality.description}</Text>
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
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const isCapturingRef = useRef(false);

  useEffect(() => {
    profileService.load().then((profile) => {
      setName(profile.name);
      setProfession(profile.profession);
      setPersonality(profile.personality as PersonalityId);
      setPhotoUri(profile.photoUri);
    });
  }, []);

  const selectedPersonality = PERSONALITIES.find((p) => p.id === personality)!;

  const handleSave = async () => {
    await profileService.save({ name, profession, personality });
    Alert.alert('Saved', 'Profile updated.');
  };

  const handleAvatarPress = useCallback(() => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: photoUri
          ? ['Cancel', 'Take Photo', 'Remove Photo']
          : ['Cancel', 'Take Photo'],
        cancelButtonIndex: 0,
        destructiveButtonIndex: photoUri ? 2 : undefined,
      },
      async (buttonIndex) => {
        if (buttonIndex === 1) {
          if (!cameraPermission?.granted) {
            const result = await requestCameraPermission();
            if (!result.granted) {
              Alert.alert('Camera access required', 'Enable camera in Settings to set a profile photo.');
              return;
            }
          }
          setShowCamera(true);
        } else if (photoUri && buttonIndex === 2) {
          setPhotoUri(undefined);
          await profileService.clearPhoto();
        }
      },
    );
  }, [photoUri, cameraPermission, requestCameraPermission]);

  const handleTakePhoto = useCallback(async () => {
    if (!cameraRef.current || isCapturingRef.current) return;
    isCapturingRef.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6, skipMetadata: true });
      if (!photo?.base64) return;

      // Save base64 photo to a persistent file in the app's document directory
      const dest = FileSystem.documentDirectory + 'profile_photo.jpg';
      await FileSystem.writeAsStringAsync(dest, photo.base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setPhotoUri(dest);
      await profileService.save({ photoUri: dest });
    } catch {
      // non-fatal
    } finally {
      isCapturingRef.current = false;
      setShowCamera(false);
    }
  }, []);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>PROFILE</Text>
        </View>

        <View style={styles.avatarSection}>
          <Pressable
            style={[styles.avatar, { borderColor: selectedPersonality.color }]}
            onPress={handleAvatarPress}
          >
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={styles.avatarPhoto}
              />
            ) : (
              <Text style={[styles.avatarInitial, { color: selectedPersonality.color }]}>
                {name ? name.charAt(0).toUpperCase() : 'A'}
              </Text>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={10} color="#000" />
            </View>
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

      {/* Camera modal for profile photo */}
      <Modal visible={showCamera} animationType="fade" statusBarTranslucent>
        <View style={styles.cameraModal}>
          <CameraView ref={cameraRef} style={styles.cameraView} facing="front" />
          <Pressable style={styles.cameraClose} onPress={() => setShowCamera(false)}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <Pressable style={styles.captureButton} onPress={handleTakePhoto}>
            <View style={styles.captureButtonInner} />
          </Pressable>
        </View>
      </Modal>
    </>
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
    overflow: 'visible',
  },
  avatarPhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '300',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.background,
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
  // Camera modal
  cameraModal: { flex: 1, backgroundColor: '#000' },
  cameraView: { flex: 1 },
  cameraClose: {
    position: 'absolute', top: 56, right: 24,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  captureButton: {
    position: 'absolute', bottom: 60, alignSelf: 'center',
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  captureButtonInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
});
