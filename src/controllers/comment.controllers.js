import mongoose from "mongoose";
import { Comment } from "../models/comment.models.js";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";

const getVideoComments = asynchandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
if(!videoId && !mongoose.Types.ObjectId.isValid(videoId)){
  throw new ApiError(400, "Invalid video ID")
}
  

  const { page = 1, limit = 10 } = req.query;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  //create pipeline fot comments

  const videoComments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "owner",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullname: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $arrayElemAt: ["$owner", 0],
        },
      },
    },
    {
      $skip: (parseInt(page) - 1) * parseInt(limit),
    },
    {
      $limit: parseInt(limit),
    },
  ]);

  return res
     .status(200)
     .json(
      new ApiResponse(200, videoComments, "Comments fetched successfully"))
  
});

const addComment = asynchandler(async (req, res) => {
  // TODO: add a comment to a video

  const { videoId } = req.params;

  if (!videoId && !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const { comment} = req.body;

  if(!comment){
    throw new ApiError(400, "Comment text is required")
  }


  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const newComment = await Comment.create({
    content: comment,
    video: videoId,
    owner: req.user._id,
  })
  
  if(!newComment){
    throw new ApiError(500, "Failed to add comment")
  }

  return res
     .status(201)
     .json(
      new ApiResponse(201, newComment, "Comment added successfully"))

});

const updateComment = asynchandler(async (req, res) => {
  // TODO: update a comment
   const { commentId } = req.params;

   if (!commentId && !mongoose.Types.ObjectId.isValid(commentId)) {
     throw new ApiError(400, "Invalid comment ID");
   }

    const { comment } = req.body;

    if (!comment) {
      throw new ApiError(400, "Comment content is required");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { content: comment },
      { new: true }
    );  

    if (!updatedComment) {
      throw new ApiError(404, "Comment not updated");
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedComment, "Comment updated successfully"));

});

const deleteComment = asynchandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;

  if (!commentId && !mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }


  const deletedComment = await Comment.findByIdAndDelete(commentId);

  if (!deletedComment) {
    throw new ApiError(404, "Comment not deleted");
  }

  return res
     .status(200)
     .json(
      new ApiResponse(200, deletedComment, "Comment deleted successfully"))


});

export { getVideoComments, addComment, updateComment, deleteComment };
