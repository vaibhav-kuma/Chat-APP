#!/usr/bin/env python3

"""
Basic Encryption Tool

This script provides a simple encryption and decryption tool for educational purposes.
It supports various encryption algorithms including AES, RSA, and simple XOR encryption.

Usage:
    # Symmetric encryption (AES)
    python encryption_tool.py -m encrypt -a aes -i input.txt -o encrypted.bin -p "password"
    python encryption_tool.py -m decrypt -a aes -i encrypted.bin -o decrypted.txt -p "password"
    
    # Asymmetric encryption (RSA)
    python encryption_tool.py -m generate -a rsa -k key_prefix
    python encryption_tool.py -m encrypt -a rsa -i input.txt -o encrypted.bin -k key_prefix.pub
    python encryption_tool.py -m decrypt -a rsa -i encrypted.bin -o decrypted.txt -k key_prefix.priv
    
    # Simple XOR encryption
    python encryption_tool.py -m encrypt -a xor -i input.txt -o encrypted.bin -p "password"
    python encryption_tool.py -m decrypt -a xor -i encrypted.bin -o decrypted.txt -p "password"

Disclaimer:
    This tool is for educational purposes only. It is not intended for securing sensitive data.
    For real security needs, use established cryptographic libraries and tools.
"""

import argparse
import base64
import hashlib
import os
import sys
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, padding
from cryptography.hazmat.primitives.asymmetric import rsa, padding as asym_padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.serialization import (
    load_pem_private_key, load_pem_public_key,
    Encoding, PrivateFormat, PublicFormat, NoEncryption
)

# Constants
AES_BLOCK_SIZE = 128  # bits
SALT_SIZE = 16  # bytes
IV_SIZE = 16  # bytes
KEY_SIZE = 32  # bytes (256 bits)
RSA_KEY_SIZE = 2048  # bits

def derive_key(password, salt=None):
    """
    Derive a key from a password using PBKDF2.
    
    Args:
        password (str): Password to derive key from
        salt (bytes, optional): Salt for key derivation
        
    Returns:
        tuple: (key, salt)
    """
    if salt is None:
        salt = os.urandom(SALT_SIZE)
    
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=KEY_SIZE,
        salt=salt,
        iterations=100000,
    )
    
    key = kdf.derive(password.encode())
    return key, salt

def aes_encrypt(data, password):
    """
    Encrypt data using AES-256 in CBC mode with PKCS7 padding.
    
    Args:
        data (bytes): Data to encrypt
        password (str): Password for encryption
        
    Returns:
        bytes: Encrypted data with salt and IV prepended
    """
    # Generate salt and derive key
    key, salt = derive_key(password)
    
    # Generate random IV
    iv = os.urandom(IV_SIZE)
    
    # Create padder
    padder = padding.PKCS7(AES_BLOCK_SIZE).padder()
    padded_data = padder.update(data) + padder.finalize()
    
    # Create cipher
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    encryptor = cipher.encryptor()
    
    # Encrypt data
    encrypted_data = encryptor.update(padded_data) + encryptor.finalize()
    
    # Prepend salt and IV to encrypted data
    return salt + iv + encrypted_data

def aes_decrypt(encrypted_data, password):
    """
    Decrypt data using AES-256 in CBC mode with PKCS7 padding.
    
    Args:
        encrypted_data (bytes): Data to decrypt (with salt and IV prepended)
        password (str): Password for decryption
        
    Returns:
        bytes: Decrypted data
    """
    # Extract salt and IV
    salt = encrypted_data[:SALT_SIZE]
    iv = encrypted_data[SALT_SIZE:SALT_SIZE+IV_SIZE]
    ciphertext = encrypted_data[SALT_SIZE+IV_SIZE:]
    
    # Derive key
    key, _ = derive_key(password, salt)
    
    # Create cipher
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    decryptor = cipher.decryptor()
    
    # Decrypt data
    padded_data = decryptor.update(ciphertext) + decryptor.finalize()
    
    # Remove padding
    unpadder = padding.PKCS7(AES_BLOCK_SIZE).unpadder()
    try:
        data = unpadder.update(padded_data) + unpadder.finalize()
        return data
    except Exception as e:
        print(f"Error during decryption: {e}")
        print("This could be due to an incorrect password or corrupted data.")
        return None

def generate_rsa_keypair(key_prefix):
    """
    Generate an RSA key pair and save to files.
    
    Args:
        key_prefix (str): Prefix for key files
        
    Returns:
        tuple: (private_key_path, public_key_path)
    """
    # Generate private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=RSA_KEY_SIZE,
    )
    
    # Get public key
    public_key = private_key.public_key()
    
    # Save private key
    private_key_path = f"{key_prefix}.priv"
    with open(private_key_path, 'wb') as f:
        f.write(private_key.private_bytes(
            encoding=Encoding.PEM,
            format=PrivateFormat.PKCS8,
            encryption_algorithm=NoEncryption()
        ))
    
    # Save public key
    public_key_path = f"{key_prefix}.pub"
    with open(public_key_path, 'wb') as f:
        f.write(public_key.public_bytes(
            encoding=Encoding.PEM,
            format=PublicFormat.SubjectPublicKeyInfo
        ))
    
    print(f"Private key saved to: {private_key_path}")
    print(f"Public key saved to: {public_key_path}")
    
    return private_key_path, public_key_path

def rsa_encrypt(data, public_key_path):
    """
    Encrypt data using RSA.
    
    Args:
        data (bytes): Data to encrypt
        public_key_path (str): Path to public key file
        
    Returns:
        bytes: Encrypted data
    """
    # Load public key
    with open(public_key_path, 'rb') as f:
        public_key = load_pem_public_key(f.read())
    
    # RSA can only encrypt small amounts of data, so we'll use a hybrid approach
    # Generate a random AES key
    aes_key = os.urandom(KEY_SIZE)
    
    # Encrypt the AES key with RSA
    encrypted_aes_key = public_key.encrypt(
        aes_key,
        asym_padding.OAEP(
            mgf=asym_padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    
    # Generate random IV
    iv = os.urandom(IV_SIZE)
    
    # Create padder
    padder = padding.PKCS7(AES_BLOCK_SIZE).padder()
    padded_data = padder.update(data) + padder.finalize()
    
    # Create cipher
    cipher = Cipher(algorithms.AES(aes_key), modes.CBC(iv))
    encryptor = cipher.encryptor()
    
    # Encrypt data with AES
    encrypted_data = encryptor.update(padded_data) + encryptor.finalize()
    
    # Combine everything
    # Format: [encrypted_aes_key_length (4 bytes)][encrypted_aes_key][iv][encrypted_data]
    key_length = len(encrypted_aes_key).to_bytes(4, byteorder='big')
    return key_length + encrypted_aes_key + iv + encrypted_data

def rsa_decrypt(encrypted_data, private_key_path):
    """
    Decrypt data using RSA.
    
    Args:
        encrypted_data (bytes): Data to decrypt
        private_key_path (str): Path to private key file
        
    Returns:
        bytes: Decrypted data
    """
    # Load private key
    with open(private_key_path, 'rb') as f:
        private_key = load_pem_private_key(f.read(), password=None)
    
    # Extract encrypted AES key length
    key_length = int.from_bytes(encrypted_data[:4], byteorder='big')
    
    # Extract encrypted AES key
    encrypted_aes_key = encrypted_data[4:4+key_length]
    
    # Extract IV and ciphertext
    iv = encrypted_data[4+key_length:4+key_length+IV_SIZE]
    ciphertext = encrypted_data[4+key_length+IV_SIZE:]
    
    # Decrypt the AES key with RSA
    try:
        aes_key = private_key.decrypt(
            encrypted_aes_key,
            asym_padding.OAEP(
                mgf=asym_padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
    except Exception as e:
        print(f"Error decrypting AES key: {e}")
        print("This could be due to using the wrong private key.")
        return None
    
    # Create cipher
    cipher = Cipher(algorithms.AES(aes_key), modes.CBC(iv))
    decryptor = cipher.decryptor()
    
    # Decrypt data with AES
    try:
        padded_data = decryptor.update(ciphertext) + decryptor.finalize()
    except Exception as e:
        print(f"Error decrypting data: {e}")
        return None
    
    # Remove padding
    unpadder = padding.PKCS7(AES_BLOCK_SIZE).unpadder()
    try:
        data = unpadder.update(padded_data) + unpadder.finalize()
        return data
    except Exception as e:
        print(f"Error removing padding: {e}")
        return None

def xor_crypt(data, password):
    """
    Encrypt or decrypt data using XOR with a password-derived key.
    XOR encryption is symmetric, so the same function works for both encryption and decryption.
    
    Args:
        data (bytes): Data to encrypt/decrypt
        password (str): Password for encryption/decryption
        
    Returns:
        bytes: Encrypted/decrypted data
    """
    # Derive a key from the password
    key = hashlib.sha256(password.encode()).digest()
    
    # XOR each byte of data with the corresponding byte of the key (cycling the key)
    result = bytearray(len(data))
    for i in range(len(data)):
        result[i] = data[i] ^ key[i % len(key)]
    
    return bytes(result)

def read_file(file_path, binary=True):
    """
    Read data from a file.
    
    Args:
        file_path (str): Path to the file
        binary (bool): Whether to read in binary mode
        
    Returns:
        bytes: File data
    """
    mode = 'rb' if binary else 'r'
    with open(file_path, mode) as f:
        data = f.read()
    
    # Convert to bytes if read in text mode
    if not binary and isinstance(data, str):
        data = data.encode()
    
    return data

def write_file(file_path, data, binary=True):
    """
    Write data to a file.
    
    Args:
        file_path (str): Path to the file
        data (bytes): Data to write
        binary (bool): Whether to write in binary mode
        
    Returns:
        bool: True if successful, False otherwise
    """
    mode = 'wb' if binary else 'w'
    
    # Convert to string if writing in text mode
    if not binary and isinstance(data, bytes):
        data = data.decode()
    
    with open(file_path, mode) as f:
        f.write(data)
    
    return True

def main():
    """
    Main function to parse arguments and run the encryption tool.
    """
    parser = argparse.ArgumentParser(description="Basic Encryption Tool for educational purposes")
    parser.add_argument("-m", "--mode", choices=['encrypt', 'decrypt', 'generate'], required=True,
                        help="Mode: 'encrypt', 'decrypt', or 'generate' (for RSA keys)")
    parser.add_argument("-a", "--algorithm", choices=['aes', 'rsa', 'xor'], required=True,
                        help="Encryption algorithm to use")
    parser.add_argument("-i", "--input",
                        help="Input file path")
    parser.add_argument("-o", "--output",
                        help="Output file path")
    parser.add_argument("-p", "--password",
                        help="Password for symmetric encryption/decryption")
    parser.add_argument("-k", "--key",
                        help="Key file path for RSA or key prefix for key generation")
    
    args = parser.parse_args()
    
    print("\n===== Basic Encryption Tool =====")
    print("For educational purposes only")
    print("===================================\n")
    
    # Generate RSA key pair
    if args.mode == 'generate':
        if args.algorithm != 'rsa':
            print("Error: Key generation is only supported for RSA")
            return 1
        
        if not args.key:
            print("Error: Key prefix is required for key generation")
            return 1
        
        generate_rsa_keypair(args.key)
        return 0
    
    # Encrypt or decrypt
    if not args.input:
        print("Error: Input file path is required")
        return 1
    
    if not args.output:
        print("Error: Output file path is required")
        return 1
    
    # Check if input file exists
    if not os.path.isfile(args.input):
        print(f"Error: Input file '{args.input}' not found")
        return 1
    
    # Read input file
    input_data = read_file(args.input)
    
    # Process based on algorithm and mode
    if args.algorithm == 'aes':
        if not args.password:
            print("Error: Password is required for AES encryption/decryption")
            return 1
        
        if args.mode == 'encrypt':
            output_data = aes_encrypt(input_data, args.password)
        else:  # decrypt
            output_data = aes_decrypt(input_data, args.password)
            if output_data is None:
                return 1
    
    elif args.algorithm == 'rsa':
        if not args.key:
            print("Error: Key file path is required for RSA encryption/decryption")
            return 1
        
        if not os.path.isfile(args.key):
            print(f"Error: Key file '{args.key}' not found")
            return 1
        
        if args.mode == 'encrypt':
            output_data = rsa_encrypt(input_data, args.key)
        else:  # decrypt
            output_data = rsa_decrypt(input_data, args.key)
            if output_data is None:
                return 1
    
    elif args.algorithm == 'xor':
        if not args.password:
            print("Error: Password is required for XOR encryption/decryption")
            return 1
        
        # XOR is symmetric, so the same function works for both encryption and decryption
        output_data = xor_crypt(input_data, args.password)
    
    # Write output file
    write_file(args.output, output_data)
    print(f"Operation completed successfully. Output written to '{args.output}'")
    
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nOperation interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)