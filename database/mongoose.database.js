import mongoose from 'mongoose';
mongoose.set('strictQuery', true);
export const connectDatabase = () => {
  console.log('mongodb is connecting');
  mongoose
    .connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
    })
    .then(() => {
      console.log(`mongodb is connected`);
    })
    .catch((err) => {
      console.log(`${err}`);
    });
};
