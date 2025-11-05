"""
Application Configuration
Environment variables and settings management
"""
import os
from typing import List, Dict, Any
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = int(os.getenv("PORT", "8080"))
    
    # TURN server settings (self-hosted)
    TURN_ENABLED: bool = os.getenv("TURN_ENABLED", "true").lower() == "true"
    TURN_HOST: str = os.getenv("TURN_HOST", "0.0.0.0")
    TURN_PORT: int = int(os.getenv("TURN_PORT", "3478"))
    TURN_USER: str = os.getenv("TURN_USER", "webrtc")
    TURN_PASS: str = os.getenv("TURN_PASS", "webrtc123")
    
    # External IP (for TURN server relay)
    EXTERNAL_IP: str = os.getenv("EXTERNAL_IP", "")
    
    # ICE servers configuration
    STUN_SERVERS: List[str] = [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
    ]
    
    def get_ice_servers(self) -> Dict[str, Any]:
        """
        Generate ICE servers configuration
        Returns dict with iceServers array for WebRTC
        """
        ice_servers = []
        
        # Add STUN servers
        for stun_url in self.STUN_SERVERS:
            ice_servers.append({"urls": stun_url})
        
        # Add self-hosted TURN server if enabled
        if self.TURN_ENABLED:
            turn_host = self.EXTERNAL_IP if self.EXTERNAL_IP else self.TURN_HOST
            
            # TURN over UDP
            ice_servers.append({
                "urls": f"turn:{turn_host}:{self.TURN_PORT}",
                "username": self.TURN_USER,
                "credential": self.TURN_PASS
            })
            
            # TURN over TCP
            ice_servers.append({
                "urls": f"turn:{turn_host}:{self.TURN_PORT}?transport=tcp",
                "username": self.TURN_USER,
                "credential": self.TURN_PASS
            })
        
        return {"iceServers": ice_servers}
    
    class Config:
        case_sensitive = True


# Global settings instance
settings = Settings()
