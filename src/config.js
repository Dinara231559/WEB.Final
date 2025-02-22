const mongoose = require('mongoose')

mongoose
  .connect("mongodb://127.0.0.1:27017/login")
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });


const LoginSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
})


const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  author: String,
  createdAt: { type: Date, default: Date.now },
});


const collection = new mongoose.model("users", LoginSchema)
const Blog = new mongoose.model("Blog", blogSchema)
module.exports = {
  collection,
  Blog
};
