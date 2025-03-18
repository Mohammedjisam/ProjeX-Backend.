// routes/tenantRoutes.ts
import express from "express";
const tenantRouter = express.Router();
import TenantController from '../controllers/tenant.controller';

const tenantController = new TenantController();

// Create a new tenant
tenantRouter.post('/addtenant', tenantController.createTenant);

// Get all tenants
tenantRouter.get('/', tenantController.getAllTenants);

// Get tenant by ID
tenantRouter.get('/:id', tenantController.getTenantById);

// Update tenant
tenantRouter.put('/:id', tenantController.updateTenant);

// Delete tenant
tenantRouter.delete('/:id', tenantController.deleteTenant);

export default tenantRouter;