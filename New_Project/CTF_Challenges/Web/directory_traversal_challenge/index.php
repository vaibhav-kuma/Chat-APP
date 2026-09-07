<?php
// Directory Traversal Challenge
// For educational purposes only

// Set up the flag
$flag = "CTF{d1r3ct0ry_tr4v3rs4l_3xp3rt}"; // This is stored here for simplicity

// Initialize variables
$error = "";
$fileContents = "";
$requestedFile = "";

// Define the allowed files directory
$filesDirectory = "./files/";

// Process file request
if (isset($_GET['file'])) {
    $requestedFile = $_GET['file'];
    
    // VULNERABLE CODE: Insufficient path validation
    // The application only checks if the filename contains certain strings
    // but doesn't properly validate the full path
    if (strpos($requestedFile, "../") !== false || strpos($requestedFile, "..%2f") !== false) {
        $error = "Invalid file path. Directory traversal attempts are not allowed.";
    } else {
        // Construct the file path - VULNERABLE to directory traversal
        $filePath = $filesDirectory . $requestedFile;
        
        // Check if file exists
        if (file_exists($filePath)) {
            // Read file contents
            $fileContents = file_get_contents($filePath);
        } else {
            $error = "File not found: " . htmlspecialchars($requestedFile);
        }
    }
}

// Create the files directory and sample files if they don't exist
if (!is_dir($filesDirectory)) {
    mkdir($filesDirectory, 0755, true);
    
    // Create sample files
    file_put_contents($filesDirectory . "welcome.txt", "Welcome to the Document Viewer! This application allows you to view text files stored on the server.");
    file_put_contents($filesDirectory . "about.txt", "This is a simple document viewer application created for educational purposes.");
    file_put_contents($filesDirectory . "help.txt", "To view a file, click on one of the available files in the list or specify a filename in the URL.");
    
    // Create a secret file with a hint
    file_put_contents("./secret_data.txt", "Congratulations on finding this file! But the real flag is somewhere else...");
    
    // Create a flag file in an unexpected location
    file_put_contents("./admin/flag.txt", "The flag is: " . $flag);
    
    // Create the admin directory if it doesn't exist
    if (!is_dir("./admin")) {
        mkdir("./admin", 0755, true);
    }
}

// Get list of available files
$availableFiles = scandir($filesDirectory);
$availableFiles = array_diff($availableFiles, array('.', '..'));
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Viewer</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            color: #333;
        }
        .container {
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 5px;
        }
        .file-list {
            background-color: #fff;
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 3px;
            margin-bottom: 20px;
        }
        .file-list h3 {
            margin-top: 0;
        }
        .file-list ul {
            list-style-type: none;
            padding: 0;
        }
        .file-list li {
            margin-bottom: 8px;
        }
        .file-list a {
            text-decoration: none;
            color: #0066cc;
        }
        .file-list a:hover {
            text-decoration: underline;
        }
        .file-content {
            background-color: #fff;
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 3px;
            white-space: pre-wrap;
            font-family: monospace;
        }
        .error {
            color: red;
            margin-top: 10px;
        }
        .hint {
            margin-top: 30px;
            padding: 10px;
            background-color: #ffffd0;
            border-left: 4px solid #ffcc00;
        }
        .admin-note {
            color: #999;
            font-size: 12px;
            margin-top: 50px;
            padding: 10px;
            border-top: 1px dashed #ddd;
        }
    </style>
</head>
<body>
    <h1>Document Viewer</h1>
    
    <div class="container">
        <div class="file-list">
            <h3>Available Files</h3>
            <ul>
                <?php foreach ($availableFiles as $file): ?>
                    <li><a href="?file=<?php echo urlencode($file); ?>"><?php echo htmlspecialchars($file); ?></a></li>
                <?php endforeach; ?>
            </ul>
        </div>
        
        <?php if ($error): ?>
            <div class="error"><?php echo $error; ?></div>
        <?php endif; ?>
        
        <?php if ($fileContents): ?>
            <h3>File: <?php echo htmlspecialchars($requestedFile); ?></h3>
            <div class="file-content"><?php echo htmlspecialchars($fileContents); ?></div>
        <?php elseif (!$error): ?>
            <p>Select a file from the list to view its contents.</p>
        <?php endif; ?>
        
        <div class="hint">
            <strong>Hint:</strong> The application allows you to view files on the server. Some files might be stored outside the files directory.
        </div>
    </div>
    
    <div class="admin-note">
        <!-- This comment would normally not be visible in a real application -->
        <!-- Admin note: Need to fix the directory traversal vulnerability in the file viewer. -->
        <!-- Also, remember to move the flag from the source code to /admin/flag.txt -->
    </div>
</body>
</html>