#!/usr/bin/env python3

"""
Packet Analyzer - A simple packet capture and analysis tool

This script provides basic packet capture and analysis functionality for educational purposes.
It uses scapy to capture network packets and provides analysis of common protocols.

For educational purposes only.
"""

import argparse
import datetime
import os
import sys
from collections import Counter, defaultdict

try:
    from scapy.all import sniff, wrpcap, rdpcap, IP, TCP, UDP, ICMP, DNS, ARP, Ether
    from scapy.layers.http import HTTP
except ImportError:
    print("Error: This script requires scapy. Install it with 'pip install scapy'.")
    sys.exit(1)

class PacketAnalyzer:
    """A class for capturing and analyzing network packets."""
    
    def __init__(self, interface=None, pcap_file=None, count=100, timeout=None, filter_str=None):
        """Initialize the packet analyzer.
        
        Args:
            interface (str): Network interface to capture from
            pcap_file (str): PCAP file to read from or write to
            count (int): Number of packets to capture
            timeout (int): Timeout for packet capture in seconds
            filter_str (str): BPF filter string
        """
        self.interface = interface
        self.pcap_file = pcap_file
        self.count = count
        self.timeout = timeout
        self.filter_str = filter_str
        self.packets = []
        self.stats = {}
    
    def capture_packets(self):
        """Capture packets from the network interface."""
        print(f"\n[*] Starting packet capture on {self.interface}...")
        print(f"[*] Capturing {self.count} packets or until {self.timeout}s timeout...")
        if self.filter_str:
            print(f"[*] Using filter: {self.filter_str}")
        
        try:
            self.packets = sniff(
                iface=self.interface,
                count=self.count,
                timeout=self.timeout,
                filter=self.filter_str,
                prn=lambda x: self._packet_callback(x)
            )
            print(f"\n[+] Captured {len(self.packets)} packets")
            
            if self.pcap_file:
                wrpcap(self.pcap_file, self.packets)
                print(f"[+] Saved packets to {self.pcap_file}")
        
        except KeyboardInterrupt:
            print("\n[!] Capture interrupted by user")
            if self.packets and self.pcap_file:
                wrpcap(self.pcap_file, self.packets)
                print(f"[+] Saved {len(self.packets)} packets to {self.pcap_file}")
        
        except Exception as e:
            print(f"\n[!] Error during packet capture: {e}")
    
    def read_pcap(self):
        """Read packets from a PCAP file."""
        if not os.path.exists(self.pcap_file):
            print(f"[!] Error: PCAP file {self.pcap_file} does not exist")
            return False
        
        try:
            print(f"\n[*] Reading packets from {self.pcap_file}...")
            self.packets = rdpcap(self.pcap_file)
            print(f"[+] Read {len(self.packets)} packets")
            return True
        except Exception as e:
            print(f"[!] Error reading PCAP file: {e}")
            return False
    
    def _packet_callback(self, packet):
        """Callback function for packet capture.
        
        Args:
            packet: The captured packet
            
        Returns:
            packet: The same packet (for prn)
        """
        # Print a simple one-line summary of the packet
        summary = self._get_packet_summary(packet)
        print(f"[>] {summary}")
        return packet
    
    def _get_packet_summary(self, packet):
        """Get a one-line summary of a packet.
        
        Args:
            packet: The packet to summarize
            
        Returns:
            str: A summary of the packet
        """
        timestamp = datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3]
        
        if IP in packet:
            src_ip = packet[IP].src
            dst_ip = packet[IP].dst
            proto = packet[IP].proto
            
            if TCP in packet:
                sport = packet[TCP].sport
                dport = packet[TCP].dport
                flags = self._get_tcp_flags(packet[TCP].flags)
                return f"{timestamp} {src_ip}:{sport} -> {dst_ip}:{dport} [TCP] {flags}"
            
            elif UDP in packet:
                sport = packet[UDP].sport
                dport = packet[UDP].dport
                
                if DNS in packet:
                    return f"{timestamp} {src_ip}:{sport} -> {dst_ip}:{dport} [DNS] {self._get_dns_summary(packet)}"
                else:
                    return f"{timestamp} {src_ip}:{sport} -> {dst_ip}:{dport} [UDP]"
            
            elif ICMP in packet:
                icmp_type = packet[ICMP].type
                return f"{timestamp} {src_ip} -> {dst_ip} [ICMP] Type: {icmp_type}"
            
            else:
                return f"{timestamp} {src_ip} -> {dst_ip} [IP] Proto: {proto}"
        
        elif ARP in packet:
            return f"{timestamp} [ARP] {packet[ARP].psrc} -> {packet[ARP].pdst}"
        
        else:
            return f"{timestamp} [???] Unknown packet type"
    
    def _get_tcp_flags(self, flags):
        """Get a string representation of TCP flags.
        
        Args:
            flags: The TCP flags field
            
        Returns:
            str: A string representation of the flags
        """
        flag_str = ""
        if flags & 0x01: flag_str += "F"
        if flags & 0x02: flag_str += "S"
        if flags & 0x04: flag_str += "R"
        if flags & 0x08: flag_str += "P"
        if flags & 0x10: flag_str += "A"
        if flags & 0x20: flag_str += "U"
        if flags & 0x40: flag_str += "E"
        if flags & 0x80: flag_str += "C"
        
        return flag_str if flag_str else "."
    
    def _get_dns_summary(self, packet):
        """Get a summary of a DNS packet.
        
        Args:
            packet: The DNS packet
            
        Returns:
            str: A summary of the DNS packet
        """
        if packet.haslayer(DNS):
            qname = packet[DNS].qd.qname.decode() if packet[DNS].qd else "-"
            qtype = packet[DNS].qd.qtype if packet[DNS].qd else 0
            
            if packet[DNS].qr == 0:
                return f"Query: {qname} (Type: {qtype})"
            else:
                return f"Response: {qname} (Type: {qtype})"
        return "DNS packet"
    
    def analyze_packets(self):
        """Analyze the captured packets and generate statistics."""
        if not self.packets:
            print("[!] No packets to analyze")
            return
        
        print("\n[*] Analyzing packets...")
        
        # Initialize statistics
        stats = {
            "total_packets": len(self.packets),
            "protocols": Counter(),
            "ip_sources": Counter(),
            "ip_destinations": Counter(),
            "tcp_ports": defaultdict(Counter),
            "udp_ports": defaultdict(Counter),
            "packet_sizes": [],
            "tcp_flags": Counter(),
            "dns_queries": Counter(),
            "http_methods": Counter(),
        }
        
        # Analyze each packet
        for packet in self.packets:
            # Packet size
            stats["packet_sizes"].append(len(packet))
            
            # Ethernet layer
            if Ether in packet:
                stats["protocols"]["Ethernet"] += 1
            
            # ARP
            if ARP in packet:
                stats["protocols"]["ARP"] += 1
            
            # IP layer
            if IP in packet:
                stats["protocols"]["IP"] += 1
                stats["ip_sources"][packet[IP].src] += 1
                stats["ip_destinations"][packet[IP].dst] += 1
                
                # TCP
                if TCP in packet:
                    stats["protocols"]["TCP"] += 1
                    stats["tcp_ports"]["src"][packet[TCP].sport] += 1
                    stats["tcp_ports"]["dst"][packet[TCP].dport] += 1
                    stats["tcp_flags"][self._get_tcp_flags(packet[TCP].flags)] += 1
                    
                    # HTTP
                    if packet.haslayer(HTTP):
                        stats["protocols"]["HTTP"] += 1
                        if hasattr(packet[HTTP], "Method"):
                            stats["http_methods"][packet[HTTP].Method.decode()] += 1
                
                # UDP
                elif UDP in packet:
                    stats["protocols"]["UDP"] += 1
                    stats["udp_ports"]["src"][packet[UDP].sport] += 1
                    stats["udp_ports"]["dst"][packet[UDP].dport] += 1
                    
                    # DNS
                    if DNS in packet:
                        stats["protocols"]["DNS"] += 1
                        if packet[DNS].qd and packet[DNS].qr == 0:  # DNS query
                            qname = packet[DNS].qd.qname.decode()
                            stats["dns_queries"][qname] += 1
                
                # ICMP
                elif ICMP in packet:
                    stats["protocols"]["ICMP"] += 1
        
        self.stats = stats
        self._print_statistics()
    
    def _print_statistics(self):
        """Print the packet analysis statistics."""
        stats = self.stats
        
        print("\n===== Packet Analysis Results =====")
        print(f"Total Packets: {stats['total_packets']}")
        
        # Packet sizes
        if stats["packet_sizes"]:
            avg_size = sum(stats["packet_sizes"]) / len(stats["packet_sizes"])
            min_size = min(stats["packet_sizes"])
            max_size = max(stats["packet_sizes"])
            print(f"\nPacket Sizes: Min: {min_size} bytes, Avg: {avg_size:.1f} bytes, Max: {max_size} bytes")
        
        # Protocol distribution
        print("\nProtocol Distribution:")
        for proto, count in sorted(stats["protocols"].items(), key=lambda x: x[1], reverse=True):
            percentage = (count / stats["total_packets"]) * 100
            print(f"  {proto}: {count} ({percentage:.1f}%)")
        
        # IP statistics
        if stats["ip_sources"]:
            print("\nTop 5 Source IP Addresses:")
            for ip, count in stats["ip_sources"].most_common(5):
                percentage = (count / stats["total_packets"]) * 100
                print(f"  {ip}: {count} ({percentage:.1f}%)")
        
        if stats["ip_destinations"]:
            print("\nTop 5 Destination IP Addresses:")
            for ip, count in stats["ip_destinations"].most_common(5):
                percentage = (count / stats["total_packets"]) * 100
                print(f"  {ip}: {count} ({percentage:.1f}%)")
        
        # TCP statistics
        if stats["tcp_ports"]["src"]:
            print("\nTop 5 TCP Source Ports:")
            for port, count in stats["tcp_ports"]["src"].most_common(5):
                print(f"  {port}: {count}")
        
        if stats["tcp_ports"]["dst"]:
            print("\nTop 5 TCP Destination Ports:")
            for port, count in stats["tcp_ports"]["dst"].most_common(5):
                print(f"  {port}: {count}")
        
        if stats["tcp_flags"]:
            print("\nTCP Flags Distribution:")
            for flags, count in sorted(stats["tcp_flags"].items(), key=lambda x: x[1], reverse=True):
                percentage = (count / stats["protocols"]["TCP"]) * 100 if "TCP" in stats["protocols"] else 0
                print(f"  {flags}: {count} ({percentage:.1f}%)")
        
        # UDP statistics
        if stats["udp_ports"]["src"]:
            print("\nTop 5 UDP Source Ports:")
            for port, count in stats["udp_ports"]["src"].most_common(5):
                print(f"  {port}: {count}")
        
        if stats["udp_ports"]["dst"]:
            print("\nTop 5 UDP Destination Ports:")
            for port, count in stats["udp_ports"]["dst"].most_common(5):
                print(f"  {port}: {count}")
        
        # DNS statistics
        if stats["dns_queries"]:
            print("\nTop 5 DNS Queries:")
            for query, count in stats["dns_queries"].most_common(5):
                print(f"  {query}: {count}")
        
        # HTTP statistics
        if stats["http_methods"]:
            print("\nHTTP Methods:")
            for method, count in sorted(stats["http_methods"].items(), key=lambda x: x[1], reverse=True):
                print(f"  {method}: {count}")
        
        print("\n====================================")

def main():
    """Main function to parse arguments and run the packet analyzer."""
    parser = argparse.ArgumentParser(description="A simple packet capture and analysis tool for educational purposes.")
    
    # Capture options
    capture_group = parser.add_argument_group("Capture Options")
    capture_group.add_argument("-i", "--interface", help="Network interface to capture from")
    capture_group.add_argument("-c", "--count", type=int, default=100, help="Number of packets to capture (default: 100)")
    capture_group.add_argument("-t", "--timeout", type=int, help="Timeout for packet capture in seconds")
    capture_group.add_argument("-f", "--filter", help="BPF filter string (e.g., 'tcp port 80')")
    
    # File options
    file_group = parser.add_argument_group("File Options")
    file_group.add_argument("-r", "--read", help="Read packets from PCAP file instead of capturing")
    file_group.add_argument("-w", "--write", help="Write captured packets to PCAP file")
    
    # Analysis options
    analysis_group = parser.add_argument_group("Analysis Options")
    analysis_group.add_argument("-a", "--analyze", action="store_true", help="Analyze packets and print statistics")
    
    args = parser.parse_args()
    
    # Validate arguments
    if args.read:
        # Reading from file
        analyzer = PacketAnalyzer(pcap_file=args.read)
        if analyzer.read_pcap() and args.analyze:
            analyzer.analyze_packets()
    
    elif args.interface:
        # Capturing from interface
        analyzer = PacketAnalyzer(
            interface=args.interface,
            pcap_file=args.write,
            count=args.count,
            timeout=args.timeout,
            filter_str=args.filter
        )
        analyzer.capture_packets()
        
        if args.analyze:
            analyzer.analyze_packets()
    
    else:
        parser.print_help()
        print("\nError: You must specify either an interface (-i) to capture from or a PCAP file (-r) to read.")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nProgram interrupted by user. Exiting...")
        sys.exit(0)
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)