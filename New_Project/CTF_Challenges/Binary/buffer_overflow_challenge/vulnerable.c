/*
 * Simple Buffer Overflow Challenge
 * 
 * This program contains a deliberate buffer overflow vulnerability for educational purposes.
 * DO NOT use this code in production environments.
 * 
 * Compile with: gcc -fno-stack-protector -z execstack -o vulnerable vulnerable.c
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

// The secret function that participants need to call
void print_flag(void) {
    printf("Congratulations! You've successfully exploited the buffer overflow!\n");
    printf("The flag is: CTF{b4s1c_buff3r_0v3rfl0w_3xpl01t3d}\n");
}

void vulnerable_function(char *input) {
    char buffer[64]; // Only 64 bytes allocated
    
    // Vulnerable: No bounds checking
    strcpy(buffer, input);
    
    printf("You entered: %s\n", buffer);
}

void print_banner() {
    printf("\n===== Buffer Overflow Challenge =====\n");
    printf("For educational purposes only\n");
    printf("=====================================\n\n");
    
    printf("This program has a buffer overflow vulnerability.\n");
    printf("Your goal is to exploit it to call the print_flag() function.\n\n");
}

void print_memory_info() {
    printf("Memory Information (for educational purposes):\n");
    printf("Address of print_flag(): %p\n", print_flag);
    printf("Address of vulnerable_function(): %p\n", vulnerable_function);
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
    
    printf("\nProgram execution completed normally.\n");
    return 0;
}