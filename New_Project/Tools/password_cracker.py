#!/usr/bin/env python3

"""
Basic Password Cracker

This script provides a simple password cracking tool for educational purposes.
It can perform dictionary attacks and brute force attacks on password hashes.

Usage:
    python password_cracker.py -m MODE -t TARGET [-w WORDLIST] [-a ALPHABET] [-l MAX_LENGTH]

Examples:
    python password_cracker.py -m dict -t 5f4dcc3b5aa765d61d8327deb882cf99 -w wordlists/rockyou.txt
    python password_cracker.py -m brute -t 5f4dcc3b5aa765d61d8327deb882cf99 -a abc123 -l 4

Disclaimer:
    This tool is for educational purposes only. Only use it on your own passwords or with explicit permission.
"""

import argparse
import hashlib
import itertools
import sys
import time
from datetime import datetime

# Default character set for brute force attacks
DEFAULT_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

# Default maximum length for brute force attacks
DEFAULT_MAX_LENGTH = 4

# Supported hash algorithms
SUPPORTED_ALGORITHMS = {
    "md5": hashlib.md5,
    "sha1": hashlib.sha1,
    "sha256": hashlib.sha256,
    "sha512": hashlib.sha512
}

def detect_hash_type(hash_string):
    """
    Attempt to detect the hash type based on its length.
    
    Args:
        hash_string (str): The hash to analyze
        
    Returns:
        str: The detected hash type or "unknown"
    """
    hash_length = len(hash_string)
    
    if hash_length == 32:
        return "md5"
    elif hash_length == 40:
        return "sha1"
    elif hash_length == 64:
        return "sha256"
    elif hash_length == 128:
        return "sha512"
    else:
        return "unknown"

def hash_password(password, algorithm):
    """
    Hash a password using the specified algorithm.
    
    Args:
        password (str): The password to hash
        algorithm (str): The hashing algorithm to use
        
    Returns:
        str: The hashed password
    """
    if algorithm not in SUPPORTED_ALGORITHMS:
        raise ValueError(f"Unsupported algorithm: {algorithm}")
    
    # Convert the password to bytes if it's not already
    if isinstance(password, str):
        password = password.encode('utf-8')
    
    # Hash the password
    hasher = SUPPORTED_ALGORITHMS[algorithm]()
    hasher.update(password)
    
    return hasher.hexdigest()

def dictionary_attack(target_hash, wordlist_file, hash_algorithm):
    """
    Perform a dictionary attack on a password hash.
    
    Args:
        target_hash (str): The hash to crack
        wordlist_file (str): Path to the wordlist file
        hash_algorithm (str): The hashing algorithm to use
        
    Returns:
        str or None: The cracked password or None if not found
    """
    print(f"\nStarting dictionary attack on {target_hash}")
    print(f"Using algorithm: {hash_algorithm}")
    print(f"Wordlist: {wordlist_file}\n")
    
    start_time = time.time()
    words_tried = 0
    
    try:
        with open(wordlist_file, 'r', encoding='latin-1') as f:
            for line in f:
                # Remove trailing newline and whitespace
                password = line.strip()
                words_tried += 1
                
                # Hash the password and compare
                hashed = hash_password(password, hash_algorithm)
                if hashed == target_hash.lower():
                    elapsed_time = time.time() - start_time
                    print(f"\nPassword found after trying {words_tried} passwords")
                    print(f"Time elapsed: {elapsed_time:.2f} seconds")
                    print(f"Speed: {words_tried / elapsed_time:.2f} hashes/second")
                    return password
                
                # Print progress every 10000 attempts
                if words_tried % 10000 == 0:
                    elapsed_time = time.time() - start_time
                    print(f"Tried {words_tried} passwords... ({words_tried / elapsed_time:.2f} hashes/second)")
    
    except FileNotFoundError:
        print(f"Error: Wordlist file '{wordlist_file}' not found")
        return None
    except KeyboardInterrupt:
        print("\nAttack interrupted by user")
        return None
    
    elapsed_time = time.time() - start_time
    print(f"\nPassword not found after trying {words_tried} passwords")
    print(f"Time elapsed: {elapsed_time:.2f} seconds")
    print(f"Speed: {words_tried / elapsed_time:.2f} hashes/second")
    
    return None

def brute_force_attack(target_hash, alphabet, max_length, hash_algorithm):
    """
    Perform a brute force attack on a password hash.
    
    Args:
        target_hash (str): The hash to crack
        alphabet (str): The character set to use
        max_length (int): The maximum password length to try
        hash_algorithm (str): The hashing algorithm to use
        
    Returns:
        str or None: The cracked password or None if not found
    """
    print(f"\nStarting brute force attack on {target_hash}")
    print(f"Using algorithm: {hash_algorithm}")
    print(f"Character set: {alphabet}")
    print(f"Maximum length: {max_length}\n")
    
    start_time = time.time()
    passwords_tried = 0
    
    try:
        # Try passwords of increasing length
        for length in range(1, max_length + 1):
            print(f"Trying passwords of length {length}...")
            
            # Generate all possible combinations of the given length
            for password_tuple in itertools.product(alphabet, repeat=length):
                # Convert tuple to string
                password = ''.join(password_tuple)
                passwords_tried += 1
                
                # Hash the password and compare
                hashed = hash_password(password, hash_algorithm)
                if hashed == target_hash.lower():
                    elapsed_time = time.time() - start_time
                    print(f"\nPassword found after trying {passwords_tried} passwords")
                    print(f"Time elapsed: {elapsed_time:.2f} seconds")
                    print(f"Speed: {passwords_tried / elapsed_time:.2f} hashes/second")
                    return password
                
                # Print progress every 100000 attempts
                if passwords_tried % 100000 == 0:
                    elapsed_time = time.time() - start_time
                    print(f"Tried {passwords_tried} passwords... ({passwords_tried / elapsed_time:.2f} hashes/second)")
    
    except KeyboardInterrupt:
        print("\nAttack interrupted by user")
        return None
    
    elapsed_time = time.time() - start_time
    print(f"\nPassword not found after trying {passwords_tried} passwords")
    print(f"Time elapsed: {elapsed_time:.2f} seconds")
    print(f"Speed: {passwords_tried / elapsed_time:.2f} hashes/second")
    
    return None

def main():
    """
    Main function to parse arguments and run the password cracker.
    """
    parser = argparse.ArgumentParser(description="Basic Password Cracker for educational purposes")
    parser.add_argument("-m", "--mode", required=True, choices=["dict", "brute"],
                        help="Attack mode: 'dict' for dictionary attack, 'brute' for brute force")
    parser.add_argument("-t", "--target", required=True,
                        help="Target hash to crack")
    parser.add_argument("-a", "--algorithm", choices=list(SUPPORTED_ALGORITHMS.keys()),
                        help="Hash algorithm (default: auto-detect)")
    parser.add_argument("-w", "--wordlist",
                        help="Path to wordlist file (required for dictionary attack)")
    parser.add_argument("-c", "--charset", default=DEFAULT_ALPHABET,
                        help=f"Character set for brute force attack (default: alphanumeric)")
    parser.add_argument("-l", "--max-length", type=int, default=DEFAULT_MAX_LENGTH,
                        help=f"Maximum password length for brute force attack (default: {DEFAULT_MAX_LENGTH})")
    
    args = parser.parse_args()
    
    print("\n===== Basic Password Cracker =====")
    print("For educational purposes only")
    print("===================================\n")
    
    # Print a warning about legal usage
    print("WARNING: Only attempt to crack your own passwords or those you have permission to test.")
    print("Unauthorized password cracking may be illegal in your jurisdiction.\n")
    
    # Detect hash algorithm if not specified
    hash_algorithm = args.algorithm
    if not hash_algorithm:
        hash_algorithm = detect_hash_type(args.target)
        if hash_algorithm == "unknown":
            print("Could not detect hash type. Please specify with --algorithm.")
            return 1
        print(f"Detected hash type: {hash_algorithm}")
    
    # Record start time
    start_time = datetime.now()
    print(f"Attack started at: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run the appropriate attack
    if args.mode == "dict":
        if not args.wordlist:
            print("Error: Wordlist is required for dictionary attack")
            return 1
        
        password = dictionary_attack(args.target, args.wordlist, hash_algorithm)
    else:  # brute force
        password = brute_force_attack(args.target, args.charset, args.max_length, hash_algorithm)
    
    # Print results
    if password:
        print(f"\nSuccess! The password is: {password}")
    else:
        print("\nFailed to crack the password with the given parameters.")
    
    # Record end time and print duration
    end_time = datetime.now()
    duration = end_time - start_time
    print(f"\nAttack completed at: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Total duration: {duration}")
    
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nProgram interrupted by user")
        sys.exit(1)