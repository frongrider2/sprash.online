import mongoose, { Schema, Document } from 'mongoose';

export interface PredictionModel extends Document {
  roundId: number;
  objectId: string;
}

const PredictionSchema: Schema = new Schema({
  roundId: { type: Number, required: true },
  objectId: { type: String, required: true },
});

export default mongoose.model<PredictionModel>('Prediction', PredictionSchema);
