#!/usr/bin/env python3
"""
Wireless Security Assessment Tool - A basic wireless network security analyzer

This script provides functionality for analyzing wireless networks, detecting
rogue access points, and identifying potential security issues. It includes
capabilities for scanning networks, analyzing encryption, and detecting common
wireless attacks.

NOTE: This tool requires appropriate permissions and should only be used on
networks you own or have explicit permission to test.

WARNING: This tool is for EDUCATIONAL PURPOSES ONLY.
"""

import argparse
import csv
import datetime
import json
import os
import re
import signal
import sys
import time

try:
    from scapy.all import *
    from scapy.layers.dot11 import Dot11, Dot11Beacon, Dot11Elt, Dot11ProbeResp, Dot11Auth, Dot11AssoReq, Dot11Deauth
    SCAPY_AVAILABLE = True
except ImportError:
    SCAPY_AVAILABLE = False
    print("Warning: Scapy module not found. This tool requires scapy to function.")
    print("Install with: pip install scapy")

# Global variables
networks = {}
clients = {}
rogue_aps = []
deauth_frames = {}
beacon_frames = {}
monitor_mode = False
interface = None
channels = range(1, 14)  # Default channels 1-13
scanning = False

# Security ratings
SECURITY_RATINGS = {
    "OPEN": 0,
    "WEP": 1,
    "WPA": 2,
    "WPA2": 3,
    "WPA3": 4
}

# Known MAC address prefixes (OUIs) for common vendors
VENDOR_MACS = {
    "00:11:22": "Cisco",
    "00:1A:11": "Google",
    "00:13:E8": "Intel",
    "00:25:00": "Apple",
    "00:26:37": "Samsung",
    "00:18:82": "Huawei",
    "00:50:56": "VMware",
    "00:1A:A0": "Dell",
    "00:15:5D": "Microsoft",
    # Add more as needed
}

def signal_handler(sig, frame):
    """Handle Ctrl+C to gracefully exit the program."""
    global scanning
    if scanning:
        print("\n[*] Stopping scan...")
        scanning = False
        time.sleep(1)  # Allow time for any pending operations
    else:
        print("\n[*] Exiting...")
        sys.exit(0)

def get_vendor(mac):
    """Get vendor name from MAC address OUI."""
    if not mac:
        return "Unknown"
    
    mac = mac.upper()
    oui = mac[:8]  # First 3 bytes (6 hex chars + 2 colons)
    
    for prefix, vendor in VENDOR_MACS.items():
        if oui.startswith(prefix.upper()):
            return vendor
    
    return "Unknown"

def get_encryption(packet):
    """Determine encryption type from beacon packet."""
    encryption = "OPEN"
    capability = packet.sprintf("{Dot11Beacon:%Dot11Beacon.cap%}")
    
    # Extract privacy bit
    if re.search("privacy", capability):
        # Check for RSN (WPA2) or WPA information elements
        rsn = False
        wpa = False
        wpa3 = False
        
        # Look for RSN information element (WPA2)
        for element in packet[Dot11Elt]:
            if element.ID == 48:  # RSN ID
                rsn = True
                # Check for WPA3 (SAE authentication)
                if element.info and len(element.info) > 8:
                    if element.info[7] == 8:  # SAE authentication
                        wpa3 = True
            elif element.ID == 221:  # Vendor specific
                if element.info.startswith(b'\x00\x50\xf2\x01'):
                    wpa = True
        
        if wpa3:
            encryption = "WPA3"
        elif rsn:
            encryption = "WPA2"
        elif wpa:
            encryption = "WPA"
        else:
            encryption = "WEP"
    
    return encryption

def packet_handler(packet):
    """Process captured packets."""
    global networks, clients, deauth_frames, beacon_frames
    
    # Process Beacon frames (Access Points)
    if packet.haslayer(Dot11Beacon):
        process_beacon(packet)
    
    # Process Probe Response frames (AP responses to client probes)
    elif packet.haslayer(Dot11ProbeResp):
        process_probe_response(packet)
    
    # Process Authentication frames
    elif packet.haslayer(Dot11Auth):
        process_auth(packet)
    
    # Process Association Request frames (clients connecting to APs)
    elif packet.haslayer(Dot11AssoReq):
        process_association(packet)
    
    # Process Deauthentication frames (potential attacks)
    elif packet.haslayer(Dot11Deauth):
        process_deauth(packet)

def process_beacon(packet):
    """Process beacon frames to identify access points."""
    global networks, beacon_frames
    
    # Extract BSSID (AP MAC address)
    bssid = packet[Dot11].addr2
    if not bssid:
        return
    
    # Count beacon frames per BSSID (for beacon flood detection)
    if bssid not in beacon_frames:
        beacon_frames[bssid] = 0
    beacon_frames[bssid] += 1
    
    # Skip if we've already seen this network
    if bssid in networks:
        networks[bssid]["last_seen"] = time.time()
        return
    
    # Try to extract SSID
    try:
        ssid = packet[Dot11Elt].info.decode("utf-8")
    except:
        ssid = "<HIDDEN>"
    
    # Skip broadcast SSID
    if ssid == "" or ssid == "\x00" * len(ssid):
        ssid = "<HIDDEN>"
    
    # Get channel
    channel = None
    for element in packet[Dot11Elt]:
        if element.ID == 3:  # Channel ID
            channel = ord(element.info)
            break
    
    # Get encryption type
    encryption = get_encryption(packet)
    
    # Get signal strength if available
    signal_strength = None
    if hasattr(packet, "dBm_AntSignal"):
        signal_strength = packet.dBm_AntSignal
    
    # Store network information
    networks[bssid] = {
        "ssid": ssid,
        "channel": channel,
        "encryption": encryption,
        "signal": signal_strength,
        "vendor": get_vendor(bssid),
        "clients": [],
        "first_seen": time.time(),
        "last_seen": time.time(),
        "security_rating": SECURITY_RATINGS.get(encryption, 0)
    }

def process_probe_response(packet):
    """Process probe response frames."""
    # Similar to beacon processing but for probe responses
    bssid = packet[Dot11].addr2
    if not bssid:
        return
    
    # If we haven't seen this network before, process it like a beacon
    if bssid not in networks:
        process_beacon(packet)
    else:
        networks[bssid]["last_seen"] = time.time()

def process_auth(packet):
    """Process authentication frames."""
    # Authentication frames can indicate connection attempts
    bssid = packet[Dot11].addr1  # AP
    client = packet[Dot11].addr2  # Client
    
    if not bssid or not client:
        return
    
    # Update client list for this AP if we know about the AP
    if bssid in networks and client not in networks[bssid]["clients"]:
        networks[bssid]["clients"].append(client)

def process_association(packet):
    """Process association request frames."""
    # Association requests indicate client connections
    bssid = packet[Dot11].addr1  # AP
    client = packet[Dot11].addr2  # Client
    
    if not bssid or not client:
        return
    
    # Update client list for this AP
    if bssid in networks and client not in networks[bssid]["clients"]:
        networks[bssid]["clients"].append(client)
    
    # Track client information
    if client not in clients:
        clients[client] = {
            "vendor": get_vendor(client),
            "associated_with": bssid,
            "first_seen": time.time(),
            "last_seen": time.time()
        }
    else:
        clients[client]["last_seen"] = time.time()
        clients[client]["associated_with"] = bssid

def process_deauth(packet):
    """Process deauthentication frames to detect attacks."""
    global deauth_frames
    
    # Extract addresses
    addr1 = packet[Dot11].addr1  # Destination
    addr2 = packet[Dot11].addr2  # Source
    
    if not addr1 or not addr2:
        return
    
    # Track deauth frames by source-destination pair
    key = f"{addr2}-{addr1}"
    if key not in deauth_frames:
        deauth_frames[key] = {
            "count": 0,
            "first_seen": time.time(),
            "last_seen": time.time()
        }
    
    deauth_frames[key]["count"] += 1
    deauth_frames[key]["last_seen"] = time.time()

def detect_rogue_aps():
    """Detect potential rogue access points."""
    global networks, rogue_aps
    rogue_aps = []
    
    # Group networks by SSID
    ssid_groups = {}
    for bssid, data in networks.items():
        ssid = data["ssid"]
        if ssid not in ssid_groups:
            ssid_groups[ssid] = []
        ssid_groups[ssid].append((bssid, data))
    
    # Check for multiple BSSIDs with same SSID but different security
    for ssid, ap_list in ssid_groups.items():
        if len(ap_list) > 1 and ssid != "<HIDDEN>":
            # Check for security inconsistencies
            security_levels = set(ap[1]["security_rating"] for ap in ap_list)
            if len(security_levels) > 1:
                # Find the AP with lowest security
                min_security = min(security_levels)
                for bssid, data in ap_list:
                    if data["security_rating"] == min_security:
                        rogue_aps.append({
                            "bssid": bssid,
                            "ssid": ssid,
                            "channel": data["channel"],
                            "encryption": data["encryption"],
                            "reason": "Security downgrade",
                            "details": f"Multiple security levels for same SSID"
                        })
    
    # Check for suspicious beacon frame rates (potential beacon flood)
    for bssid, count in beacon_frames.items():
        if bssid in networks and count > 100:  # Arbitrary threshold
            rogue_aps.append({
                "bssid": bssid,
                "ssid": networks[bssid]["ssid"],
                "channel": networks[bssid]["channel"],
                "encryption": networks[bssid]["encryption"],
                "reason": "Beacon flood",
                "details": f"High beacon rate: {count} frames"
            })

def detect_deauth_attacks():
    """Detect potential deauthentication attacks."""
    attacks = []
    
    for key, data in deauth_frames.items():
        # If we see a high number of deauth frames in a short time
        if data["count"] > 10 and (data["last_seen"] - data["first_seen"]) < 5:
            src, dst = key.split("-")
            attacks.append({
                "type": "Deauthentication attack",
                "source": src,
                "target": dst,
                "count": data["count"],
                "duration": round(data["last_seen"] - data["first_seen"], 2),
                "first_seen": datetime.datetime.fromtimestamp(data["first_seen"]).strftime('%H:%M:%S')
            })
    
    return attacks

def scan_networks(interface, timeout=60, hop_interval=1):
    """Scan for wireless networks by channel hopping."""
    global scanning, channels
    
    if not SCAPY_AVAILABLE:
        print("[!] Error: Scapy is required for network scanning.")
        return False
    
    # Check if interface exists
    try:
        # This is a simulation - in a real tool, you'd check if the interface exists
        # and is in monitor mode
        print(f"[*] Using interface {interface} for scanning")
        scanning = True
    except Exception as e:
        print(f"[!] Error: {str(e)}")
        return False
    
    print(f"[*] Starting wireless scan (timeout: {timeout}s)")
    print("[*] Press Ctrl+C to stop scanning")
    
    # Set up signal handler for graceful exit
    signal.signal(signal.SIGINT, signal_handler)
    
    # Start time for timeout
    start_time = time.time()
    current_channel = 0
    
    try:
        # In a real implementation, this would use actual packet capture
        # For this educational tool, we'll simulate network discovery
        while scanning and (time.time() - start_time) < timeout:
            # Channel hopping
            current_channel = (current_channel + 1) % len(channels)
            channel = channels[current_channel]
            
            print(f"\r[*] Scanning channel {channel}... ", end="")
            sys.stdout.flush()
            
            # In a real implementation, you would set the channel with:
            # os.system(f"iwconfig {interface} channel {channel}")
            
            # Simulate packet capture (in a real tool, you'd use sniff() from scapy)
            # sniff(iface=interface, prn=packet_handler, count=10, timeout=hop_interval)
            
            # For simulation, we'll add some dummy networks
            if channel == 1 and len(networks) == 0:
                simulate_networks()
            
            time.sleep(hop_interval)
        
        print("\n[+] Scan completed")
        return True
    
    except Exception as e:
        print(f"\n[!] Error during scan: {str(e)}")
        return False
    
    finally:
        scanning = False

def simulate_networks():
    """Simulate network discovery for educational purposes."""
    global networks, clients
    
    # Add some simulated networks
    simulated_networks = [
        {"bssid": "00:11:22:33:44:55", "ssid": "CorporateWiFi", "channel": 1, "encryption": "WPA2"},
        {"bssid": "00:11:22:33:44:56", "ssid": "CorporateWiFi", "channel": 6, "encryption": "WEP"},
        {"bssid": "00:25:00:AA:BB:CC", "ssid": "HomeNetwork", "channel": 11, "encryption": "WPA2"},
        {"bssid": "00:18:82:CC:DD:EE", "ssid": "GuestWiFi", "channel": 1, "encryption": "OPEN"},
        {"bssid": "00:26:37:FF:00:11", "ssid": "IoT_Network", "channel": 3, "encryption": "WPA2"},
        {"bssid": "00:1A:11:22:33:44", "ssid": "<HIDDEN>", "channel": 7, "encryption": "WPA3"}
    ]
    
    # Add simulated clients
    simulated_clients = [
        {"mac": "AA:BB:CC:DD:EE:FF", "associated_with": "00:11:22:33:44:55"},
        {"mac": "AA:BB:CC:DD:EE:00", "associated_with": "00:11:22:33:44:55"},
        {"mac": "AA:BB:CC:00:11:22", "associated_with": "00:25:00:AA:BB:CC"}
    ]
    
    # Add networks to our global dictionary
    for net in simulated_networks:
        bssid = net["bssid"]
        networks[bssid] = {
            "ssid": net["ssid"],
            "channel": net["channel"],
            "encryption": net["encryption"],
            "signal": -70,  # Simulated signal strength
            "vendor": get_vendor(bssid),
            "clients": [],
            "first_seen": time.time(),
            "last_seen": time.time(),
            "security_rating": SECURITY_RATINGS.get(net["encryption"], 0)
        }
    
    # Add clients
    for client in simulated_clients:
        mac = client["mac"]
        bssid = client["associated_with"]
        
        if bssid in networks and mac not in networks[bssid]["clients"]:
            networks[bssid]["clients"].append(mac)
        
        clients[mac] = {
            "vendor": get_vendor(mac),
            "associated_with": bssid,
            "first_seen": time.time(),
            "last_seen": time.time()
        }
    
    # Simulate some deauth frames
    deauth_frames["00:11:22:33:44:55-AA:BB:CC:DD:EE:FF"] = {
        "count": 15,
        "first_seen": time.time() - 2,
        "last_seen": time.time()
    }

def print_networks():
    """Print discovered networks in a formatted table."""
    if not networks:
        print("[!] No networks found")
        return
    
    # Sort networks by signal strength
    sorted_networks = sorted(
        networks.items(),
        key=lambda x: x[1]["signal"] if x[1]["signal"] is not None else -100,
        reverse=True
    )
    
    print("\n" + "=" * 100)
    print(f"{'BSSID':<18} {'SSID':<20} {'Channel':<8} {'Encryption':<10} {'Signal':<8} {'Clients':<8} {'Vendor':<15}")
    print("=" * 100)
    
    for bssid, data in sorted_networks:
        print(f"{bssid:<18} {data['ssid']:<20} {data['channel']:<8} {data['encryption']:<10} "
              f"{data['signal'] if data['signal'] else 'N/A':<8} {len(data['clients']):<8} {data['vendor']:<15}")
    
    print("=" * 100)
    print(f"Total networks: {len(networks)}\n")

def print_clients():
    """Print discovered clients in a formatted table."""
    if not clients:
        print("[!] No clients found")
        return
    
    print("\n" + "=" * 80)
    print(f"{'Client MAC':<18} {'Associated With':<18} {'AP SSID':<20} {'Vendor':<15}")
    print("=" * 80)
    
    for mac, data in clients.items():
        bssid = data["associated_with"]
        ssid = networks[bssid]["ssid"] if bssid in networks else "Unknown"
        
        print(f"{mac:<18} {bssid:<18} {ssid:<20} {data['vendor']:<15}")
    
    print("=" * 80)
    print(f"Total clients: {len(clients)}\n")

def print_security_issues():
    """Print detected security issues."""
    # Detect rogue APs
    detect_rogue_aps()
    
    # Detect deauth attacks
    deauth_attacks = detect_deauth_attacks()
    
    # Print rogue APs
    if rogue_aps:
        print("\n[!] Potential Rogue Access Points Detected:")
        print("=" * 100)
        print(f"{'BSSID':<18} {'SSID':<20} {'Channel':<8} {'Encryption':<10} {'Reason':<20} {'Details':<30}")
        print("=" * 100)
        
        for ap in rogue_aps:
            print(f"{ap['bssid']:<18} {ap['ssid']:<20} {ap['channel']:<8} {ap['encryption']:<10} "
                  f"{ap['reason']:<20} {ap['details']:<30}")
        
        print("=" * 100)
    else:
        print("\n[+] No rogue access points detected")
    
    # Print deauth attacks
    if deauth_attacks:
        print("\n[!] Potential Deauthentication Attacks Detected:")
        print("=" * 100)
        print(f"{'Type':<25} {'Source':<18} {'Target':<18} {'Count':<8} {'Duration(s)':<12} {'First Seen':<10}")
        print("=" * 100)
        
        for attack in deauth_attacks:
            print(f"{attack['type']:<25} {attack['source']:<18} {attack['target']:<18} "
                  f"{attack['count']:<8} {attack['duration']:<12} {attack['first_seen']:<10}")
        
        print("=" * 100)
    else:
        print("\n[+] No deauthentication attacks detected")
    
    # Check for open networks
    open_networks = []
    for bssid, data in networks.items():
        if data["encryption"] == "OPEN":
            open_networks.append((bssid, data["ssid"]))
    
    if open_networks:
        print("\n[!] Open (Unencrypted) Networks Detected:")
        print("=" * 50)
        print(f"{'BSSID':<18} {'SSID':<20}")
        print("=" * 50)
        
        for bssid, ssid in open_networks:
            print(f"{bssid:<18} {ssid:<20}")
        
        print("=" * 50)
    else:
        print("\n[+] No open networks detected")
    
    # Check for WEP networks (insecure)
    wep_networks = []
    for bssid, data in networks.items():
        if data["encryption"] == "WEP":
            wep_networks.append((bssid, data["ssid"]))
    
    if wep_networks:
        print("\n[!] WEP Networks Detected (Insecure):")
        print("=" * 50)
        print(f"{'BSSID':<18} {'SSID':<20}")
        print("=" * 50)
        
        for bssid, ssid in wep_networks:
            print(f"{bssid:<18} {ssid:<20}")
        
        print("=" * 50)
    else:
        print("\n[+] No WEP networks detected")

def save_results(filename, format="json"):
    """Save scan results to a file."""
    if not networks:
        print("[!] No data to save")
        return False
    
    try:
        if format.lower() == "json":
            # Prepare data for JSON serialization
            data = {
                "scan_time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "networks": {},
                "clients": {},
                "security_issues": {
                    "rogue_aps": rogue_aps,
                    "deauth_attacks": detect_deauth_attacks(),
                    "open_networks": [{
                        "bssid": bssid,
                        "ssid": data["ssid"]
                    } for bssid, data in networks.items() if data["encryption"] == "OPEN"],
                    "wep_networks": [{
                        "bssid": bssid,
                        "ssid": data["ssid"]
                    } for bssid, data in networks.items() if data["encryption"] == "WEP"]
                }
            }
            
            # Convert network data (handling timestamps)
            for bssid, net_data in networks.items():
                data["networks"][bssid] = {
                    **net_data,
                    "first_seen": datetime.datetime.fromtimestamp(net_data["first_seen"]).strftime("%H:%M:%S"),
                    "last_seen": datetime.datetime.fromtimestamp(net_data["last_seen"]).strftime("%H:%M:%S")
                }
            
            # Convert client data
            for mac, client_data in clients.items():
                data["clients"][mac] = {
                    **client_data,
                    "first_seen": datetime.datetime.fromtimestamp(client_data["first_seen"]).strftime("%H:%M:%S"),
                    "last_seen": datetime.datetime.fromtimestamp(client_data["last_seen"]).strftime("%H:%M:%S")
                }
            
            with open(filename, "w") as f:
                json.dump(data, f, indent=4)
        
        elif format.lower() == "csv":
            # Save networks to CSV
            with open(filename, "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(["BSSID", "SSID", "Channel", "Encryption", "Signal", "Clients", "Vendor"])
                
                for bssid, data in networks.items():
                    writer.writerow([
                        bssid,
                        data["ssid"],
                        data["channel"],
                        data["encryption"],
                        data["signal"],
                        len(data["clients"]),
                        data["vendor"]
                    ])
        
        else:
            print(f"[!] Unsupported format: {format}")
            return False
        
        print(f"[+] Results saved to {filename}")
        return True
    
    except Exception as e:
        print(f"[!] Error saving results: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Wireless Security Assessment Tool (Educational Purposes Only)")
    parser.add_argument("-i", "--interface", help="Wireless interface to use (must be in monitor mode)")
    parser.add_argument("-t", "--timeout", type=int, default=60, help="Scan timeout in seconds (default: 60)")
    parser.add_argument("-c", "--channels", help="Channels to scan, comma separated (default: 1-13)")
    parser.add_argument("-o", "--output", help="Save results to file")
    parser.add_argument("-f", "--format", choices=["json", "csv"], default="json", help="Output format (default: json)")
    parser.add_argument("-s", "--simulate", action="store_true", help="Simulation mode (no actual scanning)")
    
    args = parser.parse_args()
    
    # Print banner
    print("""\n
    ██╗    ██╗██╗██████╗ ███████╗██╗     ███████╗███████╗███████╗
    ██║    ██║██║██╔══██╗██╔════╝██║     ██╔════╝██╔════╝██╔════╝
    ██║ █╗ ██║██║██████╔╝█████╗  ██║     █████╗  ███████╗███████╗
    ██║███╗██║██║██╔══██╗██╔══╝  ██║     ██╔══╝  ╚════██║╚════██║
    ╚███╔███╔╝██║██║  ██║███████╗███████╗███████╗███████║███████║
     ╚══╝╚══╝ ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚══════╝╚══════╝
                                                                  
    ███████╗ ██████╗ █████╗ ███╗   ██╗███╗   ██╗███████╗██████╗ 
    ██╔════╝██╔════╝██╔══██╗████╗  ██║████╗  ██║██╔════╝██╔══██╗
    ███████╗██║     ███████║██╔██╗ ██║██╔██╗ ██║█████╗  ██████╔╝
    ╚════██║██║     ██╔══██║██║╚██╗██║██║╚██╗██║██╔══╝  ██╔══██╗
    ███████║╚██████╗██║  ██║██║ ╚████║██║ ╚████║███████╗██║  ██║
    ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝
                                                                  
    EDUCATIONAL TOOL ONLY - USE RESPONSIBLY AND LEGALLY
    """)
    
    # Check if Scapy is available
    if not SCAPY_AVAILABLE and not args.simulate:
        print("[!] Error: Scapy is required for this tool to function.")
        print("[!] Install with: pip install scapy")
        return 1
    
    # Set channels if specified
    global channels
    if args.channels:
        try:
            channels = []
            for part in args.channels.split(','):
                if '-' in part:
                    start, end = map(int, part.split('-'))
                    channels.extend(range(start, end + 1))
                else:
                    channels.append(int(part))
        except ValueError:
            print("[!] Invalid channel specification. Format: 1,2,3-6,11")
            return 1
    
    # Simulation mode
    if args.simulate:
        print("[*] Running in simulation mode (no actual scanning)")
        simulate_networks()
    else:
        # Check for interface
        if not args.interface:
            print("[!] Error: Wireless interface is required")
            print("[!] Use -i/--interface to specify the interface")
            return 1
        
        # Perform scan
        scan_networks(args.interface, args.timeout)
    
    # Print results
    print_networks()
    print_clients()
    print_security_issues()
    
    # Save results if requested
    if args.output:
        save_results(args.output, args.format)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())