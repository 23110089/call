# WebRTC Video Call with Self-hosted TURN
FROM ubuntu:22.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3-pip \
    coturn \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Copy configuration files
COPY config/turnserver.conf /etc/turnserver.conf
COPY config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create log directories
RUN mkdir -p /var/log/supervisor /var/log/turn

# Expose ports
# 8080: FastAPI app
# 3478: TURN/STUN (UDP/TCP)
# 5349: TURN/STUN over TLS
# 49152-65535: TURN relay ports (we'll use a subset)
EXPOSE 8080 3478 5349 49152-49252

# Start supervisor (manages both FastAPI and coturn)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
