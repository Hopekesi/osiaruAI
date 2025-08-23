import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

export async function connectDB() {
    try {
        await mongoose
            .connect(process.env.DB_URL)
            .then(() => console.log("connected"));
    } catch (err) {
        console.log(err.message);
    }
}

const UserSchema = new mongoose.Schema({
    wallet: {
        type: String,
        unique: true, // Ensures no duplicate wallets
        minLength: 26, // Minimum BTC address length (e.g., P2PKH)
        maxLength: 35, // Maximum BTC address length (e.g., Bech32)
        match: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/, // Basic BTC address regex
        required: [true, "Regenerate another wallet adders"] // Optional: Enforce wallet creation
    },

    gmail: {
        type: String,
        lowercase: true,
        minLength: 5,
        maxLength: 39,
        unique: true
    },

    phone: {
        type: Number
    },
    avatar: {
        type: String,
        unique: true
    },
    password: {
        type: String,
        minLength: 7
    },

    mate: {
        type: String,
        minLength: 4,
        maxLength: 5
    },

    faculty: {
        type: String,
        minLength: 3,
        maxLength: 20
    },
    department: {
        type: String,
        minLength: 3,
        maxLength: 20
    },

    tokens: {
        type: Number,
        required: true,
        default: 0
    },
    OTP: Number,

    details: {
        logins: Array,
        created: String, // Consider using `Date` instead of `String`
        Transactions: [] // Could be an array of transaction objects
    }
});

export const PermiumUser = mongoose.model("PermiumUser", UserSchema);

export async function deductTokens(id, amount, notes) {
    let user = await PermiumUser.findById(id);
    if (!user) throw new Error(`User  not found`);
   let t = Number(user.tokens);
    if ( t+ amount < 0){
     
        throw new Error(`Insufficient tokens. Current balance: ${t}`);
    }
    const trans = {
        transId: Date.now(),
        status: "successful",
        action: notes,
        cost: amount,
        balance: t + amount,
        date: getDateOnly(),
        time: getTimeOnly()
    };

    // Initialize details if not exists
    if (!user.details) user.details = { Transactions: [] };
    if (!user.details.Transactions) user.details.Transactions = [];

    user.tokens = amount +user.tokens;
    user.details.Transactions.unshift(trans);
    user.markModified("details"); // Important for mixed types

    await user.save();

    return {
        id: id,
        gmail: user.gmail,
        password: user.password,
        wallet: user.wallet,
        tokens: user.tokens,
        avatar: user.avatar
    };
}

function getDateOnly(locale = "en-US", options = {}) {
    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
        ...options
    }).format(new Date());
}
// Example output: "November 15, 2023"

function getTimeOnly(locale = "en-US", options = {}) {
    return new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        ...options
    }).format(new Date());
}
// Example output: "02:30:45 PM"
