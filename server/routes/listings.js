import express from "express";
import mongoose from "mongoose";
import Listing from "../models/Listing.js";

const router = express.Router();

// ✅ Create a New Listing
router.post("/", async (req, res) => {
  try {
    console.log("🔍 Incoming Request Body:", req.body);

    let { sellerId, platform, username, followers, price, description } = req.body;

    // ✅ Convert sellerId to ObjectId
    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({ error: "Invalid sellerId format. Must be a valid MongoDB ObjectId." });
    }

    sellerId = new mongoose.Types.ObjectId(sellerId); // ✅ Convert to ObjectId

    const newListing = new Listing({
      sellerId,
      platform,
      username,
      followers,
      price,
      description
    });

    await newListing.save();
    res.status(201).json(newListing);
  } catch (error) {
    console.error("❌ Listing Creation Error:", error);
    res.status(500).json({ error: "Failed to create listing", details: error.message });
  }
});

// ✅ Get All Listings
router.get("/", async (req, res) => {
  try {
    const listings = await Listing.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(listings);
  } catch (error) {
    console.error("❌ Fetch Listings Error:", error);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// ✅ Get a Single Listing by ID
router.get("/", async (req, res) => {
  try {
    const listings = await Listing.find({}); // ❌ Removed { isActive: true } for now
    console.log("📡 Retrieved Listings:", listings); // ✅ Debugging log
    res.json(listings);
  } catch (error) {
    console.error("❌ Fetch Listings Error:", error);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

// ✅ Delete a Listing (For Future Admin Controls)
router.delete("/:id", async (req, res) => {
  try {
    await Listing.findByIdAndDelete(req.params.id);
    res.json({ message: "Listing deleted" });
  } catch (error) {
    console.error("❌ Delete Listing Error:", error);
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

export default router;
