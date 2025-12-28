import { ApiError } from "../utils/ApiError.js";
import { asynchandler } from "../utils/asynchandler.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { warn } from "console";
import { deleteImageToCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { subscribe } from "diagnostics_channel";

const generateAccessAndRefreshToken = async (userId) => {
    try {
      const user =  await User.findById(userId)
  
      if(!user){
         throw new ApiError(500, "Can't find user to generate access and refresh token");
      }
  
      const accessToken = user.generateAccessToken()
      const refreshToken = user.generateRefreshToken()
  
      user.refreshToken= refreshToken
      await user.save({ validateBeforeSave: false})
      return {accessToken, refreshToken}
    } catch (error) {
      throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
    }
}

const registerUser = asynchandler(async (req, res) => {
  const { fullname, email, username, password } = req.body;

  //validation
  if (
    [fullname, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

if (!req.files || !req.files.avatar || !req.files.avatar[0]) {
  throw new ApiError(400, "Avatar file is required");
}
  
  const avatarLocalPath = req.files?.avatar[0].path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

    // const avatar = await uploadOnCloudinary(avatarlocalPath)
    // let coverImage = ""
    
    // if(coverlocalPath){
    //      coverImage = await uploadOnCloudinary(coverImage)
        
    // }

    let avatar;
    try {
      avatar = await uploadOnCloudinary(avatarLocalPath)
      console.log("uploaded avatar", avatar);
      
    } catch (error) {
      console.log("Error uploading avatar", error);
      throw new ApiError(500, "Failed to upload avatar")
    }
    let coverImage = null;

    if (coverImageLocalPath ) {
      try {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
        console.log("uploaded cover image", coverImage);
      } catch (error) {
        console.log("Error uploading cover image", error);
        if (avatar) {
        await deleteImageToCloudinary(avatar.url);
      }
      throw new ApiError(500, "Failed to upload cover image");
    }
       
    }




     try {
       const user = await User.create({
         fullname,
         email,
         username: username.toLowerCase(),
         password,

         avatar: avatar.url,
         coverImage: coverImage?.url || "",
       });

 
     
 
     const createdUser =  await User.findById(user._id).select("-password -refreshToken")
     
     if(!createdUser) {
         throw new ApiError(500, "Something went wrong while registering a user")
     }
 
     return res 
       .status(201)
       .json( new ApiResponse(201, createdUser, "User registed successfully "))
 
     } catch (error) {
         console.log("User creation failed",error);
         if(avatar) {
          await deleteImageToCloudinary(avatar.url)
         }
         if(coverImage) {
          await deleteImageToCloudinary(coverImage.url)
         }

         throw new ApiError(500, "Something went wrong while registering a user and images were deleted")
     }

});

const loginUser = asynchandler(async(req, res) => {
    // get data from body
    const{email, username, password} = req.body


    //validation
   if (!email && !username) {
     throw new ApiError(400, "Email or username is required");
   }

    if(!password){
      throw new ApiError(400, "password is req")
    }


    const user = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    //validate password
    const isPasswordValid =  await user.isPasswordCorrect(password)

    if(!isPasswordValid){
      throw new ApiError(401, "invalid credentials")
    }

  const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

  const loggedInUser = await User.findById(user._id)
  .select("-password -refreshToken ");

  if(!loggedInUser){
    throw new ApiError(500, "Something went wrong while logging in")
  }

  const options = {
    httpOnly: true,
    secure : process.env.NODE_ENV === "production",

  }
  return res.status(200).cookie("accessToken", accessToken, options).json(new ApiResponse(200, {user: loggedInUser, accessToken, refreshToken}, "User logged in successfully"))




})


const refreshAccessToken = asynchandler(async (req, res) => {
       
     const incomingRefreshToken = req.body.refreshToken || req.cookies.refreshToken;

      if(!incomingRefreshToken){
         throw new ApiError(400, "Refresh token is required")
      }

      try {
        const decodedToken = jwt.verify(
          incomingRefreshToken,
           process.env.REFRESH_TOKEN_SECRET)
          

           const user =  await User.findById(decodedToken?._id)

           if(!user){
              throw new ApiError(401, "invalid refresh token - user not found") 
           }

           if(incomingRefreshToken !== user?.refreshToken){
              throw new ApiError(401, "Invalid refresh token - token mismatch")

           }
           const options = {
            httpOnly: true,
            secure : process.env.NODE_ENV === "production", 
           }

           const {accessToken, refreshToken: newRefreshToken} = await generateAccessAndRefreshToken(user._id);


           return res
           .status(200)
           .cookie("accessToken", accessToken, options)
           .cookie("refreshToken", newRefreshToken, options)
           .json(
            new ApiResponse(
              200,
               {accessToken, 
                refreshToken: newRefreshToken},
                "Access token refreshed successfully"))



      } catch (error) {
        throw new ApiError(500, "something went wrong while refreshing access token");
        
      }

})

const logoutUser = asynchandler(async (req, res) => {

    await User.findByIdAndUpdate(
      req.user._id,
       {
        $unset: {
          refreshToken: 1
        }
      }, {new: true})

      const options = {
        httpOnly: true,
        secure : process.env.NODE_ENV === "production", 
       }  

        return res
          .status(200)
          .clearCookie("accessToken", options)
          .clearCookie("refreshToken", options)
          .json(new ApiResponse(200, {}, "User logged out successfully"))


})

const changeCurrentPassword = asynchandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user?._id);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const isOldPasswordValid = await user.isPasswordCorrect(oldPassword);
    
    if (!isOldPasswordValid) {
      throw new ApiError(401, "Old password is incorrect");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
 

    return res
      .status(200)
      .json(new ApiResponse(200,
         {}, 
         "Password changed Successfully"));
})

const getCurrentUser = asynchandler(async (req, res) => {
       return res
       .status(200)
       .json(new ApiResponse(200,
                     req.user, 
                     "Current user fetched successfully")) 
})

const UpdateAccountDetails = asynchandler(async (req, res) => {
        const { fullname, email } = req.body;

        if(!fullname?.trim() || !email?.trim()){
          throw new ApiError(400, "fullname and email are required")
        }

        const updatedUser = await User.findByIdAndUpdate(
          req.user._id,
          {
            $set: {
              fullname,
              email: email
            }
          },
          { new: true }
        ).select("-password -refreshToken");

        if(!updatedUser){
          throw new ApiError(500, "Something went wrong while updating account details")
        }

        return res
          .status(200)
          .json(new ApiResponse(200, updatedUser, "Account details updated successfully"))  



})

const updateUserAvatar = asynchandler(async (req, res) => {
  const avatarLocalPath = req.file?.path; 
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  
   

  const avatar = await uploadOnCloudinary(avatarLocalPath);


  if (!avatar?.url ) {
    throw new ApiError(500, "Failed to upload avatar");
  }

  const user = await User.findById(req.user._id);

  if (!user.avatar) {
    throw new ApiError(500, "User avatar details not found");
  }

  const cloudinaryFilePathToDelete = user.avatar;

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
    
      $set: {
        avatar: avatar.url
        
        },
      },
      {new: true },
).select("-password -refreshToken");

 await deleteImageToCloudinary(cloudinaryFilePathToDelete); 



  return res.status(200).json(new ApiResponse(200, updatedUser, "User avatar updated successfully"));
})

const updateUserCoverImage = asynchandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path; 
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing");
  }   

  

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!coverImage.url){
    throw new ApiError(500, "Failed to upload cover image"); 
  } 

  const user = await User.findById(req.user._id);
  if(!user.coverImage){
    throw new ApiError(400, "User cover image details not found");
  }
  
  const cloudinaryFilePathToDelete = user.coverImage; 
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage : coverImage.url,
          
        },
      },
    
    { new: true }
  ).select("-password -refreshToken");
 return res.status(200).json(new ApiResponse(200, updatedUser, "User cover image updated successfully")); 
})

const deleteUserCoverImage = asynchandler(async (req, res) => {
  const user = await User.findById(req.user?._id);
  if(!user.coverImage){
    throw new ApiError(400, "User cover image details not found");
  }
  
  await deleteImageToCloudinary(user.coverImage);
  user.coverImage = null;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, "User cover image deleted successfully"));
})


const getUserChannelProfile = asynchandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is required");
  }

  const channel = await User.aggregate([
    { 
      $match: {
         username: username.toLowerCase()
        } 
    },
    { $lookup: {
       from: "subscriptions",
      localField: "_id",
      foreignField: "channel",
      as: "subscribers"
    }
     },
     {
      $lookup: {
        from: "subscriptions",
        localField: "_id",  
        foreignField: "subscriber",
        as: "subscribedTo"
      }
     },
     {
      $addFields: {
        subscribersCount: { 
          $size: "$subscribers" 
        },
        subscribedToCount: {
           $size: "$subscribedTo"
           },
          channelsSubscribedTo: {
          $size: "$subscribedTo.channel"

          },
          isSubscribed: {
            $cond: {
              if: {
                $in: [req.user._id, "$subscribers.subscriber"]
              },
              then: true,
              else: false
            }
          }
        }
      },
      {
        //project only necessary fields
        $project: {
          fullname: 1,  
          username: 1,
          avatar: 1,
          coverImage: 1,  
          subscribersCount: 1,
          subscribedToCount: 1,
          isSubscribed: 1,
          email: 1
        }
      }

      ]
    );

    if(!channel || channel.length === 0){
      throw new ApiError(404, "Channel not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, 
        channel[0], 
        "User channel profile fetched successfully"));

})

const getWatchHistory  = asynchandler(async (req, res) => {
  const user = await User.aggregate([
      {
        $match: { 
          _id: new mongoose.Types.ObjectId(req.user._id)  


        }     
      },{
        $lookup: {
          from: "videos",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
               pipeline: [
                  {
                    $project: {
                      fullname: 1,
                      username: 1,
                      avatar: 1
                    }
                  }
               ]
              }
            },
            {
              $addFields: {
                owner: {
                  $arrayElemAt: ["$owner", 0]
                }
              }
            }
          ]
        },
      },
      
          
      
  ])

  if(!user || user.length === 0){
    throw new ApiError(404, "User not found")
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "User watch history fetched successfully"))

})

// const getUserChannelProfile = asynchandler(async (req, res) => {})

export {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  changeCurrentPassword,
  getCurrentUser,
  UpdateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
  deleteUserCoverImage,
};
