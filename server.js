require('dotenv').config() 
var path = require('path')
var crypto = require('crypto')
const express = require('express')
const mysql = require('mysql');
const fetch = require('node-fetch'); 
const app = express()


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended: true}))
app.use(express.json())

app.set('view engine', 'ejs');

function createConnection() {
    var mysqlConnection = mysql.createConnection({
        host: process.env.HOST,
        user: 'root',
        password: process.env.PASSWORD,
        database: process.env.DATABASE,
        multipleStatements: true
        });

    
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

    return mysqlConnection
}



app.get('/',  (req, res) => {
  res.render('signin')
})

app.post('/signin',  (req, res) => {
    var connection = createConnection() 
   
    // check if username from body exists 
    connection.query('SELECT username, password, password_salt FROM users WHERE username = ' + mysql.escape(req.body.username),
     (err, results, fields) => {
        if (err) throw err; 


        if (results.length == 0) {
            console.log(rows.length)
            res.render('signin', {message: "Invalid Username"})
        }
        else {
            
            const result = results[0] 
            console.log('result: ', result)

            crypto.pbkdf2(req.body.password, result['password_salt'], 1000, 16, 'sha512', (err, derivedKey) => {
                if(err) {
                    console.log(err)
                    throw err
                }
                else {
                    console.log(typeof derivedKey)
                    console.log('derived key: ', derivedKey.toString('hex'))
                    console.log(result['password'])
                    // check if form password + salt is the same as db password
                    if (derivedKey.toString('hex') == result['password']) {
                        
                        // send API response data to /home
                        const url = `https://api.openweathermap.org/data/2.5/weather?q=Montgomery&appid=${process.env.API_KEY}`
                        fetch(url)
                            .then(function(response) {
                                return response.json()
                            })
                            .then(function(data) {
                                const temp =   9/5 * (data.main.temp - 273.15) + 32
                                const icon_url = 'http://openweathermap.org/img/w/' + data.weather[0].icon + '.png'

                                res.render('home', {temp: temp, icon_url: icon_url})
                            })
                            .catch(function(error) {
                                console.log('Request failed', error);

                            })
                        
                    }
                    else {
                        res.render('signin', {message: "Invalid Password"})
                    }
                
                } })
        }
    }) 
    }) 


app.get('/newaccount', (req, res) => {
    res.render('newaccount')
  })

app.post('/newaccount', async function (req, res) {
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

app.listen(3000, () => {
  console.log('Example app listening on port 3000!')
})

