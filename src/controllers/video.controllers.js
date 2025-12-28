
import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { uploadOnCloudinary, deleteImageToCloudinary, deleteVideoToCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asynchandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination

  const videos = await Video.aggregate([
    {
      $match: {
        isPublished: true,
      },
    },
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
              avatar:1,
            },
            
          },
        ],
      },
    },{

      $addFields: {
        owner: { $arrayElemAt: ["$owner", 0] },
      },
    },
    {
      $sort:
       { createdAt: -1 },
    },
    {
      $skip: (parseInt(page) - 1) * parseInt(limit),
    },
    {
      $limit: parseInt(limit),
    }
  ])

    
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { videos },
        "Videos fetched successfully"
      )
    );

});

const publishAVideo = asynchandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  if(!title || !description){
    throw new ApiError(400, "Title and description are required");
  }

  if(!description || description.trim() === ""){  
    throw new ApiError(400, "Description cannot be empty");
  }

  const videoLocalPath = req.files?.videoFile?.[0]?.path;

  if(!videoLocalPath){
    throw new ApiError(400, "Video file is required");
  }
  
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  if(!thumbnailLocalPath){
    throw new ApiError(400, "Thumbnail image is required");
  }
  console.log("Uploading video...");
  const videoFile = await uploadOnCloudinary(videoLocalPath);
  console.log("Video uploaded");


 if(!videoFile || !videoFile.url){
    throw new ApiError(500, "Failed to upload video file");
  }
  
  
  console.log(videoFile);

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
  if(!thumbnail || !thumbnail.url){
    throw new ApiError(500, "Failed to upload thumbnail image");
  }


  const newVideo = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    duration: videoFile.duration,
    thumbnail: thumbnail.url,
    owner: req.user._id,
    isPublished: true,
  });
  
  const createdVideo = await Video.findById(newVideo._id).populate(
    "owner",
    "username fullname avatar"
  );
  return res.status(200).json(new ApiResponse(200, createdVideo, "Video published successfully")); 

});


const getVideoById = asynchandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id

  if(!videoId || !isValidObjectId(videoId)){
    throw new ApiError(400, "Invalid video id");
  }

  const findVideo = await Video.findById(videoId)
  if(!findVideo){
    throw new ApiError(404, "Video not found");
  }

  return res.status(200).json(new ApiResponse(200, findVideo, "Video fetched successfully"));

});

const updateVideo = asynchandler(async (req, res) => {
  console.log("BODY:", req.body);
  console.log("FILES:", req.files);
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
  if(!videoId || !isValidObjectId(videoId)){
    throw new ApiError(400, "Invalid video id");
  }

  const video  = await Video.findById(videoId);
  if(!video){
    throw new ApiError(404, "Video not found");
  }

  if(video.owner.toString() !== req.user._id.toString()){
    throw new ApiError(403, "You are not authorized to update this video");
  }


  const { title, description } = req.body;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
  if(thumbnailLocalPath){
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);   
    if(!thumbnail || !thumbnail.url){
      throw new ApiError(500, "Failed to upload thumbnail image");
    }
    video.thumbnail = thumbnail.url;  
  }

  if(title){
    video.title = title;
  }
  if(description){
    video.description = description;
  } 
  await video.save();
  return res.status(200).json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asynchandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video

  if(!videoId ){
    throw new ApiError(400, "Invalid video id");
  }
  if(!isValidObjectId(videoId)){
    throw new ApiError(400, "Invalid video id");
  }
  
   const videoToDelete = await Video.findById(videoId);
   
    if (!videoToDelete) { 
      throw new ApiError(404, "Video not found");
    }

    
    if (videoToDelete.owner.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "You are not authorized to delete this video");
    }

    try {
      await deleteVideoToCloudinary(videoToDelete.videoFile);
      await deleteImageToCloudinary(videoToDelete.thumbnail);
    } catch (error) {
      console.error("Error deleting files from cloudinary:", error);
      // Continue with deletion even if cloudinary deletion fails
    }
    await Video.findByIdAndDelete(videoId);

    return res
      .status(200)
      .json(
        new ApiResponse(200, null, "Video deleted successfully")
      );
    

});

const togglePublishStatus = asynchandler(async (req, res) => {
  const { videoId } = req.params;
   if (!videoId || !isValidObjectId(videoId)) {
     throw new ApiError(400, "Invalid video id");
   }

   const video = await Video.findById(videoId);
   if (!video) {
     throw new ApiError(404, "Video not found");
   }

    if (video.owner.toString() !== req.user._id.toString()) { 
      throw new ApiError(403, "You are not authorized to update this video");
    }

   video.isPublished = !video.isPublished;
   const updatedRes = await video.save();
   if (!updatedRes) {
     throw new ApiError(500, "Failed to update publish status");
   }

   return res
     .status(200)
     .json(
       new ApiResponse(
         200,
          {publishStatus : updatedRes.isPublished},
         "Video publish status updated successfully"
       )
     );

});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
