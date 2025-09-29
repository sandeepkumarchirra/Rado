from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
from geopy.distance import geodesic
import base64
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'nearby-connect-secret-key-12345')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Initialize Socket.IO
sio = socketio.AsyncServer(
    cors_allowed_origins="*",
    logger=True,
    engineio_logger=True
)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Authentication
security = HTTPBearer()

# Pydantic Models
class UserCreate(BaseModel):
    name: str
    email: str
    phone: str
    
    @validator('email')
    def validate_email(cls, v):
        import re
        if not re.match(r'^[^@]+@[^@]+\.[^@]+$', v):
            raise ValueError('Invalid email format')
        return v
    
    @validator('phone')
    def validate_phone(cls, v):
        import re
        if not re.match(r'^\+?[\d\s\-\(\)]{10,15}$', v):
            raise ValueError('Invalid phone format')
        return v

class UserLogin(BaseModel):
    email: str
    password: str = None
    verification_code: str = None

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    password_hash: Optional[str] = None
    verification_code: Optional[str] = None
    verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: datetime = Field(default_factory=datetime.utcnow)
    profile_image: Optional[str] = None
    preferences: List[str] = Field(default_factory=list)
    
class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    user_id: str
    
    @validator('latitude')
    def validate_latitude(cls, v):
        if not -90 <= v <= 90:
            raise ValueError('Latitude must be between -90 and 90')
        return v
    
    @validator('longitude')
    def validate_longitude(cls, v):
        if not -180 <= v <= 180:
            raise ValueError('Longitude must be between -180 and 180')
        return v

class Location(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    latitude: float
    longitude: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class MessageCreate(BaseModel):
    content: str
    recipient_ids: List[str]
    image_data: Optional[str] = None  # base64 encoded image

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    recipient_ids: List[str]
    content: str
    image_data: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    read_by: List[str] = Field(default_factory=list)

class NearbyUsersRequest(BaseModel):
    latitude: float
    longitude: float
    radius_miles: float = Field(default=1.0, ge=0.5, le=5.0)

class UserPreferences(BaseModel):
    preferences: List[str]

# Helper Functions
def create_verification_code():
    import random
    return str(random.randint(100000, 999999))

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str) -> str:
    expiration = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "user_id": user_id,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Check if user exists
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def calculate_distance_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    return geodesic((lat1, lon1), (lat2, lon2)).miles

# API Routes
@api_router.post("/auth/signup")
async def signup(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create verification code
    verification_code = create_verification_code()
    
    user = User(
        name=user_data.name,
        email=user_data.email,
        phone=user_data.phone,
        verification_code=verification_code,
        verified=False
    )
    
    await db.users.insert_one(user.dict())
    
    # In a real app, send verification code via email/SMS
    # For MVP, we'll just return it
    return {
        "message": "User created successfully",
        "verification_code": verification_code,  # Remove in production
        "user_id": user.id
    }

@api_router.post("/auth/verify")
async def verify_code(verification_data: dict):
    user_id = verification_data.get("user_id")
    code = verification_data.get("verification_code")
    
    user = await db.users.find_one({"id": user_id})
    if not user or user.get("verification_code") != code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Update user as verified
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"verified": True, "verification_code": None}}
    )
    
    # Create JWT token
    token = create_jwt_token(user_id)
    
    return {
        "message": "User verified successfully",
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "phone": user["phone"]
        }
    }

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    
    if not user.get("verified"):
        raise HTTPException(status_code=400, detail="User not verified")
    
    # For MVP, we'll use a simple verification flow
    # In production, implement proper password-based auth
    token = create_jwt_token(user["id"])
    
    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "phone": user["phone"]
        }
    }

@api_router.get("/profile")
async def get_profile(current_user_id: str = Depends(verify_jwt_token)):
    user = await db.users.find_one({"id": current_user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "phone": user["phone"],
        "preferences": user.get("preferences", []),
        "profile_image": user.get("profile_image")
    }

@api_router.put("/profile")
async def update_profile(profile_data: dict, current_user_id: str = Depends(verify_jwt_token)):
    await db.users.update_one(
        {"id": current_user_id},
        {"$set": profile_data}
    )
    return {"message": "Profile updated successfully"}

@api_router.post("/location")
async def update_location(location_data: LocationUpdate, current_user_id: str = Depends(verify_jwt_token)):
    location = Location(
        user_id=current_user_id,
        latitude=location_data.latitude,
        longitude=location_data.longitude
    )
    
    # Update or insert location
    await db.locations.update_one(
        {"user_id": current_user_id},
        {"$set": location.dict()},
        upsert=True
    )
    
    # Update user's last active time
    await db.users.update_one(
        {"id": current_user_id},
        {"$set": {"last_active": datetime.utcnow()}}
    )
    
    return {"message": "Location updated successfully"}

@api_router.post("/users/nearby")
async def get_nearby_users(request: NearbyUsersRequest, current_user_id: str = Depends(verify_jwt_token)):
    # Get all active users (active in last 30 minutes)
    cutoff_time = datetime.utcnow() - timedelta(minutes=30)
    active_users = await db.users.find(
        {
            "id": {"$ne": current_user_id},
            "last_active": {"$gte": cutoff_time}
        }
    ).to_list(1000)
    
    nearby_users = []
    
    for user in active_users:
        # Get user's latest location
        location = await db.locations.find_one({"user_id": user["id"]})
        if location:
            distance = calculate_distance_miles(
                request.latitude, request.longitude,
                location["latitude"], location["longitude"]
            )
            
            if distance <= request.radius_miles:
                nearby_users.append({
                    "id": user["id"],
                    "name": user["name"],
                    "latitude": location["latitude"],
                    "longitude": location["longitude"],
                    "distance_miles": round(distance, 2),
                    "last_active": user["last_active"]
                })
    
    return {"nearby_users": nearby_users}

@api_router.post("/messages")
async def send_message(message_data: MessageCreate, current_user_id: str = Depends(verify_jwt_token)):
    message = Message(
        sender_id=current_user_id,
        recipient_ids=message_data.recipient_ids,
        content=message_data.content,
        image_data=message_data.image_data
    )
    
    result = await db.messages.insert_one(message.dict())
    
    # Emit real-time message via Socket.IO
    await sio.emit('new_message', {
        'id': message.id,
        'sender_id': current_user_id,
        'content': message.content,
        'image_data': message.image_data,
        'timestamp': message.timestamp.isoformat()
    }, room='messages')
    
    return {"message": "Message sent successfully", "message_id": message.id}

@api_router.get("/messages")
async def get_messages(current_user_id: str = Depends(verify_jwt_token)):
    messages = await db.messages.find(
        {"$or": [
            {"sender_id": current_user_id},
            {"recipient_ids": current_user_id}
        ]}
    ).sort("timestamp", -1).limit(100).to_list(100)
    
    # Get sender names
    for message in messages:
        sender = await db.users.find_one({"id": message["sender_id"]})
        if sender:
            message["sender_name"] = sender["name"]
    
    return {"messages": messages}

@api_router.put("/preferences")
async def update_preferences(preferences: UserPreferences, current_user_id: str = Depends(verify_jwt_token)):
    await db.users.update_one(
        {"id": current_user_id},
        {"$set": {"preferences": preferences.preferences}}
    )
    return {"message": "Preferences updated successfully"}

# Socket.IO Events
@sio.event
async def connect(sid, environ):
    print(f"Client {sid} connected")
    await sio.enter_room(sid, 'messages')

@sio.event
async def disconnect(sid):
    print(f"Client {sid} disconnected")

@sio.event
async def join_location_updates(sid, data):
    user_id = data.get('user_id')
    if user_id:
        await sio.enter_room(sid, f'location_updates_{user_id}')

# Include the router in the main app
app.include_router(api_router)

# Mount Socket.IO
sio_app = socketio.ASGIApp(sio, app)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(sio_app, host="0.0.0.0", port=8001)