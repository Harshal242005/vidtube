import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { Tweet } from "../models/tweet.models.js";

const toggleVideoLike = asynchandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
  if(!videoId || !mongoose.Types.ObjectId.isValid(videoId)){
    throw new ApiError(400, "Invalid video ID")
  }

  const isLiked = await Like.findOne({
    likeBy: req.user._id,
    video: videoId,
  });

  if (isLiked) {
    //unlike the video
   const deletedLike =  await Like.findByIdAndDelete(isLiked._id);
    return res
      .status(200)
      .json(new ApiResponse(200, deletedLike, "Video unliked successfully"));
  }
  const newLike = await Like.create({
    likeBy: req.user._id,   
    video: videoId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newLike, "Video liked successfully"));

   
});

const toggleCommentLike = asynchandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment

  if(!commentId && !mongoose.Types.ObjectId.isValid(commentId)){
    throw new ApiError(400, "Invalid comment ID")
  }

  const isLiked = await Like.findOne({
    likeBy: req.user._id,
    comment: commentId,
  }); 
  if (isLiked) {
    //unlike the comment
   const deletedLike =  await Like.findByIdAndDelete(isLiked._id);
    return res
      .status(200)
      .json(new ApiResponse(200, deletedLike, "Comment unliked successfully"));
  }
  const newLike = await Like.create({
    likeBy: req.user._id,   
    comment: commentId,
  }); 
  return res
    .status(201)
    .json(new ApiResponse(201, newLike, "Comment liked successfully")); 
});

const toggleTweetLike = asynchandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  if(!tweetId && !mongoose.Types.ObjectId.isValid(tweetId)){
    throw new ApiError(400, "Invalid tweet ID")
  }

  const tweet = await Tweet.findById(tweetId);
  if(!tweet){
    throw new ApiError(404, "Tweet not found");
  }
  const isLiked = await Like.findOne({
    likeBy: req.user._id,
    tweet: tweetId,
  });
  if (isLiked) {
    //unlike the tweet
   const deletedLike =  await Like.findByIdAndDelete(isLiked._id);
    return res
      .status(200)
      .json(new ApiResponse(200, deletedLike, "Tweet unliked successfully"));
  } 
  const newLike = await Like.create({
    likeBy: req.user._id,   
    tweet: tweetId,
  });
  return res
    .status(201)
    .json(new ApiResponse(201, newLike, "Tweet liked successfully"));
});

const getLikedVideos = asynchandler(async (req, res) => {
  //TODO: get all liked videos
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likeBy: new mongoose.Types.ObjectId(req.user._id),
      },

    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {$project: {
              videoFile:1,
              thumbnail : 1,
              duration: 1,
              title: 1,
              views: 1,

              
            }
          }
        ]
            
      }
    },{
      $unwind: {
        path: "$video",
      }
    },{
      $unset:"likeBy",
    }
  ]) 
  return res
    .status(200)
    .json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
