import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Colors } from '../../constants/Colors';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

const INTEREST_CATEGORIES = [
  { id: 'restaurants', name: 'Restaurants & Food', icon: 'restaurant' },
  { id: 'schools', name: 'Schools & Education', icon: 'school' },
  { id: 'events', name: 'Local Events', icon: 'calendar' },
  { id: 'sports', name: 'Sports & Fitness', icon: 'fitness' },
  { id: 'music', name: 'Music & Entertainment', icon: 'musical-notes' },
  { id: 'shopping', name: 'Shopping & Markets', icon: 'storefront' },
  { id: 'parks', name: 'Parks & Nature', icon: 'leaf' },
  { id: 'nightlife', name: 'Nightlife & Bars', icon: 'wine' },
  { id: 'art', name: 'Art & Culture', icon: 'brush' },
  { id: 'tech', name: 'Technology', icon: 'laptop' },
  { id: 'travel', name: 'Travel & Tourism', icon: 'airplane' },
  { id: 'health', name: 'Health & Wellness', icon: 'heart' },
];

export default function PreferencesScreen() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
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
        setPreferences(data.preferences || []);
      } else if (response.status === 401) {
        router.replace('/auth/login');
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = (categoryId: string) => {
    setPreferences(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        router.replace('/auth/login');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          preferences: preferences,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Preferences saved successfully!');
      } else if (response.status === 401) {
        router.replace('/auth/login');
      } else {
        Alert.alert('Error', 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferences</Text>
        <TouchableOpacity onPress={savePreferences} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={styles.saveButton}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interest Categories</Text>
          <Text style={styles.sectionSubtitle}>
            Select your interests to personalize notifications and messages
          </Text>
        </View>

        <View style={styles.categoriesContainer}>
          {INTEREST_CATEGORIES.map((category) => {
            const isSelected = preferences.includes(category.id);
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryItem,
                  isSelected && styles.categoryItemSelected,
                ]}
                onPress={() => togglePreference(category.id)}
              >
                <View style={styles.categoryContent}>
                  <Ionicons
                    name={category.icon as any}
                    size={24}
                    color={isSelected ? Colors.primary : Colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      isSelected && styles.categoryTextSelected,
                    ]}
                  >
                    {category.name}
                  </Text>
                </View>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={isSelected ? Colors.primary : Colors.textTertiary}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Selected: {preferences.length} categor{preferences.length !== 1 ? 'ies' : 'y'}
          </Text>
          <Text style={styles.footerSubtext}>
            Your preferences help us personalize your experience and connect you with like-minded people nearby.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceElevated,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginLeft: 12,
  },
  categoryTextSelected: {
    color: Colors.textPrimary,
  },
  footer: {
    padding: 16,
    paddingTop: 24,
  },
  footerText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  footerSubtext: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});