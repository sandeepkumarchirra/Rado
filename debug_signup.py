#!/usr/bin/env python3
"""
Debug Signup API Endpoint - Focus on 400 Bad Request Issue
Testing the exact scenario from the review request
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend .env
BASE_URL = "https://radius-chat.preview.emergentagent.com/api"

def debug_signup_400_error():
    """Debug the specific signup 400 error with exact payload from review request"""
    print("🔍 DEBUGGING SIGNUP API 400 BAD REQUEST ERROR")
    print("=" * 60)
    print(f"Backend URL: {BASE_URL}")
    print(f"Endpoint: POST {BASE_URL}/auth/signup")
    
    # Exact test data from review request
    signup_data = {
        "name": "Test User",
        "email": "test@example.com", 
        "phone": "1234567890"
    }
    
    print(f"\nTest Payload:")
    print(json.dumps(signup_data, indent=2))
    
    # Test with different header configurations
    test_scenarios = [
        {
            "name": "Standard JSON Headers",
            "headers": {"Content-Type": "application/json"}
        },
        {
            "name": "With Accept Header",
            "headers": {
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
        },
        {
            "name": "With User-Agent",
            "headers": {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "NearbyConnect-Frontend/1.0"
            }
        }
    ]
    
    for scenario in test_scenarios:
        print(f"\n--- {scenario['name']} ---")
        print(f"Headers: {scenario['headers']}")
        
        try:
            response = requests.post(
                f"{BASE_URL}/auth/signup",
                json=signup_data,
                headers=scenario['headers'],
                timeout=10
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Response Headers: {dict(response.headers)}")
            
            # Try to parse response
            try:
                response_json = response.json()
                print(f"Response JSON:")
                print(json.dumps(response_json, indent=2))
            except:
                print(f"Response Text: {response.text}")
            
            if response.status_code == 400:
                print("❌ 400 BAD REQUEST DETECTED")
                # Analyze the error
                try:
                    error_data = response.json()
                    if 'detail' in error_data:
                        detail = error_data['detail']
                        if isinstance(detail, list):
                            print("VALIDATION ERRORS:")
                            for error in detail:
                                print(f"  Field: {error.get('loc', 'unknown')}")
                                print(f"  Message: {error.get('msg', 'unknown')}")
                                print(f"  Type: {error.get('type', 'unknown')}")
                                print(f"  Input: {error.get('input', 'unknown')}")
                        else:
                            print(f"Error Detail: {detail}")
                except Exception as e:
                    print(f"Could not parse error details: {e}")
            elif response.status_code == 200:
                print("✅ SUCCESS")
            else:
                print(f"❌ UNEXPECTED STATUS: {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            print("❌ CONNECTION ERROR - Backend not reachable")
        except requests.exceptions.Timeout:
            print("❌ TIMEOUT ERROR")
        except Exception as e:
            print(f"❌ EXCEPTION: {str(e)}")

def test_phone_validation():
    """Test different phone number formats to identify validation issues"""
    print("\n🔍 TESTING PHONE NUMBER VALIDATION")
    print("=" * 60)
    
    phone_test_cases = [
        {"phone": "1234567890", "description": "10 digits (original)"},
        {"phone": "+1234567890", "description": "With + prefix"},
        {"phone": "123-456-7890", "description": "With dashes"},
        {"phone": "(123) 456-7890", "description": "With parentheses"},
        {"phone": "+1 (123) 456-7890", "description": "Full US format"},
        {"phone": "123", "description": "Too short"},
        {"phone": "12345678901234567890", "description": "Too long"},
        {"phone": "abcd567890", "description": "With letters"},
    ]
    
    for test_case in phone_test_cases:
        print(f"\n--- Testing: {test_case['description']} ---")
        
        signup_data = {
            "name": "Test User",
            "email": "test@example.com",
            "phone": test_case['phone']
        }
        
        print(f"Phone: '{test_case['phone']}'")
        
        try:
            response = requests.post(
                f"{BASE_URL}/auth/signup",
                json=signup_data,
                headers={"Content-Type": "application/json"},
                timeout=5
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 422:  # Validation error
                try:
                    error_data = response.json()
                    if 'detail' in error_data and isinstance(error_data['detail'], list):
                        for error in error_data['detail']:
                            if 'phone' in str(error.get('loc', [])):
                                print(f"  ❌ Validation Error: {error.get('msg', 'unknown')}")
                except:
                    print(f"  ❌ Validation Error (unparseable)")
            elif response.status_code == 400:
                print(f"  ❌ 400 Bad Request")
                try:
                    error_data = response.json()
                    print(f"  Error: {error_data.get('detail', 'unknown')}")
                except:
                    pass
            elif response.status_code == 200:
                print(f"  ✅ Accepted")
            else:
                print(f"  ❓ Status {response.status_code}")
                
        except Exception as e:
            print(f"  ❌ Exception: {str(e)}")

def test_email_validation():
    """Test different email formats"""
    print("\n🔍 TESTING EMAIL VALIDATION")
    print("=" * 60)
    
    email_test_cases = [
        {"email": "test@example.com", "description": "Valid email (original)"},
        {"email": "test.user@example.com", "description": "With dot in name"},
        {"email": "test+tag@example.com", "description": "With plus tag"},
        {"email": "test@sub.example.com", "description": "Subdomain"},
        {"email": "invalid-email", "description": "No @ symbol"},
        {"email": "test@", "description": "Missing domain"},
        {"email": "@example.com", "description": "Missing local part"},
        {"email": "test@.com", "description": "Missing domain name"},
    ]
    
    for test_case in email_test_cases:
        print(f"\n--- Testing: {test_case['description']} ---")
        
        signup_data = {
            "name": "Test User",
            "email": test_case['email'],
            "phone": "1234567890"
        }
        
        print(f"Email: '{test_case['email']}'")
        
        try:
            response = requests.post(
                f"{BASE_URL}/auth/signup",
                json=signup_data,
                headers={"Content-Type": "application/json"},
                timeout=5
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 422:  # Validation error
                try:
                    error_data = response.json()
                    if 'detail' in error_data and isinstance(error_data['detail'], list):
                        for error in error_data['detail']:
                            if 'email' in str(error.get('loc', [])):
                                print(f"  ❌ Validation Error: {error.get('msg', 'unknown')}")
                except:
                    print(f"  ❌ Validation Error (unparseable)")
            elif response.status_code == 400:
                print(f"  ❌ 400 Bad Request")
                try:
                    error_data = response.json()
                    print(f"  Error: {error_data.get('detail', 'unknown')}")
                except:
                    pass
            elif response.status_code == 200:
                print(f"  ✅ Accepted")
            else:
                print(f"  ❓ Status {response.status_code}")
                
        except Exception as e:
            print(f"  ❌ Exception: {str(e)}")

def check_backend_logs():
    """Check backend logs for any errors"""
    print("\n🔍 CHECKING BACKEND LOGS")
    print("=" * 60)
    
    import subprocess
    try:
        # Check supervisor backend logs
        result = subprocess.run(
            ["tail", "-n", "50", "/var/log/supervisor/backend.out.log"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.stdout:
            print("Backend Output Logs (last 50 lines):")
            print(result.stdout)
        
        # Check error logs
        result = subprocess.run(
            ["tail", "-n", "50", "/var/log/supervisor/backend.err.log"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.stdout:
            print("\nBackend Error Logs (last 50 lines):")
            print(result.stdout)
            
    except Exception as e:
        print(f"Could not read logs: {e}")

def main():
    print("NEARBY CONNECT - SIGNUP API DEBUG")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("Focus: Debug 400 Bad Request on signup endpoint")
    
    # Debug the specific 400 error
    debug_signup_400_error()
    
    # Test phone validation
    test_phone_validation()
    
    # Test email validation  
    test_email_validation()
    
    # Check backend logs
    check_backend_logs()
    
    print("\n" + "=" * 60)
    print("DEBUG SUMMARY")
    print("=" * 60)
    print("If signup is working in tests but failing in frontend:")
    print("1. Check frontend request format and headers")
    print("2. Verify CORS configuration")
    print("3. Check if frontend is sending extra fields")
    print("4. Verify Content-Type header is set correctly")
    print("5. Check for any middleware interference")

if __name__ == "__main__":
    main()