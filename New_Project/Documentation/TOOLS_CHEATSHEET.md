# Cybersecurity Tools Cheatsheet

## Reconnaissance Tools

### Nmap
**Purpose**: Network discovery and security auditing
```bash
# Basic scan
nmap <target>

# Scan specific ports
nmap -p 80,443,8080 <target>

# Service and version detection
nmap -sV <target>

# OS detection
nmap -O <target>

# Comprehensive scan
nmap -sS -sV -sC -A -O -p- <target>

# Save output
nmap <target> -oN output.txt
```

### Sublist3r
**Purpose**: Subdomain enumeration
```bash
# Basic usage
sublist3r -d example.com

# Specify threads
sublist3r -d example.com -t 50

# Use specific search engine
sublist3r -d example.com -e google,yahoo,bing

# Save output
sublist3r -d example.com -o output.txt
```

### theHarvester
**Purpose**: Gather emails, subdomains, hosts, employee names, open ports and banners
```bash
# Basic usage
theHarvester -d example.com -b all

# Specify data source
theHarvester -d example.com -b google,linkedin

# Limit results
theHarvester -d example.com -b all -l 500
```

## Web Application Security Tools

### Burp Suite
**Purpose**: Web application security testing

**Key Features**:
- Proxy: Intercept and modify requests/responses
- Scanner: Automated vulnerability detection
- Intruder: Customized attack payloads
- Repeater: Manual request manipulation
- Decoder: Encode/decode data

**Common Shortcuts**:
- Ctrl+R: Send to Repeater
- Ctrl+I: Send to Intruder
- Ctrl+Shift+B: Send to Browser

### OWASP ZAP
**Purpose**: Open-source web application security scanner
```bash
# Quick scan
zap-cli quick-scan --self-contained --start-options "-config api.disablekey=true" https://example.com

# Full scan
zap-cli full-scan --self-contained --start-options "-config api.disablekey=true" https://example.com
```

### Nikto
**Purpose**: Web server scanner
```bash
# Basic scan
nikto -h example.com

# Scan with SSL
nikto -h example.com -ssl

# Scan specific port
nikto -h example.com -p 8080

# Save output
nikto -h example.com -o output.txt -Format txt
```

### SQLmap
**Purpose**: Automated SQL injection detection and exploitation
```bash
# Basic scan
sqlmap -u "http://example.com/page.php?id=1"

# Specify parameter to test
sqlmap -u "http://example.com/page.php?id=1" -p id

# Use POST data
sqlmap -u "http://example.com/login.php" --data="username=test&password=test"

# Dump database
sqlmap -u "http://example.com/page.php?id=1" --dump

# Specify database
sqlmap -u "http://example.com/page.php?id=1" -D database_name --tables
```

## Password and Authentication Tools

### Hydra
**Purpose**: Online password cracking tool
```bash
# HTTP Basic Auth
hydra -l admin -P wordlist.txt example.com http-get /admin/

# SSH
hydra -l user -P wordlist.txt ssh://example.com

# FTP
hydra -l user -P wordlist.txt ftp://example.com

# POST form
hydra -l admin -P wordlist.txt example.com http-post-form "/login:username=^USER^&password=^PASS^:F=Login failed"
```

### John the Ripper
**Purpose**: Offline password cracking
```bash
# Basic usage
john --wordlist=wordlist.txt hashes.txt

# Specify format
john --format=md5 --wordlist=wordlist.txt hashes.txt

# Show cracked passwords
john --show hashes.txt
```

### Hashcat
**Purpose**: Advanced password recovery
```bash
# MD5 cracking
hashcat -m 0 -a 0 hashes.txt wordlist.txt

# SHA1 cracking
hashcat -m 100 -a 0 hashes.txt wordlist.txt

# Windows NTLM
hashcat -m 1000 -a 0 hashes.txt wordlist.txt

# Rule-based attack
hashcat -m 0 -a 0 hashes.txt wordlist.txt -r rules/best64.rule
```

## Network Security Tools

### Wireshark
**Purpose**: Network protocol analyzer

**Common Filters**:
```
# HTTP traffic
http

# IP address
ip.addr == 192.168.1.1

# TCP port
tcp.port == 80

# DNS queries
dns

# Exclude traffic
!arp
```

### Metasploit Framework
**Purpose**: Penetration testing framework
```bash
# Start Metasploit
msfconsole

# Search for exploits
search type:exploit platform:windows ms17-010

# Use a module
use exploit/windows/smb/ms17_010_eternalblue

# Set options
set RHOSTS 192.168.1.10
set LHOST 192.168.1.5

# Run exploit
exploit
```

### Aircrack-ng
**Purpose**: Wireless network security assessment
```bash
# Monitor mode
airmon-ng start wlan0

# Capture packets
airodump-ng wlan0mon

# Capture packets for specific AP
airodump-ng -c 1 --bssid 00:11:22:33:44:55 -w output wlan0mon

# Deauthentication attack
aireplay-ng -0 5 -a 00:11:22:33:44:55 -c AA:BB:CC:DD:EE:FF wlan0mon

# Crack WPA handshake
aircrack-ng -w wordlist.txt output-01.cap
```

## Forensics Tools

### Volatility
**Purpose**: Memory forensics
```bash
# Identify profile
volatility -f memory.dmp imageinfo

# Process list
volatility -f memory.dmp --profile=Win10x64_19041 pslist

# Network connections
volatility -f memory.dmp --profile=Win10x64_19041 netscan

# Command history
volatility -f memory.dmp --profile=Win10x64_19041 cmdscan

# Registry hives
volatility -f memory.dmp --profile=Win10x64_19041 hivelist
```

### Autopsy
**Purpose**: Digital forensics platform

**Key Features**:
- Timeline analysis
- Keyword search
- File type identification
- Hash matching
- Web artifacts analysis

### Sleuth Kit
**Purpose**: File system forensics
```bash
# List partitions
mmls disk.img

# File system analysis
fsstat -o offset disk.img

# List files and directories
fls -o offset disk.img

# Extract file by inode
icat -o offset disk.img inode > output_file
```

## Reverse Engineering Tools

### Ghidra
**Purpose**: Software reverse engineering

**Key Features**:
- Disassembly
- Decompilation
- Function graphing
- Scripting

**Common Shortcuts**:
- G: Go to address
- Ctrl+Shift+F: Search
- F: Function graph

### Radare2
**Purpose**: Reverse engineering framework
```bash
# Open binary
r2 -A binary

# Analyze all
aaa

# List functions
afl

# Disassemble function
pdf @main

# Enter visual mode
v
```

### x64dbg
**Purpose**: Windows debugger

**Key Features**:
- Breakpoints
- Memory map
- Call stack
- Patching

**Common Shortcuts**:
- F7: Step into
- F8: Step over
- F9: Run/continue

## Cryptography Tools

### OpenSSL
**Purpose**: Cryptography toolkit
```bash
# Generate RSA key pair
openssl genrsa -out private.key 2048
openssl rsa -in private.key -pubout -out public.key

# Encrypt/Decrypt with RSA
openssl rsautl -encrypt -pubin -inkey public.key -in plaintext.txt -out encrypted.txt
openssl rsautl -decrypt -inkey private.key -in encrypted.txt -out decrypted.txt

# Generate hash
openssl dgst -sha256 file.txt

# Base64 encode/decode
openssl base64 -in file.txt -out encoded.txt
openssl base64 -d -in encoded.txt -out decoded.txt
```

### GnuPG
**Purpose**: Encryption and signing
```bash
# Generate key pair
gpg --gen-key

# Export public key
gpg --export --armor user@example.com > public.key

# Import public key
gpg --import public.key

# Encrypt file
gpg --encrypt --recipient user@example.com file.txt

# Decrypt file
gpg --decrypt file.txt.gpg > decrypted.txt

# Sign file
gpg --sign file.txt
```

## Ethical Guidelines for Tool Usage

1. **Always obtain proper authorization** before using security tools on any system or network

2. **Document your activities** when performing security testing

3. **Respect the scope** of any security assessment

4. **Report vulnerabilities responsibly** following proper disclosure procedures

5. **Never use security tools for illegal activities** or unauthorized access

6. **Keep tools updated** to ensure accurate results and avoid false positives

7. **Practice in controlled environments** before using tools in production