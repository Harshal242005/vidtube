import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { User } from "../models/user.models.js";

const getChannelStats = asynchandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    
  const subscribers = await Subscription.find({

    channel: new mongoose.Types.ObjectId(req.user?._id),
  }).countDocuments();

  const  videosCount = await Video.find({
    owner: (req.user?._id),
  }).countDocuments();

  const viewsCount = await Video.aggregate([
      {

        $match: {
          owner: new mongoose.Types.ObjectId(req.user?._id),
          ispublished: true,
        },
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$views" },

        }
      }
  ])

  const views = viewsCount[0]?.totalViews || 0;

  const likesCount = await Like.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
        ispublished: true,
      },
    },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "likes",
        }
      },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: { $size: "$likes" } },
        }
      },

  ])
  const likes = likesCount[0]?.totalLikes || 0;

  const channelInfo = await User.findById(req.user?._id).select("-password -refreshToken")

  return res.status(200).json(new ApiResponse(200, {
    subscribers,
    videosCount,
    views,
    likes,
    channelInfo
  }, "Channel stats fetched successfully"));

});

const getChannelVideos = asynchandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel

  const channelVideos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
        isPublished: true,  
      },
    },{
      $sort: { createdAt: -1  
      }
    },
    
  ])

  return res.status(200).json(new ApiResponse(200, {channelVideos}, "Channel videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
