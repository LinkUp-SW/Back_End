import express from "express";
import * as connections  from "../../controllers/my_network/myNetwork.controller.ts";

const router = express.Router();

// Route to follow a user
router.post("/follow/:user_id", connections.followUser);

// Route to unfollow a user
router.delete("/unfollow/:user_id", connections.unfollowUser);

// Route to get the following list
router.get("/my-network/network-manager/following", connections.getFollowingList);

// Route to get the followers list
router.get("/my-network/network-manager/followers", connections.getFollowersList);

// Route to send a connection request
router.post("/connect/:user_id", connections.sendConnectionRequest);

// Route to get sent connection requests
router.get("/my-network/invitation-manager/sent", connections.getSentConnections);

// Route to get received connection request
router.get("/my-network/invitation-manager/received", connections.getReceivedConnections);

// Route to accept a connection request
router.post("/accept/:user_id", connections.acceptConnectionRequest);

// Route to get connections list
router.get("/my-network/invite-connect/connections", connections.getAllConnections);

// Route to remove a connection
router.delete("/my-network/connections/remove/:user_id", connections.removeConnection);

// Route to ignore a received connection request
router.delete("/my-network/invitation-manager/ignore/:user_id", connections.ignoreConnectionRequest);

// Route to withdraw a sent connection request
router.delete("/my-network/invitation-manager/withdraw/:user_id", connections.withdrawConnectionRequest);

// Route to block a user
router.post("/block/:user_id", connections.blockUser);

// Route to unblock a user
router.delete("/manage-by-blocked-list/unblock/:user_id", connections.unblockUser);

// Route to get the blocked list
router.get("/manage-by-blocked-list/blocked", connections.getBlockedList);

// Route to get the number of connections
router.get("/my-network/connections/count", connections.getNumberOfConnectionsAndFollowers);


export default router;