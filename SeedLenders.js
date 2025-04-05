const mongoose = require("mongoose");
const Professional = require("./models/Professional"); // Ensure the correct path to your model

// MongoDB Connection
const MONGO_URI = "mongodb://127.0.0.1:27017/chatre_marketplace";

// MongoDB Connection
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));
    

    // Sample Lenders Data
    const lenders = [
    {
        name: "John Doe",
        email: "johndoe@example.com",
        password: "hashedpassword123", // Use bcrypt to hash passwords in real use
        companyName: "Best Mortgage Co.",
        phone: "555-123-4567",
        address: "123 Main St, Anytown, USA",
        state: "MO",
        professionalType: "lender",
        loanTypes: ["Conventional", "FHA", "VA"],
        licenseNumber: "LEND12345",
        isVerified: true,
        paymentTier: "Preferred",
        closedDeals: 5,
        rating: 4.8,
        preApprovalLink: "https://www.google.com"
    },
    {
        name: "Jane Smith",
        email: "janesmith@example.com",
        password: "hashedpassword123",
        companyName: "Quick Loans Inc.",
        phone: "555-987-6543",
        address: "456 Oak St, Springfield, USA",
        state: "MO",
        professionalType: "lender",
        loanTypes: ["USDA", "Jumbo"],
        licenseNumber: "LEND67890",
        isVerified: true,
        paymentTier: "Ultra-Preferred",
        closedDeals: 12,
        rating: 5.0,
        preApprovalLink: "https://www.google.com"
    },
    {
        name: "Robert Brown",
        email: "robertbrown@example.com",
        password: "hashedpassword123",
        companyName: "Secure Lending Solutions",
        phone: "555-321-7890",
        address: "789 Pine St, Columbia, USA",
        state: "MO",
        professionalType: "lender",
        loanTypes: ["Conventional", "FHA"],
        licenseNumber: "LEND54321",
        isVerified: true,
        paymentTier: "Basic",
        closedDeals: 3,
        rating: 4.5,
        preApprovalLink: "https://www.google.com"
    }
];

// Insert Lenders into Database
const seedLenders = async () => {
    try {
        await Professional.deleteMany({ professionalType: "lender" }); // Clears old lender data
        await Professional.insertMany(lenders);
        console.log("✅ Lenders successfully seeded!");
    } catch (error) {
        console.error("❌ Error seeding lenders:", error);
    } finally {
        mongoose.disconnect();
        console.log("🔌 Disconnected from MongoDB");
    }
};

seedLenders();
