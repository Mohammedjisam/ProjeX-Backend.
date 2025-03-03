import { Request, Response } from 'express';
import { Project, IProject } from '../../models/Project';
import { User } from '../../models/User';
import mongoose from 'mongoose';

// Type for handling custom error responses
interface ErrorResponse {
  message: string;
  field?: string;
}

class ProjectController {
  /**
   * Get all projects with pagination and optional filtering
   * GET /api/projects
   */
  public getAllProjects = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      
      // Extract filter parameters
      const { status, clientName, startDateFrom, startDateTo } = req.query;
      
      // Build filter object
      const filter: any = {};
      
      if (status) filter.status = status;
      if (clientName) filter.clientName = new RegExp(clientName as string, 'i'); // Case-insensitive search
      
      // Date range filtering
      if (startDateFrom || startDateTo) {
        filter.startDate = {};
        if (startDateFrom) filter.startDate.$gte = new Date(startDateFrom as string);
        if (startDateTo) filter.startDate.$lte = new Date(startDateTo as string);
      }

      // Get total count for pagination
      const total = await Project.countDocuments(filter);
      
      // Query with populated project manager details
      const projects = await Project.find(filter)
        .populate('projectManager', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      res.status(200).json({
        success: true,
        count: projects.length,
        total,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          hasNext: skip + projects.length < total,
          hasPrev: page > 1
        },
        data: projects
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching projects'
      });
    }
  };

  /**
   * Get project by ID
   * GET /api/projects/:id
   */
  public getProjectById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid project ID format'
        });
        return;
      }

      const project = await Project.findById(id)
        .populate('projectManager', 'name email role')
        .populate('comments.author', 'name role');

      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: project
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching project details'
      });
    }
  };

  /**
   * Create a new project
   * POST /api/projects
   */
  public createProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        name,
        description,
        clientName,
        budget,
        startDate,
        endDate,
        projectManager,
        goal,
        status = 'planned'
      } = req.body;

      // Validate required fields
      const errors: ErrorResponse[] = [];
      
      if (!name) errors.push({ field: 'name', message: 'Project name is required' });
      if (!description) errors.push({ field: 'description', message: 'Description is required' });
      if (!clientName) errors.push({ field: 'clientName', message: 'Client name is required' });
      if (!budget && budget !== 0) errors.push({ field: 'budget', message: 'Budget is required' });
      if (!startDate) errors.push({ field: 'startDate', message: 'Start date is required' });
      if (!endDate) errors.push({ field: 'endDate', message: 'End date is required' });
      if (!projectManager) errors.push({ field: 'projectManager', message: 'Project manager is required' });
      if (!goal) errors.push({ field: 'goal', message: 'Project goal is required' });

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          errors
        });
        return;
      }

      // Validate dates
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      
      if (startDateObj > endDateObj) {
        res.status(400).json({
          success: false,
          errors: [{ field: 'dates', message: 'Start date must be before end date' }]
        });
        return;
      }

      // Validate project manager exists and has proper role
      if (mongoose.Types.ObjectId.isValid(projectManager)) {
        const manager = await User.findById(projectManager);
        
        if (!manager) {
          res.status(400).json({
            success: false,
            errors: [{ field: 'projectManager', message: 'Selected project manager does not exist' }]
          });
          return;
        }
        
        const validRoles = ['admin', 'companyAdmin', 'manager', 'projectManager'];
        if (!validRoles.includes(manager.role)) {
          res.status(400).json({
            success: false,
            errors: [{ field: 'projectManager', message: 'Selected user does not have project management permissions' }]
          });
          return;
        }
      } else {
        res.status(400).json({
          success: false,
          errors: [{ field: 'projectManager', message: 'Invalid project manager ID format' }]
        });
        return;
      }

      // Create the project
      const project = await Project.create({
        name,
        description,
        clientName,
        budget,
        startDate: startDateObj,
        endDate: endDateObj,
        projectManager,
        goal,
        status
      });

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: project
      });
    } catch (error) {
      console.error('Error creating project:', error);
      
      if (error instanceof mongoose.Error.ValidationError) {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        
        res.status(400).json({
          success: false,
          errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        message: 'Server error while creating project'
      });
    }
  };

  /**
   * Update project by ID
   * PUT /api/projects/:id
   */
  public updateProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid project ID format'
        });
        return;
      }
  
      // Find project first to check if it exists
      const existingProject = await Project.findById(id);
      
      if (!existingProject) {
        res.status(404).json({
          success: false,
          message: 'Project not found'
        });
        return;
      }
  
      const {
        name,
        description,
        clientName,
        budget,
        startDate,
        endDate,
        projectManager,
        goal,
        status
      } = req.body;
  
      // Validate dates if provided
      if (startDate && endDate) {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        
        if (startDateObj > endDateObj) {
          res.status(400).json({
            success: false,
            errors: [{ field: 'dates', message: 'Start date must be before end date' }]
          });
          return;
        }
      }
  
      // Validate project manager if provided
      if (projectManager && !mongoose.Types.ObjectId.isValid(projectManager)) {
        res.status(400).json({
          success: false,
          errors: [{ field: 'projectManager', message: 'Invalid project manager ID format' }]
        });
        return;
      }
  
      if (projectManager && mongoose.Types.ObjectId.isValid(projectManager)) {
        const manager = await User.findById(projectManager);
        
        if (!manager) {
          res.status(400).json({
            success: false,
            errors: [{ field: 'projectManager', message: 'Selected project manager does not exist' }]
          });
          return;
        }
        
        const validRoles = ['admin', 'companyAdmin', 'manager', 'projectManager'];
        if (!validRoles.includes(manager.role)) {
          res.status(400).json({
            success: false,
            errors: [{ field: 'projectManager', message: 'Selected user does not have project management permissions' }]
          });
          return;
        }
      }
  
      // Use a different approach to update by fetching, modifying and saving
      // to avoid validation issues with date fields
      if (existingProject) {
        // Update fields if provided
        if (name) existingProject.name = name;
        if (description) existingProject.description = description;
        if (clientName) existingProject.clientName = clientName;
        if (budget !== undefined) existingProject.budget = budget;
        if (startDate) existingProject.startDate = new Date(startDate);
        if (endDate) existingProject.endDate = new Date(endDate);
        if (projectManager) existingProject.projectManager = projectManager as any;
        if (goal) existingProject.goal = goal;
        if (status) existingProject.status = status as any;
        
        // Save the updated project
        const updatedProject = await existingProject.save();
        
        // Populate the project manager details
        await updatedProject.populate('projectManager', 'name email role');
        
        res.status(200).json({
          success: true,
          message: 'Project updated successfully',
          data: updatedProject
        });
      }
    } catch (error) {
      console.error('Error updating project:', error);
      
      if (error instanceof mongoose.Error.ValidationError) {
        const errors = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        
        res.status(400).json({
          success: false,
          errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        message: 'Server error while updating project'
      });
    }
  }
  /**
   * Delete project by ID
   * DELETE /api/projects/:id
   */
  public deleteProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid project ID format'
        });
        return;
      }

      // Find project first to check if it exists
      const project = await Project.findById(id);
      
      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found'
        });
        return;
      }

      // Delete the project
      await Project.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: 'Project deleted successfully',
        data: {}
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while deleting project'
      });
    }
  };

  /**
   * Add a comment to a project
   * POST /api/projects/:id/comments
   */
  public addComment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { text, authorId } = req.body;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid project ID format'
        });
        return;
      }

      if (!text) {
        res.status(400).json({
          success: false,
          message: 'Comment text is required'
        });
        return;
      }

      if (!authorId || !mongoose.Types.ObjectId.isValid(authorId)) {
        res.status(400).json({
          success: false,
          message: 'Valid author ID is required'
        });
        return;
      }

      const project = await Project.findById(id);
      
      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found'
        });
        return;
      }

      const author = await User.findById(authorId);
      if (!author) {
        res.status(400).json({
          success: false,
          message: 'Author not found'
        });
        return;
      }

      project.comments.push({
        text,
        author: authorId,
        createdAt: new Date()
      });

      await project.save();

      const updatedProject = await Project.findById(id)
        .populate('projectManager', 'name email role')
        .populate('comments.author', 'name role');

      res.status(200).json({
        success: true,
        message: 'Comment added successfully',
        data: updatedProject
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while adding comment'
      });
    }
  };
}

export default new ProjectController();