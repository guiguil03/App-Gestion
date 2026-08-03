// apps/mobile/src/app/changer-mot-de-passe.tsx
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { getChangePasswordErrorMessage, useChangePassword } from '@/api/hooks/useChangePassword';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing, withOpacity } from '@/theme/theme';
import { initialRouteForRole } from '@/navigation/roleGuard';

/**
 * Étape obligatoire pour un compte ELEVE/PARENT tout juste provisionné (mot
 * de passe généré par la Direction, affiché une seule fois à l'écran) —
 * volontairement aucun moyen de passer cet écran (pas de bouton retour) tant
 * que le mot de passe n'a pas été changé. Voir User.mustChangePassword.
 */
export default function ChangerMotDePasseScreen() {
  const theme = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { mutate: changePassword, isPending, error } = useChangePassword();

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit =
    currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword && !isPending;

  function handleSubmit() {
    if (!canSubmit) return;
    changePassword(
      { currentPassword, newPassword },
      {
        onSuccess: (response) => {
          router.replace(initialRouteForRole(response.role));
        },
      },
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.hero}>
        <View style={[styles.iconBadge, { backgroundColor: withOpacity(theme.primary, '1A') }]}>
          <Ionicons name="key-outline" size={32} color={theme.primary} />
        </View>
        <ThemedText type="subtitle" style={styles.title}>
          Choisis ton mot de passe
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
          Pour la sécurité de ton compte, tu dois définir un nouveau mot de passe avant de continuer.
        </ThemedText>
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          Mot de passe actuel
        </ThemedText>
        <TextInput
          style={[styles.input, { borderColor: theme.border, backgroundColor: theme.backgroundElement, color: theme.text }]}
          placeholder="Reçu de la part de l'établissement"
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          Nouveau mot de passe (8 caractères minimum)
        </ThemedText>
        <TextInput
          style={[styles.input, { borderColor: theme.border, backgroundColor: theme.backgroundElement, color: theme.text }]}
          placeholder="••••••••"
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
      </View>

      <View style={styles.field}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          Confirme le nouveau mot de passe
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: mismatch ? theme.danger : theme.border,
              backgroundColor: theme.backgroundElement,
              color: theme.text,
            },
          ]}
          placeholder="••••••••"
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        {mismatch && (
          <ThemedText type="small" themeColor="danger">
            Les mots de passe ne correspondent pas.
          </ThemedText>
        )}
      </View>

      {error && (
        <ThemedText type="small" themeColor="danger">
          {getChangePasswordErrorMessage(error)}
        </ThemedText>
      )}

      <Button
        label={isPending ? 'Validation…' : 'Valider'}
        onPress={handleSubmit}
        disabled={!canSubmit}
        loading={isPending}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  field: {
    gap: Spacing.one,
  },
  label: {
    marginLeft: Spacing.half,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 2,
    fontSize: 16,
  },
});
