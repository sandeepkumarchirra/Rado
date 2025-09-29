#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Nearby Connect App
Tests all authentication, location, and messaging endpoints
"""

import requests
import json
import time
import random
from datetime import datetime

# Configuration
BASE_URL = "https://radius-chat.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class NearbyConnectTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS.copy()
        self.test_users = []
        self.auth_tokens = {}
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
    
    def log_result(self, test_name, success, message="", response=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if response and not success:
            print(f"   Response: {response.status_code} - {response.text}")
        
        if success:
            self.test_results["passed"] += 1
        else:
            self.test_results["failed"] += 1
            self.test_results["errors"].append({
                "test": test_name,
                "message": message,
                "response": response.text if response else None
            })
        print()
    
    def test_user_signup(self):
        """Test user registration endpoint"""
        print("🔐 Testing Authentication System...")
        
        # Test valid signup
        test_user = {
            "name": "Alice Johnson",
            "email": f"alice.test.{int(time.time())}@example.com",
            "phone": "+1234567890"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/signup", json=test_user, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                if "user_id" in data and "verification_code" in data:
                    self.test_users.append({
                        "user_data": test_user,
                        "user_id": data["user_id"],
                        "verification_code": data["verification_code"]
                    })
                    self.log_result("User Signup", True, f"User created with ID: {data['user_id']}")
                else:
                    self.log_result("User Signup", False, "Missing user_id or verification_code in response", response)
            else:
                self.log_result("User Signup", False, f"Unexpected status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("User Signup", False, f"Exception: {str(e)}")
    
    def test_invalid_signup(self):
        """Test signup with invalid data"""
        # Test invalid email
        invalid_user = {
            "name": "Invalid User",
            "email": "invalid-email",
            "phone": "+1234567890"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/signup", json=invalid_user, headers=self.headers)
            if response.status_code == 422:  # Validation error
                self.log_result("Invalid Email Validation", True, "Correctly rejected invalid email")
            else:
                self.log_result("Invalid Email Validation", False, f"Should reject invalid email, got {response.status_code}", response)
        except Exception as e:
            self.log_result("Invalid Email Validation", False, f"Exception: {str(e)}")
    
    def test_user_verification(self):
        """Test user verification endpoint"""
        if not self.test_users:
            self.log_result("User Verification", False, "No test users available for verification")
            return
        
        user = self.test_users[0]
        verification_data = {
            "user_id": user["user_id"],
            "verification_code": user["verification_code"]
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/verify", json=verification_data, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.auth_tokens[user["user_id"]] = data["token"]
                    self.log_result("User Verification", True, f"User verified successfully, token received")
                else:
                    self.log_result("User Verification", False, "Missing token or user data in response", response)
            else:
                self.log_result("User Verification", False, f"Verification failed with status: {response.status_code}", response)
        except Exception as e:
            self.log_result("User Verification", False, f"Exception: {str(e)}")
    
    def test_invalid_verification(self):
        """Test verification with invalid code"""
        if not self.test_users:
            return
        
        user = self.test_users[0]
        invalid_verification = {
            "user_id": user["user_id"],
            "verification_code": "000000"  # Invalid code
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/verify", json=invalid_verification, headers=self.headers)
            if response.status_code == 400:
                self.log_result("Invalid Verification Code", True, "Correctly rejected invalid verification code")
            else:
                self.log_result("Invalid Verification Code", False, f"Should reject invalid code, got {response.status_code}", response)
        except Exception as e:
            self.log_result("Invalid Verification Code", False, f"Exception: {str(e)}")
    
    def test_user_login(self):
        """Test user login endpoint"""
        if not self.test_users:
            self.log_result("User Login", False, "No verified users available for login")
            return
        
        user = self.test_users[0]
        login_data = {
            "email": user["user_data"]["email"]
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", json=login_data, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.auth_tokens[user["user_id"]] = data["token"]
                    self.log_result("User Login", True, "Login successful, token received")
                else:
                    self.log_result("User Login", False, "Missing token or user data in response", response)
            else:
                self.log_result("User Login", False, f"Login failed with status: {response.status_code}", response)
        except Exception as e:
            self.log_result("User Login", False, f"Exception: {str(e)}")
    
    def test_profile_access(self):
        """Test protected profile endpoint"""
        if not self.auth_tokens:
            self.log_result("Profile Access", False, "No auth tokens available")
            return
        
        user_id = list(self.auth_tokens.keys())[0]
        token = self.auth_tokens[user_id]
        auth_headers = self.headers.copy()
        auth_headers["Authorization"] = f"Bearer {token}"
        
        try:
            response = requests.get(f"{self.base_url}/profile", headers=auth_headers)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "name" in data and "email" in data:
                    self.log_result("Profile Access", True, f"Profile retrieved for user: {data['name']}")
                else:
                    self.log_result("Profile Access", False, "Missing required profile fields", response)
            else:
                self.log_result("Profile Access", False, f"Profile access failed with status: {response.status_code}", response)
        except Exception as e:
            self.log_result("Profile Access", False, f"Exception: {str(e)}")
    
    def test_profile_update(self):
        """Test profile update endpoint"""
        if not self.auth_tokens:
            self.log_result("Profile Update", False, "No auth tokens available")
            return
        
        user_id = list(self.auth_tokens.keys())[0]
        token = self.auth_tokens[user_id]
        auth_headers = self.headers.copy()
        auth_headers["Authorization"] = f"Bearer {token}"
        
        update_data = {
            "preferences": ["hiking", "photography", "coffee"],
            "profile_image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
        }
        
        try:
            response = requests.put(f"{self.base_url}/profile", json=update_data, headers=auth_headers)
            
            if response.status_code == 200:
                self.log_result("Profile Update", True, "Profile updated successfully")
            else:
                self.log_result("Profile Update", False, f"Profile update failed with status: {response.status_code}", response)
        except Exception as e:
            self.log_result("Profile Update", False, f"Exception: {str(e)}")
    
    def test_unauthorized_access(self):
        """Test accessing protected endpoints without token"""
        try:
            response = requests.get(f"{self.base_url}/profile", headers=self.headers)
            if response.status_code == 401 or response.status_code == 403:
                self.log_result("Unauthorized Access Protection", True, "Correctly blocked unauthorized access")
            else:
                self.log_result("Unauthorized Access Protection", False, f"Should block unauthorized access, got {response.status_code}", response)
        except Exception as e:
            self.log_result("Unauthorized Access Protection", False, f"Exception: {str(e)}")
    
    def test_location_update(self):
        """Test location update endpoint"""
        print("📍 Testing Location Services...")
        
        if not self.auth_tokens:
            self.log_result("Location Update", False, "No auth tokens available")
            return
        
        user_id = list(self.auth_tokens.keys())[0]
        token = self.auth_tokens[user_id]
        auth_headers = self.headers.copy()
        auth_headers["Authorization"] = f"Bearer {token}"
        
        location_data = {
            "latitude": 37.7749,  # San Francisco coordinates
            "longitude": -122.4194,
            "user_id": user_id
        }
        
        try:
            response = requests.post(f"{self.base_url}/location", json=location_data, headers=auth_headers)
            
            if response.status_code == 200:
                self.log_result("Location Update", True, "Location updated successfully")
            else:
                self.log_result("Location Update", False, f"Location update failed with status: {response.status_code}", response)
        except Exception as e:
            self.log_result("Location Update", False, f"Exception: {str(e)}")
    
    def test_invalid_location(self):
        """Test location update with invalid coordinates"""
        if not self.auth_tokens:
            return
        
        user_id = list(self.auth_tokens.keys())[0]
        token = self.auth_tokens[user_id]
        auth_headers = self.headers.copy()
        auth_headers["Authorization"] = f"Bearer {token}"
        
        invalid_location = {
            "latitude": 200,  # Invalid latitude
            "longitude": -122.4194,
            "user_id": user_id
        }
        
        try:
            response = requests.post(f"{self.base_url}/location", json=invalid_location, headers=auth_headers)
            if response.status_code == 422:  # Validation error
                self.log_result("Invalid Location Validation", True, "Correctly rejected invalid coordinates")
            else:
                self.log_result("Invalid Location Validation", False, f"Should reject invalid coordinates, got {response.status_code}", response)
        except Exception as e:
            self.log_result("Invalid Location Validation", False, f"Exception: {str(e)}")
    
    def create_second_user(self):
        """Create a second user for nearby users testing"""
        test_user2 = {
            "name": "Bob Smith",
            "email": f"bob.test.{int(time.time())}@example.com",
            "phone": "+1987654321"
        }
        
        try:
            # Signup
            response = requests.post(f"{self.base_url}/auth/signup", json=test_user2, headers=self.headers)
            if response.status_code == 200:
                data = response.json()
                user_info = {
                    "user_data": test_user2,
                    "user_id": data["user_id"],
                    "verification_code": data["verification_code"]
                }
                
                # Verify
                verification_data = {
                    "user_id": user_info["user_id"],
                    "verification_code": user_info["verification_code"]
                }
                verify_response = requests.post(f"{self.base_url}/auth/verify", json=verification_data, headers=self.headers)
                
                if verify_response.status_code == 200:
                    verify_data = verify_response.json()
                    self.auth_tokens[user_info["user_id"]] = verify_data["token"]
                    self.test_users.append(user_info)
                    
                    # Update location for second user (nearby to first user)
                    auth_headers = self.headers.copy()
                    auth_headers["Authorization"] = f"Bearer {verify_data['token']}"
                    
                    location_data = {
                        "latitude": 37.7849,  # Close to first user
                        "longitude": -122.4094,
                        "user_id": user_info["user_id"]
                    }
                    
                    requests.post(f"{self.base_url}/location", json=location_data, headers=auth_headers)
                    return True
        except Exception as e:
            print(f"Error creating second user: {str(e)}")
        
        return False
    
    def test_nearby_users(self):
        """Test nearby users search"""
        if len(self.auth_tokens) < 2:
            # Create second user
            if not self.create_second_user():
                self.log_result("Nearby Users Search", False, "Could not create second user for testing")
                return
        
        user_id = list(self.auth_tokens.keys())[0]
        token = self.auth_tokens[user_id]
        auth_headers = self.headers.copy()
        auth_headers["Authorization"] = f"Bearer {token}"
        
        nearby_request = {
            "latitude": 37.7749,
            "longitude": -122.4194,
            "radius_miles": 2.0
        }
        
        try:
            response = requests.post(f"{self.base_url}/users/nearby", json=nearby_request, headers=auth_headers)
            
            if response.status_code == 200:
                data = response.json()
                if "nearby_users" in data:
                    nearby_count = len(data["nearby_users"])
                    self.log_result("Nearby Users Search", True, f"Found {nearby_count} nearby users")
                else:
                    self.log_result("Nearby Users Search", False, "Missing nearby_users in response", response)
            else:
                self.log_result("Nearby Users Search", False, f"Nearby users search failed with status: {response.status_code}", response)
        except Exception as e:
            self.log_result("Nearby Users Search", False, f"Exception: {str(e)}")
    
    def test_messaging(self):
        """Test messaging system"""
        print("💬 Testing Messaging System...")
        
        if len(self.auth_tokens) < 2:
            self.log_result("Send Message", False, "Need at least 2 users for messaging test")
            return
        
        user_ids = list(self.auth_tokens.keys())
        sender_id = user_ids[0]
        recipient_id = user_ids[1]
        
        token = self.auth_tokens[sender_id]
        auth_headers = self.headers.copy()
        auth_headers["Authorization"] = f"Bearer {token}"
        
        message_data = {
            "content": "Hello! This is a test message from the API test suite.",
            "recipient_ids": [recipient_id]
        }
        
        try:
            response = requests.post(f"{self.base_url}/messages", json=message_data, headers=auth_headers)
            
            if response.status_code == 200:
                data = response.json()
                if "message_id" in data:
                    self.log_result("Send Message", True, f"Message sent successfully with ID: {data['message_id']}")
                else:
                    self.log_result("Send Message", False, "Missing message_id in response", response)
            else:
                self.log_result("Send Message", False, f"Send message failed with status: {response.status_code}", response)
        except Exception as e:
            self.log_result("Send Message", False, f"Exception: {str(e)}")
    
    def test_message_with_image(self):
        """Test sending message with base64 image"""
        if len(self.auth_tokens) < 2:
            return
        
        user_ids = list(self.auth_tokens.keys())
        sender_id = user_ids[0]
        recipient_id = user_ids[1]
        
        token = self.auth_tokens[sender_id]
        auth_headers = self.headers.copy()
        auth_headers["Authorization"] = f"Bearer {token}"
        
        # Small base64 encoded test image
        test_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        message_data = {
            "content": "Test message with image",
            "recipient_ids": [recipient_id],
            "image_data": test_image
        }
        
        try:
            response = requests.post(f"{self.base_url}/messages", json=message_data, headers=auth_headers)
            
            if response.status_code == 200:
                self.log_result("Send Message with Image", True, "Message with image sent successfully")
            else:
                self.log_result("Send Message with Image", False, f"Send message with image failed with status: {response.status_code}", response)
        except Exception as e:
            self.log_result("Send Message with Image", False, f"Exception: {str(e)}")
    
    def test_get_messages(self):
        """Test retrieving messages"""
        if not self.auth_tokens:
            self.log_result("Get Messages", False, "No auth tokens available")
            return
        
        user_id = list(self.auth_tokens.keys())[0]
        token = self.auth_tokens[user_id]
        auth_headers = self.headers.copy()
        auth_headers["Authorization"] = f"Bearer {token}"
        
        try:
            response = requests.get(f"{self.base_url}/messages", headers=auth_headers)
            
            if response.status_code == 200:
                data = response.json()
                if "messages" in data:
                    message_count = len(data["messages"])
                    self.log_result("Get Messages", True, f"Retrieved {message_count} messages")
                else:
                    self.log_result("Get Messages", False, "Missing messages in response", response)
            else:
                self.log_result("Get Messages", False, f"Get messages failed with status: {response.status_code}", response)
        except Exception as e:
            self.log_result("Get Messages", False, f"Exception: {str(e)}")
    
    def test_preferences_update(self):
        """Test user preferences update"""
        if not self.auth_tokens:
            self.log_result("Update Preferences", False, "No auth tokens available")
            return
        
        user_id = list(self.auth_tokens.keys())[0]
        token = self.auth_tokens[user_id]
        auth_headers = self.headers.copy()
        auth_headers["Authorization"] = f"Bearer {token}"
        
        preferences_data = {
            "preferences": ["music", "travel", "technology", "fitness"]
        }
        
        try:
            response = requests.put(f"{self.base_url}/preferences", json=preferences_data, headers=auth_headers)
            
            if response.status_code == 200:
                self.log_result("Update Preferences", True, "Preferences updated successfully")
            else:
                self.log_result("Update Preferences", False, f"Update preferences failed with status: {response.status_code}", response)
        except Exception as e:
            self.log_result("Update Preferences", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Nearby Connect Backend API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication Tests
        self.test_user_signup()
        self.test_invalid_signup()
        self.test_user_verification()
        self.test_invalid_verification()
        self.test_user_login()
        self.test_profile_access()
        self.test_profile_update()
        self.test_unauthorized_access()
        
        # Location Tests
        self.test_location_update()
        self.test_invalid_location()
        self.test_nearby_users()
        
        # Messaging Tests
        self.test_messaging()
        self.test_message_with_image()
        self.test_get_messages()
        
        # Preferences Tests
        self.test_preferences_update()
        
        # Summary
        print("=" * 60)
        print("🏁 TEST SUMMARY")
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        print(f"📊 Success Rate: {(self.test_results['passed'] / (self.test_results['passed'] + self.test_results['failed']) * 100):.1f}%")
        
        if self.test_results['errors']:
            print("\n🔍 FAILED TESTS DETAILS:")
            for error in self.test_results['errors']:
                print(f"- {error['test']}: {error['message']}")
        
        return self.test_results

if __name__ == "__main__":
    tester = NearbyConnectTester()
    results = tester.run_all_tests()