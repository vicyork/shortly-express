var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

// extra modules
var session = require('express-session');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());

// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public'));

//allows for sessions so user won't have to continuously login
app.use(session({secret: 'somesecrettokenhere'}));

//logout
app.get('/logout', function(req, res){
  req.session.username = null;
  req.session.password = null;
  res.redirect('/login')
})


app.get('/', function(req, res){
  //if user is not logged in
  if(!req.session.username && !req.session.password){
    //redirect to login page
    res.redirect('/login');
  } else {
    //otherwise go to app main page
    res.render('index');
  }
});

app.get('/signup', function(req, res){
  res.render('signup');
});


app.get('/links', function(req, res){
  if(!req.session.username && !req.session.password){
    res.redirect('index')
  } else {
    Links.reset().fetch().then(function(links){
      res.send(200, links.models);
    });
  }
});

app.post('/links', function(req, res){
  var uri = req.body.url;

  if(!util.isValidUrl(uri)){
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({url: uri}).fetch().then(function(found){
    if(found){
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title){
        if(err){
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink){
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});


/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', function(req, res){
  res.render('login')
});

app.post('/signup', function(req, res){
  //new user instance is created and checked against database
  new User({username: req.body.username}).fetch().then(function(found){
    //if user not found in db
    if(!found){
      //create user w/ username and pswd and save to db
      new User({username: req.body.username, password: req.body.password})
        .save()
        .then(function(model){
          //customize session to each user
          req.session.username = req.body.username;
          req.session.password = req.body.password;
          //redirect to app main page
          res.redirect('/');
        });
    } else {
      //if user already exists, have them login
      res.redirect('/login')
    }
  });
});

app.post('/login', function(req, res){
  //check username and pw entered against db
  new User({username: req.body.username, password: req.body.password})
    .fetch().then(function(found){
    //if user exists
    if(found){
      //customize session to them
      req.session.username = req.body.username;
      req.session.password = req.body.password;
      //redirect to app main page
      res.redirect('/');
    } else {
      //if user doesn't exist, have them reenter details
      res.redirect('/login')
    }
  });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res){
  new Link({code: req.params[0]}).fetch().then(function(link){
    if(!link){
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function(){
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1
          }).then(function(){
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
