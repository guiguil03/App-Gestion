import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { getLoginErrorMessage, useLogin } from '@/api/hooks/useLogin';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Elevation, Radius, Spacing, withOpacity } from '@/theme/theme';
import { useSyncStatus } from '@/features/sync/SyncStatusProvider';
import { resolveDestination } from '@/navigation/roleGuard';

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
          router.replace(resolveDestination(response));
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

      <ThemedView type="backgroundElement" style={styles.card}>
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
                borderColor: usernameFocused ? theme.active : theme.border,
                backgroundColor: theme.background,
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
                borderColor: passwordFocused ? theme.active : theme.border,
                backgroundColor: theme.background,
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
          <View style={[styles.errorBox, { backgroundColor: withOpacity(theme.danger, '1A') }]}>
            <Ionicons name="alert-circle" size={16} color={theme.danger} />
            <ThemedText style={[styles.error, { color: theme.danger }]}>{getLoginErrorMessage(error)}</ThemedText>
          </View>
        ) : null}

        <Button label="Se connecter" onPress={handleSubmit} disabled={!canSubmit} loading={isPending} />
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
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
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
    borderTopLeftRadius: Radius.xlarge,
    borderTopRightRadius: Radius.xlarge,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four + 4,
    paddingBottom: Spacing.five + 8,
    gap: Spacing.three,
    ...Elevation.level2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.one,
  },
  field: {
    gap: Spacing.one + 2,
  },
  label: {
    marginLeft: Spacing.half,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.small + 2,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  error: {
    flex: 1,
    fontSize: 13,
  },
});
