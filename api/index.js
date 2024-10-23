const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors()); // Enable CORS

// Initialize Firebase Admin SDK
const serviceAccount = require("./e-library-78db5-firebase-adminsdk-ppsmp-13a77753a7.json"); // Replace with the path to your service account JSON file
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gs://e-library-78db5.appspot.com", // Replace with your Firebase Storage bucket URL
});

// Get Firebase Storage bucket reference
const bucket = admin.storage().bucket();


app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.resolve(process.cwd(), "frontend", "build")));


app.get("/api/books", async (req, res) => {
  const category = req.query.category;

  
  try {
    // Log the category being requested, or indicate if no category is provided
    console.log(`Category requested: ${category ? category : "All categories"}`);

    // Fetch all files from Firebase Storage, optionally filtered by category prefix
    const [files] = category
      ? await bucket.getFiles({ prefix: `Categories/${category}` }) // Fetch files within a specific category folder
      : await bucket.getFiles({ prefix: "Categories/" }); // Fetch all files if no category is specified

    // Check if files were retrieved and log them
    if (!files.length) {
      console.log("No files found.");
      return res.json([]); // Return an empty array if no files are found
    }
    console.log(`Retrieved ${files.length} file(s)`);

    // Process each file to generate book details and signed URLs
    const books = await Promise.all(
      files.map(async (file) => {
        const filePath = file.name.split("/"); // Split the path to extract category and file name
        const category = filePath[1]; // Get category from file path
        const fileName = filePath[2].replace(".pdf", ""); // Remove .pdf extension from the file name

        // Get a public signed URL for the PDF file
        const [url] = await file.getSignedUrl({
          action: "read",
          expires: "03-17-3025", // Set a far future expiry date for public access
        });

        // Return book details with the title, category, and URL to access the PDF
        return {
          title: fileName,
          category: category,
          pdfLink: url,
        };
      })
    );

    // Send the list of books as a JSON response
    res.json(books);
  } catch (error) {
    // Log any errors and send a 500 status response
    console.error("Error fetching books:", error);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});


app.use((req, res, next) => res.sendFile(path.resolve(process.cwd(), "frontend", "build", "index.html")))

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});


// error handler
app.use(function (err, req, res) {
  // set locals, only providing error in development
  const error = new Error()
  //@ts-ignore
  error.status = err.status || 500
  error.message = err.message || "Internal server error"
  error.stack = err?.stack
  const response = req.app.get('env') === 'development' ? err : {};

  // render the error page
  //@ts-ignore
  res.status(error.status).json(response)
});


// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports =  app