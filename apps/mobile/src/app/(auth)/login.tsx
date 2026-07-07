import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { getLoginErrorMessage, useLogin } from '@/api/hooks/useLogin';
import { ThemedText } from '@/components/themed-text';
import { useSyncStatus } from '@/features/sync/SyncStatusProvider';
import { initialRouteForRole } from '@/navigation/roleGuard';

const BRAND_COLOR = '#208AEF';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const { mutate: login, isPending, error } = useLogin();
  const { triggerSync } = useSyncStatus();

  const canSubmit = username.trim().length > 0 && password.length > 0 && !isPending;

  function handleSubmit() {
    if (!canSubmit) return;
    login(
      { username, password },
      {
        onSuccess: (response) => {
          // Peuple un appareil neuf (élèves/classes) avant le premier scan.
          triggerSync();
          router.replace(initialRouteForRole(response.role));
        },
      },
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.hero}>
        <View style={styles.logoBadge}>
          <ThemedText style={styles.logoEmoji}>🏫</ThemedText>
        </View>
        <ThemedText style={styles.appName}>Présence Scolaire</ThemedText>
        <ThemedText style={styles.appSubtitle}>Suivi de présence en temps réel</ThemedText>
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>Connexion</ThemedText>

        <View style={styles.field}>
          <ThemedText type="small" style={styles.label}>
            Identifiant
          </ThemedText>
          <TextInput
            style={[styles.input, usernameFocused && styles.inputFocused]}
            placeholder="ex. surveillant1"
            placeholderTextColor="#9AA0A8"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            onFocus={() => setUsernameFocused(true)}
            onBlur={() => setUsernameFocused(false)}
          />
        </View>

        <View style={styles.field}>
          <ThemedText type="small" style={styles.label}>
            Mot de passe
          </ThemedText>
          <TextInput
            style={[styles.input, passwordFocused && styles.inputFocused]}
            placeholder="••••••••"
            placeholderTextColor="#9AA0A8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
          />
        </View>

        {error ? <ThemedText style={styles.error}>{getLoginErrorMessage(error)}</ThemedText> : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            !canSubmit && styles.buttonDisabled,
            pressed && canSubmit && styles.buttonPressed,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {isPending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText style={styles.buttonLabel}>Se connecter</ThemedText>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND_COLOR,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 24,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoEmoji: {
    fontSize: 36,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  appSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  card: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#9AA0A8',
    marginBottom: 4,
  },
  field: {
    gap: 6,
  },
  label: {
    marginLeft: 2,
    color: '#6B7280',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F7F8FA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111318',
  },
  inputFocused: {
    borderColor: BRAND_COLOR,
    backgroundColor: '#ffffff',
  },
  button: {
    backgroundColor: BRAND_COLOR,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    backgroundColor: '#B7D9F8',
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#D32F2F',
    fontSize: 13,
  },
});
