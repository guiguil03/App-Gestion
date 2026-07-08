// Doit être importé avant tout autre module : @noble/ed25519 (signature des
// QR de session, cf. src/services/sessionSigning.ts) a besoin de
// crypto.getRandomValues, absent de Hermes/React Native sans ce polyfill.
import 'react-native-get-random-values';
import 'expo-router/entry';
