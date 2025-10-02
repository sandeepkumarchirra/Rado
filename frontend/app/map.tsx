import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import Slider from '@react-native-community/slider';
import { Colors } from '../constants/Colors';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface User {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance_miles: number;
  last_active: string;
}

interface UserLocation {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface UserBlip {
  id: string;
  name: string;
  distance_miles: number;
  angle: number;
  radius: number;
  selected: boolean;
}

export default function RadarScreen() {
  const router = useRouter();
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
  const [userBlips, setUserBlips] = useState<UserBlip[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserBlip | null>(null);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(1.0);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Radar dimensions
  const radarSize = Math.min(screenWidth - 40, screenHeight * 0.4);
  const radarCenter = radarSize / 2;

  useEffect(() => {
    initializeScreen();
  }, []);

  useEffect(() => {
    if (location && authToken) {
      updateLocationOnServer();
      findNearbyUsers();
    }
  }, [location, radius, authToken]);

  useEffect(() => {
    // Convert nearby users to radar blips
    const blips = nearbyUsers.map((user, index) => ({
      id: user.id,
      name: user.name,
      distance_miles: user.distance_miles,
      // Position users based on distance from center
      angle: (index * 45 + Math.random() * 30) % 360, // Distribute around circle with some randomness
      radius: (user.distance_miles / radius) * (radarCenter - 40), // Scale to radar size
      selected: false,
    }));
    setUserBlips(blips);
  }, [nearbyUsers, radius, radarCenter]);

  const initializeScreen = async () => {
    try {
      // Check authentication
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Please login first', [
          { text: 'OK', onPress: () => router.replace('/auth/login') }
        ]);
        return;
      }
      setAuthToken(token);

      // For web, skip location request
      if (Platform.OS === 'web') {
        // Mock location for web demo
        const userLocation = {
          latitude: 37.7749,  // San Francisco default
          longitude: -122.4194,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setLocation(userLocation);
        setLoading(false);
        return;
      }

      // Request location permission for mobile
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Location permission is required to use this app');
        return;
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const userLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setLocation(userLocation);
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateLocationOnServer = async () => {
    if (!location || !authToken) return;

    try {
      await fetch(`${BACKEND_URL}/api/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      });
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const findNearbyUsers = async () => {
    if (!location || !authToken) return;

    setUpdating(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/nearby`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          radius_miles: radius,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setNearbyUsers(data.nearby_users || []);
      } else {
        console.error('Failed to get nearby users:', data.detail);
      }
    } catch (error) {
      console.error('Network error:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleUserBlipPress = (blip: UserBlip) => {
    setSelectedUser(blip);
    // Update the blips array to show selection
    setUserBlips(prev => prev.map(b => ({ ...b, selected: b.id === blip.id })));
  };

  const handleSendMessage = () => {
    if (!selectedUser) {
      Alert.alert('No User Selected', 'Please select a user from the radar to send a message');
      return;
    }

    // Find the full user data
    const fullUserData = nearbyUsers.filter(user => user.id === selectedUser.id);

    router.push({
      pathname: '/messages/send',
      params: {
        nearbyUsers: JSON.stringify(fullUserData),
      },
    });
  };

  const handleRefresh = () => {
    if (location && authToken) {
      findNearbyUsers();
    }
  };

  const goToProfile = () => {
    router.push('/profile/settings');
  };

  const goToPreferences = () => {
    router.push('/profile/preferences');
  };

  const goToNotifications = () => {
    router.push('/notifications');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Initializing radar...</Text>
      </SafeAreaView>
    );
  }

  if (!location) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="location-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.errorText}>Location not available</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeScreen}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Radar Discovery</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton} onPress={goToNotifications}>
            <Ionicons name="notifications-outline" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={goToPreferences}>
            <Ionicons name="settings-outline" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={goToProfile}>
            <Ionicons name="person-outline" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Simplified Radar Display */}
      <View style={styles.radarContainer}>
        <View style={[styles.radarView, { width: radarSize, height: radarSize }]}>
          {/* Radar Background */}
          <View style={styles.radarBackground}>
            <Ionicons name="radio" size={64} color={Colors.primary} />
            <Text style={styles.radarTitle}>Radar Active</Text>
            <Text style={styles.radarSubtitle}>
              Scanning {radius.toFixed(1)} mile radius
            </Text>
          </View>

          {/* Distance Rings Visual */}
          <View style={styles.radarRings}>
            {[0.25, 0.5, 0.75, 1.0].map((factor, index) => (
              <View
                key={index}
                style={[
                  styles.radarRing,
                  {
                    width: (radarSize - 40) * factor,
                    height: (radarSize - 40) * factor,
                    borderRadius: ((radarSize - 40) * factor) / 2,
                  },
                ]}
              />
            ))}
          </View>

          {/* User Blips */}
          <View style={styles.userBlipsContainer}>
            {userBlips.map((blip, index) => {
              const angleRad = (blip.angle - 90) * Math.PI / 180;
              const x = radarCenter + Math.cos(angleRad) * Math.min(blip.radius, radarCenter - 40);
              const y = radarCenter + Math.sin(angleRad) * Math.min(blip.radius, radarCenter - 40);

              return (
                <TouchableOpacity
                  key={blip.id}
                  style={[
                    styles.userBlip,
                    {
                      left: x - 15,
                      top: y - 15,
                    },
                    blip.selected && styles.userBlipSelected,
                  ]}
                  onPress={() => handleUserBlipPress(blip)}
                >
                  <Ionicons 
                    name="person" 
                    size={blip.selected ? 20 : 16} 
                    color={Colors.textPrimary} 
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Center Dot */}
          <View style={[styles.centerDot, { left: radarCenter - 6, top: radarCenter - 6 }]} />
        </View>

        {/* Refresh Button */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={updating}
        >
          <Ionicons 
            name="refresh" 
            size={20} 
            color={Colors.textPrimary} 
          />
        </TouchableOpacity>
      </View>

      {/* Selected User Info */}
      {selectedUser && (
        <View style={styles.selectedUserInfo}>
          <View style={styles.userInfoContent}>
            <Ionicons name="person" size={20} color={Colors.primary} />
            <Text style={styles.selectedUserName}>{selectedUser.name}</Text>
            <Text style={styles.selectedUserDistance}>
              {selectedUser.distance_miles.toFixed(1)} miles away
            </Text>
          </View>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {/* User Count */}
        <View style={styles.userCount}>
          <Ionicons name="people" size={20} color={Colors.primary} />
          <Text style={styles.userCountText}>
            {nearbyUsers.length} user{nearbyUsers.length !== 1 ? 's' : ''} within {radius.toFixed(1)} miles
          </Text>
        </View>

        {/* Radius Slider */}
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Scan Radius: {radius.toFixed(1)} miles</Text>
          <Slider
            style={styles.slider}
            value={radius}
            onValueChange={setRadius}
            minimumValue={0.5}
            maximumValue={5.0}
            step={0.1}
            minimumTrackTintColor={Colors.primary}
            maximumTrackTintColor={Colors.border}
            thumbStyle={styles.sliderThumb}
          />
        </View>

        {/* Send Message Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            !selectedUser && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!selectedUser}
        >
          <Ionicons name="paper-plane" size={20} color={Colors.textPrimary} style={styles.sendIcon} />
          <Text style={styles.sendButtonText}>
            {selectedUser ? 'Send Message' : 'Select User to Message'}
          </Text>
        </TouchableOpacity>
      </View>
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
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: Colors.textTertiary,
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 16,
    padding: 4,
  },
  radarContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingTop: 20,
  },
  radarView: {
    position: 'relative',
    backgroundColor: Colors.surface,
    borderRadius: 999,
    elevation: 8,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  radarSvg: {
    backgroundColor: 'transparent',
  },
  distanceLabels: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  distanceLabel: {
    position: 'absolute',
    color: Colors.textTertiary,
    fontSize: 10,
    fontWeight: '500',
  },
  refreshButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20,
    padding: 12,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  selectedUserInfo: {
    backgroundColor: Colors.surfaceElevated,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  userInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedUserName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  selectedUserDistance: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  controls: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  userCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userCountText: {
    color: Colors.textPrimary,
    fontSize: 16,
    marginLeft: 8,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: Colors.primary,
    width: 20,
    height: 20,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.buttonDisabled,
    opacity: 0.6,
  },
  sendIcon: {
    marginRight: 8,
  },
  sendButtonText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
});