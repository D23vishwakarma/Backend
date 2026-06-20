import { User } from '../models/user.models.js'
import { Video } from '../models/video.models.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from './../utils/asynhandler.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'

const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend
    //check validation
    //check user already exist
    //check for images and avatar
    //if available upload them to cloudinary,avatar
    //create user object-create entry in db
    //remove password and refresh token field from response
    //check for user creation
    //return res

    const { fullname, email, username, password } = req.body
    console.log("email:", email)
    if (
        [fullname, email, username, password].some((field) =>
            field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "Username or email already exists")
    }
    console.log("FILES:", req.files);
    console.log("BODY:", req.body);

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    console.log("avatarLocalPath:", avatarLocalPath);
    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!avatar) {
        throw new ApiError(400, "avatar is required")
    }

    const user = await User.create(
        {
            fullname,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            username: username.toLowerCase(),
            email,
            password
        }
    )
    const createdUser = await User.findById(user._id).select("-password -refreshTokens")
    if (!createdUser) {
        throw new ApiError(500, "something went wrong while registering")
    }
    res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

export { registerUser }