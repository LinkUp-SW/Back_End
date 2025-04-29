import express from "express";
import { searchCompanies, searchEducationalInstitutions, searchOrganizations, searchUsersByName, checkIsFollower } from "../../controllers/organization/utilities.controller.ts";

const router = express.Router();

router.get("/company/:query", searchCompanies);

router.get("/education/:query", searchEducationalInstitutions);

router.get("/:query", searchOrganizations);

router.get("/users/:name", searchUsersByName);

router.get('/is-follower/:organization_id', checkIsFollower);

export default router;
