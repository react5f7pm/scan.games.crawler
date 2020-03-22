import mongoose from 'mongoose'

const { Schema } = mongoose

const steamSchema = new Schema({
  appid: String,
  type: String,
  success: Boolean,
  dateCreated: {
    type: Date,
    default: Date.now,
  }
})

export default steamSchema;

// export const Steam = mongoose.model('Steam', steamSchema)

// export default { 
//   steamSchema, 
//   Steam
// }