import { Router } from "express";

import { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels } from "../controllers/subscription.controllers.js";

import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.use(verifyJWT);

router.route("/channel/:channelId").post(toggleSubscription);
router.route("/user/:channelId").get(getUserChannelSubscribers);
router.route("/channel/:subscriberId").get(getSubscribedChannels);

export default router;