import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { router } from 'expo-router';

import { useLogin } from '@/api/hooks/useLogin';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { initialRouteForRole } from '@/navigation/roleGuard';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { mutate: login, isPending, error } = useLogin();

  function handleSubmit() {
    login(
      { username, password },
      { onSuccess: (response) => router.replace(initialRouteForRole(response.role)) },
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Présence Scolaire
      </ThemedText>

      <TextInput
        style={styles.input}
        placeholder="Identifiant"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? (
        <ThemedText themeColor="text" style={styles.error}>
          Identifiants incorrects. Réessayez.
        </ThemedText>
      ) : null}

      <Pressable style={styles.button} onPress={handleSubmit} disabled={isPending}>
        {isPending ? <ActivityIndicator color="#ffffff" /> : <ThemedText style={styles.buttonLabel}>Se connecter</ThemedText>}
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#B0B4BA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonLabel: {
    color: '#ffffff',
  },
  error: {
    color: '#D32F2F',
  },
});
