import Prediction from '../models/prediction.model';

const getPredictions = async (cursor: string | null, limit: number) => {
  try {
    const query = cursor ? { _id: { $gt: cursor } } : {};
    const predictions = await Prediction.find(query)
      .sort({ _id: 1 })
      .limit(limit)
      .exec();
    return predictions;
  } catch (error) {
    console.error('Error fetching predictions:', error);
    throw error;
  }
};

const createPrediction = async (roundId: number, objectId: string) => {
  try {
    const newPrediction = new Prediction({ roundId, objectId });
    const savedPrediction = await newPrediction.save();
    return savedPrediction;
  } catch (error) {
    console.error('Error creating prediction:', error);
    throw error;
  }
};

export { getPredictions, createPrediction };
