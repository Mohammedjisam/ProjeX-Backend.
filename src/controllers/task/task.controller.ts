import { Request, Response } from 'express';
import { Task, ITask } from '../../models/Task';
import { Project } from '../../models/Project';
import { User } from '../../models/User';
import mongoose from 'mongoose';

interface ErrorResponse {
  message: string;
  field?: string;
}

class TaskController {
  public getTasksByProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      console.log("heeeeeeeeeeeeeeeeeeeeeeee;lo",projectId)
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid project ID format'
        });
        return;
      }
      
      // Verify project exists
      const projectExists = await Project.exists({ _id: projectId });
      if (!projectExists) {
        res.status(404).json({
          success: false,
          message: 'Project not found'
        });
        return;
      }
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      
      const { status, priority, assigneeId } = req.query;
      
      const filter: any = { project: projectId };
      
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (assigneeId && mongoose.Types.ObjectId.isValid(assigneeId as string)) {
        filter.assignee = assigneeId;
      }

      const total = await Task.countDocuments(filter);
      
      const tasks = await Task.find(filter)
        .populate('assignee', 'name email role')
        .populate('createdBy', 'name email')
        .sort({ dueDate: 1 })
        .skip(skip)
        .limit(limit);
      
      res.status(200).json({
        success: true,
        count: tasks.length,
        total,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          hasNext: skip + tasks.length < total,
          hasPrev: page > 1
        },
        data: tasks
      });
    } catch (error) {
      console.error('Error fetching tasks by project:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching tasks'
      });
    }
  };

 

  public getTaskById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid task ID format'
        });
        return;
      }

      const task = await Task.findById(id)
        .populate('project', 'name clientName status')
        .populate('assignee', 'name email role')
        .populate('createdBy', 'name email');

      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Task not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: task
      });
    } catch (error) {
      console.error('Error fetching task:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching task details'
      });
    }
  };


  public createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    // Log the incoming request data
    console.log("Request body:", req.body);
    console.log("Project ID from params:", req.params.projectId);
    
    const {
      title,
      description,
      assignee,
      priority = 'medium',
      status = 'pending',
      dueDate,
      remarks,
      createdBy
    } = req.body;

    // Get project ID from request parameters
    const { projectId } = req.params;
    
    // Log the extracted data
    console.log("Extracted data:", {
      title,
      description,
      assignee,
      priority,
      status,
      dueDate,
      remarks,
      createdBy,
      projectId
    });
  
      const errors: ErrorResponse[] = [];
      
      if (!title) errors.push({ field: 'title', message: 'Task title is required' });
      if (!description) errors.push({ field: 'description', message: 'Description is required' });
      if (!assignee) errors.push({ field: 'assignee', message: 'Assignee is required' });
      if (!dueDate) errors.push({ field: 'dueDate', message: 'Due date is required' });
      if (!createdBy) errors.push({ field: 'createdBy', message: 'Creator ID is required' });
      if (!projectId) errors.push({ field: 'project', message: 'Project ID is required' });
  
      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          errors
        });
        return;
      }
  
      // Validate project exists
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        res.status(400).json({
          success: false,
          errors: [{ field: 'project', message: 'Invalid project ID format' }]
        });
        return;
      }
      
      const projectExists = await Project.findById(projectId);
      if (!projectExists) {
        res.status(400).json({
          success: false,
          errors: [{ field: 'project', message: 'Project does not exist' }]
        });
        return;
      }
  
      // Validate assignee exists and is a valid user
      if (!mongoose.Types.ObjectId.isValid(assignee)) {
        res.status(400).json({
          success: false,
          errors: [{ field: 'assignee', message: 'Invalid assignee ID format' }]
        });
        return;
      }
      
      const assigneeUser = await User.findById(assignee);
      if (!assigneeUser) {
        res.status(400).json({
          success: false,
          errors: [{ field: 'assignee', message: 'Assignee does not exist' }]
        });
        return;
      }
  
      // Validate creator exists
      if (!mongoose.Types.ObjectId.isValid(createdBy)) {
        res.status(400).json({
          success: false,
          errors: [{ field: 'createdBy', message: 'Invalid creator ID format' }]
        });
        return;
      }
      
      const creatorExists = await User.findById(createdBy);
      if (!creatorExists) {
        res.status(400).json({
          success: false,
          errors: [{ field: 'createdBy', message: 'Creator does not exist' }]
        });
        return;
      }
  
      const task = await Task.create({
        title,
        description,
        project: projectId, // Use projectId from params
        assignee,
        priority,
        status,
        dueDate: new Date(dueDate),
        remarks,
        createdBy
      });
  
      // Populate the references for the response
      await task.populate([
        { path: 'project', select: 'name clientName' },
        { path: 'assignee', select: 'name email role' },
        { path: 'createdBy', select: 'name email' }
      ]);
  
      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: task
      });
    } catch (error) {
      console.error('Error creating task:', error);
      
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
        message: 'Server error while creating task'
      });
    }
  };

  // Updated controller method to get assignee ID from req.body
public getTasksByAssignee = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assigneeId } = req.body;
    
    if (!assigneeId) {
      res.status(400).json({
        success: false,
        message: 'Assignee ID is required'
      });
      return;
    }
    
    if (!mongoose.Types.ObjectId.isValid(assigneeId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid assignee ID format'
      });
      return;
    }

    // Verify user exists
    const userExists = await User.exists({ _id: assigneeId });
    if (!userExists) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }
    
    const filter: any = { assignee: assigneeId };
    
    // Get all tasks for this assignee
    const allTasks = await Task.find(filter)
      .populate('project', 'name clientName')
      .sort({ dueDate: 1 });
    
    // Get completed tasks
    const completedTasks = await Task.find({
      ...filter,
      status: 'completed'
    }).countDocuments();
    
    // Get pending tasks
    const pendingTasks = await Task.find({
      ...filter,
      status: 'pending'
    }).countDocuments();
    
    // Get latest tasks (limit to 4)
    const recentTasks = await Task.find(filter)
      .populate('project', 'name clientName')
      .sort({ createdAt: -1 })
      .limit(4);
    
    res.status(200).json({
      success: true,
      taskCounts: {
        total: allTasks.length,
        completed: completedTasks,
        pending: pendingTasks
      },
      recentTasks
    });
  } catch (error) {
    console.error('Error fetching tasks by assignee:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tasks'
    });
  }
};

  public updateTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid task ID format'
        });
        return;
      }
  
      const existingTask = await Task.findById(id);
      
      if (!existingTask) {
        res.status(404).json({
          success: false,
          message: 'Task not found'
        });
        return;
      }
  
      const {
        title,
        description,
        project,
        assignee,
        priority,
        status,
        dueDate,
        remarks
      } = req.body;
  
      // Validate project if provided
      if (project) {
        if (!mongoose.Types.ObjectId.isValid(project)) {
          res.status(400).json({
            success: false,
            errors: [{ field: 'project', message: 'Invalid project ID format' }]
          });
          return;
        }
        
        const projectExists = await Project.findById(project);
        if (!projectExists) {
          res.status(400).json({
            success: false,
            errors: [{ field: 'project', message: 'Project does not exist' }]
          });
          return;
        }
      }
  
      // Validate assignee if provided
      if (assignee) {
        if (!mongoose.Types.ObjectId.isValid(assignee)) {
          res.status(400).json({
            success: false,
            errors: [{ field: 'assignee', message: 'Invalid assignee ID format' }]
          });
          return;
        }
        
        const assigneeExists = await User.findById(assignee);
        if (!assigneeExists) {
          res.status(400).json({
            success: false,
            errors: [{ field: 'assignee', message: 'Assignee does not exist' }]
          });
          return;
        }
      }
  
      if (existingTask) {
        if (title) existingTask.title = title;
        if (description) existingTask.description = description;
        if (project) existingTask.project = project as any;
        if (assignee) existingTask.assignee = assignee as any;
        if (priority) existingTask.priority = priority as any;
        if (status) existingTask.status = status as any;
        if (dueDate) existingTask.dueDate = new Date(dueDate);
        if (remarks !== undefined) existingTask.remarks = remarks;
        
        const updatedTask = await existingTask.save();
        
        // Populate references for the response
        await updatedTask
          .populate('project', 'name clientName')
          .populate('assignee', 'name email role')
          .populate('createdBy', 'name email');
        
        res.status(200).json({
          success: true,
          message: 'Task updated successfully',
          data: updatedTask
        });
      }
    } catch (error) {
      console.error('Error updating task:', error);
      
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
        message: 'Server error while updating task'
      });
    }
  };

  public deleteTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { taskId } = req.params;
      console.log("task id",taskId)
      
      if (!mongoose.Types.ObjectId.isValid(taskId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid task ID format'
        });
        return;
      }

      const task = await Task.findById(taskId);
      
      if (!task) {
        res.status(404).json({
          success: false,
          message: 'Task not found'
        });
        return;
      }

      await Task.findByIdAndDelete(taskId);

      res.status(200).json({
        success: true,
        message: 'Task deleted successfully',
        data: {}
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while deleting task'
      });
    }
  };

  // Get tasks due soon (within the next 7 days)
  public getTasksDueSoon = async (req: Request, res: Response): Promise<void> => {
    try {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      
      const { projectId, assigneeId } = req.query;
      
      const filter: any = {
        dueDate: { $gte: today, $lte: nextWeek },
        status: { $ne: 'completed' }
      };
      
      if (projectId && mongoose.Types.ObjectId.isValid(projectId as string)) {
        filter.project = projectId;
      }
      
      if (assigneeId && mongoose.Types.ObjectId.isValid(assigneeId as string)) {
        filter.assignee = assigneeId;
      }
      
      const tasks = await Task.find(filter)
        .populate('project', 'name clientName')
        .populate('assignee', 'name email role')
        .sort({ dueDate: 1 });
        
      res.status(200).json({
        success: true,
        count: tasks.length,
        data: tasks
      });
    } catch (error) {
      console.error('Error fetching tasks due soon:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching tasks'
      });
    }
  };
  
  // Get overdue tasks
  public getOverdueTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      const today = new Date();
      
      const { projectId, assigneeId } = req.query;
      
      const filter: any = {
        dueDate: { $lt: today },
        status: { $ne: 'completed' }
      };
      
      if (projectId && mongoose.Types.ObjectId.isValid(projectId as string)) {
        filter.project = projectId;
      }
      
      if (assigneeId && mongoose.Types.ObjectId.isValid(assigneeId as string)) {
        filter.assignee = assigneeId;
      }
      
      const tasks = await Task.find(filter)
        .populate('project', 'name clientName')
        .populate('assignee', 'name email role')
        .sort({ dueDate: 1 });
        
      res.status(200).json({
        success: true,
        count: tasks.length,
        data: tasks
      });
    } catch (error) {
      console.error('Error fetching overdue tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching tasks'
      });
    }
  };
}

export default new TaskController();