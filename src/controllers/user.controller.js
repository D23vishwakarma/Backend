import { User } from '../models/user.models.js'
import { Video } from '../models/video.models.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from './../utils/asynhandler.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'

const generateAccessAndRefreshTokens=async(userId)=>{
    try {
        const user=await User.findOne(userId);
        const refreshToken=user.generateRefreshToken();
        const accessToken=user.generateAccessToken();
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})

        return {refreshToken,accessToken}

    } catch (error) {
        throw new ApiError(500,"Something went wrong in generating access or refresh tokens")
    }
}

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

const loginUser=asyncHandler(async(req,res)=>{
    //req body->data
    //username and email
    //find the user
    //check the password
    //access and refreshtoken
    //send cookie

    const {username,email,password}=req.body

    if(!username||!email){
        throw new ApiError(400,"username or email is required")
    }
    const user=await User.findOne({
        $or: [{username},{email}]
    }
    )
    if(!user){
        throw new ApiError(404,"user does not exist")
    }
    const isPasswordValid=await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials")
    }

    const {refreshToken,accessToken}=await generateAccessAndRefreshTokens(user._id)
    const loggedInUser=await User.findById(user._id).select("-password refreshToken")
    const options={
        httpOnly:true,
        secure:true
   } 
   return res.status(200).cookie("refreshToken",refreshToken,options).cookie("accessToken",accessToken,options)
   .json(
        new ApiResponse(200,{
            user:loggedInUser,accessToken,refreshToken
        },"user logged in successfully")
   )
})
const logoutUser=asyncHandler(async(req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
        
    )
    const options={
        httpOnly:true,
        secure:true
   } 

   return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options)
   .json(
    new ApiResponse(200,{},"user logged out")
   )
})

export { registerUser,loginUser,logoutUser }