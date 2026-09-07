/*
 * Format String Vulnerability Challenge
 * 
 * This program contains a deliberate format string vulnerability for educational purposes.
 * DO NOT use this code in production environments.
 * 
 * Compile with: gcc -fno-stack-protector -o vulnerable vulnerable.c
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

// Secret value that participants need to read
int secret_value = 0x45474144; // "DAGE" in hex (little-endian)

// Flag that participants need to modify
int flag_unlocked = 0;

void print_flag(void) {
    if (flag_unlocked) {
        printf("Congratulations! You've successfully exploited the format string vulnerability!\n");
        printf("The flag is: CTF{f0rm4t_str1ng_vuln_3xpl01t3d}\n");
    } else {
        printf("Sorry, you need to unlock the flag first!\n");
    }
}

void vulnerable_function(char *input) {
    // Vulnerable: Directly passing user input to printf
    printf(input);
    printf("\n");
}

void print_banner() {
    printf("\n===== Format String Vulnerability Challenge =====\n");
    printf("For educational purposes only\n");
    printf("==============================================\n\n");
    
    printf("This program has a format string vulnerability.\n");
    printf("Your goals:\n");
    printf("1. Read the secret_value variable\n");
    printf("2. Modify the flag_unlocked variable to a non-zero value\n\n");
}

void print_memory_info() {
    printf("Memory Information (for educational purposes):\n");
    printf("Address of secret_value: %p\n", &secret_value);
    printf("Address of flag_unlocked: %p\n", &flag_unlocked);
    printf("Current value of flag_unlocked: %d\n", flag_unlocked);
    printf("\n");
}

int main(int argc, char *argv[]) {
    // Check if an argument was provided
    if (argc < 2) {
        print_banner();
        print_memory_info();
        printf("Usage: %s <input>\n", argv[0]);
        return 1;
    }
    
    print_banner();
    print_memory_info();
    
    printf("Calling vulnerable function with your input...\n\n");
    vulnerable_function(argv[1]);
    
    print_flag();
    
    printf("\nProgram execution completed normally.\n");
    return 0;
}