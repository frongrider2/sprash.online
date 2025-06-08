import mongoose from 'mongoose';
import Prediction from '../models/prediction.model';

const getPredictions = async (cursor: number | null, limit: number = 10) => {
  try {
    const totalRounds = await Prediction.countDocuments();
    console.log(totalRounds);
    let query = {};
    if (cursor !== null) {
      query = { roundId: { $gt: cursor } };
    }
    const predictions = await Prediction.find(query)
      .sort({ roundId: 1 })
      .limit(limit)
      .exec();

    return { totalRounds, predictions };
  } catch (error) {
    console.error('Error fetching predictions:', error);
    throw error;
  }
};

const createPrediction = async (objectId: string, roundIdFixed?: number) => {
  try {
    let roundId = 0;
    if (!roundIdFixed) {
      const currentRound = await Prediction.findOne()
        .sort({ roundId: -1 })
        .exec();
      if (currentRound) {
        roundId = currentRound.roundId + 1;
      } else {
        roundId = 1;
      }
    } else {
      roundId = roundIdFixed;
    }
    const newPrediction = new Prediction({ roundId, objectId });
    const savedPrediction = await newPrediction.save();
    console.log('savedPrediction', savedPrediction);
    return savedPrediction;
  } catch (error) {
    console.error('Error creating prediction:', error);
    throw error;
  }
};

export { getPredictions, createPrediction };
