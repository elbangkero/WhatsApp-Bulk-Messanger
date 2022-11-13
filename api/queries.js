const dotenv = require('dotenv');
dotenv.config();
 


const { Client } = require('pg');
const client = new Client
  ({
    user: `${process.env.USER}`,
    host: `${process.env.HOST}`,
    database: `${process.env.DATABASE}`,
    password: `${process.env.PASSWORD}`,
    port: `${process.env.DB_PORT}`,
  })

client.connect();




const getActiveConfig = (request, response) => {
  client.query(`SELECT * FROM whatsapp_config where triggerstatus='active' and sending ='true'`, (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
} 
 
const storeConfig = (request, response) => {
  client.query(`SELECT * FROM whatsapp_config where triggerstatus='active' and sending ='true'`, (error, results) => {
    if (error) {
      throw error
    }
    response.status(200).json(results.rows)
  })
} 
  
module.exports = {
  getActiveConfig,
  storeConfig
}