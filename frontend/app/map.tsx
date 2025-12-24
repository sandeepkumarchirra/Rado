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
  AccessibilityInfo,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import Slider from '@react-native-community/slider';
import { Colors, Typography, Accessibility } from '../constants/Colors';

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

  // Animation for radar sweep
  const sweepAnimation = React.useRef(new Animated.Value(0)).current;

  // Radar dimensions
  const radarSize = Math.min(screenWidth - 40, screenHeight * 0.45);
  const radarCenter = radarSize / 2;

  useEffect(() => {
    initializeScreen();
    startRadarAnimation();
  }, []);

  useEffect(() => {
    if (location && authToken) {
      updateLocationOnServer();
      findNearbyUsers();
    }
  }, [location, radius, authToken]);

  useEffect(() => {
    // Convert nearby users to radar blips with better positioning
    const blips = nearbyUsers.map((user, index) => ({
      id: user.id,
      name: user.name,
      distance_miles: user.distance_miles,
      // More natural positioning with some randomization
      angle: (index * 72 + Math.random() * 45) % 360, // Golden angle distribution
      radius: Math.min((user.distance_miles / radius) * (radarCenter - 60), radarCenter - 60),
      selected: false,
    }));
    setUserBlips(blips);
  }, [nearbyUsers, radius, radarCenter]);

  const startRadarAnimation = () => {
    const animate = () => {
      sweepAnimation.setValue(0);
      Animated.timing(sweepAnimation, {
        toValue: 1,
        duration: 3000, // 3 second sweep
        useNativeDriver: true,
      }).start(() => animate());
    };
    animate();
  };

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
    
    // Provide haptic feedback
    if (Platform.OS === 'ios') {
      // Add haptic feedback if available
    }
    
    // Announce selection for screen readers
    AccessibilityInfo.announceForAccessibility(`Selected user ${blip.name}, ${blip.distance_miles.toFixed(1)} miles away`);
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

  const handleSliderChange = (value: number) => {
    setRadius(value);
    // Announce radius change for accessibility
    AccessibilityInfo.announceForAccessibility(`Scan radius set to ${value.toFixed(1)} miles`);
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
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={initializeScreen}
          accessibilityLabel="Retry getting location"
          accessibilityHint="Attempts to get your current location again"
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Calculate sweep rotation
  const sweepRotation = sweepAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Radar Discovery</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={goToNotifications}
            accessibilityLabel="Notifications"
            accessibilityHint="View your notifications"
          >
            <Ionicons name="notifications-outline" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={goToPreferences}
            accessibilityLabel="Settings"
            accessibilityHint="Open app preferences"
          >
            <Ionicons name="settings-outline" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={goToProfile}
            accessibilityLabel="Profile"
            accessibilityHint="View and edit your profile"
          >
            <Ionicons name="person-outline" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Enhanced Radar Display */}
      <View style={styles.radarContainer}>
        <View style={[styles.radarView, { width: radarSize, height: radarSize }]}>
          
          {/* Enhanced Distance Rings */}
          {[0.25, 0.5, 0.75, 1.0].map((factor, index) => (
            <View
              key={`ring-${index}`}
              style={[
                styles.radarRing,
                {
                  width: (radarSize - 80) * factor,
                  height: (radarSize - 80) * factor,
                  borderRadius: ((radarSize - 80) * factor) / 2,
                  left: radarCenter - ((radarSize - 80) * factor) / 2,
                  top: radarCenter - ((radarSize - 80) * factor) / 2,
                },
              ]}
            />
          ))}

          {/* Animated Radar Sweep */}
          <Animated.View
            style={[
              styles.radarSweep,
              {
                width: radarSize - 80,
                height: radarSize - 80,
                left: 40,
                top: 40,
                transform: [{ rotate: sweepRotation }],
              },
            ]}
            pointerEvents="none"
          />

          {/* Radar Center with pulsing animation */}
          <View style={[styles.centerDot, { left: radarCenter - 8, top: radarCenter - 8 }]} />

          {/* User Blips */}
          <View style={styles.userBlipsContainer}>
            {userBlips.map((blip) => {
              const angleRad = (blip.angle - 90) * Math.PI / 180;
              const x = radarCenter + Math.cos(angleRad) * blip.radius;
              const y = radarCenter + Math.sin(angleRad) * blip.radius;

              return (
                <TouchableOpacity
                  key={blip.id}
                  style={[
                    styles.userBlip,
                    {
                      left: x - 20,
                      top: y - 20,
                    },
                    blip.selected && styles.userBlipSelected,
                  ]}
                  onPress={() => handleUserBlipPress(blip)}
                  accessibilityLabel={`User ${blip.name}`}
                  accessibilityHint={`${blip.distance_miles.toFixed(1)} miles away. Double tap to select for messaging.`}
                  accessibilityRole="button"
                >
                  <Ionicons 
                    name="person" 
                    size={blip.selected ? 20 : 16} 
                    color={Colors.textPrimary} 
                  />
                  {blip.selected && <View style={styles.selectionRing} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Distance Labels */}
          {[0.25, 0.5, 0.75, 1.0].map((factor, index) => (
            <Text
              key={`label-${index}`}
              style={[
                styles.distanceLabel,
                {
                  top: radarCenter - ((radarSize - 80) * factor) / 2 - 12,
                  left: radarCenter + 8,
                },
              ]}
            >
              {(radius * factor).toFixed(1)}mi
            </Text>
          ))}
        </View>

        {/* Refresh Button */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={updating}
          accessibilityLabel="Refresh nearby users"
          accessibilityHint="Searches for nearby users again"
        >
          <Ionicons 
            name="refresh" 
            size={20} 
            color={Colors.textPrimary} 
          />
        </TouchableOpacity>
      </View>

      {/* No Users Message or Selected User Info */}
      {nearbyUsers.length === 0 ? (
        <View style={styles.noUsersContainer}>
          <Ionicons name="search-outline" size={32} color={Colors.textSecondary} />
          <Text style={styles.noUsersTitle}>No users detected</Text>
          <Text style={styles.noUsersMessage}>
            Expand your search radius or try again later to find people nearby.
          </Text>
        </View>
      ) : selectedUser ? (
        <View style={styles.selectedUserInfo}>
          <View style={styles.userInfoContent}>
            <Ionicons name="person" size={20} color={Colors.primary} />
            <Text style={styles.selectedUserName}>{selectedUser.name}</Text>
            <Text style={styles.selectedUserDistance}>
              {selectedUser.distance_miles.toFixed(1)} miles away
            </Text>
          </View>
        </View>
      ) : null}

      {/* Enhanced Controls */}
      <View style={styles.controls}>
        {/* User Count with better styling */}
        <View style={styles.userCount}>
          <Ionicons name="people" size={20} color={Colors.primary} />
          <Text style={styles.userCountText}>
            {nearbyUsers.length} user{nearbyUsers.length !== 1 ? 's' : ''} within {radius.toFixed(1)} miles
          </Text>
        </View>

        {/* Enhanced Radius Slider with accessibility */}
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Scan Radius: {radius.toFixed(1)} miles</Text>
          <Slider
            style={styles.slider}
            value={radius}
            onValueChange={handleSliderChange}
            minimumValue={0.5}
            maximumValue={5.0}
            step={0.1}
            minimumTrackTintColor={Colors.primary}
            maximumTrackTintColor={Colors.radarGrid}
            thumbStyle={styles.sliderThumb}
            accessibilityLabel="Scan radius slider"
            accessibilityHint="Adjust the search radius from 0.5 to 5 miles"
            accessible={true}
          />
          <View style={styles.sliderMarkers}>
            <Text style={styles.sliderMarker}>0.5mi</Text>
            <Text style={styles.sliderMarker}>5.0mi</Text>
          </View>
        </View>

        {/* Enhanced Send Message Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!selectedUser || nearbyUsers.length === 0) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!selectedUser || nearbyUsers.length === 0}
          accessibilityLabel={
            selectedUser 
              ? `Send message to ${selectedUser.name}` 
              : nearbyUsers.length === 0 
                ? "No users available to message"
                : "Select a user to message"
          }
          accessibilityHint={
            selectedUser 
              ? "Opens the message composition screen" 
              : "Button will be enabled when you select a user"
          }
        >
          <Ionicons name="paper-plane" size={20} color={Colors.textPrimary} style={styles.sendIcon} />
          <Text style={styles.sendButtonText}>
            {selectedUser 
              ? 'Send Message' 
              : nearbyUsers.length === 0 
                ? 'No Users Available'
                : 'Select User to Message'
            }
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
  radarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  radarTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  radarSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  radarRings: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  userBlipsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  userBlip: {
    position: 'absolute',
    width: 30,
    height: 30,
    backgroundColor: Colors.primary,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.textPrimary,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  userBlipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
    transform: [{ scale: 1.2 }],
  },
  centerDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: Colors.primary,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.textPrimary,
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