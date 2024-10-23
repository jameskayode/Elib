const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors()); // Enable CORS

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT); // Use environment variable for service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://e-library-78db5.appspot.com", // Replace with your Firebase Storage bucket URL
});

// Get Firebase Storage bucket reference
const bucket = admin.storage().bucket();

app.use(express.urlencoded({ extended: false }));

// API endpoint to fetch books based on category
app.get("/api/books", async (req, res) => {
  const category = req.query.category;

  try {
    console.log(`Category requested: ${category ? category : "All categories"}`);

    const [files] = category
      ? await bucket.getFiles({ prefix: `Categories/${category}` }) // Fetch files within a specific category folder
      : await bucket.getFiles({ prefix: "Categories/" }); // Fetch all files if no category is specified

    if (!files.length) {
      console.log("No files found.");
      return res.json([]); // Return an empty array if no files are found
    }
    console.log(`Retrieved ${files.length} file(s)`);

    const books = await Promise.all(
      files.map(async (file) => {
        const filePath = file.name.split("/");
        const category = filePath[1]; // Get category from file path
        const fileName = filePath[2].replace(".pdf", ""); // Remove .pdf extension from the file name

        const [url] = await file.getSignedUrl({
          action: "read",
          expires: "03-17-3025", // Set a far future expiry date for public access
        });

        return {
          title: fileName,
          category: category,
          pdfLink: url,
        };
      })
    );

    res.json(books);
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// Serve static files from the frontend build directory
app.use(express.static(path.resolve(__dirname, '..', 'frontend', 'build')));

// Handle all other routes by sending the index.html file
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'frontend', 'build', 'index.html'));
});

// Error handling middleware
app.use(function (err, req, res, next) {
  const error = new Error();
  error.status = err.status || 500;
  error.message = err.message || "Internal server error";
  console.error(err.stack);
  res.status(error.status).json({ error: error.message });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
