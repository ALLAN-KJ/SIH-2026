FROM python:3.10-slim

WORKDIR /app

# Install tcpdump/libpcap for scapy (often required for raw parsing even if we just use standard UDP socket)
RUN apt-get update && apt-get install -y tcpdump && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
# We need to copy the ike_parser.py from backend too, actually...
# Wait, if we just send the raw bytes back to the main backend, the main backend can parse it!
# Yes! The probe service just needs to return the Base64 encoded PCAP file.
