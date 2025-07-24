import mongoose, { Document, Schema } from 'mongoose';

export interface ITool extends Document {
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const ToolSchema = new Schema<ITool>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

export const Tool = mongoose.model<ITool>('Tool', ToolSchema);