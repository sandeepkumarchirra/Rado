import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Slider,
  StatusBar,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

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

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(1.0);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    initializeScreen();
  }, []);

  useEffect(() => {
    if (location && authToken) {
      updateLocationOnServer();
      findNearbyUsers();
    }
  }, [location, radius, authToken]);

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

      // Request location permission
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

  const handleSendMessage = () => {
    if (nearbyUsers.length === 0) {
      Alert.alert('No Users', 'No users found in your selected radius');
      return;
    }

    router.push({
      pathname: '/messages/send',
      params: {
        nearbyUsers: JSON.stringify(nearbyUsers),
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
        <ActivityIndicator size="large" color="#4a9eff" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </SafeAreaView>
    );
  }

  if (!location) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="location-outline" size={48} color="#666" />
        <Text style={styles.errorText}>Location not available</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeScreen}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const radiusInMeters = radius * 1609.34; // Convert miles to meters

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nearby Connect</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton} onPress={goToNotifications}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={goToPreferences}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={goToProfile}>
            <Ionicons name="person-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={location}
          showsUserLocation={true}
          showsMyLocationButton={false}
          loadingEnabled={true}
        >
          {/* Radius Circle */}
          <Circle
            center={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            radius={radiusInMeters}
            strokeColor="rgba(74, 158, 255, 0.5)"
            fillColor="rgba(74, 158, 255, 0.1)"
            strokeWidth={2}
          />

          {/* Nearby Users */}
          {nearbyUsers.map((user) => (
            <Marker
              key={user.id}
              coordinate={{
                latitude: user.latitude,
                longitude: user.longitude,
              }}
              title={user.name}
              description={`${user.distance_miles} miles away`}
            >
              <View style={styles.markerContainer}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Refresh Button */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={updating}
        >
          <Ionicons 
            name="refresh" 
            size={20} 
            color="#fff" 
            style={updating ? styles.rotating : undefined}
          />
        </TouchableOpacity>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* User Count */}
        <View style={styles.userCount}>
          <Ionicons name="people" size={20} color="#4a9eff" />
          <Text style={styles.userCountText}>
            {nearbyUsers.length} user{nearbyUsers.length !== 1 ? 's' : ''} in radius
          </Text>
        </View>

        {/* Radius Slider */}
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Search Radius: {radius.toFixed(1)} miles</Text>
          <Slider
            style={styles.slider}
            value={radius}
            onValueChange={setRadius}
            minimumValue={0.5}
            maximumValue={5.0}
            step={0.1}
            minimumTrackTintColor="#4a9eff"
            maximumTrackTintColor="#333"
            thumbStyle={styles.sliderThumb}
          />
        </View>

        {/* Send Message Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            nearbyUsers.length === 0 && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={nearbyUsers.length === 0}
        >
          <Ionicons name="paper-plane" size={20} color="#fff" style={styles.sendIcon} />
          <Text style={styles.sendButtonText}>
            Send Message
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#666',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4a9eff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#fff',
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
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    backgroundColor: '#4a9eff',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  refreshButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 12,
  },
  rotating: {
    transform: [{ rotate: '360deg' }],
  },
  controls: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  userCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userCountText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#4a9eff',
    width: 20,
    height: 20,
  },
  sendButton: {
    backgroundColor: '#4a9eff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.6,
  },
  sendIcon: {
    marginRight: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});