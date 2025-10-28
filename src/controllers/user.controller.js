import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
const generateAccessandRefreshTokens=async(userId)=>{
    try{
        const user=await User.findById(userId)
        const acccesToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()
         user.refreshToken=refreshToken
        await user.save({ValiditeBeforeSave: false})
        return {acccesToken,refreshToken}
    }catch(error){
        throw new ApiError(500,"something went wrong while generating refresh and accces token")
    }
}
const registerUser=asyncHandler(async(req,res)=>{ // get user details from frontend
// validation – not empty
// check if user already exists: username, email
// check for images, check for avatar
// upload them to cloudinary, avatar
// create user object – create entry in db
// remove password and refresh token field from response
// check for user creation
// return res
   const {fullname,email,username,password}= req.body
   console.log("email: ",email);
   if(
    [fullname,email,username,password].some((field)=>
    field?.trim()==="")
   ){
    throw new ApiError(400,"All Filed are required")
   }
   const existedUser=await User.findOne({
    $or:[{username},{email}]
   })
   if(existedUser){
    throw new ApiError(409,"User with email or username alredy exits")
   }
   // console.log(req.files)
     


   const avatarLocalPath=req.files?.avatar[0]?.path;
  // const coverImageLocalPath=req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage)&&
  req.files.coverImage.length>0){
    coverImageLocalPath=req.files.coverImage[0].path
  }

   if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is required")
   }
   const avatar=await uploadOnCloudinary(avatarLocalPath)
   const coverImage=await uploadOnCloudinary(coverImageLocalPath)
   if(!avatar){
    throw new ApiError(400,"Avatar file is required")
   }
   const user=await  User.create({
    fullname,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
   })
   const createdUser=await User.findById(user._id).select(
    "-password -refreshToken"
   )
   if(!createdUser){
    throw new ApiError(500,"something wnet wrong while registering the user")
   }

   return res.status(201).json(
    new ApiResponse(200,createdUser,"User registered Scccuesfully")
   )

})
const loginUser=asyncHandler(async(req,res)=>{
    //req body->data
    // username or email
    // find the user
    // password check
    // acces and refrwsh token
    //send cookies
    const {email,username,password}=req.body
    console.log(email)
    if(!username && !email){
        throw new ApiError(400,"username or passwordis required")
    }
  const user= await User.findOne({
        $or:[{username},{email}]
    })
    if(!user){
        throw new ApiError(400,"User does not exsit")
    }
    const isPasswordValid=await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401,"invalid User credinetial")
    }
   const {acccesToken,refreshToken}=await generateAccessandRefreshTokens(user._id)
    
   const loggedInUser=await User.findById(user._id).
   select("-password -refreshToken")
   const options={
    httpOnly:true,
    secure:true
   }
   return res.
   status(200).
   cookie("accessToken",acccesToken,options)
   .cookie("refreshToken",refreshToken,options)
   .json(
    new ApiResponse(
        200,
        {
            user:loggedInUser,acccesToken,
            refreshToken
        },
        "User logged in succesfullly"
    )
   )
})
const logoutUser=asyncHandler(async(req,res)=>{
  await  User.findByIdAndUpdate(
        req.user._id,{
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
       return res.status(200)
       .clearCookie("accessToken",options)
       .clearCookie("refreshToken",options)
       .json(new ApiResponse(200,{},"User logged out suucesfully"))
})
export {
    registerUser,
    loginUser,
    logoutUser

}





// The .some() method checks whether at least one element in the array satisfies the condition inside.
// field?.trim():
// ?. → optional chaining (prevents error if field is undefined or null).
// .trim() → removes extra spaces from both ends of the string.
// Then it checks if the result is an empty string ("").