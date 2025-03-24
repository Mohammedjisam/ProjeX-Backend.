
import express from 'express';
import CompanyController from '../controllers/company/company.controller';
const companyRouter = express.Router();
import { protect } from '../middleware/auth';

const companyController = new CompanyController();

// Company creation flow
companyRouter.post('/create-payment-intent', protect, companyController.createPaymentIntent);
companyRouter.post('/complete-creation', protect, companyController.completeCompanyCreation);

// Company management
companyRouter.get('/', protect, companyController.getAllCompanies);
companyRouter.get('/:id', protect, companyController.getCompanyById);
companyRouter.put('/:id', protect, companyController.updateCompany);
companyRouter.delete('/:id', protect, companyController.deleteCompany);
companyRouter.patch('/:id/toggle-verification', protect, companyController.toggleAdminVerification);

// Subscription management
companyRouter.get('/subscription/details', protect, companyController.getSubscriptionDetails);
companyRouter.post('/subscription/update-plan', protect, companyController.updateSubscriptionPlan);
companyRouter.post('/subscription/cancel', protect, companyController.cancelSubscription);
companyRouter.post('/subscription/update-payment-method', protect, companyController.updatePaymentMethod);
companyRouter.post('/webhook', express.raw({ type: 'application/json' }), companyController.handleWebhook);

export default companyRouter;