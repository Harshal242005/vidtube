import { Router } from "express";
import {
     createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist
} from "../controllers/playlist.controllers.js"

import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(createPlaylist);
router.route("/:playlistId").get(getPlaylistById);
router.route("/:playlistId").delete(deletePlaylist);
router.route("/:playlistId").patch(updatePlaylist);
router.route("/user/:userId").get(getUserPlaylists);
router.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist);
router.route("/add/:videoId/:playlistId").patch(addVideoToPlaylist);

export default router;