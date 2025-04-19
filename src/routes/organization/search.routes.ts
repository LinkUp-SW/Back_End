import express from "express";
import { searchCompanies, searchEducationalInstitutions, searchOrganizations } from "../../controllers/organization/search.controller.ts";

const router = express.Router();

router.get("/company/:query", searchCompanies);
router.get("/education/:query", searchEducationalInstitutions);
router.get("/:query", searchOrganizations);

export default router;
