import express from "express";
import { searchCompanies, searchEducationalInstitutions, searchOrganizations, searchUsersByName } from "../../controllers/organization/search.controller.ts";
import { searchUsers } from "../../services/search.service.ts";

const router = express.Router();

router.get("/company/:query", searchCompanies);

router.get("/education/:query", searchEducationalInstitutions);

router.get("/:query", searchOrganizations);

router.get("/users/:name", searchUsersByName);

export default router;
