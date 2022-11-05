// app.js
const express = require("express")
const path = require('path')
const app = express(); 
const dotenv = require('dotenv');
dotenv.config();  

const client = require('./client');






app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')))
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')))
app.use('/js', express.static(path.join(__dirname, 'node_modules/jquery/dist')))

/*app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'views/index.html'))
});*/
app.listen(`${process.env.PORT}`, () => {
  console.log('Listening on port ' + `${process.env.PORT}`);
});

app.get('/', (request, response) => {
  response.json({ info: 'Node.js, Express, and Postgres API' })
})  
 


//console.log(userToken) // Promise { <pending> }