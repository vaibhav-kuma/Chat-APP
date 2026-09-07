#!/usr/bin/env python3

"""
Basic Network Scanner

This script provides a simple network scanning tool for educational purposes.
It can perform port scanning and basic host discovery on a target network.

Usage:
    python network_scanner.py -t TARGET [-p PORTS] [-m MODE]

Examples:
    python network_scanner.py -t 192.168.1.1 -p 80,443,8080 -m port
    python network_scanner.py -t 192.168.1.0/24 -m ping

Disclaimer:
    This tool is for educational purposes only. Only scan networks you have permission to test.
"""

import argparse
import ipaddress
import socket
import struct
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

# Maximum number of threads to use for scanning
MAX_THREADS = 100

# Timeout for socket connections (in seconds)
SOCKET_TIMEOUT = 1.0

# Common ports to scan if none specified
COMMON_PORTS = [21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 993, 995, 1723, 3306, 3389, 5900, 8080]

# Service names for common ports
PORT_NAMES = {
    21: "FTP",
    22: "SSH",
    23: "Telnet",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    110: "POP3",
    111: "RPC",
    135: "MSRPC",
    139: "NetBIOS",
    143: "IMAP",
    443: "HTTPS",
    445: "SMB",
    993: "IMAPS",
    995: "POP3S",
    1723: "PPTP",
    3306: "MySQL",
    3389: "RDP",
    5900: "VNC",
    8080: "HTTP-Proxy"
}

def create_icmp_packet(id=0):
    """
    Create a simple ICMP echo request packet.
    
    Args:
        id (int): ICMP packet identifier
        
    Returns:
        bytes: Raw ICMP packet
    """
    # ICMP type 8 (echo request), code 0
    icmp_type = 8
    icmp_code = 0
    checksum = 0
    sequence = 1
    payload = b'\x00' * 32  # 32 bytes of padding
    
    # Create the ICMP header
    header = struct.pack("!BBHHH", icmp_type, icmp_code, checksum, id, sequence)
    
    # Calculate the checksum on the header + payload
    checksum = calculate_checksum(header + payload)
    
    # Recreate the header with the correct checksum
    header = struct.pack("!BBHHH", icmp_type, icmp_code, checksum, id, sequence)
    
    return header + payload

def calculate_checksum(data):
    """
    Calculate the Internet checksum of the supplied data.
    
    Args:
        data (bytes): Data to calculate checksum for
        
    Returns:
        int: Calculated checksum
    """
    checksum = 0
    count_to = (len(data) // 2) * 2
    
    for count in range(0, count_to, 2):
        this_val = data[count + 1] * 256 + data[count]
        checksum += this_val
        checksum &= 0xffffffff
    
    if count_to < len(data):
        checksum += data[len(data) - 1]
        checksum &= 0xffffffff
    
    checksum = (checksum >> 16) + (checksum & 0xffff)
    checksum += (checksum >> 16)
    answer = ~checksum
    answer &= 0xffff
    
    return answer

def ping_host(ip):
    """
    Send an ICMP echo request to a host and check for a response.
    
    Args:
        ip (str): IP address to ping
        
    Returns:
        bool: True if host responds, False otherwise
    """
    try:
        # Create a raw socket
        with socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_ICMP) as sock:
            sock.settimeout(SOCKET_TIMEOUT)
            
            # Send the ICMP packet
            packet = create_icmp_packet()
            sock.sendto(packet, (ip, 0))
            
            # Wait for a response
            start_time = time.time()
            while time.time() - start_time < SOCKET_TIMEOUT:
                try:
                    data, addr = sock.recvfrom(1024)
                    if addr[0] == ip:
                        return True
                except socket.timeout:
                    break
            
            return False
    except (socket.error, PermissionError):
        # Raw sockets typically require admin/root privileges
        print("Error: ICMP scanning requires administrative privileges.")
        print("Try running the script with administrator/root privileges.")
        return False

def scan_port(ip, port):
    """
    Check if a specific port is open on a host.
    
    Args:
        ip (str): IP address to scan
        port (int): Port number to check
        
    Returns:
        tuple: (port, is_open, service_name)
    """
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(SOCKET_TIMEOUT)
    
    result = sock.connect_ex((ip, port))
    is_open = (result == 0)
    
    service_name = PORT_NAMES.get(port, "Unknown")
    
    sock.close()
    return (port, is_open, service_name)

def scan_host(ip, ports):
    """
    Scan a host for open ports.
    
    Args:
        ip (str): IP address to scan
        ports (list): List of port numbers to scan
        
    Returns:
        list: List of open ports with their service names
    """
    print(f"\nScanning {ip} for open ports...")
    open_ports = []
    
    try:
        # Try to get the hostname
        hostname = socket.gethostbyaddr(ip)[0]
        print(f"Hostname: {hostname}")
    except socket.herror:
        hostname = "Unknown"
    
    # Use ThreadPoolExecutor for parallel scanning
    with ThreadPoolExecutor(max_workers=min(MAX_THREADS, len(ports))) as executor:
        results = list(executor.map(lambda p: scan_port(ip, p), ports))
    
    # Filter and sort the results
    open_ports = [(port, service) for port, is_open, service in results if is_open]
    open_ports.sort()
    
    if open_ports:
        print(f"Open ports on {ip}:")
        for port, service in open_ports:
            print(f"  {port}/tcp - {service}")
    else:
        print(f"No open ports found on {ip}")
    
    return open_ports

def discover_hosts(network):
    """
    Discover active hosts on a network using ICMP ping.
    
    Args:
        network (str): Network address in CIDR notation (e.g., 192.168.1.0/24)
        
    Returns:
        list: List of active IP addresses
    """
    try:
        # Parse the network address
        ip_network = ipaddress.ip_network(network, strict=False)
        total_hosts = ip_network.num_addresses
        
        if total_hosts > 256:
            confirm = input(f"Warning: You are about to scan {total_hosts} hosts. Continue? (y/n): ")
            if confirm.lower() != 'y':
                print("Scan aborted.")
                return []
        
        print(f"\nDiscovering hosts on {network}...")
        print(f"This may take some time. Scanning {total_hosts} potential hosts.")
        
        active_hosts = []
        hosts_checked = 0
        
        # Use ThreadPoolExecutor for parallel scanning
        with ThreadPoolExecutor(max_workers=MAX_THREADS) as executor:
            # Convert to list to force immediate execution
            results = list(executor.map(ping_host, [str(ip) for ip in ip_network.hosts()]))
            
            # Process results
            for i, ip in enumerate(ip_network.hosts()):
                if results[i]:
                    print(f"Host {ip} is up")
                    active_hosts.append(str(ip))
                hosts_checked += 1
                
                # Print progress every 10 hosts
                if hosts_checked % 10 == 0:
                    print(f"Progress: {hosts_checked}/{total_hosts} hosts checked")
        
        print(f"\nDiscovered {len(active_hosts)} active hosts out of {total_hosts} potential hosts.")
        return active_hosts
    
    except ValueError as e:
        print(f"Error: {e}")
        return []

def main():
    """
    Main function to parse arguments and run the scanner.
    """
    parser = argparse.ArgumentParser(description="Basic Network Scanner for educational purposes")
    parser.add_argument("-t", "--target", required=True, help="Target IP address or network (CIDR notation)")
    parser.add_argument("-p", "--ports", help="Comma-separated list of ports to scan (default: common ports)")
    parser.add_argument("-m", "--mode", choices=["port", "ping"], default="port",
                        help="Scan mode: 'port' for port scanning, 'ping' for host discovery")
    
    args = parser.parse_args()
    
    print("\n===== Basic Network Scanner =====")
    print("For educational purposes only")
    print("===================================\n")
    
    # Print a warning about legal usage
    print("WARNING: Only scan networks you have permission to test.")
    print("Unauthorized scanning may be illegal in your jurisdiction.\n")
    
    # Record start time
    start_time = datetime.now()
    print(f"Scan started at: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Parse ports if specified
    if args.ports:
        try:
            ports = [int(p) for p in args.ports.split(',')]
        except ValueError:
            print("Error: Ports must be comma-separated integers")
            return 1
    else:
        ports = COMMON_PORTS
    
    # Determine if target is a single host or a network
    target = args.target
    is_network = '/' in target
    
    # Run the appropriate scan based on mode and target type
    if args.mode == "ping" or is_network:
        if not is_network:
            # If it's a single IP in ping mode, just ping it
            if ping_host(target):
                print(f"Host {target} is up")
                active_hosts = [target]
            else:
                print(f"Host {target} appears to be down")
                active_hosts = []
        else:
            # Discover hosts on the network
            active_hosts = discover_hosts(target)
        
        # If in port mode and we found active hosts, scan their ports
        if args.mode == "port" and active_hosts:
            for host in active_hosts:
                scan_host(host, ports)
    else:
        # Single host port scan
        scan_host(target, ports)
    
    # Record end time and print duration
    end_time = datetime.now()
    duration = end_time - start_time
    print(f"\nScan completed at: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Duration: {duration}")
    
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nScan interrupted by user")
        sys.exit(1)