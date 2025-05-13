import { User } from '../models/user.model.js';
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

// 🔸 Token generator
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) throw new ApiError(404, "User not found");

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, error?.message || "Error generating tokens");
    }
};

// 🔸 Register
const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password, confirmPassword, role, secretKey } = req.body;
    console.log("req.body:", req.body);
    console.log("req.files:", req.files);

    if ([fullName, email, username, password, confirmPassword, role].some((field) => !field?.trim())) {
        throw new ApiError(400, "All fields are required");
    }

    if (password.trim() !== confirmPassword.trim()) {
        throw new ApiError(400, "Passwords do not match");
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) throw new ApiError(409, "User with email or username already exists");

    // Admin and SuperAdmin logic
    let isSuperAdmin = false;

    if (role === 'admin') {
        if (!secretKey || (secretKey !== process.env.ADMIN_SECRET_KEY && secretKey !== process.env.SUPERADMIN_SECRET_KEY)) {
            throw new ApiError(403, "Invalid or missing secret key");
        }

        if (secretKey === process.env.SUPERADMIN_SECRET_KEY) {
            isSuperAdmin = true;
        }
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    if (!avatarLocalPath) throw new ApiError(400, "Avatar is required");

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) throw new ApiError(400, "Avatar upload failed");

    const user = await User.create({
        fullName,
        email,
        username,
        password,
        avatar: avatar.url,
        role,
        isSuperAdmin
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if (!createdUser) throw new ApiError(500, "User registration failed");

    res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"));
});

// 🔸 Login
const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!email && !username) throw new ApiError(400, "Username or email is required");

    const user = await User.findOne({ $or: [{ username }, { email }] });
    if (!user) throw new ApiError(404, "User does not exist");

    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if (!isPasswordCorrect) throw new ApiError(401, "Invalid credentials");

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {
            user: loggedInUser,
            accessToken,
            refreshToken,
            role: loggedInUser.role,
            isSuperAdmin: loggedInUser.isSuperAdmin
        }, "User logged in successfully"));
});

// 🔸 Logout
const logoutUser = asyncHandler(async (req, res) => {
    if (!req.user?._id) throw new ApiError(401, "Unauthorized request");

    await User.findByIdAndUpdate(req.user._id, {
        $unset: { refreshToken: 1 }
    });

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict"
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// 🔸 Refresh Token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request");

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id);

        if (!user) throw new ApiError(401, "Invalid refresh token");
        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(200, {
                accessToken,
                refreshToken: newRefreshToken
            }, "Access token refreshed"));
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

// 🔸 Change Password
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Both old and new passwords are required");
    }

    const user = await User.findById(req.user?._id);
    if (!user) throw new ApiError(404, "User not found");

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) throw new ApiError(400, "Invalid old password");

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword
};
