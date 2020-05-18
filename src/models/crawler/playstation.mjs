import mongoose from 'mongoose'

const { Schema } = mongoose

const playstationSchema = new Schema({
  appid: String,
  type: String,
  success: Boolean,
  dateCreated: {
    type: Date,
    default: Date.now,
  }
})

export default playstationSchema;
