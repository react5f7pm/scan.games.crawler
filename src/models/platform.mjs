import mongoose from 'mongoose'

const { Schema } = mongoose

const platformSchema = new Schema({
  name: String,
  homePage: String,
  description: String,
  createDate: {
    type: Date,
    default: Date.now
  }
})

export default platformSchema