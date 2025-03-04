import mongoose, { Document, Schema, Types } from 'mongoose';
import { IUser } from './User'; 

export interface IProject extends Document {
  name: string;
  description: string;
  clientName: string;
  budget: number;
  startDate: Date;
  endDate: Date;
  projectManager: Types.ObjectId | IUser;
  goal: string;
  status: 'planned' | 'in-progress' | 'completed' | 'on-hold';
  comments: Array<{
    text: string;
    author: Types.ObjectId | IUser;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
  addComment(text: string, author: Types.ObjectId | IUser): Promise<void>;
  getDuration(): number;
}

const commentSchema = new Schema(
  {
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Comment author is required'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Project description is required'],
      trim: true,
    },
    clientName: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
    },
    budget: {
      type: Number,
      required: [true, 'Project budget is required'],
      min: [0, 'Budget cannot be negative'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      validate: {
        validator: function(this: IProject, value: Date) {
          return value <= this.endDate;
        },
        message: 'Start date must be before or equal to end date',
      },
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    projectManager: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project manager is required'],
      validate: {
        validator: async function(this: IProject, value: Types.ObjectId) {
          const user = await mongoose.model('User').findById(value);
          return user && ['admin', 'companyAdmin', 'manager', 'projectManager'].includes(user.role);
        },
        message: 'Project manager must have appropriate role permissions',
      },
    },
    goal: {
      type: String,
      required: [true, 'Project goal is required'],
      trim: true,
    },
    status: {
      type: String,
      enum: ['planned', 'in-progress', 'completed', 'on-hold'],
      default: 'planned',
    },
    comments: [commentSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

projectSchema.virtual('completionPercentage').get(function(this: IProject) {
  const now = new Date();
  if (now < this.startDate) return 0;
  if (now > this.endDate) return 100;
  
  const totalDuration = this.endDate.getTime() - this.startDate.getTime();
  const elapsedDuration = now.getTime() - this.startDate.getTime();
  
  return Math.round((elapsedDuration / totalDuration) * 100);
});

projectSchema.methods.addComment = async function(text: string, author: Types.ObjectId | IUser): Promise<void> {
  this.comments.push({ text, author, createdAt: new Date() });
  await this.save();
};

projectSchema.methods.getDuration = function(): number {
  const durationMs = this.endDate.getTime() - this.startDate.getTime();
  return Math.ceil(durationMs / (1000 * 60 * 60 * 24));
};

projectSchema.index({ name: 1 });
projectSchema.index({ clientName: 1 });
projectSchema.index({ projectManager: 1 });
projectSchema.index({ status: 1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);