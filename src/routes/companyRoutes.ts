// routes/companyRoutes.ts
import express from "express";
const companyRouter = express.Router();
import CompanyController from '../controllers/company.controller';

const companyController = new CompanyController();

// Create a new company
companyRouter.post('/addcompany', companyController.createCompany);

// Get all companies
companyRouter.get('/', companyController.getAllCompanies);

// Get company by ID
companyRouter.get('/:id', companyController.getCompanyById);

// Update company
companyRouter.put('/:id', companyController.updateCompany);

// Delete company
companyRouter.delete('/:id', companyController.deleteCompany);

// Toggle admin verification status
companyRouter.patch('/:id/toggle-verification', companyController.toggleAdminVerification);

export default companyRouter;