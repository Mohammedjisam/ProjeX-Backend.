import { Request, Response } from 'express';
import { User } from '../../models/User';

export const getCompanyAdmins = async (req: Request, res: Response) => {
  try {
    console.log(`User ${req.user._id} with role ${req.user.role} accessed company admins data`);
    
    const companyAdmins = await User.find({ role: 'companyAdmin' }).select('name email phoneNumber isActive');
    console.log("Company admins data fetched:", companyAdmins.length);
    
    res.status(200).json({
      success: true,
      count: companyAdmins.length,
      data: companyAdmins
    });
  } catch (error) {
    console.error('Error fetching company admins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company admins',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};


export const deleteCompanyAdmin = async (req: Request, res: Response) => {
  try {
    const deletedCompanyAdmin = await User.findOneAndDelete({
      _id: req.params.id,
      role: 'companyAdmin'
    });
    
    if (!deletedCompanyAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Company admin not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Company admin deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting company admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete company admin',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};


export const toggleCompanyAdminStatus = async (req: Request, res: Response) => {
  try {
    const companyAdmin = await User.findOne({ 
      _id: req.params.id, 
      role: 'companyAdmin' 
    });
    
    if (!companyAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Company admin not found'
      });
    }
    
    // Toggle the isActive status
    companyAdmin.isActive = !companyAdmin.isActive;
    await companyAdmin.save();
    
    res.status(200).json({
      success: true,
      message: `Company admin ${companyAdmin.isActive ? 'unblocked' : 'blocked'} successfully`,
      data: {
        id: companyAdmin._id,
        name: companyAdmin.name,
        email: companyAdmin.email,
        isActive: companyAdmin.isActive
      }
    });
  } catch (error) {
    console.error('Error toggling company admin status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle company admin status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export const getManagers = async (req: Request, res: Response) => {
    try {
      console.log(`User ${req.user._id} with role ${req.user.role} accessed managers data`);
      
      const managers = await User.find({ role: 'manager' }).select('name email phoneNumber isActive');
      console.log("Managers data fetched:", managers.length);
      
      res.status(200).json({
        success: true,
        count: managers.length,
        data: managers
      });
    } catch (error) {
      console.error('Error fetching managers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch managers',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  export const deleteManager = async (req: Request, res: Response) => {
    try {
      const deletedManager = await User.findOneAndDelete({
        _id: req.params.id,
        role: 'manager'
      });
      
      if (!deletedManager) {
        return res.status(404).json({
          success: false,
          message: 'Manager not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Manager deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting manager:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete manager',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  export const toggleManagerStatus = async (req: Request, res: Response) => {
    try {
      const manager = await User.findOne({ 
        _id: req.params.id, 
        role: 'manager' 
      });
      
      if (!manager) {
        return res.status(404).json({
          success: false,
          message: 'Manager not found'
        });
      }
      
      // Toggle the isActive status
      manager.isActive = !manager.isActive;
      await manager.save();
      
      res.status(200).json({
        success: true,
        message: `Manager ${manager.isActive ? 'unblocked' : 'blocked'} successfully`,
        data: {
          id: manager._id,
          name: manager.name,
          email: manager.email,
          isActive: manager.isActive
        }
      });
    } catch (error) {
      console.error('Error toggling manager status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle manager status',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  // New controllers for Project Managers
  
  // Get all project managers
  export const getProjectManagers = async (req: Request, res: Response) => {
    try {
      console.log(`User ${req.user._id} with role ${req.user.role} accessed project managers data`);
      
      const projectManagers = await User.find({ role: 'projectManager' }).select('name email phoneNumber isActive');
      console.log("Project managers data fetched:", projectManagers.length);
      
      res.status(200).json({
        success: true,
        count: projectManagers.length,
        data: projectManagers
      });
    } catch (error) {
      console.error('Error fetching project managers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch project managers',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  export const deleteProjectManager = async (req: Request, res: Response) => {
    try {
      const deletedProjectManager = await User.findOneAndDelete({
        _id: req.params.id,
        role: 'projectManager'
      });
      
      if (!deletedProjectManager) {
        return res.status(404).json({
          success: false,
          message: 'Project manager not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Project manager deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting project manager:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete project manager',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  export const toggleProjectManagerStatus = async (req: Request, res: Response) => {
    try {
      const projectManager = await User.findOne({ 
        _id: req.params.id, 
        role: 'projectManager' 
      });
      
      if (!projectManager) {
        return res.status(404).json({
          success: false,
          message: 'Project manager not found'
        });
      }
      
      // Toggle the isActive status
      projectManager.isActive = !projectManager.isActive;
      await projectManager.save();
      
      res.status(200).json({
        success: true,
        message: `Project manager ${projectManager.isActive ? 'unblocked' : 'blocked'} successfully`,
        data: {
          id: projectManager._id,
          name: projectManager.name,
          email: projectManager.email,
          isActive: projectManager.isActive
        }
      });
    } catch (error) {
      console.error('Error toggling project manager status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle project manager status',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  // New controllers for Developers
  
  // Get all developers
  export const getDevelopers = async (req: Request, res: Response) => {
    try {
      console.log(`User ${req.user._id} with role ${req.user.role} accessed developers data`);
      
      const developers = await User.find({ role: 'developer' }).select('name email phoneNumber isActive');
      console.log("Developers data fetched:", developers.length);
      
      res.status(200).json({
        success: true,
        count: developers.length,
        data: developers
      });
    } catch (error) {
      console.error('Error fetching developers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch developers',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  export const deleteDeveloper = async (req: Request, res: Response) => {
    try {
      const deletedDeveloper = await User.findOneAndDelete({
        _id: req.params.id,
        role: 'developer'
      });
      
      if (!deletedDeveloper) {
        return res.status(404).json({
          success: false,
          message: 'Developer not found'
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Developer deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting developer:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete developer',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  export const toggleDeveloperStatus = async (req: Request, res: Response) => {
    try {
      const developer = await User.findOne({ 
        _id: req.params.id, 
        role: 'developer' 
      });
      
      if (!developer) {
        return res.status(404).json({
          success: false,
          message: 'Developer not found'
        });
      }
      
      // Toggle the isActive status
      developer.isActive = !developer.isActive;
      await developer.save();
      
      res.status(200).json({
        success: true,
        message: `Developer ${developer.isActive ? 'unblocked' : 'blocked'} successfully`,
        data: {
          id: developer._id,
          name: developer.name,
          email: developer.email,
          isActive: developer.isActive
        }
      });
    } catch (error) {
      console.error('Error toggling developer status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle developer status',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
  