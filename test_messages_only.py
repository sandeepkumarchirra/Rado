#!/usr/bin/env python3
"""
Quick test for messages endpoint only
"""

import requests
import json
import time

BASE_URL = "https://radius-chat.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

def test_messages_endpoint():
    # First create a user and get token
    test_user = {
        "name": "Test User",
        "email": f"test.{int(time.time())}@example.com",
        "phone": "+1234567890"
    }
    
    # Signup
    response = requests.post(f"{BASE_URL}/auth/signup", json=test_user, headers=HEADERS)
    if response.status_code != 200:
        print(f"Signup failed: {response.text}")
        return
    
    signup_data = response.json()
    
    # Verify
    verification_data = {
        "user_id": signup_data["user_id"],
        "verification_code": signup_data["verification_code"]
    }
    
    response = requests.post(f"{BASE_URL}/auth/verify", json=verification_data, headers=HEADERS)
    if response.status_code != 200:
        print(f"Verification failed: {response.text}")
        return
    
    verify_data = response.json()
    token = verify_data["token"]
    
    # Test get messages
    auth_headers = HEADERS.copy()
    auth_headers["Authorization"] = f"Bearer {token}"
    
    response = requests.get(f"{BASE_URL}/messages", headers=auth_headers)
    print(f"Get Messages Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Success: Retrieved {len(data.get('messages', []))} messages")
    else:
        print(f"❌ Failed: {response.text}")

if __name__ == "__main__":
    test_messages_endpoint()