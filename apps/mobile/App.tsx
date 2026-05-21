import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { athletiqColors } from '@athletiq/ui';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>ATHLETIQ</Text>
      <Text style={styles.title}>Track the Rise. Train the Future.</Text>
      <Text style={styles.body}>Verified athlete identity for school sports.</Text>
      <StatusBar barStyle="dark-content" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: athletiqColors.background,
  },
  eyebrow: {
    color: athletiqColors.green,
    fontWeight: '700',
    marginBottom: 12,
  },
  title: {
    color: athletiqColors.navy,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    marginBottom: 12,
  },
  body: {
    color: athletiqColors.muted,
    fontSize: 17,
    lineHeight: 25,
  },
});
