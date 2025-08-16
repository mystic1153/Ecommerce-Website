import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import { razorpay } from "../lib/razorpay.js";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

export const createOrder = async (req, res) => {
    try {
        const { products, couponCode } = req.body;

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ error: "Invalid or empty products array" });
        }

        let totalAmount = 0;

        // Calculate total amount in paise (Razorpay requirement)
        products.forEach(product => {
        totalAmount += Math.round(product.price * 100) * (product.quantity || 1);
        });

        let coupon = null;
        if (couponCode) {
            coupon = await Coupon.findOne({ code: couponCode, userId: req.user._id, isActive: true });
            if (coupon) {
                totalAmount -= Math.round((totalAmount * coupon.discountPercentage) / 100);
            }
        }

        // Create Razorpay order
        const options = {
            amount: totalAmount, // amount in paise
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            payment_capture: 1, // auto capture payment
            notes: {
                userId: req.user._id.toString(),
                couponCode: couponCode || "none",
                products: JSON.stringify(
                    products.map((p) => ({
                        id: p._id,
                        quantity: p.quantity,
                        price: p.price,
                    }))
                ),
            },
        };

        const order = await razorpay.orders.create(options);

        // Create gift coupon if total amount >= 200000 paise (₹2000)
        if (totalAmount >= 200000) {
            await createNewCoupon(req.user._id);
        }

        res.status(200).json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_KEY_ID,
            totalAmount: totalAmount / 100, // Convert back to rupees for frontend
        });
    } catch (error) {
        console.error("Error processing checkout:", error);
        res.status(500).json({ message: "Error processing checkout", error: error.message });
    }
};

export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

        // Verify payment signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: "Invalid payment signature" });
        }

        // Fetch payment details to confirm payment status
        const payment = await razorpay.payments.fetch(razorpay_payment_id);

        if (payment.status === "captured") {
            // Fetch order details for notes
            const order = await razorpay.orders.fetch(razorpay_order_id);

            // Deactivate coupon if used
            if (order.notes.couponCode && order.notes.couponCode !== "none") {
                await Coupon.findOneAndUpdate(
                    {
                        code: order.notes.couponCode,
                        userId: order.notes.userId,
                    },
                    {
                        isActive: false,
                    }
                );
            }

            // Create a new Order
            const products = JSON.parse(order.notes.products);
            const newOrder = new Order({
                user: order.notes.userId,
                products: products.map((product) => ({
                    product: product.id,
                    quantity: product.quantity,
                    price: product.price,
                })),
                totalAmount: order.amount / 100, // convert from paise to rupees
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
            });

            try {
                await newOrder.save();
                
                // Create gift coupon if total amount >= 200000 paise (₹2000)
                if (order.amount >= 200000) {
                    try {
                        await createNewCoupon(order.notes.userId);
                        console.log("Gift coupon created for user:", order.notes.userId);
                    } catch (couponError) {
                        console.error("Error creating gift coupon:", couponError);
                        // Don't fail the payment if coupon creation fails
                    }
                }
                
                res.status(200).json({
                    success: true,
                    message: "Payment successful, order created, and coupon deactivated if used.",
                    orderId: newOrder._id,
                });
            } catch (saveError) {
                console.error("Error saving order:", saveError);
                // If it's a duplicate key error, try to find existing order
                if (saveError.code === 11000) {
                    const existingOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id });
                    if (existingOrder) {
                        res.status(200).json({
                            success: true,
                            message: "Payment successful, order already exists.",
                            orderId: existingOrder._id,
                        });
                    } else {
                        res.status(500).json({ 
                            message: "Error creating order", 
                            error: "Duplicate key error occurred" 
                        });
                    }
                } else {
                    res.status(500).json({ 
                        message: "Error creating order", 
                        error: saveError.message 
                    });
                }
            }
        } else {
            res.status(400).json({ message: "Payment not completed" });
        }
    } catch (error) {
        console.error("Error processing successful checkout:", error);
        res.status(500).json({ message: "Error processing successful checkout", error: error.message });
    }
};

async function createNewCoupon(userId) {
    try {
        console.log("Creating new coupon for user:", userId);
        
        // Delete existing coupon for this user
        const deletedCoupon = await Coupon.findOneAndDelete({ userId });
        if (deletedCoupon) {
            console.log("Deleted existing coupon:", deletedCoupon.code);
        }
        
        // Create new coupon
        const newCoupon = new Coupon({
            code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
            discountPercentage: 10,
            expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            userId: userId,
        });
        
        await newCoupon.save();
        console.log("Successfully created new coupon:", newCoupon.code, "for user:", userId);
        
        return newCoupon;
    } catch (error) {
        console.error("Error in createNewCoupon:", error);
        throw error;
    }
}