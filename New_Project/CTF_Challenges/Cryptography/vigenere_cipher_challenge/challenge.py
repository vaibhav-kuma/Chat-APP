#!/usr/bin/env python3

"""
Vigenere Cipher Challenge

This script implements a Vigenere cipher encryption and provides a challenge
where participants need to decrypt a message encrypted with this cipher.

For educational purposes only.
"""

import random
import string
import sys

# The flag that participants need to find
FLAG = "CTF{v1g3n3r3_c1ph3r_1s_cl4ss1c}"

def generate_key(length):
    """
    Generate a random key of specified length using lowercase letters.
    
    Args:
        length (int): Length of the key to generate
        
    Returns:
        str: Random key
    """
    return ''.join(random.choice(string.ascii_lowercase) for _ in range(length))

def vigenere_encrypt(plaintext, key):
    """
    Encrypt plaintext using Vigenere cipher with the given key.
    
    Args:
        plaintext (str): Text to encrypt
        key (str): Encryption key
        
    Returns:
        str: Encrypted text
    """
    ciphertext = ""
    key_length = len(key)
    
    for i, char in enumerate(plaintext):
        if char.isalpha():
            # Determine the shift value from the key
            key_char = key[i % key_length]
            shift = ord(key_char.lower()) - ord('a')
            
            # Apply the shift
            if char.isupper():
                # For uppercase letters
                encrypted_char = chr((ord(char) - ord('A') + shift) % 26 + ord('A'))
            else:
                # For lowercase letters
                encrypted_char = chr((ord(char) - ord('a') + shift) % 26 + ord('a'))
            
            ciphertext += encrypted_char
        else:
            # Non-alphabetic characters remain unchanged
            ciphertext += char
    
    return ciphertext

def vigenere_decrypt(ciphertext, key):
    """
    Decrypt ciphertext using Vigenere cipher with the given key.
    
    Args:
        ciphertext (str): Text to decrypt
        key (str): Decryption key
        
    Returns:
        str: Decrypted text
    """
    plaintext = ""
    key_length = len(key)
    
    for i, char in enumerate(ciphertext):
        if char.isalpha():
            # Determine the shift value from the key
            key_char = key[i % key_length]
            shift = ord(key_char.lower()) - ord('a')
            
            # Apply the reverse shift
            if char.isupper():
                # For uppercase letters
                decrypted_char = chr((ord(char) - ord('A') - shift) % 26 + ord('A'))
            else:
                # For lowercase letters
                decrypted_char = chr((ord(char) - ord('a') - shift) % 26 + ord('a'))
            
            plaintext += decrypted_char
        else:
            # Non-alphabetic characters remain unchanged
            plaintext += char
    
    return plaintext

def create_challenge():
    """
    Create a Vigenere cipher challenge.
    
    Returns:
        tuple: (plaintext, ciphertext, key)
    """
    # Generate a random key of length 5-10
    key_length = random.randint(5, 10)
    key = generate_key(key_length)
    
    # Create a message that includes the flag
    plaintext = f"Congratulations! You have successfully decrypted this message. The flag is {FLAG}."
    
    # Encrypt the message
    ciphertext = vigenere_encrypt(plaintext, key)
    
    return plaintext, ciphertext, key

def print_challenge_info(ciphertext, key):
    """
    Print challenge information.
    
    Args:
        ciphertext (str): Encrypted message
        key (str): Encryption key
    """
    print("\n===== Vigenere Cipher Challenge =====")
    print("For educational purposes only")
    print("===================================\n")
    
    print("Your mission, should you choose to accept it, is to decrypt the following message:")
    print(f"\nCiphertext: {ciphertext}\n")
    
    print("Hints:")
    print("1. This message was encrypted using a Vigenere cipher.")
    print(f"2. The key length is {len(key)}.")
    print("3. The key consists of lowercase letters only.")
    print("4. The flag format is CTF{...}")
    
    print("\nGood luck!")

def print_solution(plaintext, ciphertext, key):
    """
    Print the solution to the challenge.
    
    Args:
        plaintext (str): Original message
        ciphertext (str): Encrypted message
        key (str): Encryption key
    """
    print("\n===== Solution =====")
    print(f"Key: {key}")
    print(f"Plaintext: {plaintext}")
    print("\nTo decrypt the message, you need to:")
    print("1. Determine the key length (given as a hint)")
    print("2. Try different keys or use frequency analysis to find the key")
    print("3. Apply the Vigenere decryption algorithm with the correct key")
    
    print("\nThe flag is:", FLAG)

def main():
    """
    Main function to run the Vigenere cipher challenge.
    """
    # Create the challenge
    plaintext, ciphertext, key = create_challenge()
    
    # Print challenge information
    print_challenge_info(ciphertext, key)
    
    # Ask if the user wants to see the solution
    while True:
        try:
            choice = input("\nDo you want to see the solution? (y/n): ").lower()
            if choice == 'y':
                print_solution(plaintext, ciphertext, key)
                break
            elif choice == 'n':
                print("\nKeep trying! You can run this script again if you want to see the solution later.")
                break
            else:
                print("Invalid choice. Please enter 'y' or 'n'.")
        except KeyboardInterrupt:
            print("\nChallenge aborted.")
            break
    
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nChallenge aborted.")
        sys.exit(1)
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)