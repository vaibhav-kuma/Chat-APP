#!/usr/bin/env python3
"""
Forensic Imager Tool - A basic disk imaging and verification tool

This script provides functionality for creating forensic disk images,
verifying image integrity, and documenting the imaging process.
It supports raw/dd format imaging with hash verification.

WARNING: This tool is for EDUCATIONAL PURPOSES ONLY. For actual forensic
investigations, use professional, court-admissible tools.
"""

import argparse
import datetime
import hashlib
import json
import os
import platform
import shutil
import sys
import time
from concurrent.futures import ThreadPoolExecutor

# Constants
BUFFER_SIZE = 10 * 1024 * 1024  # 10MB buffer for reading/writing
METADATA_VERSION = "1.0"

def get_system_info():
    """Gather system information for documentation."""
    return {
        "platform": platform.platform(),
        "system": platform.system(),
        "release": platform.release(),
        "version": platform.version(),
        "machine": platform.machine(),
        "processor": platform.processor(),
        "python_version": platform.python_version(),
        "user": os.getlogin() if hasattr(os, 'getlogin') else "Unknown",
        "hostname": platform.node()
    }

def get_drive_info(drive_path):
    """Get information about the source drive."""
    try:
        # In a real forensic tool, you would use platform-specific methods
        # to gather detailed drive information. This is a simplified version.
        drive_size = os.path.getsize(drive_path) if os.path.isfile(drive_path) else None
        
        drive_info = {
            "path": drive_path,
            "size": drive_size,
            "is_file": os.path.isfile(drive_path),
            "is_device": not os.path.isfile(drive_path),
            "access_time": time.ctime(os.path.getatime(drive_path)) if os.path.exists(drive_path) else None,
            "modification_time": time.ctime(os.path.getmtime(drive_path)) if os.path.exists(drive_path) else None
        }
        
        return drive_info
    except Exception as e:
        print(f"[!] Error getting drive info: {str(e)}")
        return {"path": drive_path, "error": str(e)}

def calculate_hash(file_path, algorithms=None, chunk_size=BUFFER_SIZE, callback=None):
    """Calculate hash values for a file using multiple algorithms."""
    if algorithms is None:
        algorithms = ["md5", "sha1", "sha256"]
    
    # Initialize hash objects
    hash_objects = {}
    for algo in algorithms:
        if algo.lower() == "md5":
            hash_objects[algo] = hashlib.md5()
        elif algo.lower() == "sha1":
            hash_objects[algo] = hashlib.sha1()
        elif algo.lower() == "sha256":
            hash_objects[algo] = hashlib.sha256()
        elif algo.lower() == "sha512":
            hash_objects[algo] = hashlib.sha512()
    
    # Get file size for progress reporting
    try:
        file_size = os.path.getsize(file_path)
        processed = 0
        
        with open(file_path, 'rb') as f:
            while True:
                data = f.read(chunk_size)
                if not data:
                    break
                
                # Update all hash objects
                for h in hash_objects.values():
                    h.update(data)
                
                # Update progress
                processed += len(data)
                if callback:
                    callback(processed, file_size)
        
        # Get hexadecimal digests
        return {algo: h.hexdigest() for algo, h in hash_objects.items()}
    
    except Exception as e:
        print(f"[!] Error calculating hash: {str(e)}")
        return {algo: None for algo in algorithms}

def create_image(source, destination, metadata_file=None, hash_algorithms=None, verify=True):
    """Create a forensic image of the source drive/file."""
    if hash_algorithms is None:
        hash_algorithms = ["md5", "sha1", "sha256"]
    
    start_time = time.time()
    
    # Check if source exists
    if not os.path.exists(source):
        print(f"[!] Error: Source {source} does not exist")
        return False
    
    # Check if destination directory exists
    dest_dir = os.path.dirname(destination)
    if dest_dir and not os.path.exists(dest_dir):
        try:
            os.makedirs(dest_dir)
        except Exception as e:
            print(f"[!] Error creating destination directory: {str(e)}")
            return False
    
    # Gather metadata
    metadata = {
        "version": METADATA_VERSION,
        "case_info": {
            "examiner": "Educational User",
            "case_number": "EDU-001",
            "description": "Educational forensic imaging example"
        },
        "source": get_drive_info(source),
        "destination": {
            "path": destination
        },
        "system_info": get_system_info(),
        "acquisition": {
            "start_time": datetime.datetime.now().isoformat(),
            "hash_algorithms": hash_algorithms
        }
    }
    
    print(f"\n[*] Starting forensic acquisition of {source}")
    print(f"[*] Destination: {destination}")
    print(f"[*] Hash algorithms: {', '.join(hash_algorithms)}")
    
    # Create the image
    try:
        # For files, we can use direct file operations
        # For devices, in a real tool, you would use platform-specific methods
        if os.path.isfile(source):
            source_size = os.path.getsize(source)
            
            # Progress callback function
            def progress_callback(processed, total):
                percent = (processed / total) * 100
                print(f"\r[*] Imaging progress: {processed}/{total} bytes ({percent:.2f}%)", end="")
            
            # Copy the file with progress reporting
            with open(source, 'rb') as src, open(destination, 'wb') as dst:
                copied = 0
                while True:
                    data = src.read(BUFFER_SIZE)
                    if not data:
                        break
                    dst.write(data)
                    copied += len(data)
                    progress_callback(copied, source_size)
            
            print("\n[+] Image creation completed")
            
            # Calculate hashes for verification
            print("[*] Calculating source hashes...")
            source_hashes = calculate_hash(source, hash_algorithms, callback=progress_callback)
            
            if verify:
                print("\n[*] Calculating destination hashes for verification...")
                dest_hashes = calculate_hash(destination, hash_algorithms, callback=progress_callback)
                
                # Compare hashes
                verification_success = True
                print("\n[*] Verification results:")
                for algo in hash_algorithms:
                    source_hash = source_hashes.get(algo)
                    dest_hash = dest_hashes.get(algo)
                    match = source_hash == dest_hash
                    verification_success &= match
                    print(f"  {algo.upper()}: {'MATCH' if match else 'MISMATCH'}")
                    print(f"    Source: {source_hash}")
                    print(f"    Image:  {dest_hash}")
                
                if verification_success:
                    print("\n[+] Verification successful - all hashes match")
                else:
                    print("\n[!] Verification failed - hash mismatch detected")
            
            # Update metadata
            metadata["acquisition"]["end_time"] = datetime.datetime.now().isoformat()
            metadata["acquisition"]["duration_seconds"] = time.time() - start_time
            metadata["acquisition"]["source_hashes"] = source_hashes
            
            if verify:
                metadata["acquisition"]["verification"] = {
                    "performed": True,
                    "success": verification_success,
                    "image_hashes": dest_hashes
                }
            
            # Save metadata
            if metadata_file:
                with open(metadata_file, 'w') as f:
                    json.dump(metadata, f, indent=2)
                print(f"[+] Acquisition metadata saved to {metadata_file}")
            
            return verification_success if verify else True
        
        else:
            # For devices, this would require platform-specific code
            # This is a simplified educational version
            print("[!] Device imaging not implemented in this educational version")
            print("[!] For actual forensic work, use professional tools")
            return False
    
    except Exception as e:
        print(f"\n[!] Error during imaging: {str(e)}")
        
        # Update metadata with error
        metadata["acquisition"]["end_time"] = datetime.datetime.now().isoformat()
        metadata["acquisition"]["duration_seconds"] = time.time() - start_time
        metadata["acquisition"]["error"] = str(e)
        
        # Save metadata even on error
        if metadata_file:
            with open(metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
            print(f"[+] Error metadata saved to {metadata_file}")
        
        return False

def verify_image(source, image, hash_algorithms=None):
    """Verify an existing forensic image against its source."""
    if hash_algorithms is None:
        hash_algorithms = ["md5", "sha1", "sha256"]
    
    print(f"\n[*] Verifying image {image} against source {source}")
    print(f"[*] Hash algorithms: {', '.join(hash_algorithms)}")
    
    # Progress callback function
    def progress_callback(processed, total):
        percent = (processed / total) * 100
        print(f"\r[*] Progress: {processed}/{total} bytes ({percent:.2f}%)", end="")
    
    try:
        # Calculate hashes in parallel using ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=2) as executor:
            print("[*] Calculating source hashes...")
            source_future = executor.submit(calculate_hash, source, hash_algorithms)
            
            print("[*] Calculating image hashes...")
            image_future = executor.submit(calculate_hash, image, hash_algorithms)
            
            # Wait for both tasks to complete
            source_hashes = source_future.result()
            image_hashes = image_future.result()
        
        # Compare hashes
        verification_success = True
        print("\n[*] Verification results:")
        for algo in hash_algorithms:
            source_hash = source_hashes.get(algo)
            image_hash = image_hashes.get(algo)
            match = source_hash == image_hash
            verification_success &= match
            print(f"  {algo.upper()}: {'MATCH' if match else 'MISMATCH'}")
            print(f"    Source: {source_hash}")
            print(f"    Image:  {image_hash}")
        
        if verification_success:
            print("\n[+] Verification successful - all hashes match")
        else:
            print("\n[!] Verification failed - hash mismatch detected")
        
        return verification_success
    
    except Exception as e:
        print(f"\n[!] Error during verification: {str(e)}")
        return False

def split_image(source, output_prefix, chunk_size_mb=2000, verify=True):
    """Split a large forensic image into smaller chunks."""
    chunk_size = chunk_size_mb * 1024 * 1024  # Convert MB to bytes
    
    try:
        # Get source file size
        source_size = os.path.getsize(source)
        num_chunks = (source_size + chunk_size - 1) // chunk_size  # Ceiling division
        
        print(f"\n[*] Splitting image {source} into {num_chunks} chunks")
        print(f"[*] Chunk size: {chunk_size_mb} MB")
        print(f"[*] Output prefix: {output_prefix}")
        
        # Create output directory if it doesn't exist
        output_dir = os.path.dirname(output_prefix)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        # Calculate source hash for verification
        source_hash = None
        if verify:
            print("[*] Calculating source hash for verification...")
            source_hash = calculate_hash(source, ["sha256"])["sha256"]
        
        # Split the file
        with open(source, 'rb') as src:
            for i in range(num_chunks):
                chunk_file = f"{output_prefix}.{i:03d}"
                print(f"\r[*] Creating chunk {i+1}/{num_chunks}: {chunk_file}", end="")
                
                with open(chunk_file, 'wb') as dst:
                    # Read and write chunk_size bytes or remaining bytes
                    bytes_to_read = min(chunk_size, source_size - i * chunk_size)
                    bytes_read = 0
                    
                    while bytes_read < bytes_to_read:
                        # Read in smaller buffers to avoid memory issues
                        buffer_size = min(BUFFER_SIZE, bytes_to_read - bytes_read)
                        data = src.read(buffer_size)
                        if not data:
                            break
                        dst.write(data)
                        bytes_read += len(data)
        
        print("\n[+] Splitting completed")
        
        # Create metadata file
        metadata = {
            "original_file": source,
            "original_size": source_size,
            "chunk_size": chunk_size,
            "num_chunks": num_chunks,
            "chunks": [f"{output_prefix}.{i:03d}" for i in range(num_chunks)],
            "timestamp": datetime.datetime.now().isoformat()
        }
        
        if verify:
            metadata["original_hash"] = source_hash
        
        metadata_file = f"{output_prefix}.metadata.json"
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"[+] Split metadata saved to {metadata_file}")
        return True
    
    except Exception as e:
        print(f"\n[!] Error during splitting: {str(e)}")
        return False

def merge_image(metadata_file, output_file, verify=True):
    """Merge split chunks back into a complete image."""
    try:
        # Read metadata
        with open(metadata_file, 'r') as f:
            metadata = json.load(f)
        
        chunks = metadata.get("chunks", [])
        num_chunks = len(chunks)
        original_size = metadata.get("original_size")
        original_hash = metadata.get("original_hash")
        
        print(f"\n[*] Merging {num_chunks} chunks into {output_file}")
        
        # Create output directory if it doesn't exist
        output_dir = os.path.dirname(output_file)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        # Merge chunks
        with open(output_file, 'wb') as dst:
            for i, chunk_file in enumerate(chunks):
                if not os.path.exists(chunk_file):
                    print(f"\n[!] Error: Chunk file {chunk_file} not found")
                    return False
                
                print(f"\r[*] Processing chunk {i+1}/{num_chunks}: {chunk_file}", end="")
                
                with open(chunk_file, 'rb') as src:
                    shutil.copyfileobj(src, dst, BUFFER_SIZE)
        
        print("\n[+] Merging completed")
        
        # Verify merged file
        if verify and original_hash:
            print("[*] Verifying merged file...")
            merged_hash = calculate_hash(output_file, ["sha256"])["sha256"]
            
            if merged_hash == original_hash:
                print(f"[+] Verification successful - hash matches original")
                print(f"    SHA256: {merged_hash}")
            else:
                print(f"[!] Verification failed - hash mismatch")
                print(f"    Original: {original_hash}")
                print(f"    Merged:   {merged_hash}")
                return False
        
        return True
    
    except Exception as e:
        print(f"\n[!] Error during merging: {str(e)}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Forensic Imager Tool (Educational Purposes Only)")
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Create image command
    create_parser = subparsers.add_parser("create", help="Create a forensic image")
    create_parser.add_argument("source", help="Source drive or file to image")
    create_parser.add_argument("destination", help="Destination image file")
    create_parser.add_argument("-m", "--metadata", help="Path to save acquisition metadata")
    create_parser.add_argument("-a", "--algorithms", default="md5,sha1,sha256",
                              help="Hash algorithms to use (comma-separated)")
    create_parser.add_argument("-n", "--no-verify", action="store_true",
                              help="Skip verification after imaging")
    
    # Verify image command
    verify_parser = subparsers.add_parser("verify", help="Verify an existing forensic image")
    verify_parser.add_argument("source", help="Source drive or file")
    verify_parser.add_argument("image", help="Forensic image to verify")
    verify_parser.add_argument("-a", "--algorithms", default="md5,sha1,sha256",
                              help="Hash algorithms to use (comma-separated)")
    
    # Split image command
    split_parser = subparsers.add_parser("split", help="Split a large forensic image into chunks")
    split_parser.add_argument("source", help="Source image file to split")
    split_parser.add_argument("output_prefix", help="Prefix for output chunk files")
    split_parser.add_argument("-s", "--size", type=int, default=2000,
                             help="Chunk size in MB (default: 2000)")
    split_parser.add_argument("-n", "--no-verify", action="store_true",
                             help="Skip hash calculation for verification")
    
    # Merge image command
    merge_parser = subparsers.add_parser("merge", help="Merge split chunks back into a complete image")
    merge_parser.add_argument("metadata", help="Metadata file from split operation")
    merge_parser.add_argument("output", help="Output file for merged image")
    merge_parser.add_argument("-n", "--no-verify", action="store_true",
                             help="Skip verification after merging")
    
    # Parse arguments
    args = parser.parse_args()
    
    # Print banner
    print("""\n
    ███████╗ ██████╗ ██████╗ ███████╗███╗   ██╗███████╗██╗ ██████╗
    ██╔════╝██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔════╝██║██╔════╝
    █████╗  ██║   ██║██████╔╝█████╗  ██╔██╗ ██║███████╗██║██║     
    ██╔══╝  ██║   ██║██╔══██╗██╔══╝  ██║╚██╗██║╚════██║██║██║     
    ██║     ╚██████╔╝██║  ██║███████╗██║ ╚████║███████║██║╚██████╗
    ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝ ╚═════╝
                                                                   
    ██╗███╗   ███╗ █████╗  ██████╗ ███████╗██████╗ 
    ██║████╗ ████║██╔══██╗██╔════╝ ██╔════╝██╔══██╗
    ██║██╔████╔██║███████║██║  ███╗█████╗  ██████╔╝
    ██║██║╚██╔╝██║██╔══██║██║   ██║██╔══╝  ██╔══██╗
    ██║██║ ╚═╝ ██║██║  ██║╚██████╔╝███████╗██║  ██║
    ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝
                                                    
    EDUCATIONAL TOOL ONLY - NOT FOR ACTUAL FORENSIC INVESTIGATIONS
    """)
    
    # Execute command
    if args.command == "create":
        hash_algorithms = args.algorithms.split(",")
        success = create_image(
            args.source,
            args.destination,
            args.metadata,
            hash_algorithms,
            not args.no_verify
        )
        return 0 if success else 1
    
    elif args.command == "verify":
        hash_algorithms = args.algorithms.split(",")
        success = verify_image(args.source, args.image, hash_algorithms)
        return 0 if success else 1
    
    elif args.command == "split":
        success = split_image(args.source, args.output_prefix, args.size, not args.no_verify)
        return 0 if success else 1
    
    elif args.command == "merge":
        success = merge_image(args.metadata, args.output, not args.no_verify)
        return 0 if success else 1
    
    else:
        parser.print_help()
        return 1

if __name__ == "__main__":
    sys.exit(main())