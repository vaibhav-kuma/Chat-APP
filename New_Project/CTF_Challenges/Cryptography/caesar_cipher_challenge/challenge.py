#!/usr/bin/env python3

"""
Caesar Cipher Challenge

This is a simple cryptography challenge that demonstrates the Caesar cipher,
one of the earliest and simplest encryption techniques.

The challenge encrypts a flag using a Caesar cipher with a random shift,
and the participant needs to decrypt it to find the original message.
"""

import random
import string
import sys

# The flag that participants need to find
FLAG = "CTF{C43s4r_C1ph3r_1s_N0t_S3cur3}"

def encrypt_caesar(text, shift):
    """
    Encrypt text using Caesar cipher with the specified shift.
    
    Args:
        text (str): The text to encrypt
        shift (int): The number of positions to shift each character
        
    Returns:
        str: The encrypted text
    """
    result = ""
    
    # For each character in the text
    for char in text:
        # Check if the character is a letter
        if char.isalpha():
            # Determine the ASCII offset based on case
            ascii_offset = ord('A') if char.isupper() else ord('a')
            # Apply the Caesar cipher formula: (x + shift) % 26
            shifted = (ord(char) - ascii_offset + shift) % 26 + ascii_offset
            result += chr(shifted)
        else:
            # Keep non-alphabetic characters unchanged
            result += char
    
    return result

def decrypt_caesar(text, shift):
    """
    Decrypt text that was encrypted using Caesar cipher.
    
    Args:
        text (str): The encrypted text
        shift (int): The number of positions that were shifted
        
    Returns:
        str: The decrypted text
    """
    # Decryption is just encryption with the negative shift
    return encrypt_caesar(text, -shift)

def generate_challenge():
    """
    Generate a Caesar cipher challenge with a random shift.
    
    Returns:
        tuple: (encrypted_flag, shift)
    """
    # Choose a random shift between 1 and 25
    shift = random.randint(1, 25)
    
    # Encrypt the flag
    encrypted_flag = encrypt_caesar(FLAG, shift)
    
    return encrypted_flag, shift

def main():
    """
    Main function to run the challenge.
    """
    print("Welcome to the Caesar Cipher Challenge!")
    print("===========================================\n")
    
    print("In this challenge, you need to decrypt a message that has been")
    print("encrypted using the Caesar cipher technique.\n")
    
    # Generate the challenge
    encrypted_flag, shift = generate_challenge()
    
    print(f"The encrypted flag is: {encrypted_flag}\n")
    
    # Provide a hint
    print("Hint: The Caesar cipher is a substitution cipher where each letter")
    print("in the plaintext is shifted a certain number of places down the alphabet.")
    print("For example, with a shift of 1, 'A' would become 'B', 'B' would become 'C', etc.\n")
    
    # Ask for the solution
    print("Try to decrypt the message and find the original flag!")
    print("When you're ready to see the solution, press Enter.")
    input()
    
    print("\nSolution:")
    print(f"The shift used was: {shift}")
    print(f"The original flag is: {FLAG}")
    
    print("\nExplanation:")
    print("To solve this challenge, you need to try all possible shifts (1-25)")
    print("and look for the one that produces a readable message.")
    print("This is called a 'brute force' approach and works well for")
    print("simple ciphers with a small key space.")
    
    print("\nHere are all possible decryptions:")
    for i in range(1, 26):
        decrypted = decrypt_caesar(encrypted_flag, i)
        print(f"Shift {i}: {decrypted}")
        if decrypted == FLAG:
            print("  ^ This is the correct decryption!")

if __name__ == "__main__":
    main()