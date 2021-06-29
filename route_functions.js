require('dotenv').config() 
var crypto = require('crypto')
const mysql = require('mysql');
const fetch = require('node-fetch'); 

module.exports = {
    // declare function expressions for handling routes 
    createConnection: () => {
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
    }, 

get_root: (req, res) => {
    res.render('signin')
  }, 

post_signin: (req, res) => {
    var connection = module.exports.createConnection()
    console.log(connection)
   
    // check if username from body exists 
    connection.query('SELECT username, password, password_salt, default_city FROM users WHERE username = ' + mysql.escape(req.body.username),
     (err, results, fields) => {
        if (err) {
        throw err; 
        } 

        if (results.length == 0) {
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
                        const url = `https://api.openweathermap.org/data/2.5/weather?zip=${result['default_city']},us&appid=${process.env.API_KEY}`
                        fetch(url)
                            .then(function(response) {
                                return response.json()
                            })
                            .then(function(data) {
                                console.log(data)
                                const temp =   Math.round(9/5 * (data.main.temp - 273.15) + 32) 
                                const icon_url = 'http://openweathermap.org/img/w/' + data.weather[0].icon + '.png'
                                const description = data.weather[0].main
                                const high =  Math.round(9/5 * (data.main.temp_max - 273.15) + 32) 
                                const low =  Math.round(9/5 * (data.main.temp_min - 273.15) + 32) 

                                res.render('home', {location: data.name, description: description, temp: temp, high: high, low: low, icon_url: icon_url})
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
}, 

get_newaccount: (req, res) => {
    res.render('newaccount')
  }, 

post_newaccount: async function (req, res) {
    // if passwords don't match 

    if (req.body.password != req.body.confirmpassword) {
        res.render('newaccount', {message: "Passwords do not match"})
        return
    }

    var connection = module.exports.createConnection()

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
    // Hash password before storing in db

    var salt = crypto.randomBytes(16).toString('base64')
    crypto.pbkdf2(req.body.password, salt, 1000, 16, 'sha512', (err, derivedKey) => {
        if(err) {
            console.log(err)
            throw err
        }
        else {
        
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
  }, 

post_search: async (req, res) => {
    const url = `https://api.openweathermap.org/data/2.5/weather?zip=${req.body.zipcode},us&appid=${process.env.API_KEY}`
    const response = await fetch(url)
    const data = await response.json()



    let temp, icon_url, description, high, low, message, name; 
    if (data.cod == 200) {

    temp =   Math.round(9/5 * (data.main.temp - 273.15) + 32) 
    icon_url = 'http://openweathermap.org/img/w/' + data.weather[0].icon + '.png'
    description = data.weather[0].main
    high =  Math.round(9/5 * (data.main.temp_max - 273.15) + 32) 
    low =  Math.round(9/5 * (data.main.temp_min - 273.15) + 32) 
    message = null 
    name = data.name

    } 
    else {
        console.log('api response was not 200')

        const default_response = await fetch(`https://api.openweathermap.org/data/2.5/weather?zip=02120,us&appid=${process.env.API_KEY}`)
        const default_data = await default_response.json()

        console.log('Api response: ', default_data)

        temp =   Math.round(9/5 * (default_data.main.temp - 273.15) + 32) 
        icon_url = 'http://openweathermap.org/img/w/' + default_data.weather[0].icon + '.png'
        description = default_data.weather[0].main
        high =  Math.round(9/5 * (default_data.main.temp_max - 273.15) + 32) 
        low =  Math.round(9/5 * (default_data.main.temp_min - 273.15) + 32) 
        message = 'Invalid Zipcode'
        name = default_data.name

    }
    res.render('home', {message: message, location: name, description: description, temp: temp, high: high, low: low, icon_url: icon_url})
  }
}