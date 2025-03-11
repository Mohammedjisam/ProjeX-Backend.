// controllers/companyAdmin/companyAdmin.controller.ts
import { Request, Response } from 'express';
import { User } from '../../models/User';
import { Project } from '../../models/Project';
import mongoose from 'mongoose';

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    // Fetch managers
    const managers = await User.find({ role: 'manager' })
      .select('_id name email phoneNumber location');
      
    // Fetch projects
    const projects = await Project.find()
      .populate('projectManager', 'name email role')
      .select('name clientName status startDate endDate projectManager');
    
    // Calculate project count per manager
    const managerProjectCounts = {};
    
    projects.forEach(project => {
      const managerId = project.projectManager?._id?.toString();
      if (managerId) {
        managerProjectCounts[managerId] = (managerProjectCounts[managerId] || 0) + 1;
      }
    });
    
    // Enhance manager data with project counts
    const enhancedManagers = managers.map(manager => {
      const managerId = manager._id.toString();
      const projectCount = managerProjectCounts[managerId] || 0;
      return {
        _id: manager._id,
        name: manager.name,
        email: manager.email,
        phoneNumber: manager.phoneNumber || 'N/A',
        location: manager.location || 'Unknown',
        projectCount: `${projectCount}/${projects.length}`,
        isHighlighted: false
      };
    });
    
    res.status(200).json({
      success: true,
      data: {
        managers: enhancedManagers,
        projects,
        totalProjects: projects.length,
        totalManagers: managers.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};