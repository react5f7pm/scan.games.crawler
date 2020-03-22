import dotEnv from 'dotenv'
dotEnv.config()

import mongoose from 'mongoose'

const { MONGO_URI } = process.env

function getConnection (dbname) {
  return new Promise((resolve, reject) => {
    resolve(mongoose
      .createConnection(MONGO_URI + dbname, { 
        useNewUrlParser:true, 
        useFindAndModify: false,
        useUnifiedTopology: true, // 해당 옵션을 생성자에 넘겨주지 않으면 노드 경고
      }))
  })
}

export default {
  getConnection: getConnection
}
