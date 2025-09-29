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
  Image,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  id: string;
  name: string;
  distance_miles: number;
}

export default function SendMessageScreen() {
  const router = useRouter();
  const { nearbyUsers } = useLocalSearchParams();
  const [message, setMessage] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  React.useEffect(() => {
    if (nearbyUsers && typeof nearbyUsers === 'string') {
      try {
        const parsedUsers = JSON.parse(nearbyUsers);
        setUsers(parsedUsers);
      } catch (error) {
        console.error('Failed to parse nearby users:', error);
      }
    }
  }, [nearbyUsers]);

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageBase64(asset.base64 || null);
    }
  };

  const takePhoto = async () => {
    // Request permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera permissions to make this work!');
      return;
    }

    // Take photo
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageBase64(asset.base64 || null);
    }
  };

  const removeImage = () => {
    setImageUri(null);
    setImageBase64(null);
  };

  const showImagePicker = () => {
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const sendMessage = async () => {
    if (!message.trim() && !imageBase64) {
      Alert.alert('Error', 'Please enter a message or add a photo');
      return;
    }

    if (users.length === 0) {
      Alert.alert('Error', 'No users found to send message to');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        router.replace('/auth/login');
        return;
      }

      const recipientIds = users.map(user => user.id);
      
      const response = await fetch(`${BACKEND_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: message.trim(),
          recipient_ids: recipientIds,
          image_data: imageBase64,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success',
          `Message sent to ${users.length} user${users.length !== 1 ? 's' : ''}!`,
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('Error', data.detail || 'Failed to send message');
      }
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
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
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Send Message</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          <View style={styles.content}>
            {/* Recipients */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Sending to {users.length} user{users.length !== 1 ? 's' : ''}:
              </Text>
              <View style={styles.recipientsList}>
                {users.slice(0, 3).map((user) => (
                  <View key={user.id} style={styles.recipient}>
                    <Ionicons name="person" size={16} color="#4a9eff" />
                    <Text style={styles.recipientText}>
                      {user.name} ({user.distance_miles}mi)
                    </Text>
                  </View>
                ))}
                {users.length > 3 && (
                  <Text style={styles.moreRecipients}>
                    +{users.length - 3} more
                  </Text>
                )}
              </View>
            </View>

            {/* Message Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Message</Text>
              <TextInput
                style={styles.messageInput}
                placeholder="Type your message here..."
                placeholderTextColor="#666"
                value={message}
                onChangeText={setMessage}
                multiline={true}
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>
                {message.length}/500
              </Text>
            </View>

            {/* Image Attachment */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Photo (Optional)</Text>
              
              {imageUri ? (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: imageUri }} style={styles.selectedImage} />
                  <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                    <Ionicons name="close-circle" size={24} color="#ff4757" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.addImageButton} onPress={showImagePicker}>
                  <Ionicons name="camera" size={24} color="#666" />
                  <Text style={styles.addImageText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Send Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.sendButton, loading && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={20} color="#fff" style={styles.sendIcon} />
                <Text style={styles.sendButtonText}>Send Message</Text>
              </>
            )}
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
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
  headerPlaceholder: {
    width: 24,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  recipientsList: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
  },
  recipient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  recipientText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 8,
  },
  moreRecipients: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  messageInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#333',
  },
  characterCount: {
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  imageContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  selectedImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addImageButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  addImageText: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  buttonContainer: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
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