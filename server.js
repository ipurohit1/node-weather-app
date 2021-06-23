require('dotenv').config() 
var path = require('path')
var crypto = require('crypto')
const express = require('express')
const mysql = require('mysql');
const fetch = require('node-fetch'); 
const { create } = require('domain');


const app = express()


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended: true}))
app.use(express.json())

app.set('view engine', 'ejs');

function createConnection() {
    var mysqlConnection = mysql.createConnection({
        host: process.env.HOST,
        user: process.env.USER,
        password: process.env.PASSWORD,
        database: process.env.DATABASE,
        multipleStatements: true
        });

        // var mysqlConnection = mysql.createConnection({
        //     host: 'localhost',
        //     user: 'root',
        //     password: 'root',
        //     database: 'weather_db',
        //     multipleStatements: true
        //     });
    
    mysqlConnection.connect((err)=> {
        if(!err) {
        console.log('Connection Established Successfully'); 
        }
        else {
        console.log('Connection Failed!'+ JSON.stringify(err,undefined,2));
        console.log(err.code)
        throw err
        }
        });

    // mysqlConnection.connect()
    // .then(() => console.log('Connection Established Successfully'))
    // .catch(console.error)

    return mysqlConnection
}


// app.set('views',path.join(__dirname,'views'))

app.get('/',  (req, res) => {
  res.render('signin')
})

app.post('/signin',  (req, res) => {
    console.log('in post signin')
    var connection = createConnection() 
    // check if username exists 
   
    connection.query('SELECT username, password, password_salt FROM users WHERE username = ' + mysql.escape(req.body.username),
     (err, rows, fields) => {
        if (err) throw err; 

        // Connection.query('SELECT username FROM users WHERE username = ' + mysql.escape('ip'), (err, rows, fields) => {
        //     if (err) throw err; 
        //     console.log(rows.length) })

        if (rows.length == 0) {
            console.log(rows.length)
            res.render('signin', {message: "Invalid Username"})
        }
        else {
            console.log(rows.length)
            let row = rows[0] 

            crypto.pbkdf2(req.body.password, row['password_salt'], 1000, 16, 'sha512', (err, derivedKey) => {
                if(err) {
                    console.log(err)
                    throw err
                }
                else {
                    // check if form password + salt from db is the same as db password
                    if (derivedKey == row['password']) {
                        // const url = `api.openweathermap.org/data/2.5/weather?q=Boston&appid=${API_key}` 
                         // make API call and pass in forecast when rendering home page 
                        res.render('home', {weather: ""})
                    }
                    else {
                        res.render('signin', {message: "Invalid Password"})
                    }
                
                } })
            // verify password 
        }
    }) 
    }) 

//         rows.forEach(row => {
//             if (row['username'] == req.body.username) {
//                 // valid username, now need to validate password 
//                 crypto.pbkdf2(req.body.password, row['password_salt'], 1000, 16, 'sha512', (err, derivedKey) => {
//                     if(err) {
//                         console.log(err)
//                         throw err
//                     }
//                     else {
//                         // check if form password + salt from db is the same as db password
//                         if (derivedKey == row['password']) {
//                             // make API call and pass in forecast when rendering home page 
//                             res.render('home', {weather: ""})
//                         }
//                         else {
//                             res.render('signin', {weather: "Invalid Password"})
//                         }
                    
//                     } })
//             }
//         })
       
//     })
//   })

app.get('/newaccount', (req, res) => {
    res.render('newaccount')
  })

app.post('/newaccount', async function (req, res) {
    // Make sure no one in database has same username 
    // If true, save the credentials in database (hashed)
    // Render the sign in page 
    // If false, render the new account page with message at the bottom 
    console.log("Post /newaccount")
    // if passwords don't match 

    if (req.body.password != req.body.confirmpassword) {
        console.log('passwords do not match')
        res.render('newaccount', {message: "Passwords do not match"})
        return
    }
    console.log("Passwords match")

    var connection = createConnection()

    // // check if username is already taken 
    connection.query('SELECT username FROM weather_db.users', (err, rows, fields) => {
        
        if (err) throw err; 

        rows.forEach(row => {
            if (row['username'] == req.body.username) {
                console.log(row['username'])
                res.render('signin', {message: "Username is already taken"})
                return
            }
        })
    })
    console.log()
    // Hash password before storing in db

    var salt = crypto.randomBytes(16).toString('base64')
    crypto.pbkdf2(req.body.password, salt, 1000, 16, 'sha512', (err, derivedKey) => {
        if(err) {
            console.log(err)
            throw err
        }
        else {
            console.log('hash: ' + derivedKey.toString('hex'));
        
            connection.query("INSERT INTO `weather_db`.`users` (`username`, `password`, `password_salt`) VALUES ('" + req.body.username + "', '" + derivedKey.toString('hex')
            + "', '" + salt + "')", (err, result) =>
            {
                if (err)  {
                    console.log(err)
                    throw err; 
                }
                else {
                console.log("New User created")
                }
            })
        } })
       
    
     // Create new user
    // var prepared_statement = "INSERT INTO `weather_db`.`users` (`username`, `password`, `password_salt`) VALUES ('" + req.body.username + "', '" + hash + "', '" + salt + "')"
   
    
       
    res.render('signin', {message: 'Account created'})
  })

app.listen(process.env.PORT, () => {
  console.log('Example app listening on port 3000!')
  console.log(`api.openweathermap.org/data/2.5/weather?q=Boston&appid=${process.env.API_KEY}`)
  const url = `https://api.openweathermap.org/data/2.5/weather?q=Boston&appid=${process.env.API_KEY}`
  fetch(url)
    .then(function(response) {
        return response.json()
    })
    .then(function(data) {
        console.log('Request succeeded with JSON response', data)
    })
    .then(function(error) {
        console.log('Request failed', error);

})
})