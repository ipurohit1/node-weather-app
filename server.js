require('dotenv').config() 
var path = require('path')
var rf = require('./route_functions')
const express = require('express')
const app = express()


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended: true}))
app.use(express.json())

app.set('view engine', 'ejs');

// global variable to handle invalid zip code s





app.get('/', rf.get_root)

app.post('/signin',  rf.post_signin)


app.get('/newaccount', rf.get_newaccount)

app.post('/newaccount', rf.post_newaccount)


app.post('/search', rf.post_search)
  

app.listen(3000, () => {
    console.log('Example app listening on port 3000!')

})

