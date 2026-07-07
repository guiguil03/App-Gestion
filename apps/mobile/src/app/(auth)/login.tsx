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
import { Ionicons } from '@expo/vector-icons';

import { getLoginErrorMessage, useLogin } from '@/api/hooks/useLogin';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useSyncStatus } from '@/features/sync/SyncStatusProvider';
import { initialRouteForRole } from '@/navigation/roleGuard';

export default function LoginScreen() {
  const theme = useTheme();
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
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.hero}>
        <View style={styles.logoBadge}>
          <Ionicons name="school" size={36} color="#ffffff" />
        </View>
        <ThemedText style={styles.appName}>Présence Scolaire</ThemedText>
        <ThemedText style={styles.appSubtitle}>Suivi de présence en temps réel</ThemedText>
      </View>

      <ThemedView type="background" style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.cardTitle}>
          Connexion
        </ThemedText>

        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            Identifiant
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: usernameFocused ? theme.primary : theme.backgroundSelected,
                backgroundColor: theme.backgroundElement,
                color: theme.text,
              },
            ]}
            placeholder="ex. surveillant1"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            onFocus={() => setUsernameFocused(true)}
            onBlur={() => setUsernameFocused(false)}
          />
        </View>

        <View style={styles.field}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
            Mot de passe
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: passwordFocused ? theme.primary : theme.backgroundSelected,
                backgroundColor: theme.backgroundElement,
                color: theme.text,
              },
            ]}
            placeholder="••••••••"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
          />
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: `${theme.danger}1A` }]}>
            <Ionicons name="alert-circle" size={16} color={theme.danger} />
            <ThemedText style={[styles.error, { color: theme.danger }]}>{getLoginErrorMessage(error)}</ThemedText>
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.primary },
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
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
    marginBottom: 4,
  },
  field: {
    gap: 6,
  },
  label: {
    marginLeft: 2,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  error: {
    flex: 1,
    fontSize: 13,
  },
});
