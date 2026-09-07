# Cybersecurity Tools and Scripts

## Overview
This directory contains useful tools, scripts, and utilities for various cybersecurity tasks and exercises. These tools are designed for educational purposes to help you understand cybersecurity concepts through hands-on practice.

## Categories
- Reconnaissance Tools
- Vulnerability Scanning
- Exploitation Frameworks
- Post-Exploitation
- Forensics Utilities
- Cryptography Tools
- Defensive Security

## Available Tools

### Network Scanner (`network_scanner.py`)
A basic network scanning tool that can perform port scanning and host discovery using ICMP pings.
- Features: Multi-threading, common port definitions, and argument parsing
- Usage: `python network_scanner.py -t <target> -p <ports> -m <scan_mode>`

### Password Cracker (`password_cracker.py`)
A basic password cracking tool that can perform dictionary and brute-force attacks on password hashes.
- Supports: MD5, SHA1, SHA256, and SHA512 algorithms
- Usage: `python password_cracker.py -m <mode> -H <hash> -w <wordlist> -c <charset> -l <max_length>`

### File Analyzer (`file_analyzer.py`)
A simple file analysis tool for digital forensics education.
- Features: File metadata analysis, hash calculation, string extraction, and file signature analysis
- Usage: `python file_analyzer.py -f <file> [-m <mode>] [-o <output>]`

### Steganography Tool (`steganography.py`)
A basic steganography tool for hiding and extracting data in images.
- Features: Hide text or files in PNG images using LSB technique
- Usage: 
  - Hide: `python steganography.py -m hide -i input.png -o output.png -d "Secret message"`
  - Extract: `python steganography.py -m extract -i stego.png -t text`

### Encryption Tool (`encryption_tool.py`)
A simple encryption and decryption tool supporting multiple algorithms.
- Features: AES, RSA, and XOR encryption/decryption
- Usage:
  - AES: `python encryption_tool.py -m encrypt -a aes -i input.txt -o encrypted.bin -p "password"`
  - RSA: `python encryption_tool.py -m generate -a rsa -k key_prefix`
  - XOR: `python encryption_tool.py -m encrypt -a xor -i input.txt -o encrypted.bin -p "password"`

### Packet Analyzer (`packet_analyzer.py`)
A network packet capture and analysis tool for monitoring network traffic.
- Features: Packet capture, protocol analysis, traffic statistics, and PCAP file handling
- Requirements: Requires the Scapy library (`pip install scapy`)
- Usage:
  - Capture: `python packet_analyzer.py -i <interface> -c <count> -w <output.pcap> -a`
  - Analyze PCAP: `python packet_analyzer.py -r <input.pcap> -a`
  - Filter traffic: `python packet_analyzer.py -i <interface> -f "tcp port 80" -a`

### Web Vulnerability Scanner (`web_vulnerability_scanner.py`)
A web application security scanner that detects common vulnerabilities.
- Features: Crawling, XSS detection, SQL injection detection, open redirect detection, LFI detection
- Requirements: Requires the requests and beautifulsoup4 libraries (`pip install requests beautifulsoup4`)
- Usage:
  - Basic scan: `python web_vulnerability_scanner.py -u https://example.com`
  - With authentication: `python web_vulnerability_scanner.py -u https://example.com -c "session=abc123"`
  - Deep scan: `python web_vulnerability_scanner.py -u https://example.com -d 3 -t 10`
  - Save report: `python web_vulnerability_scanner.py -u https://example.com -o report.json`

### Malware Analyzer (`malware_analyzer.py`)
A static analysis tool for examining potentially malicious files.
- Features: File hashing, string extraction, PE file analysis, suspicious pattern detection
- Requirements: Optional pefile library for enhanced PE analysis (`pip install pefile`)
- Usage:
  - Basic analysis: `python malware_analyzer.py suspicious_file.exe`
  - With string extraction: `python malware_analyzer.py suspicious_file.exe -s`
  - PE file analysis: `python malware_analyzer.py suspicious_file.exe -p`
  - Save report: `python malware_analyzer.py suspicious_file.exe -s -p -o report.json`
  - Verbose output: `python malware_analyzer.py suspicious_file.exe -s -p -v`

### Wireless Analyzer (`wireless_analyzer.py`)
A wireless network security assessment tool for analyzing WiFi networks.
- Features: Network scanning, encryption analysis, rogue AP detection, deauthentication attack detection
- Requirements: Requires the Scapy library (`pip install scapy`)
- Usage:
  - Basic scan: `python wireless_analyzer.py -i wlan0 -t 60`
  - Specific channels: `python wireless_analyzer.py -i wlan0 -c 1,6,11`
  - Save results: `python wireless_analyzer.py -i wlan0 -o results.json`
  - Simulation mode: `python wireless_analyzer.py -s`

### Forensic Imager (`forensic_imager.py`)
A disk imaging and verification tool for digital forensics.
- Features: Disk imaging, hash verification (MD5, SHA1, SHA256), splitting/merging large images
- Requirements: No external dependencies required
- Usage:
  - Create image: `python forensic_imager.py create source.img destination.dd -m metadata.json`
  - Verify image: `python forensic_imager.py verify source.img image.dd -a md5,sha256`
  - Split image: `python forensic_imager.py split large_image.dd output_prefix -s 2000`
  - Merge chunks: `python forensic_imager.py merge split_metadata.json merged_image.dd`

## Usage Guidelines
- All tools are for educational purposes only
- Always obtain proper authorization before using these tools on any system
- Practice in controlled, legal environments only

## Contributing
To add your own tools or scripts:
1. Create a subdirectory with a descriptive name
2. Include a detailed README.md explaining the tool's purpose and usage
3. Document any dependencies and installation requirements
4. Provide examples of common use cases

## Recommended External Tools
- Kali Linux - Security-focused Linux distribution
- Metasploit Framework - Penetration testing framework
- Burp Suite - Web vulnerability scanner
- Wireshark - Network protocol analyzer
- Volatility - Memory forensics framework

## Getting Started
Explore the subdirectories to find tools relevant to your current learning focus. Each tool includes documentation on installation and basic usage.