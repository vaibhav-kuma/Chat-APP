#!/usr/bin/env python3

"""
Basic File Analyzer

This script provides a simple file analysis tool for digital forensics education.
It can analyze file metadata, extract strings, calculate hashes, and perform basic
file signature analysis.

Usage:
    python file_analyzer.py -f FILE [-m MODE] [-o OUTPUT]

Examples:
    python file_analyzer.py -f suspicious.exe -m all
    python file_analyzer.py -f document.pdf -m strings -o results.txt

Disclaimer:
    This tool is for educational purposes only. Only analyze files you own or have permission to examine.
"""

import argparse
import binascii
import datetime
import hashlib
import magic
import os
import re
import sys
import time

# File signatures (magic numbers) for common file types
FILE_SIGNATURES = {
    b'\x89PNG\r\n\x1a\n': 'PNG image',
    b'\xff\xd8\xff': 'JPEG image',
    b'GIF8': 'GIF image',
    b'PK\x03\x04': 'ZIP archive',
    b'Rar!\x1a\x07': 'RAR archive',
    b'7z\xbc\xaf\x27\x1c': '7-Zip archive',
    b'%PDF': 'PDF document',
    b'MZ': 'Windows executable',
    b'\x7fELF': 'ELF executable',
    b'\xca\xfe\xba\xbe': 'Mach-O executable (Universal)',
    b'\xfe\xed\xfa\xce': 'Mach-O executable (32-bit)',
    b'\xfe\xed\xfa\xcf': 'Mach-O executable (64-bit)',
    b'\x25\x50\x44\x46': 'PDF document',
    b'\x50\x4b\x03\x04': 'ZIP archive or Office document',
    b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1': 'Microsoft Office document (OLE)',
    b'\x75\x73\x74\x61\x72': 'TAR archive',
    b'\x1f\x8b\x08': 'GZIP archive',
    b'BZh': 'BZIP2 archive',
    b'\x42\x5a\x68': 'BZIP2 archive',
    b'\x1f\x9d': 'COMPRESS archive',
    b'\x04\x22\x4d\x18': 'LZ4 archive',
    b'\x28\xb5\x2f\xfd': 'ZSTD archive',
    b'\x52\x61\x72\x21\x1a\x07': 'RAR archive',
    b'\x37\x7a\xbc\xaf\x27\x1c': '7-Zip archive',
    b'\x50\x4b\x05\x06': 'ZIP archive (empty)',
    b'\x50\x4b\x07\x08': 'ZIP archive (spanned)',
    b'\x75\x73\x74\x61\x72\x00\x30\x30': 'TAR archive (UStar format)',
    b'\x75\x73\x74\x61\x72\x20\x20\x00': 'TAR archive (GNU format)',
    b'\x23\x21\x41\x4d\x52': 'AMR audio',
    b'\x49\x44\x33': 'MP3 audio (with ID3)',
    b'\xff\xfb': 'MP3 audio',
    b'\xff\xf3': 'MP3 audio',
    b'\xff\xf2': 'MP3 audio',
    b'\x66\x4c\x61\x43': 'FLAC audio',
    b'RIFF': 'WAV audio or AVI video',
    b'OggS': 'OGG audio or video',
    b'\x00\x00\x00\x14\x66\x74\x79\x70': 'MP4 video',
    b'\x00\x00\x00\x18\x66\x74\x79\x70': 'MP4 video',
    b'\x00\x00\x00\x1c\x66\x74\x79\x70': 'MP4 video',
    b'\x1a\x45\xdf\xa3': 'Matroska video or audio',
    b'\x30\x26\xb2\x75\x8e\x66\xcf\x11\xa6\xd9\x00\xaa\x00\x62\xce\x6c': 'ASF video',
    b'\x00\x00\x01\xba': 'MPEG video',
    b'\x00\x00\x01\xb3': 'MPEG video',
    b'\x4f\x67\x67\x53': 'OGG container',
    b'\x1f\x43\xb6\x75': 'Matroska media container',
    b'\x4a\x41\x52\x43\x53\x00': 'JARCS archive',
    b'\x53\x51\x4c\x69\x74\x65': 'SQLite database',
    b'\x53\x50\x30\x31': 'Amazon Kindle Update Package',
    b'\x49\x53\x63\x28': 'InstallShield CAB Archive',
    b'\x4c\x5a\x49\x50': 'LZIP archive',
    b'\x4d\x53\x43\x46': 'Microsoft CAB Archive',
    b'\x21\x3c\x61\x72\x63\x68\x3e': 'Linux deb archive',
    b'\x52\x45\x47\x45\x44\x49\x54': 'Windows Registry file',
    b'\x43\x72\x32\x34': 'Chrome extension or packaged app',
    b'\x4d\x53\x57\x49\x4d': 'Windows Imaging Format',
    b'\x53\x5a\x44\x44': 'Microsoft compressed file',
    b'\x46\x4c\x56': 'Flash video',
    b'\x1f\x8b': 'GZIP archive',
    b'\x42\x5a\x68': 'BZIP2 archive',
    b'\xfd\x37\x7a\x58\x5a\x00': 'XZ archive',
    b'\x04\x22\x4d\x18': 'LZ4 archive',
    b'\x37\x7a\xbc\xaf\x27\x1c': '7-Zip archive',
    b'\x1f\x9d\x90': 'COMPRESS archive',
    b'\x42\x4c\x45\x4e\x44\x45\x52': 'Blender file',
    b'\x42\x50\x47\xfb': 'Better Portable Graphics',
    b'\x00\x01\x00\x00\x00': 'TrueType font',
    b'\x4f\x54\x54\x4f': 'OpenType font',
    b'\x00\x00\x01\x00': 'Windows Icon',
    b'\x69\x63\x6e\x73': 'macOS Icon',
    b'\x00\x00\x02\x00': 'Windows Cursor',
    b'\x66\x74\x79\x70\x33\x67': '3GPP multimedia file',
    b'\x66\x74\x79\x70\x4d\x53\x4e\x56': 'MPEG-4 video file',
    b'\x47': 'MPEG transport stream',
    b'\x49\x49\x2a\x00': 'TIFF image (little-endian)',
    b'\x4d\x4d\x00\x2a': 'TIFF image (big-endian)',
    b'\x42\x4d': 'BMP image',
    b'\x38\x42\x50\x53': 'Photoshop document',
    b'\x46\x4f\x52\x4d': 'IFF file',
    b'\x50\x4b\x03\x04\x14\x00\x06\x00': 'JAR archive',
    b'\x5f\x27\xa8\x89': 'JAR archive',
    b'\x75\x73\x74\x61\x72': 'TAR archive',
    b'\x78\x61\x72\x21': 'XAR archive',
    b'\x50\x41\x52\x31': 'Apache PAR archive',
    b'\x4d\x53\x43\x46': 'Microsoft CAB file',
    b'\x49\x53\x63\x28': 'InstallShield CAB file',
    b'\x49\x53\x63\x29': 'InstallShield CAB file',
    b'\x61\x72\x63\x68\x00': 'Linux ar archive',
    b'\x78\x01\x73\x0d\x62\x62\x60': 'Apple Disk Image',
    b'\x78\x61\x72\x21': 'eXtensible ARchive',
    b'\x50\x4d\x4f\x43\x43\x4d\x4f\x43': 'Windows Prefetch file',
    b'\x4c\x00\x00\x00\x01\x14\x02\x00': 'Windows Event Log file',
    b'\x52\x45\x47\x45\x44\x49\x54': 'Windows Registry file',
    b'\x41\x43\x53\x44': 'AOL parameter/info file',
    b'\x43\x57\x53': 'Shockwave Flash file',
    b'\x46\x57\x53': 'Shockwave Flash file',
    b'\x66\x4c\x61\x43': 'Free Lossless Audio Codec file',
    b'\x4D\x54\x68\x64': 'MIDI file',
    b'\x52\x49\x46\x46': 'RIFF container (AVI, WAV)',
    b'\x77\x4F\x46\x46': 'WOFF File',
    b'\x77\x4F\x46\x32': 'WOFF2 File',
    b'\x3c\x3f\x78\x6d\x6c': 'XML file',
    b'\x3c\x68\x74\x6d\x6c': 'HTML file',
    b'\x3c\x21\x44\x4f\x43\x54\x59\x50\x45': 'HTML file',
    b'\x7b\x5c\x72\x74\x66': 'RTF file',
    b'\x0a\x0d': 'Text file (LF+CR line endings)',
    b'\x0d\x0a': 'Text file (CR+LF line endings)',
    b'\x7b\x0a': 'JSON file',
    b'\x7b\x0d': 'JSON file',
    b'\x7b\x20': 'JSON file',
    b'\x5b\x0a': 'JSON file',
    b'\x5b\x0d': 'JSON file',
    b'\x5b\x20': 'JSON file',
}

def calculate_hashes(file_path):
    """
    Calculate MD5, SHA-1, SHA-256, and SHA-512 hashes for a file.
    
    Args:
        file_path (str): Path to the file
        
    Returns:
        dict: Dictionary containing the calculated hashes
    """
    # Initialize hash objects
    md5 = hashlib.md5()
    sha1 = hashlib.sha1()
    sha256 = hashlib.sha256()
    sha512 = hashlib.sha512()
    
    # Read the file in chunks to handle large files efficiently
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            md5.update(chunk)
            sha1.update(chunk)
            sha256.update(chunk)
            sha512.update(chunk)
    
    # Return the calculated hashes
    return {
        'md5': md5.hexdigest(),
        'sha1': sha1.hexdigest(),
        'sha256': sha256.hexdigest(),
        'sha512': sha512.hexdigest()
    }

def get_file_metadata(file_path):
    """
    Get metadata for a file.
    
    Args:
        file_path (str): Path to the file
        
    Returns:
        dict: Dictionary containing file metadata
    """
    # Get file stats
    stats = os.stat(file_path)
    
    # Get file size in human-readable format
    size_bytes = stats.st_size
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0 or unit == 'TB':
            break
        size_bytes /= 1024.0
    
    # Format timestamps
    created = datetime.datetime.fromtimestamp(stats.st_ctime).strftime('%Y-%m-%d %H:%M:%S')
    modified = datetime.datetime.fromtimestamp(stats.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
    accessed = datetime.datetime.fromtimestamp(stats.st_atime).strftime('%Y-%m-%d %H:%M:%S')
    
    # Try to determine file type using python-magic
    try:
        file_type = magic.from_file(file_path)
        mime_type = magic.from_file(file_path, mime=True)
    except Exception:
        file_type = "Unknown"
        mime_type = "Unknown"
    
    # Return the metadata
    return {
        'name': os.path.basename(file_path),
        'path': os.path.abspath(file_path),
        'size': f"{size_bytes:.2f} {unit}",
        'size_bytes': stats.st_size,
        'created': created,
        'modified': modified,
        'accessed': accessed,
        'file_type': file_type,
        'mime_type': mime_type,
        'permissions': oct(stats.st_mode)[-3:]
    }

def identify_file_signature(file_path):
    """
    Identify file type based on its signature (magic numbers).
    
    Args:
        file_path (str): Path to the file
        
    Returns:
        list: List of possible file types based on signatures
    """
    # Read the first 32 bytes of the file
    with open(file_path, 'rb') as f:
        header = f.read(32)
    
    # Check against known signatures
    matches = []
    for signature, file_type in FILE_SIGNATURES.items():
        if header.startswith(signature):
            matches.append(file_type)
    
    return matches if matches else ["Unknown"]

def extract_strings(file_path, min_length=4):
    """
    Extract printable ASCII and Unicode strings from a file.
    
    Args:
        file_path (str): Path to the file
        min_length (int): Minimum string length to extract
        
    Returns:
        list: List of extracted strings
    """
    # Read the file in binary mode
    with open(file_path, 'rb') as f:
        content = f.read()
    
    # Extract ASCII strings
    ascii_pattern = re.compile(b'[\x20-\x7E]{' + str(min_length).encode() + b',}')
    ascii_strings = [match.group().decode('ascii') for match in ascii_pattern.finditer(content)]
    
    # Extract Unicode strings (UTF-16LE)
    try:
        unicode_pattern = re.compile(b'(?:[\x20-\x7E]\x00){' + str(min_length).encode() + b',}')
        unicode_strings = [match.group().decode('utf-16le') for match in unicode_pattern.finditer(content)]
    except UnicodeDecodeError:
        unicode_strings = []
    
    # Combine and sort by position in file
    all_strings = ascii_strings + unicode_strings
    
    return all_strings

def analyze_file(file_path, mode='all', output_file=None):
    """
    Analyze a file based on the specified mode.
    
    Args:
        file_path (str): Path to the file to analyze
        mode (str): Analysis mode (metadata, hashes, strings, signature, all)
        output_file (str): Path to output file (if None, print to stdout)
        
    Returns:
        dict: Analysis results
    """
    # Check if file exists
    if not os.path.isfile(file_path):
        print(f"Error: File '{file_path}' not found")
        return None
    
    # Initialize results dictionary
    results = {}
    
    # Perform analysis based on mode
    if mode in ['metadata', 'all']:
        results['metadata'] = get_file_metadata(file_path)
    
    if mode in ['hashes', 'all']:
        results['hashes'] = calculate_hashes(file_path)
    
    if mode in ['signature', 'all']:
        results['signature'] = identify_file_signature(file_path)
    
    if mode in ['strings', 'all']:
        results['strings'] = extract_strings(file_path)
    
    # Output results
    if output_file:
        with open(output_file, 'w') as f:
            # Write metadata
            if 'metadata' in results:
                f.write("=== File Metadata ===\n")
                for key, value in results['metadata'].items():
                    f.write(f"{key}: {value}\n")
                f.write("\n")
            
            # Write hashes
            if 'hashes' in results:
                f.write("=== File Hashes ===\n")
                for key, value in results['hashes'].items():
                    f.write(f"{key}: {value}\n")
                f.write("\n")
            
            # Write signature
            if 'signature' in results:
                f.write("=== File Signature Analysis ===\n")
                f.write(f"Possible file types: {', '.join(results['signature'])}\n\n")
            
            # Write strings
            if 'strings' in results:
                f.write("=== Extracted Strings ===\n")
                for string in results['strings']:
                    f.write(f"{string}\n")
        
        print(f"Analysis results written to {output_file}")
    else:
        # Print metadata
        if 'metadata' in results:
            print("\n=== File Metadata ===")
            for key, value in results['metadata'].items():
                print(f"{key}: {value}")
        
        # Print hashes
        if 'hashes' in results:
            print("\n=== File Hashes ===")
            for key, value in results['hashes'].items():
                print(f"{key}: {value}")
        
        # Print signature
        if 'signature' in results:
            print("\n=== File Signature Analysis ===")
            print(f"Possible file types: {', '.join(results['signature'])}")
        
        # Print strings (limited to first 20)
        if 'strings' in results:
            print("\n=== Extracted Strings (first 20) ===")
            for string in results['strings'][:20]:
                print(string)
            
            if len(results['strings']) > 20:
                print(f"... and {len(results['strings']) - 20} more strings")
    
    return results

def main():
    """
    Main function to parse arguments and run the file analyzer.
    """
    parser = argparse.ArgumentParser(description="Basic File Analyzer for digital forensics education")
    parser.add_argument("-f", "--file", required=True,
                        help="Path to the file to analyze")
    parser.add_argument("-m", "--mode", choices=['metadata', 'hashes', 'strings', 'signature', 'all'],
                        default='all', help="Analysis mode (default: all)")
    parser.add_argument("-o", "--output",
                        help="Path to output file (if not specified, print to stdout)")
    
    args = parser.parse_args()
    
    print("\n===== Basic File Analyzer =====")
    print("For educational purposes only")
    print("===================================\n")
    
    # Print a warning about legal usage
    print("WARNING: Only analyze files you own or have permission to examine.")
    print("Unauthorized file analysis may be illegal in your jurisdiction.\n")
    
    # Record start time
    start_time = time.time()
    
    # Analyze the file
    analyze_file(args.file, args.mode, args.output)
    
    # Print execution time
    elapsed_time = time.time() - start_time
    print(f"\nAnalysis completed in {elapsed_time:.2f} seconds")
    
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nAnalysis interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)