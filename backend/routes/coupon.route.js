import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getCoupon, validateCoupon } from "../controllers/coupon.controller.js";
import Coupon from "../models/coupon.model.js";

const router = express.Router();

router.get("/", protectRoute, getCoupon);
router.post("/validate", protectRoute, validateCoupon);

// Temporary test endpoint - remove after testing
router.post("/create-test", protectRoute, async (req, res) => {
    try {
        // Delete existing coupon for this user
        await Coupon.findOneAndDelete({ userId: req.user._id });
        
        // Create a test coupon
        const testCoupon = new Coupon({
            code: "TEST50",
            discountPercentage: 50,
            expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            userId: req.user._id,
            isActive: true
        });
        
        await testCoupon.save();
        res.json({ message: "Test coupon created", coupon: testCoupon });
    } catch (error) {
        console.error("Error creating test coupon:", error);
        res.status(500).json({ message: "Error creating test coupon", error: error.message });
    }
});

export default router;