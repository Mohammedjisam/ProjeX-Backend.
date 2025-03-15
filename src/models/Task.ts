import mongoose, { Document, Schema, Types } from 'mongoose';
import { IProject } from './Project';
import { IUser } from './User';

export interface ITask extends Document {
  title: string;
  description: string;
  project: Types.ObjectId | IProject;
  assignee: Types.ObjectId | IUser;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold';
  dueDate: Date;
  remarks?: string;
  createdBy: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [100, 'Task title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Task description is required'],
      trim: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assignee is required'],
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'on-hold'],
      default: 'pending',
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    remarks: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by is required'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual to calculate days remaining until due date
taskSchema.virtual('daysRemaining').get(function(this: ITask) {
  const now = new Date();
  const dueDate = new Date(this.dueDate);
  const timeDiff = dueDate.getTime() - now.getTime();
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
});

// Virtual to determine if task is overdue
taskSchema.virtual('isOverdue').get(function(this: ITask) {
  if (this.status === 'completed') return false;
  const now = new Date();
  return this.dueDate < now;
});

// Indexes for better query performance
taskSchema.index({ project: 1 });
taskSchema.index({ assignee: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ dueDate: 1 });

export const Task = mongoose.model<ITask>('Task', taskSchema);