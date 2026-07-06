import { Redirect } from 'expo-router';

// TODO(auth): once token persistence + role are read from secure storage on
// boot, redirect straight to the right role stack for an already-logged-in
// user instead of always going through login.
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
