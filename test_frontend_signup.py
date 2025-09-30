#!/usr/bin/env python3
"""
Test Frontend Signup Flow - Simulate exact frontend behavior
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "https://radius-chat.preview.emergentagent.com/api"

def test_frontend_signup_flow():
    """Test the exact signup flow as the frontend would do it"""
    print("🔍 TESTING FRONTEND SIGNUP FLOW")
    print("=" * 60)
    
    # Generate unique email to avoid "User already exists" error
    timestamp = int(time.time())
    test_data = {
        "name": "Test User",
        "email": f"test.user.{timestamp}@example.com",
        "phone": "1234567890"
    }
    
    print(f"Testing with fresh email: {test_data['email']}")
    print(f"Payload: {json.dumps(test_data, indent=2)}")
    
    # Simulate exact frontend request
    headers = {
        'Content-Type': 'application/json',
    }
    
    try:
        print(f"\nSending POST request to: {BASE_URL}/auth/signup")
        response = requests.post(
            f"{BASE_URL}/auth/signup",
            json=test_data,
            headers=headers,
            timeout=10
        )
        
        print(f"Response Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        try:
            response_json = response.json()
            print(f"Response Body: {json.dumps(response_json, indent=2)}")
        except:
            print(f"Response Body (raw): {response.text}")
        
        if response.status_code == 200:
            print("✅ SIGNUP SUCCESS - Frontend should work correctly")
            
            # Test the verification flow too
            if 'user_id' in response_json and 'verification_code' in response_json:
                print("\n--- Testing Verification Flow ---")
                verify_data = {
                    "user_id": response_json['user_id'],
                    "verification_code": response_json['verification_code']
                }
                
                verify_response = requests.post(
                    f"{BASE_URL}/auth/verify",
                    json=verify_data,
                    headers=headers,
                    timeout=10
                )
                
                print(f"Verify Status: {verify_response.status_code}")
                if verify_response.status_code == 200:
                    print("✅ VERIFICATION SUCCESS")
                    verify_json = verify_response.json()
                    print(f"Token received: {verify_json.get('token', 'N/A')[:20]}...")
                else:
                    print("❌ VERIFICATION FAILED")
                    print(f"Verify Response: {verify_response.text}")
            
            return True
        elif response.status_code == 400:
            print("❌ 400 BAD REQUEST")
            try:
                error_data = response.json()
                print(f"Error: {error_data.get('detail', 'Unknown error')}")
            except:
                pass
            return False
        else:
            print(f"❌ UNEXPECTED STATUS: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")
        return False

def test_duplicate_signup():
    """Test what happens when frontend tries to signup with existing email"""
    print("\n🔍 TESTING DUPLICATE SIGNUP (Expected 400)")
    print("=" * 60)
    
    # Use the same email from review request that likely already exists
    duplicate_data = {
        "name": "Test User",
        "email": "test@example.com",  # This email likely exists from previous tests
        "phone": "1234567890"
    }
    
    print(f"Testing with existing email: {duplicate_data['email']}")
    
    headers = {'Content-Type': 'application/json'}
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/signup",
            json=duplicate_data,
            headers=headers,
            timeout=10
        )
        
        print(f"Response Status: {response.status_code}")
        
        if response.status_code == 400:
            print("✅ CORRECTLY REJECTED DUPLICATE EMAIL")
            try:
                error_data = response.json()
                print(f"Error Message: {error_data.get('detail', 'Unknown')}")
            except:
                pass
        else:
            print(f"❌ UNEXPECTED STATUS: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)}")

def main():
    print("FRONTEND SIGNUP FLOW TESTING")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("Testing the exact scenario that frontend encounters")
    
    # Test with fresh email (should work)
    success = test_frontend_signup_flow()
    
    # Test with duplicate email (should fail with 400)
    test_duplicate_signup()
    
    print("\n" + "=" * 60)
    print("CONCLUSION")
    print("=" * 60)
    
    if success:
        print("✅ SIGNUP ENDPOINT IS WORKING CORRECTLY")
        print("The 400 Bad Request errors in frontend are likely due to:")
        print("1. Trying to signup with an email that already exists")
        print("2. Frontend not handling the 'User already exists' error properly")
        print("3. Users testing with the same email multiple times")
        print("\nRECOMMENDATION:")
        print("- Frontend should show clear error message for existing users")
        print("- Consider adding 'Login instead?' option when user exists")
        print("- Clear form or suggest different email when user exists")
    else:
        print("❌ SIGNUP ENDPOINT HAS ISSUES")
        print("Need to investigate backend validation logic")

if __name__ == "__main__":
    main()