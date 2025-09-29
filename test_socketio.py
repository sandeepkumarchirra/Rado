#!/usr/bin/env python3
"""
Test Socket.IO functionality
"""

import socketio
import asyncio
import requests
import time

BASE_URL = "https://radius-chat.preview.emergentagent.com"
API_URL = f"{BASE_URL}/api"

async def test_socketio():
    print("🔌 Testing Socket.IO Connection...")
    
    # Create Socket.IO client
    sio = socketio.AsyncClient()
    
    @sio.event
    async def connect():
        print("✅ Socket.IO connected successfully")
    
    @sio.event
    async def disconnect():
        print("🔌 Socket.IO disconnected")
    
    @sio.event
    async def new_message(data):
        print(f"📨 Received new message: {data}")
    
    try:
        # Connect to Socket.IO server
        await sio.connect(BASE_URL)
        
        # Wait a bit to ensure connection
        await asyncio.sleep(2)
        
        # Test joining a room
        await sio.emit('join_location_updates', {'user_id': 'test-user-123'})
        
        # Wait a bit more
        await asyncio.sleep(2)
        
        print("✅ Socket.IO basic functionality working")
        
        # Disconnect
        await sio.disconnect()
        
    except Exception as e:
        print(f"❌ Socket.IO test failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_socketio())