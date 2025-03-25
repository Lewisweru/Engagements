const mongoose = require("mongoose");
require("dotenv").config();

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("✅ Connected to MongoDB Atlas!");
}).catch((error) => {
    console.error("❌ MongoDB Connection Failed:", error);
});

module.exports = mongoose;
