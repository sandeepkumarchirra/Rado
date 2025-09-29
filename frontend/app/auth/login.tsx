import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store auth token and user data
        await AsyncStorage.setItem('authToken', data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(data.user));

        Alert.alert('Success', 'Login successful!', [
          {
            text: 'OK',
            onPress: () => router.replace('/map'),
          },
        ]);
      } else {
        Alert.alert('Error', data.detail || 'Login failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue connecting with nearby people
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotLink}>
              <Text style={styles.forgotLinkText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signupLink}
              onPress={() => router.push('/auth/signup')}
            >
              <Text style={styles.signupLinkText}>
                Don't have an account? <Text style={styles.signupLinkBlue}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  button: {
    backgroundColor: '#4a9eff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    minHeight: 56,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  forgotLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotLinkText: {
    color: '#4a9eff',
    fontSize: 16,
    fontWeight: '500',
  },
  signupLink: {
    marginTop: 32,
    alignItems: 'center',
  },
  signupLinkText: {
    color: '#aaa',
    fontSize: 16,
  },
  signupLinkBlue: {
    color: '#4a9eff',
    fontWeight: '500',
  },
});