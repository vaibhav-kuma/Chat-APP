# Caesar Cipher Challenge

## Challenge Overview

**Difficulty:** Beginner  
**Category:** Cryptography  
**Points:** 50  

## Description

This challenge introduces you to one of the oldest and simplest encryption techniques: the Caesar cipher. Your task is to decrypt a message that has been encrypted using this method to find the hidden flag.

## Learning Objectives

- Understand how substitution ciphers work
- Learn about the Caesar cipher specifically
- Practice cryptanalysis through brute force methods
- Recognize the weaknesses of simple encryption schemes

## Setup Instructions

1. Ensure you have Python 3 installed on your system
2. Navigate to the `caesar_cipher_challenge` directory
3. Run the challenge script: `python challenge.py`

## Challenge Tasks

1. Analyze the encrypted flag provided by the script
2. Determine the shift value used in the Caesar cipher
3. Decrypt the message to reveal the original flag

## Hints

1. The Caesar cipher shifts each letter in the alphabet by a fixed number of positions
2. There are only 25 possible shifts to try (brute force approach)
3. Look for patterns in the encrypted text that might indicate common words or the flag format
4. Remember that non-alphabetic characters (numbers, symbols, spaces) remain unchanged in this implementation

## Solution

<details>
<summary>Click to reveal the solution</summary>

### Approach

The most straightforward way to solve this challenge is to try all possible shifts (1-25) and look for the one that produces a readable message that matches the expected flag format.

### Python Solution

```python
def decrypt_caesar(text, shift):
    result = ""
    for char in text:
        if char.isalpha():
            ascii_offset = ord('A') if char.isupper() else ord('a')
            shifted = (ord(char) - ascii_offset - shift) % 26 + ascii_offset
            result += chr(shifted)
        else:
            result += char
    return result

# The encrypted flag from the challenge
encrypted_flag = "..."  # Replace with the actual encrypted flag

# Try all possible shifts
for shift in range(1, 26):
    decrypted = decrypt_caesar(encrypted_flag, shift)
    print(f"Shift {shift}: {decrypted}")
    # Look for the one that starts with "CTF{" and ends with "}"
    if decrypted.startswith("CTF{") and decrypted.endswith("}"):
        print("Found the flag!")
```

### Manual Solution

You can also solve this manually by writing out the alphabet and shifting it by different amounts until you find a shift that produces readable text.

For example, with a shift of 3:
```
Plain:    ABCDEFGHIJKLMNOPQRSTUVWXYZ
Encrypted: DEFGHIJKLMNOPQRSTUVWXYZABC
```

Then map each letter in the encrypted text back to its original letter.

### The Flag

The original flag is: `CTF{C43s4r_C1ph3r_1s_N0t_S3cur3}`

</details>

## Historical Context

The Caesar cipher is named after Julius Caesar, who reportedly used it to communicate with his generals. It's a type of substitution cipher where each letter in the plaintext is shifted a certain number of places down the alphabet.

Despite its simplicity, the Caesar cipher was historically effective because many of Caesar's enemies were illiterate. Today, it serves as an educational tool to introduce basic cryptographic concepts.

## Cryptographic Weaknesses

The Caesar cipher is extremely vulnerable to several attacks:

1. **Brute Force Attack**: With only 25 possible shifts, an attacker can try all possibilities in seconds.
2. **Frequency Analysis**: In any language, certain letters appear more frequently than others (e.g., 'E' is the most common letter in English). By analyzing the frequency of letters in the ciphertext, one can often determine the shift without trying all possibilities.
3. **Known Plaintext Attack**: If any part of the plaintext is known or can be guessed, the shift can be immediately determined.

## Additional Resources

- [Khan Academy: Cryptography Basics](https://www.khanacademy.org/computing/computer-science/cryptography)
- [Practical Cryptography: Caesar Cipher](http://practicalcryptography.com/ciphers/caesar-cipher/)
- [CyberChef: Online Cryptography Tool](https://gchq.github.io/CyberChef/)