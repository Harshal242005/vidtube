import { Router } from "express";

import { createTweet, getUserTweets, updateTweet, deleteTweet } from "../controllers/tweet.controllers.js";

import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(createTweet);
router.route("/:userId").get(getUserTweets);
router.route("/:tweetId").put(updateTweet);
router.route("/:tweetId").delete(deleteTweet);

export default router;

