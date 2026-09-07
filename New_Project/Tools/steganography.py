#!/usr/bin/env python3

"""
Basic Steganography Tool

This script provides a simple steganography tool for hiding and extracting data in images.
It supports hiding text messages and small files within PNG images using the least significant
bit (LSB) technique.

Usage:
    python steganography.py -m hide -i input.png -o output.png -d "Secret message"
    python steganography.py -m hide -i input.png -o output.png -f secret.txt
    python steganography.py -m extract -i stego.png -t text
    python steganography.py -m extract -i stego.png -t file -o extracted_file

Disclaimer:
    This tool is for educational purposes only. Use responsibly and legally.
"""

import argparse
import os
import sys
from PIL import Image
import numpy as np

def text_to_binary(text):
    """
    Convert text to binary representation.
    
    Args:
        text (str): Text to convert
        
    Returns:
        str: Binary representation of the text
    """
    binary = ''
    for char in text:
        ascii_val = ord(char)
        binary += format(ascii_val, '08b')
    return binary

def binary_to_text(binary):
    """
    Convert binary representation to text.
    
    Args:
        binary (str): Binary representation
        
    Returns:
        str: Decoded text
    """
    text = ''
    for i in range(0, len(binary), 8):
        byte = binary[i:i+8]
        if len(byte) == 8:  # Ensure we have a full byte
            ascii_val = int(byte, 2)
            text += chr(ascii_val)
    return text

def file_to_binary(file_path):
    """
    Convert file to binary representation.
    
    Args:
        file_path (str): Path to the file
        
    Returns:
        tuple: (binary_data, file_extension)
    """
    # Get file extension
    _, file_extension = os.path.splitext(file_path)
    
    # Read file in binary mode
    with open(file_path, 'rb') as f:
        file_data = f.read()
    
    # Convert to binary string
    binary = ''
    for byte in file_data:
        binary += format(byte, '08b')
    
    return binary, file_extension

def binary_to_file(binary, output_path, file_extension):
    """
    Convert binary representation to file.
    
    Args:
        binary (str): Binary representation
        output_path (str): Path to save the file
        file_extension (str): File extension
        
    Returns:
        bool: True if successful, False otherwise
    """
    # Ensure output path has the correct extension
    if not output_path.endswith(file_extension):
        output_path += file_extension
    
    # Convert binary to bytes
    bytes_data = bytearray()
    for i in range(0, len(binary), 8):
        byte = binary[i:i+8]
        if len(byte) == 8:  # Ensure we have a full byte
            bytes_data.append(int(byte, 2))
    
    # Write to file
    with open(output_path, 'wb') as f:
        f.write(bytes_data)
    
    return True

def hide_data_in_image(input_image_path, output_image_path, binary_data, is_file=False, file_extension=''):
    """
    Hide binary data in an image using LSB steganography.
    
    Args:
        input_image_path (str): Path to the input image
        output_image_path (str): Path to save the output image
        binary_data (str): Binary data to hide
        is_file (bool): Whether the data is a file
        file_extension (str): File extension if is_file is True
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Open the image
        img = Image.open(input_image_path)
        width, height = img.size
        
        # Convert image to numpy array
        img_array = np.array(img)
        
        # Flatten the array for easier manipulation
        flat_array = img_array.flatten()
        
        # Check if the image can hold the data
        max_bytes = flat_array.size // 8
        data_bytes = len(binary_data) // 8
        
        # Add header information
        if is_file:
            # Format: FILE:extension:data_length:data
            header = f"FILE:{file_extension}:{data_bytes}:"
        else:
            # Format: TEXT:data_length:data
            header = f"TEXT:{data_bytes}:"
        
        header_binary = text_to_binary(header)
        full_binary = header_binary + binary_data
        full_bytes = len(full_binary) // 8
        
        if full_bytes + 1 > max_bytes:  # +1 for EOF marker
            print(f"Error: Image too small to hold the data. Maximum capacity: {max_bytes} bytes, Data size: {full_bytes} bytes")
            return False
        
        # Hide the data in the LSB of each byte
        for i, bit in enumerate(full_binary):
            if i >= flat_array.size:
                break
            
            # Clear the LSB and set it to the data bit
            flat_array[i] = (flat_array[i] & ~1) | int(bit)
        
        # Add EOF marker (8 ones)
        eof_marker = '11111111'
        for i, bit in enumerate(eof_marker):
            idx = len(full_binary) + i
            if idx < flat_array.size:
                flat_array[idx] = (flat_array[idx] & ~1) | int(bit)
        
        # Reshape the array back to the original shape
        stego_array = flat_array.reshape(img_array.shape)
        
        # Create a new image from the modified array
        stego_img = Image.fromarray(stego_array.astype(np.uint8))
        
        # Save the image
        stego_img.save(output_image_path)
        
        print(f"Data successfully hidden in {output_image_path}")
        print(f"Data size: {data_bytes} bytes")
        return True
    
    except Exception as e:
        print(f"Error hiding data: {e}")
        return False

def extract_data_from_image(input_image_path, output_path=None):
    """
    Extract hidden data from an image.
    
    Args:
        input_image_path (str): Path to the input image
        output_path (str): Path to save extracted file (if applicable)
        
    Returns:
        tuple: (data_type, extracted_data, file_extension)
    """
    try:
        # Open the image
        img = Image.open(input_image_path)
        
        # Convert image to numpy array
        img_array = np.array(img)
        
        # Flatten the array for easier manipulation
        flat_array = img_array.flatten()
        
        # Extract the LSB of each byte
        binary = ''
        for i in range(flat_array.size):
            binary += str(flat_array[i] & 1)
            
            # Check for EOF marker every 8 bits after a reasonable minimum length
            if i > 100 and i % 8 == 7:
                if binary[-8:] == '11111111':
                    binary = binary[:-8]  # Remove EOF marker
                    break
        
        # Convert binary to text to extract header
        extracted_text = binary_to_text(binary)
        
        # Parse header
        if extracted_text.startswith('TEXT:'):
            # Format: TEXT:data_length:data
            header_parts = extracted_text.split(':', 2)
            if len(header_parts) < 3:
                print("Error: Invalid header format")
                return None, None, None
            
            data_type = 'text'
            try:
                data_length = int(header_parts[1])
            except ValueError:
                print("Error: Invalid data length in header")
                return None, None, None
            
            data = header_parts[2]
            return data_type, data, None
            
        elif extracted_text.startswith('FILE:'):
            # Format: FILE:extension:data_length:data
            header_parts = extracted_text.split(':', 3)
            if len(header_parts) < 4:
                print("Error: Invalid header format")
                return None, None, None
            
            data_type = 'file'
            file_extension = header_parts[1]
            try:
                data_length = int(header_parts[2])
            except ValueError:
                print("Error: Invalid data length in header")
                return None, None, None
            
            # Extract binary data after header
            header_binary_length = len(text_to_binary(':'.join(header_parts[:3]) + ':'))
            file_binary = binary[header_binary_length:]
            
            # Save to file if output path is provided
            if output_path:
                binary_to_file(file_binary, output_path, file_extension)
                print(f"File extracted to {output_path}{file_extension}")
            
            return data_type, file_binary, file_extension
        
        else:
            print("Error: No valid steganographic data found")
            return None, None, None
    
    except Exception as e:
        print(f"Error extracting data: {e}")
        return None, None, None

def main():
    """
    Main function to parse arguments and run the steganography tool.
    """
    parser = argparse.ArgumentParser(description="Basic Steganography Tool for educational purposes")
    parser.add_argument("-m", "--mode", choices=['hide', 'extract'], required=True,
                        help="Mode: 'hide' to hide data, 'extract' to extract data")
    parser.add_argument("-i", "--input", required=True,
                        help="Input image path")
    parser.add_argument("-o", "--output",
                        help="Output path (image for hide mode, file for extract mode)")
    parser.add_argument("-d", "--data",
                        help="Text data to hide (for hide mode)")
    parser.add_argument("-f", "--file",
                        help="File to hide (for hide mode)")
    parser.add_argument("-t", "--type", choices=['text', 'file'],
                        help="Type of data to extract (for extract mode)")
    
    args = parser.parse_args()
    
    print("\n===== Basic Steganography Tool =====")
    print("For educational purposes only")
    print("===================================\n")
    
    # Hide mode
    if args.mode == 'hide':
        if not args.output:
            print("Error: Output image path is required for hide mode")
            return 1
        
        if args.data and args.file:
            print("Error: Specify either text data or a file to hide, not both")
            return 1
        
        if args.data:
            # Hide text data
            binary_data = text_to_binary(args.data)
            hide_data_in_image(args.input, args.output, binary_data)
        
        elif args.file:
            # Hide file data
            if not os.path.isfile(args.file):
                print(f"Error: File '{args.file}' not found")
                return 1
            
            binary_data, file_extension = file_to_binary(args.file)
            hide_data_in_image(args.input, args.output, binary_data, True, file_extension)
        
        else:
            print("Error: Specify either text data (-d) or a file (-f) to hide")
            return 1
    
    # Extract mode
    elif args.mode == 'extract':
        if not args.type:
            print("Error: Specify the type of data to extract (text or file)")
            return 1
        
        if args.type == 'file' and not args.output:
            print("Error: Output path is required for extracting files")
            return 1
        
        data_type, extracted_data, file_extension = extract_data_from_image(args.input, args.output)
        
        if data_type == 'text' and extracted_data:
            print("\nExtracted Text:")
            print("---------------")
            print(extracted_data)
        
        elif data_type != 'file':
            print("No valid data extracted")
            return 1
    
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