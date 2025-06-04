import mongoose, { Schema, Document } from 'mongoose';

export interface PredictionModel extends Document {
  roundId: number;
  objectId: string;
}

const PredictionSchema: Schema = new Schema({
  roundId: { type: Number, required: true },
  objectId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model<PredictionModel>('Prediction', PredictionSchema);
