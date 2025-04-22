import { Request, Response, NextFunction } from "express";
import { searchOrganizationsByType, searchAllOrganizations } from "../../utils/helper.ts";
import { categoryTypeEnum } from "../../models/organizations.model.ts";

/**
 * Search for companies (organizations with category_type "company")
 */
const searchCompanies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query } = req.params;
    
    if (!query || typeof query !== 'string') {
      res.status(400).json({ message: "Search query is required" });
      return;
    }
    
    const companies = await searchOrganizationsByType(query, categoryTypeEnum.company);
    
    res.status(200).json({
      message: "Companies retrieved successfully",
      data: companies.map(company => ({
        _id: company._id,
        name: company.name,
        logo: company.logo
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search for educational institutions (organizations with category_type "education")
 */
const searchEducationalInstitutions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query } = req.params;
    
    if (!query || typeof query !== 'string') {
      res.status(400).json({ message: "Search query is required" });
      return;
    }
    
    const institutions = await searchOrganizationsByType(query, categoryTypeEnum.education);
    
    res.status(200).json({
      message: "Educational institutions retrieved successfully",
      data: institutions.map(institution => ({
        _id: institution._id,
        name: institution.name,
        logo: institution.logo
      }))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search for all organizations regardless of category_type
 */
const searchOrganizations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { query } = req.params;
    
    if (!query || typeof query !== 'string') {
      res.status(400).json({ message: "Search query is required" });
      return;
    }
    
    const organizations = await searchAllOrganizations(query);
    
    res.status(200).json({
      message: "Organizations retrieved successfully",
      data: organizations.map(org => ({
        _id: org._id,
        name: org.name,
        logo: org.logo,
        category_type: org.category_type
      }))
    });
  } catch (error) {
    next(error);
  }
};

export { searchCompanies, searchEducationalInstitutions, searchOrganizations };