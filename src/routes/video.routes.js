import { Router } from "express";

import {
  getAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  deleteVideo,
  updateVideo,
} from "../controllers/video.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";     

import { upload } from "../middlewares/multer.middlewares.js";

const router = Router();
router.route("/").get(getAllVideos);

router.use(verifyJWT); // Protect all routes below this middleware

router.route("/publish").post(upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
]), publishAVideo); 

router.route("/:videoId").post(togglePublishStatus)

router.route("/:videoId").get(getVideoById)
router.route("/:videoId").delete(deleteVideo)
router.patch(
  "/:videoId",
  verifyJWT,
  upload.fields([{ name: "thumbnail", maxCount: 1 }]),
  updateVideo
);


export default router;