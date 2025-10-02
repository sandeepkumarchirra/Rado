import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Colors } from '../../constants/Colors';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  preferences: string[];
}

export default function SettingsScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/auth/login');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData({
          name: data.name,
          email: data.email,
          phone: data.phone,
        });
      } else if (response.status === 401) {
        router.replace('/auth/login');
      } else {
        Alert.alert('Error', 'Failed to load profile');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/auth/login');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Update local storage
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const user = JSON.parse(userData);
          const updatedUser = { ...user, ...formData };
          await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        }

        Alert.alert('Success', 'Profile updated successfully!');
        setProfile(prev => prev ? { ...prev, ...formData } : null);
      } else if (response.status === 401) {
        router.replace('/auth/login');
      } else {
        const data = await response.json();
        Alert.alert('Error', data.detail || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['authToken', 'userData']);
            router.replace('/');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile & Settings</Text>
          <TouchableOpacity onPress={updateProfile} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.saveButton}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile Information</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor={Colors.textTertiary}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={Colors.textTertiary}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                placeholderTextColor={Colors.textTertiary}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>
            
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/profile/preferences')}
            >
              <View style={styles.settingContent}>
                <Ionicons name="heart" size={20} color={Colors.primary} />
                <Text style={styles.settingText}>Preferences</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push('/notifications')}
            >
              <View style={styles.settingContent}>
                <Ionicons name="notifications" size={20} color={Colors.primary} />
                <Text style={styles.settingText}>Notifications</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>User ID</Text>
              <Text style={styles.accountValue}>{profile?.id}</Text>
            </View>

            <View style={styles.accountInfo}>
              <Text style={styles.accountLabel}>Selected Interests</Text>
              <Text style={styles.accountValue}>
                {profile?.preferences?.length || 0} categories
              </Text>
            </View>
          </View>

          {/* Logout Section */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out" size={20} color={Colors.error} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Nearby Connect v1.0.0
            </Text>
            <Text style={styles.footerSubtext}>
              Connect with people around you
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textPrimary,
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: 8,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    color: Colors.textPrimary,
    fontSize: 16,
    marginLeft: 12,
  },
  accountInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  accountLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  accountValue: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  logoutText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textTertiary,
    fontSize: 14,
    fontWeight: '500',
  },
  footerSubtext: {
    color: Colors.textTertiary,
    fontSize: 12,
    marginTop: 4,
  },
});